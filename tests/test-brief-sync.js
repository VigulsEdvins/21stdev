/* Saving the answers to the account (site/js/brief-sync.js) against the pretend Supabase: save, same, restore, newest wins, never throws, only the owner's row. */
const assert = require('assert');
const { start } = require('./lib/fake-supabase.js');
const A = require('../site/js/auth.js');
const S = require('../site/js/brief-sync.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const brief = (extra) => Object.assign({ v: 1, path: 'self', answers: { purpose: { value: 'business', unknown: false }, editor: { value: 'yes', unknown: false } } }, extra);

(async () => {
  const fake = await start({ confirmEmails: false });
  const device = async (email) => {
    const storage = mem(), auth = A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage, tempStorage: mem(), origin: 'http://x.test' });
    const r = await auth.signIn(email, 'Correct-Horse-1!'); assert(r.ok, 'sign in ' + email + ' ' + r.message);
    const who = await auth.current();
    return { storage, who, sync: (o) => S.create({ url: fake.url, anonKey: fake.anonKey, token: () => auth.accessToken(), storage }).sync(Object.assign({ userId: who.id }, o)) };
  };
  for (const e of ['anna@example.com', 'ben@example.com']) { const s = await A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage: mem(), tempStorage: mem(), origin: 'http://x.test' }).signUp(e, 'Correct-Horse-1!'); assert(s.ok, s.message); }

  const phone = await device('anna@example.com');
  assert.deepStrictEqual(await phone.sync(), { ok: true, action: 'none' }, 'nothing anywhere: nothing happens');
  phone.storage.setItem(S.KEY, JSON.stringify(brief({ pending: true, sent: false })));
  assert.strictEqual((await phone.sync()).action, 'saved', 'answers here, none there: saved');
  assert(!('pending' in [...fake.briefs.values()][0].brief) && !('sent' in [...fake.briefs.values()][0].brief), 'lead state is not stored');
  assert.strictEqual((await phone.sync()).action, 'same', 'a second sync with nothing new writes nothing');
  console.log('  ✓ saved once, then same');

  const laptop = await device('anna@example.com');
  assert.strictEqual((await laptop.sync()).action, 'restored', 'a new device with no answers gets them back');
  assert.deepStrictEqual(JSON.parse(laptop.storage.getItem(S.KEY)), S.forAccount(brief()), 'and they are the saved ones');
  console.log('  ✓ restored on another device');

  laptop.storage.setItem(S.KEY, JSON.stringify(brief({ answers: { purpose: { value: 'event', unknown: false } } })));
  assert.strictEqual((await laptop.sync()).action, 'saved', 'answers on this device win: newest wins');
  assert.strictEqual((await phone.sync()).action, 'saved', 'and the phone, still holding the older ones, writes its own: this device wins when it syncs');
  console.log('  ✓ the device that syncs wins');

  const before = JSON.stringify([...fake.briefs.values()]);
  assert.strictEqual((await phone.sync({ pullOnly: true })).action, 'same', 'pull only: answers here are left alone');
  assert.strictEqual(JSON.stringify([...fake.briefs.values()]), before, 'and the account is not overwritten by an older device');
  const fresh = await device('anna@example.com');
  assert.strictEqual((await fresh.sync({ pullOnly: true })).action, 'restored', 'pull only still restores into an empty browser');
  console.log('  ✓ pull only never writes');

  const ben = await device('ben@example.com');
  assert.strictEqual((await ben.sync()).action, 'none', 'another person sees nothing of Anna\'s row');
  assert.strictEqual(fake.briefs.size, 2 - 1, 'still one row');
  const stolen = await fetch(fake.url + '/rest/v1/briefs', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: fake.anonKey, Authorization: 'Bearer ' + (await A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage: ben.storage, tempStorage: mem(), origin: 'http://x.test' }).accessToken()) }, body: JSON.stringify({ user_id: phone.who.id, brief: brief() }) });
  assert.strictEqual(stolen.status, 403, 'writing a row for someone else is refused');
  const anon = await fetch(fake.url + '/rest/v1/briefs', { headers: { apikey: fake.anonKey } }); assert.strictEqual(anon.status, 401, 'no token, no access');
  console.log('  ✓ only the owner reaches the row');

  // bad data is never put into the page; failures never throw
  fake.briefs.set(ben.who.id, { brief: { v: 1, answers: { nope: { value: 'x', unknown: false } } } });
  assert.strictEqual((await ben.sync()).action, 'none', 'a stored brief that fails the checker is ignored');
  const empty = mem();
  assert.strictEqual((await S.create({ url: 'http://127.0.0.1:1', anonKey: 'k', token: async () => 'tok', storage: empty }).sync({ userId: 'u' })).ok, false, 'unreachable service: a plain answer, no throw');
  assert.strictEqual((await S.create({ url: fake.url, anonKey: fake.anonKey, token: async () => null, storage: empty }).sync({ userId: 'u' })).ok, false, 'not signed in: nothing sent');
  console.log('  ✓ bad rows ignored, failures are quiet');

  await fake.close(); console.log('brief-sync ok');
})().catch((e) => { console.error(e); process.exit(1); });
