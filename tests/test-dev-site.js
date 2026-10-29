/* The local site server (scripts/dev-site.js): reads private settings, serves site/ with the headers of site/_headers, answers /api/* like the Worker. */
const assert = require('assert');
const http = require('http');
const { createServer, parseVars, loadEnv, watchSources } = require('../scripts/dev-site.js');

// settings file format
assert.deepStrictEqual(parseVars('# note\n\nA=1\nB = "two words"\nC=x=y\nbad line\nD=\n'), { A: '1', B: 'two words', C: 'x=y', D: '' });
assert.deepStrictEqual(loadEnv('/no/such/file', { SUPABASE_URL: 'u', OTHER: 'ignored' }), { SUPABASE_URL: 'u' }, 'only the known names are read, from the shell when there is no file');
const fs = require('fs'), os = require('os'), path = require('path');
const tmp = path.join(os.tmpdir(), 'dev-vars-' + process.pid); fs.writeFileSync(tmp, 'SUPABASE_URL=from-file\nLEAD_TO_EMAIL=me@test.invalid\n');
assert.deepStrictEqual(loadEnv(tmp, { SUPABASE_URL: 'from-shell' }), { SUPABASE_URL: 'from-shell', LEAD_TO_EMAIL: 'me@test.invalid' }, 'the shell wins over the file'); fs.unlinkSync(tmp);

const raw = (port, p) => new Promise((resolve, reject) => { http.get({ host: '127.0.0.1', port, path: p }, (r) => { let b = ''; r.on('data', (c) => { b += c; }); r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: b })); }).on('error', reject); });
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

(async () => {
  const none = createServer({}); const pn = await listen(none);
  const full = createServer({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_ANON_KEY: 'public-key', LEAD_TO_EMAIL: 'o@test.invalid', LEAD_FROM_EMAIL: 's@test.invalid', RESEND_API_KEY: 'k' }); const pf = await listen(full);
  const base = (p) => 'http://127.0.0.1:' + p;
  try {
    // pages
    for (const [p, re] of [['/', /edvlabs/i], ['/account/', /Your account/], ['/pricing/', /rice/], ['/examples/arena/', /<html/i]]) { const r = await raw(pn, p); assert.strictEqual(r.status, 200, p); assert(re.test(r.body), p); }
    // like Cloudflare: a .html address is redirected to the tidy one, and the tidy one serves the file
    let r = await raw(pn, '/pricing/index.html'); assert.strictEqual(r.status, 307); assert.strictEqual(r.headers.location, '/pricing/');
    r = await raw(pn, '/examples/arena/admin.html'); assert.strictEqual(r.status, 307); assert.strictEqual(r.headers.location, '/examples/arena/admin');
    r = await raw(pn, '/examples/arena/admin'); assert.strictEqual(r.status, 200, 'the tidy address serves admin.html'); assert(/<html/i.test(r.body));
    r = await raw(pn, '/nope/'); assert.strictEqual(r.status, 404); assert(/<html/i.test(r.body), 'the site\'s own 404 page');
    for (const evil of ['/..%2fpackage.json', '/%2e%2e/package.json', '/..%2f..%2f.dev.vars', '/%00']) { r = await raw(pn, evil); assert(r.status === 404 && !/"scripts"/.test(r.body), 'cannot read outside site/: ' + evil); }
    console.log('  ✓ pages, the 404 page, and no way out of site/');

    // headers follow site/_headers
    r = await raw(pn, '/'); let csp = r.headers['content-security-policy'];
    assert(/script-src 'self'(;|$)/.test(csp) && !/unsafe-inline/.test(csp.match(/script-src[^;]*/)[0]) && !/upgrade-insecure/.test(csp), 'strict policy, without the https-only part');
    assert(!r.headers['strict-transport-security'], 'no HSTS on http'); assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
    r = await raw(pn, '/account/'); csp = r.headers['content-security-policy']; assert(/connect-src 'self' https:\/\/[a-z0-9]+\.supabase\.co/.test(csp), 'account page may reach Supabase'); assert.strictEqual(r.headers['content-security-policy'].split("default-src").length, 2, 'one policy only');
    r = await raw(pn, '/examples/yearbook/'); assert(/style-src 'self' 'unsafe-inline'/.test(r.headers['content-security-policy']) && /frame-ancestors 'self'/.test(r.headers['content-security-policy']), 'whole websites get their own policy');
    r = await raw(pn, '/js/auth.js'); assert.strictEqual(r.headers['cache-control'], 'public, max-age=0, must-revalidate', 'scripts are revalidated, one value');
    r = await raw(pn, '/site.css'); assert.strictEqual(r.headers['cache-control'], 'public, max-age=0, must-revalidate');
    console.log('  ✓ headers per path match site/_headers (one policy, one cache rule)');

    // API like the Worker
    r = await raw(pn, '/api/config'); assert.strictEqual(r.status, 503); assert.deepStrictEqual(JSON.parse(r.body).missing, ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);
    r = await raw(pf, '/api/config'); assert.strictEqual(r.status, 200); assert.deepStrictEqual(JSON.parse(r.body), { supabaseUrl: 'https://abc.supabase.co', anonKey: 'public-key' });
    const post = (port, body) => fetch(base(port) + '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let p = await post(pn, '{}'); assert.strictEqual(p.status, 503); assert.deepStrictEqual((await p.json()).missing, ['LEAD_TO_EMAIL', 'LEAD_FROM_EMAIL', 'RESEND_API_KEY']);
    p = await post(pf, '{}'); assert.strictEqual(p.status, 422, 'settings present: an empty lead is refused by the rules, and no email is sent');
    p = await fetch(base(pf) + '/api/lead'); assert.strictEqual(p.status, 405);
    console.log('  ✓ /api/config and /api/lead answer like the live Worker, naming what is missing');
  } finally { none.close(); full.close(); }
  // watching: a burst of saves is one rebuild; hidden, editor and node_modules files are ignored; the live server never lets a browser keep a copy
  const wdir = fs.mkdtempSync(path.join(os.tmpdir(), 'edv-watch-'));
  fs.mkdirSync(path.join(wdir, 'sub')); fs.mkdirSync(path.join(wdir, 'node_modules'));
  const seen = [];
  const stop = watchSources({ dirs: [wdir], onChange: (n) => seen.push(n), wait: 80 });
  fs.writeFileSync(path.join(wdir, '.hidden'), '1'); fs.writeFileSync(path.join(wdir, 'node_modules', 'x.js'), '1'); fs.writeFileSync(path.join(wdir, 'a.js~'), '1'); fs.writeFileSync(path.join(wdir, '.a.js.swp'), '1');
  await new Promise((r) => setTimeout(r, 300)); assert.strictEqual(seen.length, 0, 'ignored files do not rebuild: ' + seen.join(','));
  fs.writeFileSync(path.join(wdir, 'a.js'), '1'); fs.writeFileSync(path.join(wdir, 'sub', 'b.css'), '1'); fs.writeFileSync(path.join(wdir, 'a.js'), '2');
  await new Promise((r) => setTimeout(r, 400)); assert.strictEqual(seen.length, 1, 'a burst of saves is one rebuild: ' + seen.length);
  stop(); fs.writeFileSync(path.join(wdir, 'c.js'), '1'); await new Promise((r) => setTimeout(r, 250)); assert.strictEqual(seen.length, 1, 'stopped means stopped');
  fs.rmSync(wdir, { recursive: true, force: true });
  const liveSrv = createServer({}, { live: true }); const pl = await listen(liveSrv);
  r = await raw(pl, '/site.css'); assert.strictEqual(r.headers['cache-control'], 'no-cache', 'the local server asks the browser to check every time'); liveSrv.close();
  console.log('  ✓ watching: one rebuild per burst, noise ignored, no stale copies in the browser');
  console.log('✅ Local site server tests passed!');
})().catch((e) => { console.error(e); process.exit(1); });
