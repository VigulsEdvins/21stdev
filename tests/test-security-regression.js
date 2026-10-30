/* Security regression tests (plan E16.6). Each protection has a named test (R01...). Removing the protection must make exactly that
   test fail; docs/security/regression-map.md says where each protection lives and which items of E16.6 cannot be tested yet
   because the thing they protect does not exist (checkout, webhooks, owner pages). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('../functions/lib/lead-http.js');
const lead = require('../functions/lib/lead.js');
const Ent = require('../functions/lib/entitlement.js');
const { push, safePath } = require('../functions/lib/github-push.js');
const { sendToGithub } = require('../functions/lib/send-to-github.js');
const Fake = require('./lib/fake-github.js');
const A = require('../scripts/assembler.js');

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'briefs', 'valid-complete.json'), 'utf8'));
const ENV = { LEAD_TO_EMAIL: 'owner@test.invalid', LEAD_FROM_EMAIL: 'site@test.invalid', RESEND_API_KEY: 'test-key-not-real' };
const good = { path: 'done', email: 'anna@example.com', name: 'Anna', brief: sample, consent: true, consentText: 'It is fine to contact me about this page.' };
const post = (body, headers, raw) => new Request('https://edvlabs.test/api/lead', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Origin: 'https://edvlabs.test' }, headers || {}), body: raw !== undefined ? raw : JSON.stringify(body) });
const asset = async () => new Response('site');
const mails = [];
const results = [];
const test = (id, what, fn) => results.push({ id, what, fn });

test('R01', 'price tampering: a price sent by the browser is ignored, the email shows the price worked out on the server', async () => {
  const P = require('../site/js/prices.js');
  const out = lead.renderEmail(lead.parse(Object.assign({}, good, { price: 1, total: 1, self: 1, done: 1, brief: Object.assign({}, sample, { price: 1, total: 1 }) })).lead || { brief: sample, path: 'done', consent: {} }, false);
  // the extra fields make the brief invalid (unknown fields are refused), which is also a refusal of the tampering
  const p = lead.parse(Object.assign({}, good, { brief: Object.assign({}, sample, { price: 1 }) }));
  assert(!p.ok, 'a brief with an extra price field is refused');
  const ok = lead.parse(Object.assign({}, good, { price: 1, total: 1 }));
  assert(ok.ok && !('price' in ok.lead) && !('total' in ok.lead), 'top-level price fields are dropped');
  const q = lead.quote(ok.lead.brief);
  assert.strictEqual(q.self, P.self(q.blocks, q.editor)); assert(out.text.includes(P.eur(q.done)));
});
test('R02', 'email header injection: line breaks in a name, a message or an email are removed or refused', async () => {
  const evil = 'Anna\r\nBcc: evil@x.com\r\nSubject: hacked';
  const p = lead.parse(Object.assign({}, good, { name: evil, message: evil, how: evil }));
  assert(p.ok); const m = lead.renderEmail(Object.assign(p.lead, { consent: { given: true, text: evil, at: 'x' } }), false);
  assert(!/[\r\n]/.test(m.subject), 'no line break in the subject'); assert(!/[\r\n]Bcc:/i.test(m.subject));
  assert(!lead.parse(Object.assign({}, good, { email: 'a@b.co\r\nBcc: evil@x.com' })).ok, 'an email with a line break is refused');
  assert(!lead.parse(Object.assign({}, good, { email: 'a@b.co, evil@x.com' })).ok || !/,/.test(lead.parse(Object.assign({}, good, { email: 'a@b.co, evil@x.com' })).lead.email) , 'two addresses are not accepted as one');
});
test('R03', 'honeypot: a filled hidden field sends nothing and looks like success', async () => {
  const r = await lead.handle({ body: good, ip: '1.1.1.1', honeypot: 'http://spam' }, { mailer: { send: async () => mails.push(1) }, to: 'a', from: 'b' });
  assert.strictEqual(r.status, 200); assert.strictEqual(mails.length, 0);
});
test('R04', 'rate limit: the sixth send in an hour from one address is refused', async () => {
  const kv = new Map(); const store = { get: async (k) => kv.get(k), put: async (k, v) => kv.set(k, v) };
  const deps = { mailer: { send: async () => {} }, store, to: 'a', from: 'b' };
  let last; for (let i = 0; i < 6; i++) last = await lead.handle({ body: Object.assign({}, good, { email: 'p' + i + '@example.com' }), ip: '9.9.9.9' }, deps);
  assert.strictEqual(last.status, 429);
  assert.strictEqual((await lead.handle({ body: good, ip: '8.8.8.8' }, deps)).status, 200, 'another address is not blocked');
});
test('R05', 'size limits: an oversized body is refused before it is parsed or mailed', async () => {
  const realFetch = global.fetch; let n = 0; global.fetch = async () => { n++; return new Response('{}'); };
  try { const r = await http.route(post(null, null, '{"x":"' + 'a'.repeat(50000) + '"}'), ENV, asset); assert.strictEqual(r.status, 413); assert.strictEqual(n, 0); } finally { global.fetch = realFetch; }
});
test('R06', 'content type: only JSON is accepted', async () => {
  const r = await http.route(post(null, { 'Content-Type': 'text/plain' }, JSON.stringify(good)), ENV, asset); assert.strictEqual(r.status, 415);
  const f = await http.route(post(null, { 'Content-Type': 'application/x-www-form-urlencoded' }, 'email=a@b.co'), ENV, asset); assert.strictEqual(f.status, 415);
});
test('R07', 'CSRF: a request from another origin is refused (the check is on the Origin header)', async () => {
  const realFetch = global.fetch; let n = 0; global.fetch = async () => { n++; return new Response('{}'); };
  try { const r = await http.route(post(good, { Origin: 'https://evil.example' }), ENV, asset); assert.strictEqual(r.status, 403); assert.strictEqual(n, 0); } finally { global.fetch = realFetch; }
});
test('R08', 'no mass assignment: fields that choose the recipient or sender are ignored', async () => {
  const realFetch = global.fetch; let sent; global.fetch = async (u, i) => { sent = JSON.parse(i.body); return new Response('{}'); };
  try { const r = await http.route(post(Object.assign({}, good, { to: 'evil@x.com', from: 'evil@x.com', bcc: 'evil@x.com', replyTo: 'evil@x.com', subject: 'pwned' })), ENV, asset);
    assert.strictEqual(r.status, 200); assert.deepStrictEqual(sent.to, ['owner@test.invalid']); assert.strictEqual(sent.from, 'site@test.invalid'); assert(!JSON.stringify(sent).includes('evil@x.com')); assert(!/pwned/.test(sent.subject)); } finally { global.fetch = realFetch; }
});
test('R09', 'errors tell little: a failure never echoes a setting, a key or a stack', async () => {
  const realFetch = global.fetch; global.fetch = async () => new Response('{"error":"Bearer test-key-not-real owner@test.invalid"}', { status: 500 });
  try { const r = await http.route(post(good), ENV, asset); const t = await r.text(); assert(!/test-key-not-real|owner@test\.invalid|site@test\.invalid|\bat \w+.*\.js:\d+/.test(t), t);
    const m = await http.route(post(good), {}, asset); const mt = await m.text(); assert(/LEAD_TO_EMAIL/.test(mt) && !/@|key/i.test(mt.replace(/RESEND_API_KEY/g, '')), 'only setting names, never values'); } finally { global.fetch = realFetch; }
});
test('R10', 'API answers carry their own security headers and are never cached', async () => {
  const r = await http.route(new Request('https://edvlabs.test/api/nothing'), ENV, asset);
  assert.strictEqual(r.status, 404); for (const h of ['X-Content-Type-Options', 'Strict-Transport-Security', 'Content-Security-Policy', 'Referrer-Policy']) assert(r.headers.get(h), h);
  assert.strictEqual(r.headers.get('Cache-Control'), 'no-store');
});
test('R11', 'the public key endpoint hands out only the public values', async () => {
  const r = await http.route(new Request('https://edvlabs.test/api/config'), Object.assign({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'SECRET-SERVICE', RESEND_API_KEY: 'SECRET-MAIL' }, {}), asset);
  const t = await r.text(); assert(!/SECRET/.test(t), 'no secret setting is reachable through /api/config');
});
test('R12', 'database: row level security is on, anonymous visitors have no rights, every policy ties a row to its owner (IDOR, reading without signing in)', async () => {
  const dir = path.join(__dirname, '..', 'supabase', 'migrations'); const all = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const tables = [...all.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
  assert(tables.includes('briefs') && tables.includes('projects') && tables.includes('published_sites'));
  for (const t of tables) {
    assert(new RegExp('alter table public\\.' + t + ' enable row level security', 'i').test(all), t + ': row level security on');
    assert(new RegExp('revoke all on public\\.' + t + ' from anon', 'i').test(all), t + ': anon has nothing');
    const pol = [...all.matchAll(new RegExp('create policy "[^"]+"\\s+on public\\.' + t + '\\b[^;]*;', 'gi'))].map((m) => m[0]);
    /* Tables the server writes (publishing, name holds, paid places) give the owner a read policy only, and no write right at all. */
    const serverWritten = ['published_sites', 'site_name_holds', 'site_entitlements'].includes(t);
    if (serverWritten) assert(!new RegExp('grant[^;]*\\b(insert|update|delete|all)\\b[^;]*on public\\.' + t + '\\s+to authenticated', 'i').test(all), t + ': the browser has no write right');
    assert(pol.length >= (serverWritten ? 1 : 3), t + ': has policies'); pol.forEach((p) => assert(/auth\.uid\(\)\)? = user_id/.test(p), t + ': policy is tied to the owner: ' + p.slice(0, 60)));
    assert(!new RegExp('grant[^;]*\\bto anon\\b[^;]*public\\.' + t, 'i').test(all) && !new RegExp('grant[^;]*public\\.' + t + '[^;]*to anon', 'i').test(all), t + ': never granted to anon');
  }
  assert(!/grant\s+delete\s+on\s+public\.projects/i.test(all), 'a project is never deleted straight from the browser');
  assert(/revoke all on function public\.delete_my_account\(\) from public, anon/i.test(all), 'account deletion is closed to anon');
  assert(!/service_role/i.test(all), 'no migration hands rows to the service role by name');
});
test('R13', 'download without a paid entitlement, after expiry, and above the allowance is refused', async () => {
  const now = '2026-11-01T00:00:00Z', ent = Ent.create({ blocks: 3, now });
  assert.strictEqual(Ent.check(null, { blocks: 1 }, now).reason, 'not-paid');
  assert.strictEqual(Ent.check({ status: 'refunded', allowance: 9, expiresAt: '2099-01-01T00:00:00Z', priceVersion: 'v1' }, { blocks: 1 }, now).reason, 'not-paid');
  assert.strictEqual(Ent.check(ent, { blocks: 1 }, '2028-01-01T00:00:00Z').reason, 'expired');
  assert.strictEqual(Ent.check(ent, { blocks: 4 }, now).reason, 'payment-needed');
  assert.throws(() => Ent.check(Object.assign({}, ent, { priceVersion: '__proto__' }), { blocks: 4 }, now), /Unknown price table/);
});
test('R14', 'GitHub: unpaid is refused before GitHub is called, paths cannot escape, tokens never leak, no force push', async () => {
  const gh = Fake.create(); gh.addRepo('a/b'); const audits = [];
  const files = A.generateExportBundle([], { id: 'clean-minimal' }, {}, { page: { title: 'T' } });
  const deps = { now: () => '2026-11-01T00:00:00Z', limiter: async () => true, audit: async (e) => audits.push(e), mintToken: async () => gh.state.token, gh: (t) => gh.gh(t), buildFiles: async () => files };
  const r = await sendToGithub({ accountId: 'u', projectId: 'p', entitlement: null, blocks: 1, installationId: '1', target: { owner: 'a', repo: 'b' } }, deps);
  assert.strictEqual(r.status, 'not-paid'); assert.strictEqual(gh.log.length, 0);
  for (const p of ['../x', '.git/hooks/pre-commit', '/abs', 'a/../../b']) assert(!safePath(p), p);
  const ent = Ent.create({ blocks: 3, now: '2026-11-01T00:00:00Z' });
  const ok = await sendToGithub({ accountId: 'u', projectId: 'p', entitlement: ent, blocks: 3, installationId: '1', target: { owner: 'a', repo: 'b' } }, deps);
  assert(ok.ok); assert(!JSON.stringify([ok, audits]).includes(gh.state.token)); assert(gh.log.every((l) => !l.body || l.body.force !== true));
});
test('R15', 'rate limit on sending to GitHub', async () => {
  const r = await sendToGithub({ accountId: 'u', entitlement: Ent.create({ blocks: 3, now: '2026-11-01T00:00:00Z' }), blocks: 3, installationId: '1', target: { owner: 'a', repo: 'b' } }, { now: () => '2026-11-01T00:00:00Z', limiter: async () => false, audit: async () => {}, mintToken: async () => { throw new Error('should not be reached'); }, gh: () => { throw new Error('no'); }, buildFiles: async () => ({}) });
  assert.strictEqual(r.status, 'rate-limited');
});
test('R16', 'a downloaded site does not carry the builder\'s secrets or the account\'s data', async () => {
  const b = A.generateExportBundle([{ id: 's', slug: 'x', title: 'X', html: '<p>hi</p>', css: '', js: '' }], { id: 'clean-minimal' }, {}, { page: { title: 'T', bizEmail: 'a@b.co' } });
  const all = Object.values(b).join('\n');
  assert(!/SUPABASE|RESEND|service_role|anonKey|edvlabs\.session|sb-.*-auth-token/i.test(all), 'no setting names or session keys in the files');
});

(async () => {
  let failed = 0;
  for (const t of results) {
    try { await t.fn(); console.log('  ✓ ' + t.id + ' ' + t.what); } catch (e) { failed++; console.log('  ✗ ' + t.id + ' ' + t.what + '\n      ' + String(e && e.message).split('\n')[0]); }
  }
  if (failed) { console.error(failed + ' security regression test(s) failed'); process.exit(1); }
  console.log('✅ Security regression tests passed (' + results.length + ')');
})();
