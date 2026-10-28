// Saving the builder's page into the account, against the pretend Supabase: create, save, "nothing changed", two devices, deleted elsewhere,
// the 25-page limit, a page that is too large, no network, and a link that belongs to someone else.
const assert = require('assert');
const crypto = require('crypto');
const { start } = require('./lib/fake-supabase.js');
const C = require('../site/js/cloud-save.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

(async () => {
  const fake = await start({ confirmEmails: false });
  const seed = (email) => { const u = { id: crypto.randomUUID(), email, provider: 'email', password: 'x', confirmed: true }; fake.users.set(email, u); const tok = 'access-' + crypto.randomUUID(); fake.sessions.set(tok, email); return { id: u.id, tok }; };
  const anna = seed('anna@example.com'), ben = seed('ben@example.com');
  const device = (who, extra) => C.create(Object.assign({ url: fake.url, anonKey: fake.anonKey, token: async () => who.tok, storage: mem() }, extra));
  const page = (n) => ({ stack: [{ id: 's1', slug: 'hero', title: 'Hero ' + n }], theme: 'midnight-dark', page: { title: 'Bakery' } });

  // 1. first save creates, the same page again changes nothing, a change saves
  const a = device(anna);
  let r = await a.push(page(1), { userId: anna.id, name: 'Bakery' });
  assert(r.ok && r.action === 'created', 'first save creates the account page');
  const row = [...fake.projects.values()][0];
  assert(row.user_id === anna.id && row.name === 'Bakery' && row.revision === 1 && row.status === 'draft', 'owner, name, revision 1, draft');
  assert.strictEqual((await a.push(page(1), { userId: anna.id })).action, 'same', 'nothing changed, nothing sent');
  const callsBefore = fake.calls.length; await a.push(page(1), { userId: anna.id }); assert.strictEqual(fake.calls.length, callsBefore, 'a repeated save makes no request');
  r = await a.push(page(2), { userId: anna.id });
  assert(r.ok && r.action === 'saved' && row.revision === 2 && row.state.stack[0].title === 'Hero 2', 'a change is saved as revision 2');
  console.log('  ✓ create, same, save');

  // the fingerprint ignores the order of keys (the builder writes the same page in another order after a reload)
  assert.strictEqual(C.hash({ a: 1, b: { c: 2, d: 3 } }), C.hash({ b: { d: 3, c: 2 }, a: 1 }), 'key order does not change the fingerprint');
  assert.notStrictEqual(C.hash({ a: 1 }), C.hash({ a: 2 }));

  // 2. a second device opens it, then both save: the later one is told, nothing is overwritten
  const b = device(anna);
  const opened = await b.open(row.id);
  assert(opened.ok && opened.project.revision === 2 && opened.project.name === 'Bakery', 'the other device opens the page');
  b.adopt(opened.project, anna.id, opened.project.state);
  assert((await a.push(page(3), { userId: anna.id })).action === 'saved' && row.revision === 3, 'device A saves revision 3');
  r = await b.push(page(9), { userId: anna.id });
  assert(!r.ok && r.action === 'conflict', 'device B started from revision 2: told, not overwritten');
  assert.strictEqual(row.state.stack[0].title, 'Hero 3', "device A's work is untouched");
  r = await b.push(page(9), { userId: anna.id, force: true });
  assert(r.ok && r.action === 'saved' && row.state.stack[0].title === 'Hero 9' && row.revision === 4, 'after the person chooses "keep mine", it is saved over');
  assert((await a.push(page(4), { userId: anna.id })).action === 'conflict', 'and now A is the one told');
  console.log('  ✓ two devices: the later save is told, never overwrites; the person can choose');

  // 3. deleted from the account page while the builder is open
  row.deleted_at = new Date().toISOString();
  r = await b.push(page(10), { userId: anna.id });
  assert(!r.ok && r.action === 'gone' && b.link(anna.id) === null, 'a page deleted elsewhere is reported and the link dropped');
  r = await b.push(page(10), { userId: anna.id, name: 'Again' });
  assert(r.ok && r.action === 'created', 'the next save starts a new account page');
  console.log('  ✓ a page deleted elsewhere is reported, the next save starts a new one');

  // 4. a link belongs to one person
  const sh = mem(); const x = C.create({ url: fake.url, anonKey: fake.anonKey, token: async () => anna.tok, storage: sh });
  await x.push(page(1), { userId: anna.id });
  const y = C.create({ url: fake.url, anonKey: fake.anonKey, token: async () => ben.tok, storage: sh });
  assert.strictEqual(y.link(ben.id), null, 'someone else signing in on the same browser does not inherit the link');
  r = await y.push(page(1), { userId: ben.id, name: 'Ben page' });
  assert(r.action === 'created' && [...fake.projects.values()].some((p) => p.user_id === ben.id && p.name === 'Ben page'), 'they get their own page');
  console.log('  ✓ a link never carries over to another person');

  // 5. limit, size, offline, signed out
  const c = seed('carl@example.com'); const lim = device(c);
  for (let i = 0; i < 25; i++) fake.addProject('carl@example.com', 'P' + i, {});
  r = await lim.push(page(1), { userId: c.id });
  assert(!r.ok && r.action === 'limit' && /25/.test(r.message), 'the 26th page is refused in plain words');
  const huge = { stack: [{ id: 's', blob: 'x'.repeat(C.MAX_BYTES) }] };
  const n = fake.calls.length; r = await device(anna).push(huge, { userId: anna.id });
  assert(!r.ok && r.action === 'too-big' && fake.calls.length === n, 'a page that is too large is refused before any request');
  r = await device(anna, { fetchImpl: async () => { throw new Error('offline'); } }).push(page(1), { userId: anna.id });
  assert(!r.ok && r.action === 'offline' && /kept in this browser/.test(r.message), 'no network is an answer, not an exception');
  r = await device(anna, { token: async () => null }).push(page(1), { userId: anna.id });
  assert(!r.ok && r.action === 'signed-out', 'no token: asks to sign in');
  r = await device(anna).open('not-an-id'); assert(!r.ok && r.action === 'gone', 'a made-up id is refused');
  r = await device(ben).open(row.id); assert(!r.ok && r.action === 'gone', "someone else's page cannot be opened");
  console.log('  ✓ limit, too large, offline, signed out, other people\'s pages');

  await fake.close();
  console.log('cloud save ok');
})().catch((e) => { console.error(e); process.exit(1); });
