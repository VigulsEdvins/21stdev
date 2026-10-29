/* Form delivery under hostile input (security review 2026-10-29). Seeded so a failure can be replayed: SEED=123 RUNS=3000 node tests/test-form-fuzz.js.
   Rules: a value the checks accept is always in the one safe shape of its route; an unsafe value never reaches the exported page; the page script never
   sends to an address that fails the checks, never forwards a password, never lets a field name touch the request's prototype, and caps what it sends. */
const assert = require('assert');
const FD = require('../scripts/form-delivery.js');

const SEED = Number(process.env.SEED || 20261029);
const RUNS = Number(process.env.RUNS || 1500);
let s = SEED; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const PIECES = ['a', 'b@c.d', '@', '.', ' ', '\n', '\r\n', '\u0000', '"', "'", '<', '>', '&', '\\', '`', ';', ',', ':', '/', '//', '..', 'https://', 'http://', 'javascript:', 'data:', 'file:', 'user:pw@', '%0d%0a', '%22', '+', '+371', '0', '37120000000', 'onfocus=', '<script>', '</script>', 'formspree.io/f/', 'https://formspree.io/f/', '12345678-abcd-1234-abcd-1234567890ab', 'evil.example', '‮', 'é', '😀', 'A'.repeat(500)];
const junk = () => { let out = ''; for (let n = 1 + Math.floor(rnd() * 6); n > 0; n--) out += pick(PIECES); return out; };
const METHODS = ['', 'netlify', 'email', 'formspree', 'web3forms', 'whatsapp', 'mailto', 'custom', 'bogus', '__proto__'];

// the one shape each route's value may have once the checks accept it
const SHAPE = {
  email: /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/,
  mailto: /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/,
  whatsapp: /^\d{8,15}$/,
  formspree: /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]{4,24}$/,
  web3forms: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  custom: /^https:\/\/[^\s"'<>\\@/]+(\/[^\s"'<>\\]*)?$/
};

const form = '<section><form id="f" data-edv-form="message"><input type="text" placeholder="Name"><input type="email"><textarea></textarea><button type="submit">Go</button></form></section>';
let accepted = 0;
for (let i = 0; i < RUNS; i++) {
  const m = pick(METHODS), v = rnd() < 0.6 ? pick(['a@b.co', '+371 2000 0000', 'abcdwxyz', 'https://api.example.test/x', '12345678-ABCD-1234-abcd-1234567890ab']) + (rnd() < 0.4 ? junk() : '') : junk();
  const r = FD.check(m, v);
  assert.strictEqual(typeof r.ok, 'boolean');
  if (!r.ok) { assert(r.error && r.value === ''); }
  else if (r.method && r.value) { accepted++; assert(SHAPE[r.method] && SHAPE[r.method].test(r.value), 'accepted value has the safe shape: ' + m + ' ' + JSON.stringify(v).slice(0, 60) + ' -> ' + r.value); }
  // what reaches the exported page: only a value that passed, and nothing that could leave an attribute
  const html = FD.prepareHtml(form, { formMethod: m, formTarget: v });
  const tag = /<form\b[^>]*>/.exec(html)[0];
  assert(!/onfocus|onerror|onload|javascript:/i.test(tag.replace(/data-edv-[a-z0-9-]+="[^"]*"/g, '')), 'nothing injected into the form tag: ' + tag.slice(0, 160));
  assert.strictEqual((tag.match(/ data-edv-method=/g) || []).length, r.ok && r.method ? 1 : 0, 'the route is on the form only for a valid choice');
  const tv = /data-edv-target(?:-b64)?="([^"]*)"/.exec(tag);
  if (tv) assert(!/[<>"']/.test(tv[1]), 'target attribute holds no markup: ' + tv[1].slice(0, 80));
  assert(!/@/.test(tag) || !/data-edv-target-b64/.test(tag) || !/data-edv-target-b64="[^"]*@/.test(tag), 'an email address is not in the page as plain text');
}
console.log('  ✓ rules and export under ' + RUNS + ' hostile values (' + accepted + ' accepted, each in its safe shape)');

// the page script itself, run against a stand-in page
function run(attrs, controls, win = {}) {
  const sent = [], opened = [];
  let handler = null;
  const host = { querySelector: () => null, insertBefore: () => {} };
  const frm = { parentNode: host, nextSibling: null, elements: controls, getAttribute: (n) => (n in attrs ? attrs[n] : null) };
  const w = Object.assign({ __edvMinFillMs: 0, location: { hostname: 'site.test', href: '' }, open: (u) => { opened.push(u); return {}; }, atob: (x) => Buffer.from(x, 'base64').toString('binary'), setTimeout: (fn) => fn(), URLSearchParams, fetch: (u, o) => { sent.push({ url: u, opts: o }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }); } }, win);
  const d = { title: 'Site', addEventListener: (t, fn) => { if (t === 'edv:submitted') handler = fn; }, createElement: () => ({ style: {}, setAttribute() {} }), body: { appendChild() {}, removeChild() {} } };
  new Function('window', 'document', FD.runtimeJs())(w, d);
  handler({ target: frm });
  return { sent, opened };
}
const ctl = (name, value, type = 'text') => ({ name, value, type });
const good = { 'data-edv-method': 'custom', 'data-edv-target': 'https://api.example.test/x' };

// field names cannot touch the prototype; passwords are never sent; sizes are capped
let r = run(good, [ctl('__proto__', 'x'), ctl('constructor', 'y'), ctl('prototype', 'z'), ctl('email', 'a@b.co', 'email'), ctl('pw', 'secret', 'password'), ctl('note', 'N'.repeat(20000), 'textarea')]);
assert.strictEqual(r.sent.length, 1);
const body = JSON.parse(r.sent[0].opts.body);
assert.deepStrictEqual(Object.keys(body).sort(), ['email', 'note'], 'only real fields: ' + Object.keys(body));
assert.strictEqual(body.note.length, 5000, 'long values are cut');
assert.strictEqual(({}).polluted, undefined);
r = run(good, Array.from({ length: 200 }, (_, i) => ctl('f' + i, 'v' + i)));
assert.strictEqual(Object.keys(JSON.parse(r.sent[0].opts.body)).length, 40, 'at most 40 fields');
console.log('  ✓ page script: reserved names, passwords, sizes');

// unsafe routes and targets send nothing, whether they come from the page or from the editor's file
for (const [attrs, win] of [
  [{ 'data-edv-method': 'custom', 'data-edv-target': 'http://evil.example/x' }, {}],
  [{ 'data-edv-method': 'custom', 'data-edv-target': 'https://user:pw@evil.example/x' }, {}],
  [{ 'data-edv-method': 'whatsapp', 'data-edv-target': '123' }, {}],
  [{ 'data-edv-method': 'bogus', 'data-edv-target': 'x' }, {}],
  [good, { __edvForm: { method: 'custom', target: 'javascript:alert(1)' } }],
  [good, { __edvForm: { method: 'formspree', target: 'https://evil.example/f/abcdwxyz' } }],
  [good, { __edvForm: { method: 'email', target: 'a@b.co\nBcc: x@y.zz' } }],
  [{ 'data-edv-method': 'email', 'data-edv-target-b64': '!!!not base64!!!' }, {}],
  [{}, {}]
]) {
  r = run(attrs, [ctl('email', 'a@b.co', 'email')], win);
  assert.deepStrictEqual([r.sent.length, r.opened.length], [0, 0], 'sends nothing: ' + JSON.stringify([attrs, win]).slice(0, 120));
}
// the editor may switch to another valid route, and an encoded email address is understood
r = run(good, [ctl('email', 'a@b.co', 'email')], { __edvForm: { method: 'whatsapp', target: '+371 2000 0000' } });
assert.deepStrictEqual([r.sent.length, r.opened.length, r.opened[0].split('?')[0]], [0, 1, 'https://wa.me/37120000000']);
r = run({ 'data-edv-method': 'email', 'data-edv-target-b64': Buffer.from(encodeURIComponent('owner@zephyr.example')).toString('base64') }, [ctl('email', 'a@b.co', 'email')]);
assert.strictEqual(r.sent[0].url, 'https://formsubmit.co/ajax/owner@zephyr.example');
// the trap field
r = run(good, [ctl('email', 'a@b.co', 'email'), ctl('bot-field', 'spam')]);
assert.strictEqual(r.sent.length, 0);
console.log('  ✓ page script: unsafe or unknown routes and targets send nothing');

// the strict policy narrows connections only when it is safe to
const A = require('../scripts/assembler.js');
const sec = (html, js = '') => [{ id: 's', slug: 'x', title: 'X', html, css: '', js }];
const conn = (b) => /connect-src[^;]*/.exec(b['index.html'].replace(/&#39;/g, "'"))[0];
let b = A.generateExportBundle(sec(form), { id: 'clean-minimal' }, {}, { page: { title: 'T', formMethod: 'custom', formTarget: 'https://api.example.test/x' }, csp: true });
assert.strictEqual(conn(b), "connect-src 'self' https://formsubmit.co https://formspree.io https://api.web3forms.com https://api.example.test");
b = A.generateExportBundle(sec(form, 'fetch("https://api.other.test/x");'), { id: 'clean-minimal' }, {}, { page: { title: 'T' }, csp: true });
assert(/ https: /.test(conn(b) + ' '), 'a section that makes its own network calls keeps the wider policy');
b = A.generateExportBundle(sec('<p>no form</p>'), { id: 'clean-minimal' }, {}, { page: { title: 'T' }, csp: true });
assert(/ https: /.test(conn(b) + ' '), 'a page without message forms is left as before');
console.log('  ✓ strict policy narrows connections only when safe');
console.log('✅ Form fuzz tests passed (' + RUNS + ' runs, seed ' + SEED + ')');
