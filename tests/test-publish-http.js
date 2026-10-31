/** The publishing endpoints in the main Worker: sign-in, methods, sizes, answers that never leak, the 503 that names missing settings, the timer. Uses the real routing with in-memory storage. */
const assert = require('assert');
const http = require('../functions/lib/lead-http.js');
const PH = require('../functions/lib/publish-http.js');
const P = require('../functions/lib/publish.js');
const Fake = require('./lib/fake-sites.js');

const FUTURE = '2027-11-01T00:00:00.000Z';
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';
const TOKENS = { 'token-for-user-one-aaaaaaaa': U1, 'token-for-user-two-bbbbbbbb': U2 };
const asset = async () => new Response('static');
const files = [{ path: 'index.html', content: '<!doctype html><title>t</title><p>Hello</p>' }];
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

function world() {
  const f = Fake.create();
  const publisher = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z' });
  const deps = { user: async (t) => (TOKENS[t] ? { id: TOKENS[t], email: 'x@example.com' } : null), publisher };
  const call = (path, init, headers) => http.route(new Request('https://edvlabs.test' + path, Object.assign({}, init, { headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) })), {}, asset, deps);
  const as = (n, extra) => Object.assign({ Authorization: 'Bearer ' + Object.keys(TOKENS)[n - 1] }, extra || {});
  const post = (path, body, n, extra) => call(path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }, as(n || 1, extra));
  return { f, deps, call, as, post };
}

(async () => {
  await test('sign-in is required for every endpoint; the right method too; other paths are untouched', async () => {
    const { call, as } = world();
    for (const [m, p] of [['GET', '/api/site-name?name=abc'], ['GET', '/api/my-sites'], ['POST', '/api/publish'], ['POST', '/api/unpublish']]) {
      assert.strictEqual((await call(p, { method: m, body: m === 'POST' ? '{}' : undefined })).status, 401, p + ' without a token');
      assert.strictEqual((await call(p, { method: m, body: m === 'POST' ? '{}' : undefined }, { Authorization: 'Bearer wrong-token-wrong-token' })).status, 401, p + ' with a wrong token');
      assert.strictEqual((await call(p, { method: m, body: m === 'POST' ? '{}' : undefined }, { Authorization: 'Basic abc' })).status, 401, p + ' with another kind of header');
    }
    assert.strictEqual((await call('/api/publish', { method: 'GET' }, as(1))).status, 405);
    assert.strictEqual((await call('/api/my-sites', { method: 'POST', body: '{}' }, as(1))).status, 405);
    assert.strictEqual((await call('/api/nothing', { method: 'GET' })).status, 404);
    assert.strictEqual(await (await call('/index.html', { method: 'GET' })).text(), 'static');
  });

  await test('publishing from the browser to the live address, then listing, name check and taking it offline', async () => {
    const { f, post, call, as } = world(); f.addEntitlement(U1, FUTURE);
    const name = await (await call('/api/site-name?name=Bakery-Anna', { method: 'GET' }, as(1))).json();
    assert(name.available && name.address === 'https://bakery-anna.edvlabs.com/');
    const r = await post('/api/publish', { name: 'bakery-anna', files }); const j = await r.json();
    assert.strictEqual(r.status, 200); assert(j.ok && j.address === 'https://bakery-anna.edvlabs.com/' && j.siteId);
    assert.strictEqual((await (await call('/api/site-name?name=bakery-anna', { method: 'GET' }, as(2))).json()).reason, 'taken');
    const mine = await (await call('/api/my-sites', { method: 'GET' }, as(1))).json(); assert.strictEqual(mine.sites.length, 1);
    assert.strictEqual((await (await call('/api/my-sites', { method: 'GET' }, as(2))).json()).sites.length, 0);
    assert.strictEqual((await post('/api/unpublish', { siteId: j.siteId }, 2)).status, 404, 'someone else cannot take it offline');
    assert.strictEqual((await post('/api/unpublish', { siteId: j.siteId }, 1)).status, 200);
    assert.strictEqual((await post('/api/unpublish', { siteId: 'not-a-uuid' }, 1)).status, 400);
  });

  await test('renaming through the endpoint: sign-in, owner only, plain refusals, the new address works and the old one is held', async () => {
    const { f, post, call, as } = world(); f.addEntitlement(U1, FUTURE); f.addEntitlement(U2, FUTURE);
    assert.strictEqual((await call('/api/rename', { method: 'POST', body: '{}' })).status, 401, 'no token');
    assert.strictEqual((await call('/api/rename', { method: 'GET' }, as(1))).status, 405);
    const made = await (await post('/api/publish', { name: 'bakery-anna', files }, 1)).json();
    await post('/api/publish', { name: 'ben-shop', files }, 2);
    assert.strictEqual((await post('/api/rename', { siteId: 'x', name: 'fresh-name' }, 1)).status, 400);
    assert.strictEqual((await post('/api/rename', { siteId: made.siteId }, 1)).status, 400);
    assert.strictEqual((await post('/api/rename', { siteId: made.siteId, name: 'fresh-name' }, 2)).status, 404, 'not the owner');
    assert.strictEqual((await post('/api/rename', { siteId: made.siteId, name: 'ben-shop' }, 1)).status, 409);
    assert.strictEqual((await post('/api/rename', { siteId: made.siteId, name: 'admin' }, 1)).status, 400);
    const r = await post('/api/rename', { siteId: made.siteId, name: 'anna-bakery' }, 1); const j = await r.json();
    assert.strictEqual(r.status, 200, JSON.stringify(j)); assert.strictEqual(j.address, 'https://anna-bakery.edvlabs.com/'); assert.strictEqual(j.oldName, 'bakery-anna');
    const mine = await (await call('/api/my-sites', { method: 'GET' }, as(1))).json(); assert.strictEqual(mine.sites[0].name, 'anna-bakery');
    assert.deepStrictEqual(mine.limits, { publishesPerHour: 10, renamesPer30Days: 2, siteMb: 10, canBuyMore: { publishesPerHour: true, renamesPer30Days: true, siteMb: true } }, 'the person is told the limits that apply to them'); assert.strictEqual(mine.sites[0].renamesLeft, 1);
    assert.strictEqual((await (await call('/api/site-name?name=bakery-anna', { method: 'GET' }, as(2))).json()).reason, 'taken', 'the old name is held');
  });

  await test('refusals come back as plain JSON with the right status', async () => {
    const { f, post } = world();
    assert.strictEqual((await post('/api/publish', { name: 'bakery-anna', files })).status, 402, 'no paid place');
    f.addEntitlement(U1, FUTURE);
    assert.strictEqual((await post('/api/publish', { name: 'www', files })).status, 400);
    assert.strictEqual((await post('/api/publish', { name: 'bakery-anna', files: [{ path: 'index.html', content: '<a href="javascript:x">' }] })).status, 400);
    assert.strictEqual((await post('/api/publish', { name: 'bakery-anna' })).status, 400);
    assert.strictEqual((await post('/api/publish', { files })).status, 400);
    assert.strictEqual((await post('/api/publish', 'not json')).status, 400);
    assert.strictEqual((await post('/api/publish', '[]')).status, 400);
    assert.strictEqual((await post('/api/publish', 'null')).status, 400);
    assert.strictEqual(f.sites.length, 0, 'nothing was created by any refusal');
    const wrongType = await http.route(new Request('https://edvlabs.test/api/publish', { method: 'POST', body: '{}', headers: { Authorization: 'Bearer token-for-user-one-aaaaaaaa', 'Content-Type': 'text/plain' } }), {}, asset, world().deps);
    assert.strictEqual(wrongType.status, 415);
    const big = await http.route(new Request('https://edvlabs.test/api/publish', { method: 'POST', body: '{}', headers: { Authorization: 'Bearer token-for-user-one-aaaaaaaa', 'Content-Type': 'application/json', 'Content-Length': String(40 * 1024 * 1024) } }), {}, asset, world().deps);
    assert.strictEqual(big.status, 413);
    const foreign = await post('/api/publish', { name: 'bakery-anna', files }, 1, { Origin: 'https://evil.example' });
    assert.strictEqual(foreign.status, 403, 'a request from another website is refused');
  });

  await test('answers carry the API security headers; an unexpected failure reveals nothing', async () => {
    const { f, deps, post, call, as } = world(); f.addEntitlement(U1, FUTURE);
    const r = await call('/api/my-sites', { method: 'GET' }, as(1));
    assert.strictEqual(r.headers.get('Cache-Control'), 'no-store'); assert.strictEqual(r.headers.get('X-Content-Type-Options'), 'nosniff'); assert(/default-src 'none'/.test(r.headers.get('Content-Security-Policy')));
    deps.publisher.publish = async () => { throw new Error('connection to db.internal.example:5432 refused, password=hunter2'); };
    const bad = await post('/api/publish', { name: 'bakery-anna', files }); const t = await bad.text();
    assert.strictEqual(bad.status, 500); assert(!/hunter2|internal|5432/.test(t), t);
  });

  await test('not set up: 503 names the missing settings and never their values; the timer does nothing', async () => {
    const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon-secret-value' };
    const r = await http.route(new Request('https://edvlabs.test/api/my-sites', { method: 'GET' }), env, asset);
    const j = await r.json(); assert.strictEqual(r.status, 503); assert.deepStrictEqual(j.missing, ['SUPABASE_SERVICE_ROLE_KEY', 'SITES', 'SITES_BUCKET', 'ASSETS']);
    assert(!JSON.stringify(j).includes('anon-secret-value'));
    assert.strictEqual(await PH.scheduled(env), null);
    const w = world(); w.f.addEntitlement(U1, FUTURE);
    assert.deepStrictEqual(await PH.scheduled({}, w.deps), { orphans: 0, lapsed: 0, holds: 0, blocked: 0, repaired: 0, purged: 0, strays: 0 });
  });

  await test('admin panel endpoint: sign-in, own site only, password never echoed, listed in my-sites without the hash', async () => {
    const { f, deps, post, call, as } = world(); f.addEntitlement(U1, FUTURE);
    const SA = require('../functions/lib/site-admin.js');
    deps.siteAdmin = SA.createSiteAdmin({ db: f.db, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z', rounds: 1000 });
    const j = await (await post('/api/publish', { name: 'bakery-anna', files })).json();
    const PW = 'Tulip-Garden-7-Moon!';
    assert.strictEqual((await call('/api/site-admin', { method: 'POST', body: '{}' })).status, 401);
    assert.strictEqual((await call('/api/site-admin', { method: 'GET' }, as(1))).status, 405);
    assert.strictEqual((await post('/api/site-admin', { action: 'enable', siteId: j.siteId, username: 'anna.baker', password: PW }, 2)).status, 404, 'not their site');
    assert.strictEqual((await post('/api/site-admin', { action: 'enable', siteId: 'nope', username: 'anna.baker', password: PW })).status, 400);
    assert.strictEqual((await post('/api/site-admin', { action: 'enable', siteId: j.siteId, username: 'anna.baker', password: 12345 })).status, 400);
    assert.strictEqual((await post('/api/site-admin', { action: 'fly', siteId: j.siteId })).status, 400);
    assert.strictEqual((await post('/api/site-admin', { action: 'enable', siteId: j.siteId, username: 'anna.baker', password: 'x'.repeat(20000) })).status, 413, 'a huge body is refused');
    const r = await post('/api/site-admin', { action: 'enable', siteId: j.siteId, username: 'anna.baker', password: PW });
    const text = await r.text(); assert.strictEqual(r.status, 200, text); assert(!text.includes(PW), 'the password is never sent back');
    const mine = await (await call('/api/my-sites', { method: 'GET' }, as(1))).json();
    assert(mine.sites[0].admin.on && /\/admin\d{10}$/.test(mine.sites[0].admin.address) && mine.sites[0].admin.username === 'anna.baker');
    assert(!JSON.stringify(mine).includes(f.admins[0].password_hash));
    assert.strictEqual((await (await call('/api/my-sites', { method: 'GET' }, as(2))).json()).sites.length, 0);
    assert.strictEqual((await post('/api/site-admin', { action: 'change', siteId: j.siteId, password: 'Quiet-River-9-Stone?' })).status, 200);
    assert.strictEqual((await post('/api/site-admin', { action: 'remove', siteId: j.siteId })).status, 200);
    assert.strictEqual((await (await call('/api/my-sites', { method: 'GET' }, as(1))).json()).sites[0].admin.on, false);
  });

  console.log(`✓ publish http: ${count} groups (sign-in, methods, flow, refusals, headers, not set up)`);
})().catch((e) => { console.error(e); process.exit(1); });
