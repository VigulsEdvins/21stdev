/** The admin panel's rules and account actions (plan 2026-10-31-site-admin-panel.md, steps 1 and 3): username and password rules, the hash, the session cookie, turn on / change / remove. */
const assert = require('assert');
const A = require('../functions/lib/site-admin.js');
const P = require('../functions/lib/publish.js');
const Fake = require('./lib/fake-sites.js');

const GOOD = 'Tulip-Garden-7-Moon!';
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

async function world() {
  const f = Fake.create();
  const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z' });
  f.addEntitlement('u1', '2027-11-01T00:00:00.000Z');
  const r = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>Anna</p>' }] });
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  const admin = A.createSiteAdmin({ db: f.db, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z', rounds: 1000 });
  return { f, admin, siteId: r.json.siteId };
}

(async () => {
  await test('usernames: lower-cased, 4 to 32 characters, no odd characters or doubled dots', async () => {
    assert.strictEqual(A.cleanUsername('  Anna.Baker '), 'anna.baker');
    for (const bad of ['abc', 'a'.repeat(33), '-anna', 'anna-', 'an na', 'anna!', 'an..na', 'ännä', '', null, undefined, 'a<b>c']) assert.strictEqual(A.cleanUsername(bad), '', String(bad));
    assert.strictEqual(A.cleanUsername('a'.repeat(32)).length, 32);
  });

  await test('password rules are the account rules, and the password may not contain the username', async () => {
    assert.strictEqual(A.problem('anna.baker', GOOD), '');
    assert(/stronger|easy/.test(A.problem('anna.baker', 'short')));
    assert(/stronger|easy/.test(A.problem('anna.baker', 'alllowercaseletters')));
    assert(/username/.test(A.problem('tulip', 'Tulip-Garden-7-Moon!')));
    assert(/username needs/.test(A.problem('x', GOOD)));
    assert(A.problem('anna.baker', 'Password123!'), 'a very common password is refused');
    assert(A.problem('anna.baker', 'x'.repeat(80) + 'Aa1!'), 'too long');
  });

  await test('the secret address: ten digits, all digits used, different each time', async () => {
    const seen = new Set(), digits = new Set();
    for (let i = 0; i < 400; i++) { const d = A.newDigits(); assert(/^\d{10}$/.test(d)); seen.add(d); for (const c of d) digits.add(c); }
    assert(seen.size > 395); assert.strictEqual(digits.size, 10);
  });

  await test('hash: salted, never the password, right password only', async () => {
    const a = await A.hashPassword(GOOD, 1000), b = await A.hashPassword(GOOD, 1000);
    assert.notStrictEqual(a.hash, b.hash, 'a new salt each time');
    assert(!JSON.stringify(a).includes(GOOD));
    assert.strictEqual(await A.checkPassword(GOOD, a), true);
    assert.strictEqual(await A.checkPassword(GOOD + ' ', a), false);
    assert.strictEqual(await A.checkPassword('', a), false);
    assert.strictEqual(await A.checkPassword(GOOD, null), false, 'no record: refused, after doing the same work');
    assert.strictEqual(A.ROUNDS, 100000);
  });

  await test('session cookie: valid for its site and version only, ends, cannot be forged', async () => {
    const now = Date.parse('2026-11-01T10:00:00Z');
    const c = await A.makeSession('secret-1', 'site-a', 3, now);
    assert.strictEqual(await A.checkSession('secret-1', c, 'site-a', 3, now + 1000), true);
    assert.strictEqual(await A.checkSession('secret-1', c, 'site-b', 3, now), false, 'another site');
    assert.strictEqual(await A.checkSession('secret-1', c, 'site-a', 4, now), false, 'credentials changed since');
    assert.strictEqual(await A.checkSession('secret-2', c, 'site-a', 3, now), false, 'another secret');
    assert.strictEqual(await A.checkSession('secret-1', c, 'site-a', 3, now + (A.SESSION_HOURS * 3600 + 5) * 1000), false, 'expired');
    const parts = c.split('.'); parts[1] = String(Number(parts[1]) + 99999);
    assert.strictEqual(await A.checkSession('secret-1', parts.join('.'), 'site-a', 3, now), false, 'longer expiry, same signature');
    for (const junk of ['', 'a.b.c', 'x'.repeat(500), null, undefined]) assert.strictEqual(await A.checkSession('secret-1', junk, 'site-a', 3, now), false);
    assert.strictEqual(await A.checkSession('', c, 'site-a', 3, now), false, 'no secret set: nothing is valid');
  });

  await test('turn on: owner only, stored as hash, record for the login, address shown', async () => {
    const { f, admin, siteId } = await world();
    assert.strictEqual((await admin.enable({ userId: null, siteId, username: 'anna.baker', password: GOOD })).status, 401);
    assert.strictEqual((await admin.enable({ userId: 'someone-else', siteId, username: 'anna.baker', password: GOOD })).status, 404, 'not their site');
    assert.strictEqual((await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: 'weak' })).status, 400);
    assert.strictEqual(f.admins.length, 0, 'a refusal changes nothing');
    const r = await admin.enable({ userId: 'u1', siteId, username: 'Anna.Baker', password: GOOD });
    assert.strictEqual(r.status, 200, JSON.stringify(r.json));
    assert(/^https:\/\/bakery-anna\.edvlabs\.com\/admin\d{10}$/.test(r.json.admin.address));
    assert.strictEqual(r.json.admin.username, 'anna.baker');
    const row = f.admins[0];
    assert(!JSON.stringify(row).includes(GOOD) && !JSON.stringify(r.json).includes(row.password_hash), 'no password, and no hash in the answer');
    const rec = JSON.parse(await f.kv.get('admin:' + siteId));
    assert.deepStrictEqual([rec.digits, rec.user, rec.v], [row.path_digits, 'anna.baker', 1]);
    assert.strictEqual(await A.checkPassword(GOOD, rec), true);
    assert.strictEqual((await admin.enable({ userId: 'u1', siteId, username: 'other.name', password: GOOD })).status, 409, 'only one per site');
  });

  await test('change: password, username, new address; each raises the version; open sessions end', async () => {
    const { f, admin, siteId } = await world();
    await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD });
    const first = JSON.parse(await f.kv.get('admin:' + siteId));
    assert.strictEqual((await admin.change({ userId: 'u1', siteId })).status, 400, 'nothing to change');
    assert.strictEqual((await admin.change({ userId: 'u1', siteId, password: 'weak' })).status, 400);
    assert.strictEqual((await admin.change({ userId: 'u1', siteId, username: 'x' })).status, 400);
    assert.strictEqual(JSON.parse(await f.kv.get('admin:' + siteId)).v, 1, 'refusals change nothing');
    const NEW = 'Quiet-River-9-Stone?';
    assert.strictEqual((await admin.change({ userId: 'u1', siteId, password: NEW })).status, 200);
    let rec = JSON.parse(await f.kv.get('admin:' + siteId));
    assert.strictEqual(rec.v, 2); assert.strictEqual(rec.digits, first.digits, 'same address');
    assert.strictEqual(await A.checkPassword(NEW, rec), true); assert.strictEqual(await A.checkPassword(GOOD, rec), false);
    await admin.change({ userId: 'u1', siteId, username: 'baker.anna' });
    rec = JSON.parse(await f.kv.get('admin:' + siteId));
    assert.deepStrictEqual([rec.user, rec.v], ['baker.anna', 3]); assert.strictEqual(await A.checkPassword(NEW, rec), true, 'the password stays');
    await admin.change({ userId: 'u1', siteId, newAddress: true });
    rec = JSON.parse(await f.kv.get('admin:' + siteId));
    assert.notStrictEqual(rec.digits, first.digits); assert.strictEqual(rec.v, 4);
    assert.strictEqual((await admin.change({ userId: 'u2', siteId, password: NEW })).status, 404);
  });

  await test('remove: owner only; the login record goes; status says off', async () => {
    const { f, admin, siteId } = await world();
    await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD });
    assert.strictEqual((await admin.remove({ userId: 'u2', siteId })).status, 404);
    assert(await f.kv.get('admin:' + siteId));
    assert.strictEqual((await admin.remove({ userId: 'u1', siteId })).status, 200);
    assert.strictEqual(await f.kv.get('admin:' + siteId), null); assert.strictEqual(f.admins.length, 0);
    const st = await admin.status('u1', await f.db.sitesByUser('u1'));
    assert.deepStrictEqual(st[siteId], { on: false });
  });

  await test('status: username and address for the owner, never the hash', async () => {
    const { f, admin, siteId } = await world();
    await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD });
    const st = await admin.status('u1', await f.db.sitesByUser('u1'));
    assert.strictEqual(st[siteId].on, true);
    assert(!JSON.stringify(st).includes(f.admins[0].password_hash) && !JSON.stringify(st).includes(f.admins[0].salt));
  });

  await test('a blocked site cannot get an admin panel; too many changes in an hour are refused', async () => {
    const { f, admin, siteId } = await world();
    f.sites[0].status = 'blocked';
    assert.strictEqual((await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD })).status, 403);
    f.sites[0].status = 'live';
    await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD });
    let last; for (let i = 0; i < 25; i++) last = await admin.change({ userId: 'u1', siteId, newAddress: true });
    assert.strictEqual(last.status, 429);
  });

  await test('field list from the builder: rebuilt from known keys, hostile parts refused', async () => {
    const good = { v: 1, site: 'Anna', pages: [{ file: 'index.html', title: 'Home', sections: [{ id: 'sec-1', slug: 'hero', title: 'Hero', anchor: 'top', fields: [{ id: 'title', label: 'Title', type: 'text', selector: 'h1', value: 'Hi', attr: 'href', evil: 1 }] }], extra: 'x' }], forms: { method: 'netlify', target: '', has: true }, published: { 'index.html': { x: 'y' } }, bad: 1 };
    const c = A.cleanStructure(good);
    assert(c && c.pages[0].sections[0].fields[0].selector === 'h1' && !('evil' in c.pages[0].sections[0].fields[0]) && !('extra' in c.pages[0]) && !('bad' in c));
    assert(A.cleanStructure(Object.assign({}, good, { pages: [{ file: 'index.html', title: 'T', sections: [{ id: 's', slug: 'a', title: 'a', fields: [{ id: 'c', label: 'Colour', type: 'color', selector: ':root', value: '#fff', attr: '--accent' }] }] }] })), 'a CSS variable is a fine attribute for a colour field');
    assert.deepStrictEqual(c.published, {}, 'saved values never come in through the field list');
    const withField = (f) => ({ pages: [{ file: 'index.html', title: 'T', sections: [{ id: 's', slug: 'a', title: 'a', fields: [Object.assign({ id: 'f', label: 'L', type: 'text', selector: 'p', value: '' }, f)] }] }] });
    for (const f of [{ attr: 'onclick' }, { attr: 'style' }, { attr: 'srcdoc' }, { attr: 'formaction' }, { type: 'Text<' }, { id: 'a b' }, { selector: 'x'.repeat(601) }, { value: 'x'.repeat(20001) }]) assert.strictEqual(A.cleanStructure(withField(f)), null, JSON.stringify(f).slice(0, 40));
    for (const bad of [null, {}, { pages: [] }, { pages: [{ file: '../x.html', title: '', sections: [] }] }, { pages: [{ file: 'a.js', title: '', sections: [] }] }, 'x', []]) assert.strictEqual(A.cleanStructure(bad), null);
  });

  await test('after a publish: a site with an admin panel keeps the field list and has the editor installed; one without ignores both', async () => {
    const f = Fake.create();
    const pub0 = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z' });
    f.addEntitlement('u1', '2027-11-01T00:00:00.000Z');
    const r0 = await pub0.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>A</p>' }] });
    const siteId = r0.json.siteId;
    const editorFiles = async () => ({ 'admin.html': '<html>E</html>', 'admin.js': '//e', 'cms.js': '//c' });
    const admin = A.createSiteAdmin({ db: f.db, kv: f.kv, bucket: f.bucket, now: () => '2026-11-01T10:00:00.000Z', rounds: 1000, editorFiles });
    const pub = P.createPublisher({ db: f.db, bucket: f.bucket, kv: f.kv, now: () => '2026-11-01T10:00:00.000Z', adminHook: admin });
    const struct = { pages: [{ file: 'index.html', title: 'T', sections: [{ id: 's', slug: 'a', title: 'a', fields: [{ id: 'f', label: 'L', type: 'text', selector: 'p', value: 'A' }] }] }] };
    const noAdmin = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>B</p>' }], adminStructure: struct });
    assert.strictEqual(noAdmin.status, 200); assert(!('admin' in noAdmin.json)); assert(!f.objects.has('sites/' + siteId + '/admin/structure.json'));
    const on = await admin.enable({ userId: 'u1', siteId, username: 'anna.baker', password: GOOD });
    assert.strictEqual(on.json.needsPublish, true, 'on, but there is nothing to edit until the next publish');
    assert(f.objects.has('sites/' + siteId + '/admin/admin.html') && f.objects.has('sites/' + siteId + '/admin/cms.js'));
    const withAdmin = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>C</p>' }], adminStructure: struct });
    assert.strictEqual(withAdmin.status, 200); assert.strictEqual(withAdmin.json.admin.ok, true);
    assert(f.objects.has('sites/' + siteId + '/admin/structure.json'));
    const bad = await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>D</p>' }], adminStructure: { pages: [{ file: 'x.js' }] } });
    assert.strictEqual(bad.status, 200, 'the page still goes live'); assert.strictEqual(bad.json.admin.ok, false);
    for (let i = 0; i < 6; i++) await pub.publish({ userId: 'u1', name: 'bakery-anna', files: [{ path: 'index.html', content: '<p>' + i + '</p>' }] });
    assert(f.objects.has('sites/' + siteId + '/admin/structure.json'), 'old version folders are pruned, the admin folder is not');
    await admin.remove({ userId: 'u1', siteId });
    assert(![...f.objects.keys()].some((k) => k.includes('/admin/')), 'removing the panel removes the editor and the edits');
  });

  console.log('site-admin: ' + count + ' tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
