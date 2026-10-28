/** Lead intake: validation, honeypot, rate limit, dedupe, the email the owner reads, and the price recomputed on the server. No network. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const L = require('../functions/lib/lead.js');
const P = require('../site/js/prices.js');
const sample = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'briefs', n + '.json'), 'utf8'));
const mem = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, m }; };
const outbox = () => { const sent = []; return { sent, send: async (m) => { sent.push(m); } }; };
const base = (over) => ({ body: Object.assign({ path: 'done', email: 'Anna@Example.com ', phone: '', name: 'Anna', brief: sample('valid-complete'), consent: true, consentText: 'It is fine to contact me about this page.' }, over), ip: '1.2.3.4' });
const deps = (o) => Object.assign({ to: 'owner@test.invalid', from: 'site@test.invalid', now: () => new Date('2026-10-28T10:00:00Z'), mailer: outbox(), store: mem() }, o);

(async () => {
  // a good lead: one email, contact in the subject, price recomputed (5 blocks + editor, we build it)
  let d = deps(); let r = await L.handle(base(), d);
  assert.strictEqual(r.status, 200); assert.strictEqual(d.mailer.sent.length, 1);
  const m = d.mailer.sent[0];
  assert.strictEqual(m.to, 'owner@test.invalid'); assert.strictEqual(m.replyTo, 'anna@example.com');
  assert(m.subject.includes('Anna') && m.subject.includes('anna@example.com'), 'contact in the subject: ' + m.subject);
  assert(m.subject.includes(P.eur(P.done(5, true))), 'price in the subject: ' + m.subject);
  assert(m.text.includes('If we do it: ' + P.eur(P.done(5, true))) && m.text.includes('Opening banner, About you'), 'readable email');
  assert(m.text.includes('2026-10-28T10:00:00.000Z'), 'consent time recorded');
  console.log('  ✓ a lead becomes one email with the contact in the subject and a recomputed price');

  // a lie about the price in the payload is ignored
  d = deps(); await L.handle(base({ price: 1, quote: { done: 1 } }), d);
  assert(!d.mailer.sent[0].text.includes('€1\n'), 'client price ignored');

  // phone only works; mostly-unknown brief is marked "to discuss"
  d = deps(); r = await L.handle(base({ email: '', phone: '+371 2000-0000', brief: sample('valid-mostly-unknown'), path: 'talk' }), d);
  assert.strictEqual(r.status, 200); const t = d.mailer.sent[0].text;
  assert(t.includes('Phone: +37120000000') && t.includes('TO DISCUSS') && t.includes('assumed: they did not choose'), 'unknowns grouped, blocks assumed');
  assert(d.mailer.sent[0].replyTo === undefined);
  console.log('  ✓ phone alone is enough; “I don’t know yet” is listed under “To discuss”');

  // rejections
  for (const [over, text] of [[{ email: '', phone: '' }, 'email address or a phone'], [{ email: 'nope' }, 'email address does not'], [{ email: '', phone: 'abc' }, 'phone number does not'], [{ consent: false }, 'Consent'], [{ brief: sample('invalid-contradictory') }, 'not valid']]) {
    d = deps(); r = await L.handle(base(over), d);
    assert.strictEqual(r.status, 422, text); assert(r.json.errors.join(' ').includes(text), text + ' in ' + r.json.errors); assert.strictEqual(d.mailer.sent.length, 0);
  }
  assert.strictEqual((await L.handle({ body: null }, deps())).status, 400);
  console.log('  ✓ bad contact, missing consent and invalid answers are refused with plain messages');

  // honeypot: looks fine, sends nothing
  d = deps(); r = await L.handle(Object.assign(base(), { honeypot: 'http://spam' }), d);
  assert.strictEqual(r.status, 200); assert.strictEqual(d.mailer.sent.length, 0);
  // too large
  d = deps(); r = await L.handle(base({ message: 'x'.repeat(30000) }), d); assert.strictEqual(r.status, 413);
  // rate limit: the sixth from one address in an hour
  d = deps(); for (let i = 0; i < 5; i++) assert.strictEqual((await L.handle(base({ email: `a${i}@x.test` }), d)).status, 200);
  assert.strictEqual((await L.handle(base({ email: 'a9@x.test' }), d)).status, 429); assert.strictEqual(d.mailer.sent.length, 5);
  console.log('  ✓ honeypot, size limit and rate limit');

  // dedupe: the same person again is flagged, not lost; email and phone are normalised
  d = deps(); await L.handle(base(), d); r = await L.handle(base({ email: 'anna@example.com' }), d);
  assert.strictEqual(r.json.repeat, true); assert(d.mailer.sent[1].subject.startsWith('Again: ') && d.mailer.sent[1].text.includes('written before'));
  assert.strictEqual(L.normPhone('00371 2000 0000'), '+37120000000');
  console.log('  ✓ the same person twice is flagged “Again”, never dropped');

  // header injection: line breaks in the name cannot add mail headers
  d = deps(); await L.handle(base({ name: 'Eve\r\nBcc: x@y.z' }), d);
  assert(!/[\r\n]/.test(d.mailer.sent[0].subject), 'subject has no line breaks');

  // when the mail service fails the visitor is told, nothing is marked as sent
  d = deps({ mailer: { send: async () => { throw new Error('down'); } } }); r = await L.handle(base(), d);
  assert.strictEqual(r.status, 502); assert.strictEqual(await d.store.get('lead:e:anna@example.com'), undefined);

  // the real mailer talks to Resend with the key from settings and nothing else
  let seen; const mailer = L.resendMailer('KEY', async (url, o) => { seen = { url, o }; return { ok: true }; });
  await mailer.send({ to: 'o@t.invalid', from: 'f@t.invalid', subject: 's', text: 't', replyTo: 'r@t.invalid' });
  assert.strictEqual(seen.url, 'https://api.resend.com/emails'); assert.strictEqual(seen.o.headers.Authorization, 'Bearer KEY');
  assert.deepStrictEqual(JSON.parse(seen.o.body).to, ['o@t.invalid']);
  console.log('Lead intake passed');
})().catch((e) => { console.error(e); process.exit(1); });

// The Cloudflare Pages wrapper (ESM source, loaded here by rewriting its two export lines)
(async () => {
  const vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', 'lead.js'), 'utf8')
    .replace("import lead from '../lib/lead.js';", "const lead = require('../lib/lead.js');")
    .replace('export async function onRequestPost', 'async function onRequestPost').replace('export const onRequest ', 'const onRequest ') + '\n;({ onRequestPost, onRequest })';
  const fns = vm.runInNewContext(src, { require: (p) => require(path.join(__dirname, '..', 'functions', 'api', p)), Response, URL, URLSearchParams, JSON, fetch: async () => { throw new Error('no network in tests'); } });
  const env = { LEAD_TO_EMAIL: 'o@t.invalid', LEAD_FROM_EMAIL: 'f@t.invalid', RESEND_API_KEY: 'k' };
  const req = (o = {}) => new Request('https://edvlabs.test/api/lead', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Origin: 'https://edvlabs.test' }, o.headers), body: o.body === undefined ? '{}' : o.body });
  const code = async (r) => (await r).status;
  assert.strictEqual(await code(fns.onRequestPost({ request: req(), env: {} })), 503, 'not set up: says so, no crash');
  assert.strictEqual(await code(fns.onRequestPost({ request: req({ headers: { Origin: 'https://evil.test' } }), env })), 403, 'other origins refused');
  assert.strictEqual(await code(fns.onRequestPost({ request: req({ headers: { 'Content-Type': 'text/plain' } }), env })), 415);
  assert.strictEqual(await code(fns.onRequestPost({ request: req({ body: '{nope' }), env })), 400);
  assert.strictEqual(await code(fns.onRequestPost({ request: req({ body: JSON.stringify({ email: '' }) }), env })), 422);
  assert.strictEqual(await code(fns.onRequest({ request: new Request('https://edvlabs.test/api/lead') })), 405);
  console.log('  ✓ the /api/lead wrapper: not set up (503), wrong origin (403), wrong type (415), bad JSON (400), bad lead (422), GET (405)');
})().catch((e) => { console.error(e); process.exit(1); });
