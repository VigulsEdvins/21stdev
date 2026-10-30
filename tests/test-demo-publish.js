/** The try-it-out mode of the local server (scripts/demo-publish.js): create an account, publish through the real endpoints, open the site by its <name>.localhost address,
    and see that the main site, free names, paid places and taking offline all behave as they will online. */
const assert = require('assert');
const http = require('http');
const path = require('path');
const { createServer } = require('../scripts/dev-site.js');
const demoMod = require('../scripts/demo-publish.js');

const get = (port, host, p, headers) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: p, headers: Object.assign({ Host: host }, headers || {}) }, (res) => {
    let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
  }).on('error', reject);
});
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  const demo = {};
  const server = createServer({}, { dir: path.join(__dirname, '..', 'site'), demo });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = 'http://127.0.0.1:' + port;
  Object.assign(demo, await demoMod.start({ port }));
  const api = (p, init) => fetch(base + p, init);
  const signUp = async (email) => (await (await fetch(base + '/__auth/auth/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: demo.env.SUPABASE_ANON_KEY }, body: JSON.stringify({ email, password: 'Correct-Horse-1!' }) })).json()).access_token;
  const post = (p, token, body) => api(p, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
  const files = (title) => [{ path: 'index.html', content: '<!doctype html><title>' + title + '</title><p>Welcome to ' + title + '</p>' }, { path: 'about.html', content: '<p>About ' + title + '</p>' }];

  await test('a new account publishes through the real endpoints and the site opens on its own address', async () => {
    const anna = await signUp('anna@example.com'); assert(anna, 'the pretend service gave a session');
    assert.strictEqual((await post('/api/publish', 'x'.repeat(30), { name: 'bakery-anna', files: files('Anna') })).status, 401, 'a made-up token is refused');
    const r = await post('/api/publish', anna, { name: 'bakery-anna', files: files('Anna') }); const j = await r.json();
    assert.strictEqual(r.status, 200, JSON.stringify(j)); assert.strictEqual(j.address, 'http://bakery-anna.localhost:' + port + '/');
    const home = await get(port, 'bakery-anna.localhost:' + port, '/'); assert.strictEqual(home.status, 200); assert(/Welcome to Anna/.test(home.body)); assert.strictEqual(home.headers['x-content-type-options'], 'nosniff');
    assert(/About Anna/.test((await get(port, 'bakery-anna.localhost:' + port, '/about')).body));
    const mine = await (await api('/api/my-sites', { headers: { Authorization: 'Bearer ' + anna } })).json();
    assert.strictEqual(mine.sites.length, 1); assert.strictEqual(mine.freePlaces, 1, 'two places to start with, one used');
  });

  await test('the main site, free names and other people behave as they will online', async () => {
    const main = await get(port, 'localhost:' + port, '/'); assert.strictEqual(main.status, 200); assert(!/Welcome to Anna/.test(main.body), 'the main site is not a published site');
    const free = await get(port, 'nothing-here.localhost:' + port, '/'); assert.strictEqual(free.status, 404); assert(/Nothing here yet/.test(free.body));
    const ben = await signUp('ben@example.com');
    const taken = await post('/api/publish', ben, { name: 'bakery-anna', files: files('Ben') }); assert.strictEqual(taken.status, 409);
    assert.strictEqual((await post('/api/publish', ben, { name: 'www', files: files('Ben') })).status, 400);
    assert.strictEqual((await post('/api/publish', ben, { name: 'bens-shop', files: [{ path: 'index.html', content: '<a href="javascript:x">' }] })).status, 400);
    const sites = await (await api('/api/my-sites', { headers: { Authorization: 'Bearer ' + ben } })).json(); assert.strictEqual(sites.sites.length, 0, 'nobody sees another person\'s sites');
  });

  await test('two paid places, then the third site needs payment; taking offline removes the page, publishing again brings it back', async () => {
    const cy = await signUp('cy@example.com');
    assert.strictEqual((await post('/api/publish', cy, { name: 'cy-one', files: files('One') })).status, 200);
    const two = await post('/api/publish', cy, { name: 'cy-two', files: files('Two') }); assert.strictEqual(two.status, 200);
    const three = await post('/api/publish', cy, { name: 'cy-three', files: files('Three') }); assert.strictEqual(three.status, 402);
    const id = (await two.json()).siteId;
    assert.strictEqual((await post('/api/unpublish', cy, { siteId: id })).status, 200);
    const off = await get(port, 'cy-two.localhost:' + port, '/'); assert.strictEqual(off.status, 404); assert(/not available/.test(off.body));
    assert.strictEqual((await post('/api/publish', cy, { name: 'cy-two', files: files('Two again') })).status, 200);
    assert(/Welcome to Two again/.test((await get(port, 'cy-two.localhost:' + port, '/')).body));
  });

  await demo.close(); await new Promise((r) => server.close(r));
  console.log(`✓ demo publish: ${count} groups (account to live site, main site and free names, paid places and offline)`);
})().catch((e) => { console.error(e); process.exit(1); });
