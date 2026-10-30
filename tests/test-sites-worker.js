/** Serving published sites (plan 2026-10-30-publish-subdomain.md, step 4): host names, pages, redirects, missing files, unavailable sites, headers, odd requests. Uses the real Worker code with in-memory R2 and KV. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const P = require('../functions/lib/publish.js');
const S = require('../functions/lib/sites-serve.js');
const Fake = require('./lib/fake-sites.js');

const FUTURE = '2027-11-01T00:00:00.000Z';
const page = (t) => ({ path: 'index.html', content: '<!doctype html><title>' + t + '</title><p>' + t + '</p>' });
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

async function world(files) {
  const f = Fake.create();
  const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z' });
  f.addEntitlement('u1', FUTURE);
  const r = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: files || [page('Anna'), { path: 'about.html', content: '<p>About Anna</p>' }, { path: 'blog/index.html', content: '<p>Blog</p>' }, { path: 'blog/first.html', content: '<p>First</p>' }, { path: 'css/site.css', content: 'body{margin:0}' }, { path: 'pic.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 9]).toString('base64'), encoding: 'base64' }] });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  const server = S.createSiteServer({ bucket: f.bucket, kv: f.kv });
  const get = (url, init) => server.handle(new Request(url, init));
  return { f, pub, server, get, id: r.json.siteId };
}

(async () => {
  await test('pages: home, page names without .html, folders, assets with the right type', async () => {
    const { get } = await world();
    const home = await get('https://bakery-anna.edvlabs.com/');
    assert.strictEqual(home.status, 200); assert(/Anna/.test(await home.text())); assert(/^text\/html/.test(home.headers.get('Content-Type')));
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/index.html')).status, 200);
    assert(/About Anna/.test(await (await get('https://bakery-anna.edvlabs.com/about')).text()));
    assert(/About Anna/.test(await (await get('https://bakery-anna.edvlabs.com/about.html')).text()));
    assert(/Blog/.test(await (await get('https://bakery-anna.edvlabs.com/blog')).text()), 'a folder with an index page answers without a slash');
    assert(/Blog/.test(await (await get('https://bakery-anna.edvlabs.com/blog/')).text()));
    assert(/First/.test(await (await get('https://bakery-anna.edvlabs.com/blog/first')).text()));
    const css = await get('https://bakery-anna.edvlabs.com/css/site.css'); assert.strictEqual(css.headers.get('Content-Type'), 'text/css; charset=utf-8');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/pic.png')).headers.get('Content-Type'), 'image/png');
    assert.strictEqual((await get('https://BAKERY-ANNA.edvlabs.com/')).status, 200, 'host names are not case sensitive');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/about?x=1#y')).status, 200);
  });

  await test('every answer carries the security headers; HEAD has no body; unsupported methods are refused', async () => {
    const { get } = await world();
    for (const url of ['https://bakery-anna.edvlabs.com/', 'https://bakery-anna.edvlabs.com/missing', 'https://nothing-here.edvlabs.com/', 'https://www.edvlabs.com/']) {
      const r = await get(url);
      assert.strictEqual(r.headers.get('X-Content-Type-Options'), 'nosniff', url); assert(/frame-ancestors 'none'/.test(r.headers.get('Content-Security-Policy')), url);
      assert(r.headers.get('Strict-Transport-Security') && r.headers.get('Referrer-Policy') && r.headers.get('Permissions-Policy'), url);
    }
    const head = await get('https://bakery-anna.edvlabs.com/', { method: 'HEAD' });
    assert.strictEqual(head.status, 200); assert.strictEqual(await head.text(), '');
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) { const r = await get('https://bakery-anna.edvlabs.com/', { method: m, body: m === 'DELETE' ? undefined : 'x' }); assert.strictEqual(r.status, 405, m); assert.strictEqual(r.headers.get('Allow'), 'GET, HEAD'); }
  });

  await test('scripts may only come from the site\'s own files, whatever the page says; the page\'s own tag adds the finer limits', async () => {
    const { get } = await world();
    const csp = (await get('https://bakery-anna.edvlabs.com/')).headers.get('Content-Security-Policy');
    assert(/script-src 'self'/.test(csp) && !/unsafe-inline|unsafe-eval/.test(csp), csp);
    assert(!/default-src|img-src|connect-src|style-src/.test(csp), 'the header limits scripts and framing only, so it never fights the finer limits inside the page: ' + csp);
    for (const url of ['https://bakery-anna.edvlabs.com/missing', 'https://nothing-here.edvlabs.com/']) assert(/script-src 'self'/.test((await get(url)).headers.get('Content-Security-Policy')), url);
  });

  await test('addresses that are not sites: free names, other hosts, deep names, reserved and odd labels', async () => {
    const { get } = await world();
    const free = await get('https://nothing-here.edvlabs.com/'); assert.strictEqual(free.status, 404); assert(/Nothing here yet/.test(await free.text()));
    for (const u of ['https://edvlabs.com/', 'https://a.b.edvlabs.com/', 'https://edvlabs.example/', 'https://xn--bcher-kva.edvlabs.com/', 'https://ab.edvlabs.com/', 'https://-bad-.edvlabs.com/', 'https://bakery-anna.edvlabs.com.evil.example/']) {
      const r = await get(u); assert.strictEqual(r.status, 404, u); assert(!/Anna/.test(await r.text()), u);
    }
  });

  await test('missing pages: the site\'s own 404.html if it has one, else a plain page; odd paths never reach other sites\' files', async () => {
    const own = await world([page('Anna'), { path: '404.html', content: '<p>Anna says: lost</p>' }]);
    const r = await own.get('https://bakery-anna.edvlabs.com/nope'); assert.strictEqual(r.status, 404); assert(/Anna says: lost/.test(await r.text()));
    const plain = await world();
    const p = await plain.get('https://bakery-anna.edvlabs.com/nope'); assert.strictEqual(p.status, 404); assert(/Page not found/.test(await p.text()));
    /* The URL parser already flattens “/../” before our code sees it, so the path function is also tested on raw paths. */
    for (const raw of ['/../index.html', '/a/../b', '/./a', '/a/./b', '/%2e%2e/x', '/a%00b', '/a\\b', '//', '/blog//first', '/%E0%A4%A', 'relative']) assert.strictEqual(S.candidates(raw), null, 'refused: ' + raw);
    assert.deepStrictEqual(S.candidates('/'), ['index.html']); assert.deepStrictEqual(S.candidates('/a'), ['a.html', 'a/index.html']); assert.deepStrictEqual(S.candidates('/a/b.css'), ['a/b.css']); assert.deepStrictEqual(S.candidates('/a/'), ['a/index.html']);
    for (const u of ['/%00', '/a%5Cb', '//', '/.hidden', '/%E0%A4%A', '/blog//first']) {
      const r2 = await plain.get('https://bakery-anna.edvlabs.com' + u); assert([404].includes(r2.status), u + ' → ' + r2.status);
    }
    // a second site's files are never reachable through the first site's name
    const f = plain.f, pub = plain.pub; f.addEntitlement('u1', FUTURE);
    await pub.publish({ userId: 'u1', name: 'other-shop', files: [{ path: 'index.html', content: '<p>SECRET OTHER</p>' }, { path: 'private.html', content: '<p>SECRET OTHER PRIVATE</p>' }] });
    const leak = await plain.get('https://bakery-anna.edvlabs.com/private'); assert.strictEqual(leak.status, 404);
    const own2 = await plain.get('https://other-shop.edvlabs.com/private'); assert(/SECRET OTHER PRIVATE/.test(await own2.text()));
  });

  await test('unpublished and blocked sites show a plain "not available" page and none of their files', async () => {
    const { f, pub, get, id } = await world();
    await pub.unpublish({ userId: 'u1', siteId: id });
    const off = await get('https://bakery-anna.edvlabs.com/'); assert.strictEqual(off.status, 404); const t = await off.text(); assert(/not available/.test(t) && !/Anna/.test(t));
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/about')).status, 404);
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [page('Anna again')] });
    assert(/Anna again/.test(await (await get('https://bakery-anna.edvlabs.com/')).text()), 'publishing again brings it back');
    f.kvStore.set('site:bakery-anna', JSON.stringify({ id, version: 2, status: 'blocked' }));
    assert(/not available/.test(await (await get('https://bakery-anna.edvlabs.com/')).text()));
    for (const junk of ['not json', '{}', '{"id":"x","version":"1","status":"live"}', 'null', '[]']) { f.kvStore.set('site:bakery-anna', junk); const r = await get('https://bakery-anna.edvlabs.com/'); assert([404].includes(r.status), junk); }
  });

  await test('a new version goes live for visitors at once; old folders are not served', async () => {
    const { pub, get } = await world();
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [page('Version two')] });
    assert(/Version two/.test(await (await get('https://bakery-anna.edvlabs.com/')).text()));
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/about')).status, 404, 'a page that is no longer in the site is gone');
  });

  await test('renamed sites redirect with 301, keeping path and query; a bad target is ignored', async () => {
    const { f, get } = await world();
    f.kvStore.set('site:old-name', JSON.stringify({ redirect: 'bakery-anna' }));
    const r = await get('https://old-name.edvlabs.com/blog/first?utm=1');
    assert.strictEqual(r.status, 301); assert.strictEqual(r.headers.get('Location'), 'https://bakery-anna.edvlabs.com/blog/first?utm=1');
    f.kvStore.set('site:evil-name', JSON.stringify({ redirect: 'evil.example/x' }));
    assert.strictEqual((await get('https://evil-name.edvlabs.com/')).status, 404);
  });

  await test('caching: ETag answers 304 when unchanged', async () => {
    const { get } = await world();
    const first = await get('https://bakery-anna.edvlabs.com/'); const tag = first.headers.get('ETag'); assert(tag);
    const again = await get('https://bakery-anna.edvlabs.com/', { headers: { 'If-None-Match': tag } });
    assert.strictEqual(again.status, 304);
    assert.strictEqual(first.headers.get('Cache-Control'), 'public, max-age=300');
  });

  await test('the Worker file and its config are wired as planned', () => {
    const w = fs.readFileSync(path.join(__dirname, '..', 'src', 'sites-worker.js'), 'utf8');
    assert(/SITES_BUCKET/.test(w) && /env\.SITES\b/.test(w) && !/SERVICE|SECRET|KEY/.test(w), 'reads only: no secrets in the serving Worker');
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'wrangler.sites.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const j = JSON.parse(cfg);
    assert.strictEqual(j.routes[0].pattern, '*.edvlabs.com/*'); assert.strictEqual(j.main, 'src/sites-worker.js');
    assert(j.kv_namespaces[0].binding === 'SITES' && j.r2_buckets[0].binding === 'SITES_BUCKET');
    assert(!('assets' in j), 'the sites Worker serves no static files of its own');
  });

  console.log(`✓ sites worker: ${count} groups (pages, headers, free addresses, 404s, odd paths, unavailable sites, versions, redirects, caching, config)`);
})().catch((e) => { console.error(e); process.exit(1); });
