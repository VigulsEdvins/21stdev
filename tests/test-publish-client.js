/** The builder's publishing client: files to a request, plain-words answers, the safe-link rule, and the calls it makes (with a stand-in fetch). */
const assert = require('assert');
const C = require('../scripts/builder/publish-client.js');
const P = require('../functions/lib/publish.js');

let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  await test('files: text stays text, bytes become base64 (also large ones), nothing is dropped', () => {
    const big = new Uint8Array(200000).map((_, i) => i % 251);
    const list = C.toFiles({ files: { 'index.html': '<p>é</p>', 'style.css': '' }, assets: { 'a.png': new Uint8Array([1, 2, 3]), 'big.webp': big, 'buf.ico': new Uint8Array([9, 8]).buffer, 'note.txt': 'plain' } });
    assert.strictEqual(list.length, 6);
    assert.deepStrictEqual(list[0], { path: 'index.html', content: '<p>é</p>' }); assert.deepStrictEqual(list[1], { path: 'style.css', content: '' });
    const png = list.find((x) => x.path === 'a.png'); assert.strictEqual(png.encoding, 'base64'); assert.deepStrictEqual([...Buffer.from(png.content, 'base64')], [1, 2, 3]);
    assert.deepStrictEqual([...Buffer.from(list.find((x) => x.path === 'big.webp').content, 'base64')], [...big]);
    assert.deepStrictEqual([...Buffer.from(list.find((x) => x.path === 'buf.ico').content, 'base64')], [9, 8]);
    assert.deepStrictEqual(list.find((x) => x.path === 'note.txt'), { path: 'note.txt', content: 'plain' });
    assert.deepStrictEqual(C.toFiles({}), []);
  });

  await test('files that only help a self-hosting download are left out; the allowed kinds match the server\'s list', () => {
    assert.deepStrictEqual([...C.ALLOWED].sort(), Object.keys(P.TYPES).sort(), 'the browser\'s list and the server\'s list must be the same');
    const list = C.toFiles({ files: { 'index.html': 'a', 'style.css': 'b', 'script.js': 'c', 'README.md': 'x', 'DEPLOY.md': 'x', 'DEPLOY.html': 'x', '_headers': 'x', 'robots.txt': 'r', '404.html': 'n', 'sitemap.xml': 's', '.well-known/security.txt': 'x', 'netlify.toml': 'x', 'noext': 'x' }, assets: { 'assets/logo.png': new Uint8Array([1]), 'assets/font.woff2': new Uint8Array([2]), 'assets/clip.mp4': new Uint8Array([3]), 'assets/.hidden.png': new Uint8Array([4]) } });
    assert.deepStrictEqual(list.map((f) => f.path).sort(), ['404.html', 'assets/font.woff2', 'assets/logo.png', 'index.html', 'robots.txt', 'script.js', 'sitemap.xml', 'style.css']);
  });

  await test('files left out that are not just helper files are named, so nothing breaks silently', () => {
    assert.deepStrictEqual(C.leftOut({ files: { 'index.html': 'a', 'README.md': 'x', 'DEPLOY.md': 'x', 'DEPLOY.html': 'x', '_headers': 'x', '.well-known/security.txt': 'x', 'robots.txt': 'r' }, assets: { 'assets/a.png': new Uint8Array([1]) } }), [], 'the usual download needs no warning');
    assert.deepStrictEqual(C.leftOut({ files: { 'index.html': 'a' }, assets: { 'assets/clip.mp4': new Uint8Array([1]), 'assets/song.mp3': new Uint8Array([2]), 'assets/a.png': new Uint8Array([3]), 'assets/old.ttf': new Uint8Array([4]) } }), ['assets/clip.mp4', 'assets/old.ttf', 'assets/song.mp3']);
    assert.deepStrictEqual(C.leftOut({}), []); assert.deepStrictEqual(C.leftOut(null), []);
    const sent = C.toFiles({ files: { 'index.html': 'a' }, assets: { 'assets/clip.mp4': new Uint8Array([1]) } }).map((f) => f.path); assert.deepStrictEqual(sent, ['index.html'], 'and the left-out file is still not sent');
  });

  await test('answers become plain words with a kind the screen can act on', () => {
    assert.strictEqual(C.explain(200, { ok: true }).kind, 'ok');
    assert.strictEqual(C.explain(401, {}).kind, 'signin');
    assert.strictEqual(C.explain(402, { errors: ['Paid extra.'] }).message, 'Paid extra.');
    assert.strictEqual(C.explain(402, {}).kind, 'payment');
    assert.strictEqual(C.explain(409, { reason: 'taken' }).kind, 'taken');
    assert.strictEqual(C.explain(409, { reason: 'race', errors: ['Try again.'] }).message, 'Try again.');
    assert(/cannot be put online yet: A script is loaded/.test(C.explain(400, { reason: 'files', errors: ['A script is loaded'] }).message));
    assert.strictEqual(C.explain(400, { reason: 'reserved', errors: ['Kept for edvlabs.'] }).kind, 'name');
    assert.strictEqual(C.explain(413, {}).kind, 'files'); assert.strictEqual(C.explain(429, {}).kind, 'busy');
    assert(/not switched on/.test(C.explain(503, {}).message));
    for (const s of [0, 500, 502, 404]) assert(/did not work/.test(C.explain(s, null).message), String(s));
    for (const j of [null, undefined, {}, { errors: [] }, { errors: [{}] }]) C.explain(400, j); // never throws on odd answers
  });

  await test('only plain https addresses become links', () => {
    assert.strictEqual(C.safeAddress('https://bakery-anna.edvlabs.com/'), 'https://bakery-anna.edvlabs.com/');
    assert.strictEqual(C.safeAddress('http://bakery-anna.localhost:4173/'), 'http://bakery-anna.localhost:4173/', 'the local demo address');
    for (const bad of ['http://bakery.evil.example/', 'http://bakery.localhost.evil.example/', 'http://bakery.localhost:99999999/', 'javascript:alert(1)', 'http://bakery.edvlabs.com/', 'https://bakery.edvlabs.com/x', 'https://ab.edvlabs.com/', 'https://a b.edvlabs.com/', '//x.edvlabs.com/', '', null, undefined, 'https://user@evil.example/', 'https://bakery.edvlabs.com/?a=1']) assert.strictEqual(C.safeAddress(bad), '', String(bad));
  });

  await test('calls: the right address, method, token and body; no token means no request; network failure is an answer', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => { seen.push({ url, init }); return { status: 200, json: async () => ({ ok: true }) }; };
    const c = C.createClient({ fetchImpl, token: async () => 'tok-123' });
    await c.checkName('Bakery Anna&x=1'); await c.mySites(); await c.publish('bakery-anna', { files: { 'index.html': 'x' } }, 'pid'); await c.unpublish('sid'); await c.rename('sid', 'new-name'); await c.checkout();
    assert.strictEqual(seen[0].url, '/api/site-name?name=Bakery%20Anna%26x%3D1'); assert.strictEqual(seen[0].init.method, 'GET'); assert.strictEqual(seen[0].init.body, undefined);
    assert.strictEqual(seen[1].url, '/api/my-sites');
    assert.strictEqual(seen[2].url, '/api/publish'); assert.strictEqual(seen[2].init.headers.Authorization, 'Bearer tok-123'); assert.strictEqual(seen[2].init.headers['Content-Type'], 'application/json');
    assert.deepStrictEqual(JSON.parse(seen[2].init.body), { name: 'bakery-anna', files: [{ path: 'index.html', content: 'x' }], projectId: 'pid' });
    assert.deepStrictEqual(JSON.parse(seen[3].init.body), { siteId: 'sid' });
    assert.strictEqual(seen[4].url, '/api/rename'); assert.deepStrictEqual(JSON.parse(seen[4].init.body), { siteId: 'sid', name: 'new-name' });
    assert.strictEqual(seen[5].url, '/api/checkout'); assert.strictEqual(seen[5].init.method, 'POST'); assert.strictEqual(seen[5].init.headers.Authorization, 'Bearer tok-123');
    const none = C.createClient({ fetchImpl, token: async () => null }); const before = seen.length;
    assert.strictEqual((await none.mySites()).status, 401); assert.strictEqual(seen.length, before, 'nothing is sent without a token');
    const down = C.createClient({ fetchImpl: async () => { throw new Error('offline'); }, token: async () => 'tok-123' });
    assert.strictEqual((await down.publish('a-b-c', { files: {} })).status, 0);
    const html = C.createClient({ fetchImpl: async () => ({ status: 502, json: async () => { throw new Error('not json'); } }), token: async () => 'tok-123' });
    assert.deepStrictEqual(await html.mySites(), { status: 502, json: null });
  });

  console.log(`✓ publish client: ${count} groups (files, answers, links, calls)`);
})().catch((e) => { console.error(e); process.exit(1); });
