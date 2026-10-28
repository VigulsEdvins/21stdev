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
