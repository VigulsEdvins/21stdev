// "My pages": rows are cleaned before they reach the page, names are checked, and a failing service never throws.
const assert = require('assert');
const M = require('../site/js/my-pages.js');

const ID = '11111111-1111-4111-8111-111111111111';
assert.deepStrictEqual(M.cleanRow({ id: ID, name: '  Cafe  ', status: 'paid', updated_at: '2026-10-28T10:00:00Z' }), { id: ID, name: 'Cafe', status: 'paid', updatedAt: '2026-10-28T10:00:00.000Z' });
assert.strictEqual(M.cleanRow({ id: ID, name: '', status: 'hacked', updated_at: 'nonsense' }).name, 'Untitled page', 'empty name gets a plain one');
assert.strictEqual(M.cleanRow({ id: ID, status: 'hacked' }).status, 'draft', 'an unknown status counts as draft');
assert.strictEqual(M.cleanRow({ id: ID, name: 'x'.repeat(500) }).name.length, M.NAME_MAX, 'long names are cut');
['', 'abc', '1; drop table', null, undefined, {}, { id: 5 }].forEach((bad) => assert.strictEqual(M.cleanRow(bad && bad.id === undefined ? bad : bad), null, 'a row without a real id is dropped: ' + JSON.stringify(bad)));

(async () => {
  const calls = [];
  const ok = (rows) => async (u, o) => { calls.push({ u, method: (o && o.method) || 'GET', body: o && o.body }); return { ok: true, json: async () => rows }; };
  const api = (f, token) => M.create({ url: 'https://x.test/', anonKey: 'k', token: token || (async () => 't'), fetchImpl: f, now: () => '2026-10-28T12:00:00.000Z' });

  const list = await api(ok([{ id: ID, name: 'A', status: 'draft', updated_at: '2026-10-01T00:00:00Z' }, { id: 'bad' }])).list();
  assert(list.ok && list.pages.length === 1, 'bad rows are dropped');
  assert(/deleted_at=is\.null/.test(calls[0].u) && /order=updated_at\.desc/.test(calls[0].u), 'asks only for pages that are not deleted, newest first');

  const none = await api(ok([]), async () => null).list();
  assert(!none.ok && /sign in/i.test(none.message), 'no token: asks to sign in, sends nothing');

  const boom = await api(async () => { throw new Error('offline'); }).list();
  assert(!boom.ok && /could not reach/.test(boom.message), 'a network failure is an answer, not an exception');
  const refused = await api(async () => ({ ok: false, status: 500, json: async () => ({}) })).remove(ID);
  assert(!refused.ok, 'a refused change is reported');

  calls.length = 0;
  const a = api(ok([]));
  assert(!(await a.rename(ID, '   ')).ok && !(await a.rename(ID, 'x'.repeat(121))).ok, 'empty and too long names are refused before any call');
  assert(!(await a.remove('1;delete')).ok, 'an id that is not an id is refused before any call');
  assert.strictEqual(calls.length, 0, 'no call was made for any of those');
  await a.rename(ID, 'New name'); await a.remove(ID); await a.restore(ID);
  assert.deepStrictEqual(calls.map((c) => c.method), ['PATCH', 'PATCH', 'PATCH']);
  assert.deepStrictEqual(JSON.parse(calls[0].body), { name: 'New name', updated_at: '2026-10-28T12:00:00.000Z' });
  assert.deepStrictEqual(JSON.parse(calls[1].body), { deleted_at: '2026-10-28T12:00:00.000Z' }, 'delete only sets a date, nothing is erased');
  assert.deepStrictEqual(JSON.parse(calls[2].body), { deleted_at: null }, 'undo clears it');
  assert(calls.every((c) => !/status|user_id/.test(c.body)), 'the page never sends status or owner');
  console.log('my pages ok');
})().catch((e) => { console.error(e); process.exit(1); });
