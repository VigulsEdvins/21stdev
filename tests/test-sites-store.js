/** The Supabase adapter for publishing: exact requests (addresses, keys, filters), error mapping, and that the secret key goes only in headers to the Supabase address. A stand-in fetch records every call. */
const assert = require('assert');
const store = require('../functions/lib/sites-store.js');

const ENV = { SUPABASE_URL: 'https://proj.supabase.co/', SUPABASE_ANON_KEY: 'anon-key-value', SUPABASE_SERVICE_ROLE_KEY: 'service-key-SECRET' };
const UID = '11111111-1111-4111-8111-111111111111';
function stub(replies) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: (init && init.method) || 'GET', headers: (init && init.headers) || {}, body: init && init.body });
    const r = replies.shift() || { status: 200, body: [] };
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)), json: async () => r.body };
  };
  return { calls, fetchImpl };
}
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  await test('verifyUser asks Supabase with the person\'s own token and the public key, and refuses anything odd', async () => {
    const s = stub([{ status: 200, body: { id: UID, email: 'a@example.com' } }, { status: 401, body: { message: 'bad' } }, { status: 200, body: { id: 'not-a-uuid' } }, { status: 200, body: null }]);
    assert.deepStrictEqual(await store.verifyUser(ENV, 'a-valid-looking-token-1234567', s.fetchImpl), { id: UID, email: 'a@example.com' });
    assert.strictEqual(s.calls[0].url, 'https://proj.supabase.co/auth/v1/user'); assert.strictEqual(s.calls[0].headers.apikey, 'anon-key-value'); assert.strictEqual(s.calls[0].headers.Authorization, 'Bearer a-valid-looking-token-1234567');
    assert(!JSON.stringify(s.calls[0]).includes('SECRET'), 'the service key is never sent when checking a person');
    assert.strictEqual(await store.verifyUser(ENV, 'another-token-another-token-1', s.fetchImpl), null, 'rejected token');
    assert.strictEqual(await store.verifyUser(ENV, 'third-token-third-token-3333', s.fetchImpl), null, 'an id that is not a uuid');
    assert.strictEqual(await store.verifyUser(ENV, 'fourth-token-fourth-token-44', s.fetchImpl), null, 'an empty answer');
    const before = s.calls.length;
    for (const bad of [undefined, null, '', 'short', 'has space in the token value here', 'x'.repeat(5000), 12345]) assert.strictEqual(await store.verifyUser(ENV, bad, s.fetchImpl), null);
    assert.strictEqual(s.calls.length, before, 'nothing malformed is sent to Supabase');
  });

  await test('reads: exact filters, names encoded, only the service key as credentials, always to the Supabase address', async () => {
    const s = stub([{ status: 200, body: [{ id: 'x', name: 'bakery' }] }, { status: 200, body: [] }, { status: 200, body: [{ id: 'a' }, { id: 'b' }] }]);
    const db = store.createDb(ENV, s.fetchImpl);
    assert.deepStrictEqual(await db.siteByName('bakery-anna'), { id: 'x', name: 'bakery' });
    assert.strictEqual(await db.holdByName('a&b=c'), null);
    assert.strictEqual((await db.sitesByUser(UID)).length, 2);
    assert(s.calls[0].url.startsWith('https://proj.supabase.co/rest/v1/published_sites?') && s.calls[0].url.endsWith('&name=eq.bakery-anna'));
    assert(s.calls[1].url.endsWith('&name=eq.a%26b%3Dc'), 'a name cannot add its own filter: ' + s.calls[1].url);
    for (const c of s.calls) { assert.strictEqual(c.headers.apikey, 'service-key-SECRET'); assert.strictEqual(c.headers.Authorization, 'Bearer service-key-SECRET'); assert(!c.url.includes('SECRET') && !String(c.body || '').includes('SECRET')); }
    assert.strictEqual(await db.siteById('not-a-uuid'), null); assert.strictEqual(s.calls.length, 3, 'a bad id never reaches the database');
  });

  await test('writes: insert maps duplicate and cap errors; a paid place is claimed only while free; versions and go-live use the functions', async () => {
    const s = stub([{ status: 201, body: [{ id: 'new' }] }, { status: 409, body: { code: '23505', message: 'duplicate key' } }, { status: 400, body: { code: 'P0001', message: 'too many sites' } }, { status: 500, body: { code: 'XX000', message: 'boom' } },
      { status: 200, body: [{ id: 'e1' }] }, { status: 200, body: [] }, { status: 200, body: 3 }, { status: 204 }, { status: 204 }, { status: 204 }]);
    const db = store.createDb(ENV, s.fetchImpl);
    assert.deepStrictEqual(await db.insertSite({ user_id: UID, name: 'abc', project_id: null }), { id: 'new' });
    assert.strictEqual(s.calls[0].method, 'POST'); assert.strictEqual(s.calls[0].headers.Prefer, 'return=representation');
    await assert.rejects(db.insertSite({ name: 'abc' }), (e) => e.code === 'name-taken');
    await assert.rejects(db.insertSite({ name: 'abc' }), (e) => e.code === 'too-many');
    await assert.rejects(db.insertSite({ name: 'abc' }), (e) => e.code === 'XX000');
    assert.strictEqual(await db.claimEntitlement('e1', 'site-9'), true);
    assert(s.calls[4].url.includes('site_id=is.null') && s.calls[4].url.includes('id=eq.e1') && s.calls[4].method === 'PATCH', 'only a free place can be claimed');
    assert.strictEqual(await db.claimEntitlement('e2', 'site-9'), false, 'a place that was just taken');
    assert.strictEqual(await db.reserveVersion('s1'), 3); assert(s.calls[6].url.endsWith('/rpc/reserve_site_version') && JSON.parse(s.calls[6].body).p_site === 's1');
    await db.goLive('s1', 3, { project_id: null }); assert.deepStrictEqual(JSON.parse(s.calls[7].body), { p_site: 's1', p_version: 3, p_project: null });
    await db.setStatus('s1', 'unpublished'); assert(s.calls[8].url.endsWith('published_sites?id=eq.s1') && JSON.parse(s.calls[8].body).status === 'unpublished');
    await db.deleteSite('s1'); assert.strictEqual(s.calls[9].method, 'DELETE');
  });

  await test('rename: the one database call, and its error codes turned into names', async () => {
    const s = stub([{ status: 200, body: { old: 'a-b-c', new: 'x-y-z', version: 2, status: 'live', held: ['a-b-c'] } }, { status: 400, body: { code: 'P0001', message: 'rename:taken' } }, { status: 400, body: { code: 'P0001', message: 'rename:too-many' } }, { status: 409, body: { code: '23505', message: 'duplicate key' } }, { status: 500, body: { code: 'XX000', message: 'boom' } }]);
    const db = store.createDb(ENV, s.fetchImpl);
    const ok = await db.renameSite({ siteId: 's1', userId: UID, newName: 'x-y-z', holdDays: 90 });
    assert.deepStrictEqual(ok.held, ['a-b-c']); assert(s.calls[0].url.endsWith('/rpc/rename_site')); assert.deepStrictEqual(JSON.parse(s.calls[0].body), { p_site: 's1', p_user: UID, p_new: 'x-y-z', p_hold_days: 90 });
    await assert.rejects(db.renameSite({ siteId: 's1', userId: UID, newName: 'x-y-z' }), (e) => e.code === 'rename-taken');
    await assert.rejects(db.renameSite({ siteId: 's1', userId: UID, newName: 'x-y-z' }), (e) => e.code === 'rename-too-many');
    await assert.rejects(db.renameSite({ siteId: 's1', userId: UID, newName: 'x-y-z' }), (e) => e.code === 'rename-taken', 'a duplicate-name error from the database is also "taken"');
    await assert.rejects(db.renameSite({ siteId: 's1', userId: UID, newName: 'x-y-z' }), (e) => e.code === 'XX000');
  });

  await test('a database error carries its status and code but never the keys', async () => {
    const s = stub([{ status: 503, body: { message: 'upstream unavailable' } }]);
    await assert.rejects(store.createDb(ENV, s.fetchImpl).siteByName('abc'), (e) => e.status === 503 && !/SECRET|anon-key/.test(e.message));
  });

  console.log(`✓ sites store: ${count} groups (sign-in check, reads, writes, errors)`);
})().catch((e) => { console.error(e); process.exit(1); });
