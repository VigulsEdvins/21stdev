/** A customer's own domain (plan 2026-10-31-custom-domain.md): host name rules, adding / confirming / removing a domain, who may do it, and what visitors get on the
 *  domain and on the old edvlabs address. Uses the real code with in-memory storage and a pretend Cloudflare; nothing leaves the computer. */
const assert = require('assert');
const D = require('../functions/lib/site-domain.js');
const P = require('../functions/lib/publish.js');
const S = require('../functions/lib/sites-serve.js');
const http = require('../functions/lib/lead-http.js');
const PH = require('../functions/lib/publish-http.js');
const Fake = require('./lib/fake-sites.js');
const FakeCf = require('./lib/fake-cloudflare.js');

const FUTURE = '2027-11-01T00:00:00.000Z';
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';
let count = 0, clock = '2026-11-01T10:00:00.000Z';
const test = async (name, fn) => { clock = '2026-11-01T10:00:00.000Z'; await fn(); count++; };

async function world() {
  const f = Fake.create(), cf = FakeCf.create();
  const now = () => clock;
  const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now });
  f.addEntitlement(U1, FUTURE); f.addEntitlement(U2, FUTURE);
  const a = await pub.publish({ userId: U1, name: 'bakery-anna', files: [{ path: 'index.html', content: '<!doctype html><title>Anna</title><p>Anna home</p>' }, { path: 'about.html', content: '<p>About Anna</p>' }] });
  const b = await pub.publish({ userId: U2, name: 'garage-ben', files: [{ path: 'index.html', content: '<p>Ben home</p>' }] });
  assert.strictEqual(a.status, 200); assert.strictEqual(b.status, 200);
  const dom = D.createSiteDomains({ db: f.db, kv: f.kv, cf, now });
  const server = S.createSiteServer({ bucket: f.bucket, kv: f.kv });
  const get = (url, init) => server.handle(new Request(url, init));
  const activate = async (siteId, host, user) => { cf.setState(host, { status: 'active', ssl: { status: 'active' } }); return dom.status({ userId: user || U1, siteId }); };
  return { f, cf, dom, pub, get, server, A: a.json.siteId, B: b.json.siteId, activate };
}

(async () => {
  await test('host names: lower-cased, punycode, only sub-names, nothing odd, never our own domain', async () => {
    const ok = (t) => D.checkHostname(t, 'edvlabs.com');
    assert.strictEqual(ok('  WWW.Bakery-Anna.com. ').host, 'www.bakery-anna.com');
    assert.strictEqual(ok('www.bäckerei.de').host, 'www.xn--bckerei-5wa.de');
    assert.strictEqual(ok('shop.example.co.uk').host, 'shop.example.co.uk');
    for (const bare of ['bakery.com', 'bakery.co.uk', 'a.io']) assert(ok(bare).bare, bare + ' is a bare domain');
    for (const bad of ['', '   ', 'https://www.a.com', 'www.a.com/path', 'www.a.com:8080', '*.a.com', 'a b.com', 'a_b.example.com', 'user@www.a.com', 'www.a.com?x=1', 'localhost', 'x.localhost', 'a.local', '1.2.3.4', '[::1]', 'www..a.com', '-a.example.com', 'a-.example.com', 'www.a.123', 'www.' + 'a'.repeat(64) + '.com', ('a.'.repeat(130)) + 'com', null, undefined, 42, {}]) {
      assert(ok(bad).error, JSON.stringify(bad) + ' should be refused');
    }
    for (const own of ['edvlabs.com', 'www.edvlabs.com', 'sites.edvlabs.com', 'a.b.edvlabs.com', 'WWW.EDVLABS.COM']) assert(ok(own).error && !ok(own).bare, own + ' is ours');
    assert(!ok('www.notedvlabs.com').error, 'a different domain that ends the same way is fine');
  });

  await test('adding: pending first, the site keeps working on its edvlabs address, the customer is told which record to add', async () => {
    const { dom, cf, get, A } = await world();
    const r = await dom.add({ userId: U1, siteId: A, hostname: 'WWW.Bakery-Anna.com' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert.strictEqual(r.json.hostname, 'www.bakery-anna.com'); assert.strictEqual(r.json.status, 'pending');
    assert.deepStrictEqual(r.json.records, [{ type: 'CNAME', name: 'www.bakery-anna.com', value: 'sites.edvlabs.com' }]);
    assert.strictEqual(r.json.optionalRecords[0].type, 'TXT');
    assert(cf.has('www.bakery-anna.com'));
    const text = JSON.stringify(r.json); assert(!/cf-host-/.test(text), 'Cloudflare ids never reach the customer');
    const live = await get('https://bakery-anna.edvlabs.com/'); assert.strictEqual(live.status, 200, 'no redirect before Cloudflare confirms');
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 404, 'the domain shows nothing yet');
    const again = await dom.status({ userId: U1, siteId: A }); assert.strictEqual(again.json.status, 'pending');
    assert(/CNAME/.test(again.json.error), 'Cloudflare\'s reason is passed on');
  });

  await test('confirmed: the domain serves the site, the edvlabs address redirects (301) with path and query, other methods and hosts are refused', async () => {
    const { dom, get, A, activate, f } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' });
    const s = await activate(A, 'www.bakery-anna.com'); assert.strictEqual(s.json.status, 'active');
    const home = await get('https://www.bakery-anna.com/'); assert.strictEqual(home.status, 200); assert(/Anna home/.test(await home.text()));
    assert(/About Anna/.test(await (await get('https://www.bakery-anna.com/about')).text()));
    assert.strictEqual((await get('https://WWW.BAKERY-ANNA.COM./')).status, 200, 'case and a trailing dot do not matter');
    const old = await get('https://bakery-anna.edvlabs.com/about?x=1');
    assert.strictEqual(old.status, 301); assert.strictEqual(old.headers.get('Location'), 'https://www.bakery-anna.com/about?x=1');
    assert.strictEqual(old.headers.get('Cache-Control'), 'public, max-age=300', 'short, because removing the domain must take effect soon');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/', { method: 'HEAD' })).status, 301);
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/', { method: 'POST', body: 'x' })).status, 405, 'the old address answers no posts');
    assert.strictEqual((await get('https://www.bakery-anna.com/', { method: 'DELETE' })).status, 405);
    assert.strictEqual((await get('https://www.someone-else.com/')).status, 404, 'a host nobody attached shows no site');
    assert.strictEqual((await get('https://edvlabs.com/')).status, 404);
    // the other customer's site is unaffected
    assert.strictEqual((await get('https://garage-ben.edvlabs.com/')).status, 200);
    // the record is in our table too
    assert.strictEqual(f.domains.length, 1); assert.strictEqual(f.domains[0].status, 'active');
  });

  await test('a host entry alone is not enough: it must be the one the site names (a stale or forged entry shows nothing)', async () => {
    const { dom, get, A, B, activate, f } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' }); await activate(A, 'www.bakery-anna.com');
    await f.kv.put('host:www.evil.com', JSON.stringify({ name: 'garage-ben' })); // a host entry for Ben's site that Ben's site does not name
    assert.strictEqual((await get('https://www.evil.com/')).status, 404);
    await f.kv.put('host:www.evil.com', JSON.stringify({ name: 'bakery-anna' })); // and one pointing at Anna's site, which names another host
    assert.strictEqual((await get('https://www.evil.com/')).status, 404);
    await f.kv.put('host:www.evil.com', '{not json'); assert.strictEqual((await get('https://www.evil.com/')).status, 404);
    await f.kv.put('host:www.evil.com', JSON.stringify({ name: '../etc' })); assert.strictEqual((await get('https://www.evil.com/')).status, 404);
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 200);
    void B;
  });

  await test('Cloudflare says the DNS record is gone: the domain stops, and the edvlabs address serves the site again (no dead redirect)', async () => {
    const { dom, cf, get, A, activate } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' }); await activate(A, 'www.bakery-anna.com');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 301);
    cf.setState('www.bakery-anna.com', { status: 'moved', ssl: { status: 'active' }, errors: ['custom hostname does not CNAME to this zone.'] });
    const s = await dom.status({ userId: U1, siteId: A }); assert.strictEqual(s.json.status, 'pending');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 200);
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 404);
    await activate(A, 'www.bakery-anna.com'); assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 301, 'and back once it works again');
    cf.failGet = true; // Cloudflare not answering: nothing changes
    assert.strictEqual((await dom.status({ userId: U1, siteId: A })).json.status, 'active'); assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 200);
  });

  await test('a failed check (timed out) is reported in plain words and does not serve', async () => {
    const { dom, cf, get, A } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' });
    cf.setState('www.bakery-anna.com', { ssl: { status: 'validation_timed_out' } });
    const s = await dom.status({ userId: U1, siteId: A }); assert.strictEqual(s.json.status, 'failed'); assert(/Remove it and add it again/.test(s.json.error));
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 404); assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 200);
  });

  await test('removing: lookups and the Cloudflare entry go, the edvlabs address works again, the host name is free for anyone', async () => {
    const { dom, cf, get, A, B, activate, f } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' }); await activate(A, 'www.bakery-anna.com');
    const r = await dom.remove({ userId: U1, siteId: A }); assert.strictEqual(r.status, 200);
    assert(!cf.has('www.bakery-anna.com')); assert.strictEqual(f.domains.length, 0);
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 404); assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 200);
    assert.strictEqual((await dom.status({ userId: U1, siteId: A })).json.hostname, null);
    assert.strictEqual((await dom.add({ userId: U2, siteId: B, hostname: 'www.bakery-anna.com' })).status, 200, 'another customer may take it now');
    assert.strictEqual((await dom.remove({ userId: U1, siteId: A })).status, 200, 'removing nothing is fine');
  });

  await test('if Cloudflare cannot delete, the row stays so the removal can be repeated', async () => {
    const { dom, cf, A, f } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' });
    cf.failRemove = true; await assert.rejects(dom.remove({ userId: U1, siteId: A }));
    assert.strictEqual(f.domains.length, 1);
    cf.failRemove = false; assert.strictEqual((await dom.remove({ userId: U1, siteId: A })).status, 200); assert.strictEqual(f.domains.length, 0);
  });

  await test('who may do what: only the owner; the site must be live; one domain per site; a host name belongs to one site', async () => {
    const { dom, pub, A, B, cf, f } = await world();
    for (const bad of [{ userId: U2, siteId: A }, { userId: U1, siteId: B }, { userId: U1, siteId: '00000000-0000-4000-8000-00000000ffff' }]) {
      assert.strictEqual((await dom.add(Object.assign({ hostname: 'www.x-example.com' }, bad))).status, 404);
      assert.strictEqual((await dom.status(bad)).status, 404); assert.strictEqual((await dom.remove(bad)).status, 404);
    }
    assert.strictEqual(cf.calls.length, 0, 'a refused request never reaches Cloudflare');
    assert.strictEqual((await dom.add({ userId: U1, siteId: A, hostname: 'bakery.com' })).json.reason, 'bare');
    assert.strictEqual((await dom.add({ userId: U1, siteId: A, hostname: 'www.edvlabs.com' })).status, 400);
    assert.strictEqual((await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' })).status, 200);
    const second = await dom.add({ userId: U1, siteId: A, hostname: 'shop.bakery-anna.com' }); assert.strictEqual(second.status, 409); assert.strictEqual(second.json.reason, 'has-domain');
    const clash = await dom.add({ userId: U2, siteId: B, hostname: 'www.bakery-anna.com' }); assert.strictEqual(clash.status, 409); assert.strictEqual(clash.json.reason, 'taken');
    // an offline site cannot get a domain
    await pub.unpublish({ userId: U2, siteId: B });
    assert.strictEqual((await dom.add({ userId: U2, siteId: B, hostname: 'www.ben-garage.com' })).json.reason, 'offline');
    f.sites.find((s) => s.id === B).status = 'blocked';
    assert.strictEqual((await dom.add({ userId: U2, siteId: B, hostname: 'www.ben-garage.com' })).json.reason, 'blocked');
  });

  await test('an unfinished set-up holds a host name for two hours; then its real owner may take it. A confirmed domain is never taken.', async () => {
    const { dom, cf, A, B, f, activate } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.shared-name.com' });
    assert.strictEqual((await dom.add({ userId: U2, siteId: B, hostname: 'www.shared-name.com' })).status, 409);
    clock = '2026-11-01T12:30:00.000Z';
    f.domains[0].updated_at = '2026-11-01T10:00:00.000Z';
    const take = await dom.add({ userId: U2, siteId: B, hostname: 'www.shared-name.com' }); assert.strictEqual(take.status, 200, JSON.stringify(take.json));
    assert.strictEqual(f.domains.length, 1); assert.strictEqual(f.domains[0].site_id, B);
    assert.strictEqual(cf.calls.filter((c) => c.startsWith('remove')).length, 1);
    await activate(B, 'www.shared-name.com', U2);
    clock = '2026-12-31T12:30:00.000Z';
    assert.strictEqual((await dom.add({ userId: U1, siteId: A, hostname: 'www.shared-name.com' })).status, 409);
  });

  await test('Cloudflare problems: a refused add leaves nothing behind; too many tries in an hour are refused', async () => {
    const { dom, cf, A, f } = await world();
    cf.failNext = Object.assign(new Error('boom'), { status: 500 });
    await assert.rejects(dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' }));
    assert.strictEqual(f.domains.length, 0, 'the row is taken back');
    cf.failNext = Object.assign(new Error('Duplicate'), { status: 409, cfCode: 1406 });
    assert.strictEqual((await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' })).status, 409); assert.strictEqual(f.domains.length, 0);
    for (let i = 0; i < D.ADDS_PER_HOUR; i++) await dom.add({ userId: U1, siteId: A, hostname: 'bad' }); // refused for the name, not counted
    for (let i = 0; i < D.ADDS_PER_HOUR; i++) { const r = await dom.add({ userId: U1, siteId: A, hostname: 'www.try' + i + '.com' }); if (i === 0) assert.strictEqual(r.status, 200); await dom.remove({ userId: U1, siteId: A }); }
    const over = await dom.add({ userId: U1, siteId: A, hostname: 'www.one-more.com' }); assert.strictEqual(over.status, 429);
  });

  await test('unpublished or blocked sites do not show on their domain; rename keeps the domain working; the old name still redirects to the domain', async () => {
    const { dom, pub, get, A, activate } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' }); await activate(A, 'www.bakery-anna.com');
    const r = await pub.rename({ userId: U1, siteId: A, newName: 'anna-bakes' }); assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert(/Anna home/.test(await (await get('https://www.bakery-anna.com/')).text()), 'the domain follows the new name');
    assert.strictEqual((await get('https://anna-bakes.edvlabs.com/x')).headers.get('Location'), 'https://www.bakery-anna.com/x');
    assert.strictEqual((await get('https://bakery-anna.edvlabs.com/x')).status, 301, 'the old name redirects too');
    await pub.unpublish({ userId: U1, siteId: A });
    const off = await get('https://www.bakery-anna.com/'); assert.strictEqual(off.status, 404); assert(/not available/i.test(await off.text()));
  });

  await test('the hourly clean-up removes domains whose site or account is gone (the row outlives the site, as in the migration)', async () => {
    const { dom, cf, A, f, get } = await world();
    await dom.add({ userId: U1, siteId: A, hostname: 'www.bakery-anna.com' });
    assert.deepStrictEqual(await dom.sweep(), { removed: 0, failed: 0 }, 'a live site\'s domain is left alone');
    f.domains[0].site_id = null; f.domains[0].user_id = null; // what "on delete set null" does
    cf.failRemove = true; assert.deepStrictEqual(await dom.sweep(), { removed: 0, failed: 1 }); assert.strictEqual(f.domains.length, 1);
    cf.failRemove = false; assert.deepStrictEqual(await dom.sweep(), { removed: 1, failed: 0 });
    assert.strictEqual(f.domains.length, 0); assert(!cf.has('www.bakery-anna.com'));
    assert.strictEqual((await get('https://www.bakery-anna.com/')).status, 404);
  });

  await test('the account list: the domain is shown once confirmed; the pending one shows only its state', async () => {
    const f = Fake.create(), cf = FakeCf.create(), now = () => clock;
    const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now }); f.addEntitlement(U1, FUTURE);
    const a = await pub.publish({ userId: U1, name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>Anna</p>' }] });
    const siteDomains = D.createSiteDomains({ db: f.db, kv: f.kv, cf, now });
    const deps = { user: async (t) => (t === 'token-for-user-one-aaaaaaaa' ? { id: U1, email: 'x@example.com' } : null), publisher: pub, siteDomains };
    const asset = async () => new Response('static');
    const call = (path, init) => http.route(new Request('https://edvlabs.test' + path, Object.assign({}, init, { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-for-user-one-aaaaaaaa' } })), {}, asset, deps);
    const list = async () => (await (await call('/api/my-sites', { method: 'GET' })).json()).sites[0];
    assert.strictEqual((await list()).domain, null);
    const added = await call('/api/site-domain', { method: 'POST', body: JSON.stringify({ action: 'add', siteId: a.json.siteId, hostname: 'www.bakery-anna.com' }) });
    assert.strictEqual(added.status, 200);
    let s = await list(); assert.strictEqual(s.domain.status, 'pending'); assert.strictEqual(s.address, 'https://bakery-anna.edvlabs.com/');
    cf.setState('www.bakery-anna.com', { status: 'active', ssl: { status: 'active' } });
    const st = await (await call('/api/site-domain?siteId=' + a.json.siteId, { method: 'GET' })).json(); assert.strictEqual(st.status, 'active');
    s = await list(); assert.strictEqual(s.address, 'https://www.bakery-anna.com/'); assert.strictEqual(s.edvlabsAddress, 'https://bakery-anna.edvlabs.com/');
    // request shapes
    assert.strictEqual((await call('/api/site-domain', { method: 'POST', body: '{"action":"add","siteId":"nope","hostname":"www.a-b.com"}' })).status, 400);
    assert.strictEqual((await call('/api/site-domain', { method: 'POST', body: JSON.stringify({ action: 'explode', siteId: a.json.siteId }) })).status, 400);
    assert.strictEqual((await call('/api/site-domain?siteId=nope', { method: 'GET' })).status, 400);
    assert.strictEqual((await call('/api/site-domain', { method: 'DELETE' })).status, 404);
    const out = await call('/api/site-domain', { method: 'POST', body: JSON.stringify({ action: 'remove', siteId: a.json.siteId }) }); assert.strictEqual(out.status, 200);
    assert.strictEqual((await list()).domain, null);
    // not set up: names only, nothing else changes
    const bare = Object.assign({}, deps, { siteDomains: undefined });
    const r503 = await http.route(new Request('https://edvlabs.test/api/site-domain?siteId=' + a.json.siteId, { headers: { Authorization: 'Bearer token-for-user-one-aaaaaaaa' } }), {}, asset, bare);
    assert.strictEqual(r503.status, 503);
    assert.strictEqual((await http.route(new Request('https://edvlabs.test/api/my-sites', { headers: { Authorization: 'Bearer token-for-user-one-aaaaaaaa' } }), {}, asset, bare)).status, 200);
    void PH;
  });

  await test('the Cloudflare client sends what the documentation says and nothing more', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ url, method: init.method, auth: init.headers.Authorization, body: init.body && JSON.parse(init.body) });
      if (init.method === 'DELETE') return new Response(JSON.stringify({ success: true, result: { id: 'x' } }));
      return new Response(JSON.stringify({ success: true, result: { id: 'abc-123-def', hostname: 'www.a-b.com', status: 'pending', ssl: { status: 'pending_validation', validation_records: [{ txt_value: 'secret-ish' }] }, verification_errors: ['custom hostname does not CNAME to this zone.'], ownership_verification: { type: 'txt', name: '_cf-custom-hostname.www.a-b.com', value: 'v' }, ownership_verification_http: { http_body: 'b' } } }));
    };
    const cf = D.createCloudflare({ token: 'tok', zoneId: 'zone/1', fetchImpl });
    const h = await cf.create('www.a-b.com');
    assert.strictEqual(seen[0].url, 'https://api.cloudflare.com/client/v4/zones/zone%2F1/custom_hostnames'); assert.strictEqual(seen[0].auth, 'Bearer tok');
    assert.deepStrictEqual(seen[0].body, { hostname: 'www.a-b.com', ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2', http2: 'on' } } });
    assert.deepStrictEqual(Object.keys(h).sort(), ['errors', 'hostname', 'id', 'ownership', 'ssl', 'status'], 'only the fields we use are passed on');
    await cf.get('abc/1'); assert(seen[1].url.endsWith('/custom_hostnames/abc%2F1'));
    await cf.remove('abc'); assert.strictEqual(seen[2].method, 'DELETE');
    const missing = D.createCloudflare({ token: 't', zoneId: 'z', fetchImpl: async () => new Response(JSON.stringify({ success: false, errors: [{ code: 1551, message: 'not found' }] }), { status: 404 }) });
    assert.strictEqual(await missing.get('x'), null); await missing.remove('x');
    const down = D.createCloudflare({ token: 't', zoneId: 'z', fetchImpl: async () => new Response('<html>', { status: 502 }) });
    await assert.rejects(down.get('x')); await assert.rejects(down.create('www.a-b.com'));
    const dup = D.createCloudflare({ token: 't', zoneId: 'z', fetchImpl: async () => new Response(JSON.stringify({ success: false, errors: [{ code: 1406, message: 'Duplicate custom hostname found.' }] }), { status: 409 }) });
    await assert.rejects(dup.create('www.a-b.com'), (e) => e.cfCode === 1406 && e.status === 409);
  });

  console.log('✓ site domain: ' + count + ' groups (host names, add, confirm, serve, redirect, stale entries, DNS removed, failed, remove, rights, takeover, Cloudflare errors, rename, clean-up, account list, client)');
})().catch((e) => { console.error(e); process.exit(1); });
