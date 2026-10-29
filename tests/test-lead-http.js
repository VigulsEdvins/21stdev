/* The HTTP side of lead intake (functions/lib/lead-http.js, used by the Worker): routing, checks before any email, and the email call to Resend. No network. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('../functions/lib/lead-http.js');
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'briefs', 'valid-complete.json'), 'utf8'));
const ENV = { LEAD_TO_EMAIL: 'owner@test.invalid', LEAD_FROM_EMAIL: 'site@test.invalid', RESEND_API_KEY: 'test-key-not-real' };
const good = { path: 'done', email: 'anna@example.com', phone: '', name: 'Anna', brief: sample, consent: true, consentText: 'It is fine to contact me about this page.' };
const post = (body, headers, raw) => new Request('https://edvlabs.test/api/lead', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Origin: 'https://edvlabs.test' }, headers || {}), body: raw !== undefined ? raw : JSON.stringify(body) });
const asset = async () => new Response('<html>site</html>', { status: 200 });
const call = (req, env) => http.route(req, env || ENV, asset);

(async () => {
  const realFetch = global.fetch; let calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); };
  try {
    // a good lead reaches Resend once, to the owner, from the sender, with the key as a bearer token and never in the response
    let r = await call(post(good));
    assert.strictEqual(r.status, 200); const out = await r.text(); assert(!out.includes('test-key-not-real') && !out.includes('owner@test.invalid'), 'the response leaks no setting');
    assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0].url, 'https://api.resend.com/emails');
    const sent = JSON.parse(calls[0].init.body);
    assert.deepStrictEqual(sent.to, ['owner@test.invalid']); assert.strictEqual(sent.from, 'site@test.invalid'); assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer test-key-not-real');
    assert.strictEqual(r.headers.get('X-Content-Type-Options'), 'nosniff'); assert.strictEqual(r.headers.get('Cache-Control'), 'no-store');
    assert(/max-age=\d{8,}/.test(r.headers.get('Strict-Transport-Security')) && /default-src 'none'/.test(r.headers.get('Content-Security-Policy')), 'the API carries its own security headers');
    console.log('  ✓ a good lead becomes one email to the owner; no setting leaks back');

    // nothing is sent when the request is wrong
    for (const [name, req, status, env] of [
      ['settings missing', post(good), 503, { LEAD_TO_EMAIL: 'a@b.c' }],
      ['another origin', post(good, { Origin: 'https://evil.example' }), 403],
      ['not JSON content type', post(good, { 'Content-Type': 'text/plain' }), 415],
      ['too large', post(null, null, 'x'.repeat(40001)), 413],
      ['broken JSON', post(null, null, '{nope'), 400],
      ['honeypot filled', post(Object.assign({}, good, { website: 'http://spam.example' })), 200],
      ['no consent', post(Object.assign({}, good, { consent: false })), 422]
    ]) { calls = []; r = await call(req, env); assert.strictEqual(r.status, status, name + ' gave ' + r.status); if (name !== 'honeypot filled') assert.strictEqual(calls.length, 0, name + ' sent no email'); }
    calls = []; await call(post(Object.assign({}, good, { website: 'http://spam.example' }))); assert.strictEqual(calls.length, 0, 'a filled honeypot sends nothing');
    console.log('  ✓ missing settings, another origin, wrong type, too large, broken JSON, spam trap and no consent all send nothing');

    // a missing setting is named (names only), so the owner can see what to add
    r = await call(post(good), { LEAD_TO_EMAIL: 'a@b.c' }); const miss = await r.json();
    assert.deepStrictEqual(miss.missing, ['LEAD_FROM_EMAIL', 'RESEND_API_KEY']); assert(!JSON.stringify(miss).includes('a@b.c'), 'no value is echoed');
    r = await call(new Request('https://edvlabs.test/api/config'), {}); assert.strictEqual(r.status, 503); assert.deepStrictEqual((await r.json()).missing, ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);
    r = await call(new Request('https://edvlabs.test/api/config'), { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'public-key' });
    assert.strictEqual(r.status, 200); assert.deepStrictEqual(await r.json(), { supabaseUrl: 'https://x.supabase.co', anonKey: 'public-key' });
    r = await call(new Request('https://edvlabs.test/api/config', { method: 'POST' }), { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k' }); assert.strictEqual(r.status, 405);
    console.log('  ✓ missing settings are named without their values; /api/config hands out only the two public values');

    // routing
    r = await call(new Request('https://edvlabs.test/api/lead', { method: 'GET' })); assert.strictEqual(r.status, 405); assert.strictEqual(r.headers.get('Allow'), 'POST');
    r = await call(new Request('https://edvlabs.test/api/other', { method: 'POST' })); assert.strictEqual(r.status, 404);
    r = await call(new Request('https://edvlabs.test/pricing/')); assert.strictEqual(r.status, 200); assert((await r.text()).includes('site'), 'everything else is the static site');
    console.log('  ✓ GET is refused, other /api paths are not found, other paths are the static site');

    // the spam check: the public key is handed out only with its secret, a secret alone is called out, and the token decides
    const TS = { TURNSTILE_SITE_KEY: 'site-key-public', TURNSTILE_SECRET: 'secret-not-real' };
    const key = (env, method) => call(new Request('https://edvlabs.test/api/form-check', { method: method || 'GET' }), Object.assign({}, ENV, env));
    r = await key({}); assert.deepStrictEqual(await r.json(), {}); assert.strictEqual(r.headers.get('Cache-Control'), 'no-store');
    r = await key({ TURNSTILE_SITE_KEY: 'site-key-public' }); assert.deepStrictEqual(await r.json(), {}, 'a site key alone (account page only) does not switch the lead forms on');
    r = await key(TS); const kc = await r.text(); assert.deepStrictEqual(JSON.parse(kc), { turnstileSiteKey: 'site-key-public' }); assert(!kc.includes('secret-not-real'), 'the secret never leaves the Worker');
    assert.strictEqual((await key(TS, 'POST')).status, 405);
    calls = []; r = await call(post(good), Object.assign({}, ENV, { TURNSTILE_SECRET: 'secret-not-real' }));
    assert.strictEqual(r.status, 503); assert.deepStrictEqual((await r.json()).missing, ['TURNSTILE_SITE_KEY']); assert.strictEqual(calls.length, 0, 'a half-set-up check sends nothing and asks nothing');
    const verdicts = []; // stand-in for Cloudflare's check: only the token "good-token" passes
    global.fetch = async (url, init) => {
      if (String(url).includes('challenges.cloudflare.com')) { const b = new URLSearchParams(init.body); verdicts.push({ secret: b.get('secret'), response: b.get('response'), ip: b.get('remoteip') }); return new Response(JSON.stringify({ success: b.get('response') === 'good-token' }), { status: 200 }); }
      calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 });
    };
    for (const [name, body, status, mails] of [['no token', good, 403, 0], ['wrong token', Object.assign({}, good, { turnstile: 'bad-token' }), 403, 0], ['passed token', Object.assign({}, good, { turnstile: 'good-token' }), 200, 1]]) {
      calls = []; r = await call(post(body, { 'CF-Connecting-IP': '203.0.113.9' }), Object.assign({}, ENV, TS));
      assert.strictEqual(r.status, status, name + ' gave ' + r.status); assert.strictEqual(calls.length, mails, name + ' sent ' + calls.length + ' emails');
    }
    assert.deepStrictEqual(verdicts[2], { secret: 'secret-not-real', response: 'good-token', ip: '203.0.113.9' }, 'Cloudflare is asked with the secret, the token and the visitor address');
    calls = []; r = await call(post(good), ENV); assert.strictEqual(r.status, 200, 'without the check set up, messages go through as before');
    global.fetch = async (url, init) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); };
    console.log('  ✓ spam check: key handed out only with its secret, half setup is named, the token decides, the secret never leaves');

    // the rate limit and "again" marking through the storage binding LEADS (a stand-in with the same get/put shape)
    const mem = new Map(), puts = [];
    const LEADS = { get: async (k) => (mem.has(k) ? mem.get(k) : null), put: async (k, v, o) => { puts.push(o); mem.set(k, v); } };
    const withStore = Object.assign({}, ENV, { LEADS });
    const from = (ip, n) => call(post(Object.assign({}, good, { email: 'p' + n + '@example.com' }), { 'CF-Connecting-IP': ip }), withStore);
    calls = [];
    for (let n = 1; n <= 5; n++) assert.strictEqual((await from('198.51.100.1', n)).status, 200, 'send ' + n + ' is fine');
    r = await from('198.51.100.1', 6); assert.strictEqual(r.status, 429, 'the sixth in an hour from one address is refused'); assert.strictEqual(calls.length, 5, 'and sends no email');
    assert.strictEqual((await from('198.51.100.2', 7)).status, 200, 'another address is not affected');
    assert(puts.every((o) => o.expirationTtl >= 60), 'KV needs a time to live of at least 60 seconds');
    calls = []; r = await call(post(good, { 'CF-Connecting-IP': '198.51.100.3' }), withStore); const again = await (await call(post(good, { 'CF-Connecting-IP': '198.51.100.4' }), withStore)).json();
    assert.strictEqual(again.repeat, true, 'the same person writing again is marked as such');
    console.log('  ✓ with the LEADS binding: 5 sends an hour per address, repeat marking, and KV-safe lifetimes');

    // a failing mail service is reported, not hidden
    global.fetch = async () => new Response('no', { status: 500 });
    r = await call(post(good)); assert(r.status >= 500, 'a mail failure is an error response: ' + r.status);
    console.log('  ✓ a mail service failure is an error, not a silent success');
  } finally { global.fetch = realFetch; }
  // the real Worker file bundles the way Cloudflare will bundle it, and the bundle works
  let esbuild = null; try { esbuild = require('esbuild'); } catch (e) { /* not installed here: the checks above still ran */ }
  if (esbuild) {
    const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'worker.js')], bundle: true, format: 'esm', platform: 'neutral', mainFields: ['module', 'main'], write: false });
    const tmp = path.join(require('os').tmpdir(), 'worker-test-' + process.pid + '.mjs'); fs.writeFileSync(tmp, out.outputFiles[0].text);
    const worker = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
    global.fetch = async () => new Response('{}', { status: 200 }); calls = [];
    const env = Object.assign({ ASSETS: { fetch: async () => new Response('static') } }, ENV);
    assert.strictEqual((await worker.fetch(new Request('https://edvlabs.test/'), env)).status, 200);
    assert.strictEqual((await worker.fetch(post(good), env)).status, 200);
    global.fetch = realFetch;
    console.log('  ✓ src/worker.js bundles and answers: static pages and POST /api/lead');
  }
  console.log('lead http ok');
})().catch((e) => { console.error(e); process.exit(1); });
