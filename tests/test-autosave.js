// Autosave safety net: backup of the previous copy, full-storage handling, corrupt-copy recovery.
const assert = require('assert');
const { createAutosave } = require('../scripts/builder/autosave.js');

function fakeStorage({ quota = Infinity } = {}) {
  const data = {};
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    removeItem: k => { delete data[k]; },
    setItem(k, v) {
      const used = Object.entries(data).filter(([key]) => key !== k).reduce((n, [, val]) => n + val.length, 0);
      if (used + v.length > quota) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
      data[k] = v;
    }
  };
}

// 1. a save keeps the previous good copy
let s = fakeStorage();
let a = createAutosave({ storage: s, key: 'k' });
assert(a.save({ stack: [1] }));
assert(a.save({ stack: [1, 2] }));
assert.deepStrictEqual(JSON.parse(s.data.k), { stack: [1, 2] });
assert.deepStrictEqual(JSON.parse(s.data.k_prev), { stack: [1] });
assert.deepStrictEqual(a.load(), { state: { stack: [1, 2] }, status: 'ok' });

// 2. nothing saved yet
assert.deepStrictEqual(createAutosave({ storage: fakeStorage(), key: 'k' }).load(), { state: null, status: 'none' });

// 3. a corrupt copy is kept aside and the previous good copy is used
s.data.k = '{"stack":[1,2';
const rec = a.load();
assert.strictEqual(rec.status, 'recovered');
assert.deepStrictEqual(rec.state, { stack: [1] });
assert.strictEqual(s.data.k_corrupt, '{"stack":[1,2');

// 4. corrupt with no backup
s = fakeStorage(); s.data.k = 'not json';
assert.strictEqual(createAutosave({ storage: s, key: 'k' }).load().status, 'corrupt');
assert.strictEqual(s.data.k_corrupt, 'not json');

// 5. storage full: backups are dropped and the save is retried; the warning clears when it works again
const events = [];
s = fakeStorage({ quota: 160 });
a = createAutosave({ storage: s, key: 'k', onStatus: e => events.push(e) });
assert(a.save({ v: 'x'.repeat(30) }));
assert(a.save({ v: 'y'.repeat(30) }));
assert('k_prev' in s.data, 'backup exists while there is room');
assert(a.save({ v: 'w'.repeat(125) }), 'retry after dropping the backup succeeds');
assert(!('k_prev' in s.data), 'backup dropped to make room');
assert.deepStrictEqual(events, [], 'no warning when the retry works');
assert.strictEqual(a.save({ v: 'z'.repeat(400) }), false, 'a state that can never fit fails');
assert.deepStrictEqual(events.pop(), { ok: false, reason: 'full' });
assert(a.isFailing());
assert(a.save({ v: 'ok' }));
assert.deepStrictEqual(events.pop(), { ok: true }, 'warning cleared by the next good save');

// 6. blocked storage (private window): reported, no throw
const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => {} };
const ev2 = [];
const b = createAutosave({ storage: blocked, key: 'k', onStatus: e => ev2.push(e) });
assert.strictEqual(b.save({ a: 1 }), false);
assert.deepStrictEqual(ev2, [{ ok: false, reason: 'blocked' }]);
assert.deepStrictEqual(b.load(), { state: null, status: 'none' });
console.log('✅ Autosave tests passed!');
