/** Publishing rules (plan 2026-10-30-publish-subdomain.md, step 3): who may publish, what files are accepted, what is refused, and that a failed publish leaves the earlier site live. */
const assert = require('assert');
const P = require('../functions/lib/publish.js');
const Fake = require('./lib/fake-sites.js');

const NOW = '2026-11-01T10:00:00.000Z';
const FUTURE = '2027-11-01T00:00:00.000Z';
const html = (body) => ({ path: 'index.html', content: '<!doctype html><title>t</title><body>' + (body || '<p>Hello</p>') + '</body>' });
const css = { path: 'style.css', content: 'body{margin:0}' };
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString('base64');
const setup = (over) => {
  const f = Fake.create(); let clock = NOW;
  const pub = P.createPublisher(Object.assign({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => clock }, over || {}));
  return { f, pub, setClock: (t) => { clock = t; } };
};
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  await test('file checks: good site, then each refusal', () => {
    const ok = P.checkFiles([html(), css, { path: 'img/logo.png', content: PNG, encoding: 'base64' }]);
    assert(ok.ok && ok.files.length === 3 && ok.files[2].bytes.length === 7 && ok.files[2].type === 'image/png');
    const bad = (files, text) => { const r = P.checkFiles(files); assert(!r.ok, text + ' should be refused'); assert(r.errors.join(' ').includes(text) || !text, text + ' → ' + r.errors.join(' | ')); };
    bad([], 'no files');
    bad([css], 'index.html');
    bad([html(), { path: '../evil.html', content: 'x' }], 'allowed file name');
    bad([html(), { path: '/abs.html', content: 'x' }], 'allowed file name');
    bad([html(), { path: 'a/./b.css', content: 'x' }], 'allowed file name');
    bad([html(), { path: '.env', content: 'x' }], 'allowed file name');
    bad([html(), { path: 'a b.css', content: 'x' }], 'allowed file name');
    bad([html(), { path: 'run.php', content: 'x' }], 'cannot be published');
    bad([html(), { path: 'x.exe', content: 'x' }], 'cannot be published');
    bad([html(), { path: 'STYLE.css', content: 'x' }, css], 'appears');
    bad([html(), { path: 'p.png', content: Buffer.from('not a png').toString('base64'), encoding: 'base64' }], 'not a real png');
    bad([html(), { path: 'p.png', content: '!!!notbase64', encoding: 'base64' }], 'could not be read');
    bad([html(), { path: 'big.css', content: 'x'.repeat(5 * 1024 * 1024 + 1) }], 'larger');
    bad([html(), ...Array.from({ length: 501 }, (_, i) => ({ path: 'f' + i + '.css', content: 'a' }))], 'Too many');
    const huge = Array.from({ length: 5 }, (_, i) => ({ path: 'b' + i + '.json', content: 'x'.repeat(4.5 * 1024 * 1024) }));
    bad([html(), ...huge], 'in total');
    bad([null, undefined, 5, { path: 7 }], '');
  });

  await test('html scan: script tricks are refused, ordinary pages pass', () => {
    const refused = [
      '<a href="javascript:alert(1)">x</a>', '<a href=" JaVa\tScRiPt:alert(1)">x</a>', '<a href="&#106;avascript:alert(1)">x</a>', '<a href="&#x6A;avascript&colon;alert(1)">x</a>',
      '<a href=\'vbscript:x\'>x</a>', '<img src="data:text/html,<script>1</script>">', '<script src="https://evil.example/x.js"></script>', '<script src=//evil.example/x.js></script>',
      '<script type="module" src="https://evil.example/m.js"></script>', '<iframe src="https://evil.example"></iframe>', '<form action="https://evil.example/steal"><input name=a></form>',
      '<form action="//evil.example"></form>', '<button formaction="https://evil.example">x</button>', '<base href="https://evil.example/">', '<object data="x.swf"></object>',
      '<embed src="x.swf">', '<meta http-equiv="refresh" content="0;url=https://evil.example">'
    ];
    for (const h of refused) assert(P.scanHtml(h).length, 'should be refused: ' + h);
    const fine = ['<a href="/about">About</a>', '<a href="https://example.com/">Elsewhere</a>', '<a href="mailto:a@b.lv">mail</a>', '<script src="/js/app.js" defer></script>', '<script>document.title="x"</script>',
      '<img src="logo.png" alt="">', '<img src="data:image/png;base64,iVBORw0KGgo=">', '<form action="/thanks" method="post"></form>', '<link rel="stylesheet" href="style.css">', '<a href="#top">up</a>'];
    for (const h of fine) assert.deepStrictEqual(P.scanHtml(h), [], 'should pass: ' + h);
    assert(P.scanSvg('<svg><script>alert(1)</script></svg>').length && P.scanSvg('<svg onload="x()"></svg>').length && P.scanSvg('<svg><a href="javascript:x"/></svg>').length && P.scanSvg('<svg><foreignObject/></svg>').length);
    assert.deepStrictEqual(P.scanSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>'), []);
  });

  await test('hostile pages are scanned fast (no catastrophic matching)', () => {
    const cases = ['<a ' + '"'.repeat(200000), '<a '.repeat(150000), '<a ' + '"x" '.repeat(100000), '<script '.repeat(100000), '<a href="' + '&#'.repeat(200000) + '">'];
    const t = Date.now();
    for (const c of cases) { P.scanHtml(c); P.scanSvg(c); }
    assert(Date.now() - t < 3000, 'scanning took ' + (Date.now() - t) + ' ms');
  });

  await test('entitlement states: active, grace for 14 days, ended', () => {
    const e = { status: 'active', paid_until: '2026-12-01T00:00:00Z' };
    assert.strictEqual(P.entitlementState(e, '2026-11-30T00:00:00Z'), 'active');
    assert.strictEqual(P.entitlementState(e, '2026-12-10T00:00:00Z'), 'grace');
    assert.strictEqual(P.entitlementState(e, '2026-12-16T00:00:00Z'), 'ended');
    assert.strictEqual(P.entitlementState(Object.assign({}, e, { status: 'refunded' }), '2026-11-30T00:00:00Z'), 'ended');
    assert.strictEqual(P.entitlementState(null, NOW), 'ended');
    assert.strictEqual(P.entitlementState({ status: 'active', paid_until: 'junk' }, NOW), 'ended');
  });

  await test('publish: needs sign-in, a good name, good files and a paid place', async () => {
    const { f, pub } = setup();
    assert.strictEqual((await pub.publish({ userId: null, name: 'bakery', files: [html()] })).status, 401);
    f.addEntitlement('u1', FUTURE);
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'www', files: [html()] })).json.reason, 'reserved');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'porn', files: [html()] })).json.reason, 'blocked');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<a href="javascript:x">')] })).json.reason, 'files');
    assert.strictEqual(f.sites.length, 0, 'nothing is created by a refused publish');
    const none = await pub.publish({ userId: 'u2', name: 'bakery-anna', files: [html()] });
    assert.strictEqual(none.status, 402); assert.strictEqual(none.json.reason, 'payment-needed'); assert.strictEqual(f.sites.length, 0);
  });

  await test('publish: first publish stores the files, points the name at them, uses up one paid place', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    const r = await pub.publish({ userId: 'u1', name: ' Bakery-Anna ', files: [html(), css] });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.json.address, 'https://bakery-anna.edvlabs.com/'); assert.strictEqual(r.json.version, 1); assert.strictEqual(r.json.created, true);
    const site = f.sites[0]; assert.strictEqual(site.status, 'live'); assert.strictEqual(site.version, 1);
    assert(f.objects.has('sites/' + site.id + '/1/index.html') && f.objects.has('sites/' + site.id + '/1/style.css'));
    assert.strictEqual(f.objects.get('sites/' + site.id + '/1/style.css').type, 'text/css; charset=utf-8');
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')), { id: site.id, version: 1, status: 'live' });
    assert.strictEqual(f.ents[0].site_id, site.id);
    const again = await pub.publish({ userId: 'u1', name: 'second-site', files: [html()] });
    assert.strictEqual(again.json.reason, 'payment-needed', 'one paid place buys one site');
  });

  await test('publish: names are exclusive; holds protect a given-up name; blocked sites stay blocked', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE); f.addEntitlement('u2', FUTURE);
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    const taken = await pub.publish({ userId: 'u2', name: 'bakery-anna', files: [html()] });
    assert.strictEqual(taken.status, 409); assert.strictEqual(taken.json.reason, 'taken');
    assert.strictEqual(f.ents[1].site_id, null, 'a refused publish does not use the paid place');
    f.addEntitlement('u1', FUTURE);
    f.holds.push({ name: 'old-name', user_id: 'u1', expires_at: '2027-01-01T00:00:00Z' });
    assert.strictEqual((await pub.publish({ userId: 'u2', name: 'old-name', files: [html()] })).json.reason, 'taken');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'old-name', files: [html()] })).status, 200, 'the holder may use their own held name');
    f.holds.push({ name: 'expired-name', user_id: 'u1', expires_at: '2026-01-01T00:00:00Z' });
    assert.strictEqual((await pub.publish({ userId: 'u2', name: 'expired-name', files: [html()] })).status, 200);
    f.sites.find((s) => s.name === 'bakery-anna').status = 'blocked';
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 403);
  });

  await test('name status: free, yours, taken, held, not allowed', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    f.holds.push({ name: 'held-name', user_id: 'u1', expires_at: '2027-01-01T00:00:00Z' });
    const s = async (u, n) => (await pub.nameStatus(u, n)).json;
    assert.strictEqual((await s('u2', 'fresh-name')).available, true);
    assert.strictEqual((await s('u2', 'bakery-anna')).reason, 'taken');
    assert.strictEqual((await s('u1', 'bakery-anna')).reason, 'yours');
    assert.strictEqual((await s('u2', 'held-name')).reason, 'taken');
    assert.strictEqual((await s('u1', 'held-name')).available, true);
    assert.strictEqual((await s('u2', 'admin')).reason, 'reserved');
    assert.strictEqual((await s('u2', 'a')).reason, 'short');
  });

  await test('update: new version, old versions pruned to the last five, other people cannot touch it', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    let last;
    for (let i = 1; i <= 7; i++) last = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<p>v' + i + '</p>'), css] });
    assert.strictEqual(last.json.version, 7); assert.strictEqual(last.json.created, false); assert.strictEqual(f.sites.length, 1);
    const id = f.sites[0].id, versions = [...new Set([...f.objects.keys()].filter((k) => k.startsWith('sites/' + id + '/')).map((k) => k.split('/')[2]))].sort();
    assert.deepStrictEqual(versions, ['3', '4', '5', '6', '7']);
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')).version, 7);
    f.addEntitlement('u2', FUTURE);
    assert.strictEqual((await pub.publish({ userId: 'u2', name: 'bakery-anna', files: [html()] })).status, 409);
  });

  await test('a failed upload leaves the earlier version live and gives the paid place back', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<p>one</p>'), css] });
    const id = f.sites[0].id;
    f.bucket.failOn = '/2/style.css';
    const bad = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<p>two</p>'), css] });
    assert.strictEqual(bad.status, 500);
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')).version, 1, 'visitors still get version 1');
    assert(![...f.objects.keys()].some((k) => k.startsWith('sites/' + id + '/2/')), 'half-written files are removed');
    f.bucket.failOn = null;
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<p>three</p>')] })).json.version, 3, 'folder numbers are never reused');
    // new site whose upload fails: nothing is left behind and the paid place is free again
    f.addEntitlement('u2', FUTURE); f.bucket.failOn = 'index.html';
    const failNew = await pub.publish({ userId: 'u2', name: 'new-shop', files: [html()] });
    assert.strictEqual(failNew.status, 500); assert(!f.sites.some((s) => s.name === 'new-shop')); assert.strictEqual(f.ents[1].site_id, null); assert(!f.kvStore.has('site:new-shop'));
  });

  await test('payment: ended places refuse, grace still allows updates, new sites need an active place', async () => {
    const { f, pub, setClock } = setup(); f.addEntitlement('u1', '2026-12-01T00:00:00Z');
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    setClock('2026-12-10T00:00:00.000Z');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 200, 'grace period');
    f.addEntitlement('u1', '2026-12-05T00:00:00Z');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'second', files: [html()] })).status, 402, 'a place in its grace period cannot start a new site');
    setClock('2026-12-20T00:00:00.000Z');
    const ended = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    assert.strictEqual(ended.status, 402); assert.strictEqual(ended.json.reason, 'payment-needed');
  });

  await test('rate limit: ten publishes an hour, then the next hour is fresh', async () => {
    const { f, pub, setClock } = setup(); f.addEntitlement('u1', FUTURE);
    for (let i = 0; i < 10; i++) assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 200);
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 429);
    setClock('2026-11-01T11:00:00.000Z');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 200);
  });

  await test('site cap per account is explained, and two people racing for one name get one winner', async () => {
    const { f, pub, setClock } = setup();
    for (let i = 0; i < 10; i++) { f.addEntitlement('u1', FUTURE); assert.strictEqual((await pub.publish({ userId: 'u1', name: 'shop-' + i + 'x', files: [html()] })).status, 200); }
    f.addEntitlement('u1', FUTURE); setClock('2026-11-01T12:00:00.000Z'); // a new hour, so the hourly limit is not what answers
    const eleven = await pub.publish({ userId: 'u1', name: 'one-too-many', files: [html()] });
    assert.strictEqual(eleven.json.reason, 'too-many');
    const g = setup(); g.f.addEntitlement('a', FUTURE); g.f.addEntitlement('b', FUTURE);
    const both = await Promise.all([g.pub.publish({ userId: 'a', name: 'same-name', files: [html()] }), g.pub.publish({ userId: 'b', name: 'same-name', files: [html()] })]);
    assert.deepStrictEqual(both.map((x) => x.status).sort(), [200, 409]);
  });

  await test('unpublish: owner only; the files stay; publishing again brings it back', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    const r = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    assert.strictEqual((await pub.unpublish({ userId: 'u2', siteId: r.json.siteId })).status, 404);
    assert.strictEqual((await pub.unpublish({ userId: null, siteId: r.json.siteId })).status, 401);
    assert.strictEqual((await pub.unpublish({ userId: 'u1', siteId: r.json.siteId })).status, 200);
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')).status, 'unpublished'); assert.strictEqual(f.sites[0].status, 'unpublished');
    assert([...f.objects.keys()].some((k) => k.endsWith('/1/index.html')));
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).status, 200);
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')).status, 'live');
    f.sites[0].status = 'blocked';
    assert.strictEqual((await pub.unpublish({ userId: 'u1', siteId: r.json.siteId })).status, 403, 'a blocked site cannot be changed by its owner');
  });

  await test('mySites lists a person\'s sites with payment state and unused places', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE); f.addEntitlement('u1', FUTURE);
    await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] });
    const r = await pub.mySites('u1');
    assert.strictEqual(r.json.freePlaces, 1); assert.strictEqual(r.json.sites.length, 1);
    assert.deepStrictEqual(Object.keys(r.json.sites[0]).sort(), ['address', 'id', 'name', 'paidUntil', 'payment', 'publishedAt', 'status', 'version']);
    assert.strictEqual(r.json.sites[0].address, 'https://bakery-anna.edvlabs.com/'); assert.strictEqual(r.json.sites[0].payment, 'active');
    assert.strictEqual((await pub.mySites('u2')).json.sites.length, 0, 'nobody sees another person\'s sites');
    assert.strictEqual((await pub.mySites(null)).status, 401);
  });

  await test('sweep: deleted accounts\' sites vanish, lapsed payments go offline, old holds are released; a second run changes nothing', async () => {
    const { f, pub, setClock } = setup();
    f.addEntitlement('u1', '2026-12-01T00:00:00Z'); f.addEntitlement('u2', FUTURE);
    await pub.publish({ userId: 'u1', name: 'lapsing-shop', files: [html()] });
    await pub.publish({ userId: 'u2', name: 'gone-shop', files: [html()] });
    const goneId = f.sites.find((x) => x.name === 'gone-shop').id;
    f.sites.splice(f.sites.findIndex((x) => x.name === 'gone-shop'), 1); // the account was deleted: the database rows are gone, KV and R2 are not
    f.kvStore.set('site:renamed-away', JSON.stringify({ redirect: 'lapsing-shop' }));
    f.holds.push({ name: 'renamed-away', user_id: 'u1', expires_at: '2026-11-15T00:00:00Z' });
    f.kvStore.set('site:stale-redirect', JSON.stringify({ redirect: 'lapsing-shop' })); // a redirect with no hold behind it
    let r = await pub.sweep();
    assert.deepStrictEqual(r, { orphans: 1, lapsed: 0, holds: 1 }, JSON.stringify(r));
    assert(!f.kvStore.has('site:gone-shop') && ![...f.objects.keys()].some((k) => k.startsWith('sites/' + goneId + '/')), 'the deleted account\'s site is gone from KV and R2');
    assert(f.kvStore.has('site:renamed-away'), 'a held redirect stays while the hold lasts');
    assert(f.sites.find((x) => x.name === 'lapsing-shop').status === 'live', 'still paid or in grace');
    setClock('2026-12-10T00:00:00.000Z'); // grace
    assert.deepStrictEqual(await pub.sweep(), { orphans: 0, lapsed: 0, holds: 1 }, 'the hold is now over (15 Nov), grace keeps the site live');
    assert(!f.kvStore.has('site:renamed-away') && f.holds.length === 0, 'expired hold released with its redirect');
    setClock('2026-12-20T00:00:00.000Z'); // 19 days after payment ended: grace is over
    r = await pub.sweep();
    assert.strictEqual(r.lapsed, 1); assert.strictEqual(f.sites[0].status, 'unpublished'); assert.strictEqual(JSON.parse(f.kvStore.get('site:lapsing-shop')).status, 'unpublished');
    assert([...f.objects.keys()].some((k) => k.endsWith('/index.html')), 'the files are kept so renewing brings the site back');
    assert.deepStrictEqual(await pub.sweep(), { orphans: 0, lapsed: 0, holds: 0 }, 'running again changes nothing');
  });

  console.log(`✓ publish: ${count} groups (files, scan, payment, names, versions, failures, limits, unpublish)`);
})().catch((e) => { console.error(e); process.exit(1); });
