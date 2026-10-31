/** The admin panel on a site's own address (plan 2026-10-31-site-admin-panel.md, steps 4 and 5): wrong address = missing page, login, lock-out, cookie, Origin check,
    editor files only when signed in, save checks, live pages get the saved values. Real Worker code, in-memory R2 and KV. */
const assert = require('assert');
const P = require('../functions/lib/publish.js');
const S = require('../functions/lib/sites-serve.js');
const A = require('../functions/lib/site-admin.js');
const AS = require('../functions/lib/site-admin-serve.js');
const Fake = require('./lib/fake-sites.js');

const PW = 'Tulip-Garden-7-Moon!', SECRET = 'test-secret-for-sessions-0123456789';
const STRUCT = { site: 'Anna', pages: [{ file: 'index.html', title: 'Home', sections: [{ id: 'sec-1', slug: 'hero', title: 'Hero', fields: [{ id: 'title', label: 'Title', type: 'text', value: 'Hello' }, { id: 'cta', label: 'Button link', type: 'link', value: '#' }, { id: 'pic', label: 'Picture', type: 'image', value: 'a.png' }] }] }], published: {}, updatedAt: 0 };
const enc = (t) => new TextEncoder().encode(t);
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

async function world() {
  const f = Fake.create();
  const now = () => '2026-11-01T10:00:00.000Z';
  const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now });
  f.addEntitlement('u1', '2027-11-01T00:00:00.000Z');
  const r = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<!doctype html><title>Anna</title><p>Anna</p>' }, { path: 'a.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 9]).toString('base64'), encoding: 'base64' }] });
  const siteId = r.json.siteId;
  const admin = A.createSiteAdmin({ db: f.db, kv: f.kv, now, rounds: 1000 });
  const on = await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: PW });
  const digits = on.json.admin.digits;
  await f.bucket.put('sites/' + siteId + '/admin/admin.html', enc('<html>EDITOR</html>'));
  await f.bucket.put('sites/' + siteId + '/admin/admin.js', enc('/*editor*/'));
  await f.bucket.put('sites/' + siteId + '/admin/cms.js', enc('/*runtime*/'));
  await f.bucket.put('sites/' + siteId + '/admin/structure.json', enc(JSON.stringify(STRUCT)));
  const adminServer = AS.createAdminServer({ kv: f.kv, bucket: f.bucket, secret: SECRET, now: () => clock.t });
  const clock = { t: Date.parse('2026-11-01T10:00:00Z') };
  const server = S.createSiteServer({ bucket: f.bucket, kv: f.kv, admin: adminServer });
  const base = 'https://bakery-anna.edvlabs.com';
  const go = (path, init, headers) => server.handle(new Request(base + path, Object.assign({}, init, { headers: Object.assign({}, headers || {}) })));
  const post = (path, body, headers) => go(path, { method: 'POST', body }, Object.assign({ Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' }, headers || {}));
  const login = async (user, pw, ip) => post('/admin' + digits + '/login', new URLSearchParams({ username: user, password: pw }).toString(), ip ? { 'CF-Connecting-IP': ip } : {});
  const signIn = async () => { const r2 = await login('anna.baker', PW); const c = r2.headers.get('Set-Cookie'); return { Cookie: c.split(';')[0] }; };
  return { f, siteId, digits, go, post, login, signIn, base, clock, adminServer, admin };
}

(async () => {
  await test('only the right ten digits open anything: every other /admin… address is the ordinary missing page', async () => {
    const { go, digits } = await world();
    const missing = await go('/nothing-here');
    const wrong = (d) => go('/admin' + d);
    for (const p of ['/admin', '/admin/', '/admin123', '/admin12345678901', '/admin0000000000', '/admin' + digits.slice(0, 9) + (digits[9] === '1' ? '2' : '1'), '/ADMIN' + digits, '/admin' + digits + 'x']) {
      const r = await go(p); assert.strictEqual(r.status, 404, p); assert.strictEqual(await r.text(), await missing.clone().text(), p + ' looks like any missing page');
    }
    assert.strictEqual((await wrong(digits)).status, 200, 'the right digits give the login page');
  });

  await test('without admin on a site, an admin-shaped address (GET or POST) is just missing', async () => {
    const { f, go, post, admin, siteId, digits } = await world();
    await admin.remove({ userId: 'u1', siteId });
    assert.strictEqual((await go('/admin' + digits)).status, 404);
    assert.strictEqual((await post('/admin' + digits + '/login', 'username=a&password=b')).status, 404);
    assert.strictEqual((await go('/cms.js')).status, 404);
    assert.strictEqual((await go('/cms-content.js')).status, 404);
    assert.strictEqual((await go('/', { method: 'POST', body: 'x' })).status, 405, 'other posts are still refused');
  });

  await test('login page: no cookie, no editor, safe headers, never indexed', async () => {
    const { go, digits } = await world();
    const r = await go('/admin' + digits + '/'); const t = await r.text();
    assert(/type="password"/.test(t) && !/EDITOR/.test(t));
    assert.strictEqual(r.headers.get('Cache-Control'), 'no-store'); assert(/noindex/.test(r.headers.get('X-Robots-Tag'))); assert.strictEqual(r.headers.get('Referrer-Policy'), 'same-origin', 'not no-referrer: with that policy browsers send Origin: null on a form post, which the Origin check refuses');
    assert(/frame-ancestors 'none'/.test(r.headers.get('Content-Security-Policy')) && /script-src 'self'/.test(r.headers.get('Content-Security-Policy')));
    assert(!r.headers.get('Set-Cookie'));
    for (const p of ['/admin' + digits + '/admin.js', '/admin' + digits + '/cms-content.js', '/admin' + digits + '/index.html']) assert.strictEqual((await go(p)).status, 404, p + ' needs a session');
  });

  await test('login: right pair gives a host-only, HttpOnly, SameSite=Strict cookie and the editor; wrong pairs get one plain answer', async () => {
    const { go, login, digits, signIn } = await world();
    const ok = await login('Anna.Baker', PW); assert.strictEqual(ok.status, 303); assert.strictEqual(ok.headers.get('Location'), '/admin' + digits + '/');
    const c = ok.headers.get('Set-Cookie');
    assert(/^__Host-edv_admin=/.test(c) && /; Path=\//.test(c) && /; Secure/.test(c) && /HttpOnly/.test(c) && /SameSite=Strict/.test(c) && !/Domain=/i.test(c), c);
    const a = await login('anna.baker', 'wrong-password-1!'), b = await login('nobody.here', PW), c2 = await login('', '');
    for (const r of [a, b, c2]) { assert.strictEqual(r.status, 401); assert(!r.headers.get('Set-Cookie')); }
    const t1 = await a.text(), t2 = await b.text(); assert(/Wrong username or password/.test(t1) && /Wrong username or password/.test(t2));
    assert.strictEqual(t1, t2, 'a wrong user and a wrong password cannot be told apart');
    const cookie = await signIn();
    const page = await go('/admin' + digits + '/', {}, cookie); assert(/EDITOR/.test(await page.text()));
    assert.strictEqual(await (await go('/admin' + digits + '/admin.js', {}, cookie)).text(), '/*editor*/');
    assert.strictEqual((await go('/admin' + digits + '/', {}, { Cookie: cookie.Cookie + 'x' })).status, 200); // a bad cookie shows the login page, not the editor
    assert(!/EDITOR/.test(await (await go('/admin' + digits + '/', {}, { Cookie: cookie.Cookie + 'x' })).text()));
  });

  await test('login needs the site’s own Origin (a form on another site cannot sign anyone in or out)', async () => {
    const { go, digits } = await world();
    const body = new URLSearchParams({ username: 'anna.baker', password: PW }).toString();
    for (const origin of [null, 'https://evil.example', 'https://other.edvlabs.com', 'null']) {
      const h = { 'Content-Type': 'application/x-www-form-urlencoded' }; if (origin) h.Origin = origin;
      assert.strictEqual((await go('/admin' + digits + '/login', { method: 'POST', body }, h)).status, 403, String(origin));
      assert.strictEqual((await go('/admin' + digits + '/logout', { method: 'POST' }, h)).status, 403);
    }
  });

  await test('guessing: five wrong tries lock that visitor out, even for the right password; others and the next window are not affected', async () => {
    const { login, clock } = await world();
    for (let i = 0; i < 5; i++) assert.strictEqual((await login('anna.baker', 'wrong-' + i + '-Passw0rd!', '1.2.3.4')).status, 401);
    const locked = await login('anna.baker', PW, '1.2.3.4');
    assert.strictEqual(locked.status, 429); assert(!locked.headers.get('Set-Cookie')); assert.strictEqual(locked.headers.get('Retry-After'), '900');
    assert.strictEqual((await login('anna.baker', PW, '5.6.7.8')).status, 303, 'another visitor can still sign in');
    clock.t += 16 * 60 * 1000;
    assert.strictEqual((await login('anna.baker', PW, '1.2.3.4')).status, 303, 'after the window it works again');
  });

  await test('logout ends the browser’s cookie; changing the password ends every open session', async () => {
    const { go, post, digits, signIn, admin, siteId } = await world();
    const cookie = await signIn();
    const out = await post('/admin' + digits + '/logout', '', cookie); assert.strictEqual(out.status, 303); assert(/Max-Age=0/.test(out.headers.get('Set-Cookie')));
    assert(/EDITOR/.test(await (await go('/admin' + digits + '/', {}, cookie)).text()), 'the old cookie still works until it runs out or credentials change');
    assert.strictEqual((await admin.change({ userId: 'u1', siteId, password: 'Quiet-River-9-Stone?' })).status, 200);
    assert(!/EDITOR/.test(await (await go('/admin' + digits + '/', {}, cookie)).text()), 'a password change ends the session');
  });

  await test('session runs out after eight hours', async () => {
    const { go, digits, signIn, clock } = await world();
    const cookie = await signIn(); clock.t += 9 * 3600 * 1000;
    assert(!/EDITOR/.test(await (await go('/admin' + digits + '/', {}, cookie)).text()));
  });

  await test('the editor’s preview frame can load the site’s own pages here, framed by this address only; public pages stay unframeable', async () => {
    const { go, digits, signIn, base } = await world();
    const cookie = await signIn();
    const inEditor = await go('/admin' + digits + '/index.html?cms-preview=1', {}, cookie);
    assert.strictEqual(inEditor.status, 200); assert(/Anna/.test(await inEditor.text())); assert(/frame-ancestors 'self'/.test(inEditor.headers.get('Content-Security-Policy')));
    const pub = await go('/'); assert(/frame-ancestors 'none'/.test(pub.headers.get('Content-Security-Policy')));
    assert.strictEqual((await go('/admin' + digits + '/.hidden.html', {}, cookie)).status, 404);
  });

  await test('save: needs a session, JSON, the right Origin; only known fields; bad addresses refused; refusals change nothing', async () => {
    const { f, go, digits, signIn, base, siteId } = await world();
    const cookie = await signIn();
    const save = (values, headers) => go('/admin' + digits + '/save', { method: 'POST', body: typeof values === 'string' ? values : JSON.stringify({ values }) }, Object.assign({ Origin: base, 'Content-Type': 'application/json' }, headers || {}));
    const good = { 'index.html': { 'sec-1': { title: 'Fresh bread daily', cta: 'https://example.com/order', pic: 'a.png', pic__fit: 'cover|50|50|100', title__hide: '1' } }, __mode: 'off', __langs: ['en'], __form: { method: 'netlify', target: '' } };
    assert.strictEqual((await save(good)).status, 401, 'no session');
    assert.strictEqual((await save(good, Object.assign({}, cookie, { Origin: 'https://evil.example' }))).status, 403);
    assert.strictEqual((await save(good, Object.assign({}, cookie, { 'Content-Type': 'text/plain' }))).status, 415);
    assert.strictEqual((await save('not json', cookie)).status, 400);
    const bads = [{ 'index.html': { 'sec-1': { nope: 'x' } } }, { 'index.html': { 'sec-9': { title: 'x' } } }, { 'other.html': { 'sec-1': { title: 'x' } } }, { 'index.html': { 'sec-1': { title: 5 } } },
      { 'index.html': { 'sec-1': { cta: 'javascript:alert(1)' } } }, { 'index.html': { 'sec-1': { cta: ' J a\tvascript:alert(1)' } } }, { 'index.html': { 'sec-1': { pic: 'data:text/html;base64,AAAA' } } },
      { 'index.html': { 'sec-1': { title: 'x'.repeat(20001) } } }, { __mode: 'on' }, { __langs: ['<script>'] }, { random: 1 }, JSON.parse('{"index.html":{"sec-1":{"__proto__":"x"}}}'), [], 'x', null];
    for (const b of bads) { const r = await save(b, cookie); assert.strictEqual(r.status, 400, JSON.stringify(b).slice(0, 80)); }
    assert.strictEqual((await save(JSON.stringify({ values: 'x'.repeat(500000) }), cookie)).status, 413);
    assert.strictEqual(f.objects.has('sites/' + siteId + '/admin/content.json'), false, 'nothing was kept so far');
    const r = await save(good, cookie); assert.strictEqual(r.status, 200, await r.clone().text());
    assert(f.objects.has('sites/' + siteId + '/admin/content.json'));
  });

  await test('after a save, live pages and the editor get the saved values; the file the pages load is public but only exists with an admin panel; one step back is kept', async () => {
    const { f, go, digits, signIn, base, siteId } = await world();
    const cookie = await signIn();
    const save = (t) => go('/admin' + digits + '/save', { method: 'POST', body: JSON.stringify({ values: { 'index.html': { 'sec-1': { title: t } } } }) }, Object.assign({ Origin: base, 'Content-Type': 'application/json' }, cookie));
    const before = await (await go('/cms-content.js')).text(); assert(/EDV_CMS = /.test(before)); assert(!/Fresh/.test(before));
    await save('Fresh bread daily');
    const live = await go('/cms-content.js'); const t = await live.text();
    assert.strictEqual(live.status, 200); assert(/^text\/javascript/.test(live.headers.get('Content-Type'))); assert(/Fresh bread daily/.test(t));
    assert(/max-age=60/.test(live.headers.get('Cache-Control')));
    const parsed = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); assert.strictEqual(parsed.published['index.html']['sec-1'].title, 'Fresh bread daily'); assert.strictEqual(parsed.pages[0].file, 'index.html');
    assert(/Fresh bread daily/.test(await (await go('/admin' + digits + '/cms-content.js', {}, cookie)).text()));
    assert.strictEqual(await (await go('/cms.js')).text(), '/*runtime*/');
    await save('Second text'); const prev = JSON.parse(new TextDecoder().decode(f.objects.get('sites/' + siteId + '/admin/content.prev.json').bytes));
    assert.strictEqual(prev.values['index.html']['sec-1'].title, 'Fresh bread daily');
  });

  await test('restore: swaps the saved version with the one before it, needs a session and the right Origin', async () => {
    const { go, digits, signIn, base } = await world();
    const cookie = await signIn();
    const save = (t) => go('/admin' + digits + '/save', { method: 'POST', body: JSON.stringify({ values: { 'index.html': { 'sec-1': { title: t } } } }) }, Object.assign({ Origin: base, 'Content-Type': 'application/json' }, cookie));
    const restore = (headers) => go('/admin' + digits + '/restore', { method: 'POST' }, Object.assign({ Origin: base }, headers || {}));
    assert.strictEqual((await restore(cookie)).status, 409, 'nothing earlier yet');
    await save('First'); await save('Second');
    assert.strictEqual((await restore()).status, 401); assert.strictEqual((await restore(Object.assign({ Origin: 'https://evil.example' }, cookie))).status, 403);
    assert.strictEqual((await restore(cookie)).status, 200);
    assert(/First/.test(await (await go('/cms-content.js')).text()));
    await restore(cookie); assert(/Second/.test(await (await go('/cms-content.js')).text()), 'pressing it again goes back');
  });

  await test('the secret address does not appear on any public page, header or file', async () => {
    const { go, digits } = await world();
    for (const p of ['/', '/cms-content.js', '/cms.js', '/robots.txt', '/sitemap.xml']) { const r = await go(p); const t = await r.text(); assert(!t.includes(digits), p); for (const [, v] of r.headers) assert(!v.includes(digits), p + ' header'); }
  });

  await test('without ADMIN_SESSION_SECRET nothing is signed in (a missing secret never means "everyone")', async () => {
    const { f, siteId, digits } = await world();
    const bad = AS.createAdminServer({ kv: f.kv, bucket: f.bucket, secret: undefined });
    const server = S.createSiteServer({ bucket: f.bucket, kv: f.kv, admin: bad });
    const r = await server.handle(new Request('https://bakery-anna.edvlabs.com/admin' + digits + '/', { headers: { Cookie: '__Host-edv_admin=' + siteId + '.9999999999.1.' } }));
    assert(!/EDITOR/.test(await r.text()));
  });

  console.log('site-admin-serve: ' + count + ' tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
