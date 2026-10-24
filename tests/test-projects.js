const assert = require('assert');
const { createProjectStore } = require('../scripts/projects.js');
const { createStackManager } = require('../scripts/stack-manager.js');

console.log('Testing client project store...');

const mem = {};
const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
const store = createProjectStore(storage, { maxSnapshots: 3 });
const state = { stack: [{ id: 'a', slug: 'hero' }], theme: 'midnight-dark', customColors: {}, page: { title: 'Acme' } };

assert.deepStrictEqual(store.list(), []);
const p1 = store.create({ name: '  Acme  ', client: 'Acme Ltd', state });
assert.strictEqual(p1.name, 'Acme');
assert.strictEqual(store.activeId(), p1.id);
assert.throws(() => store.create({ name: 'x', state: {} }), /needs a state/);

// state is copied, not shared
state.stack.push({ id: 'b' });
assert.strictEqual(store.get(p1.id).state.stack.length, 1);

assert.strictEqual(store.saveState(p1.id, state), true);
assert.strictEqual(store.list()[0].sections, 2);
assert.strictEqual(store.saveState(p1.id, { nope: true }), false, 'invalid state rejected');

// snapshots trimmed to max, newest first, restorable
for (let i = 0; i < 5; i++) store.snapshot(p1.id, 'v' + i);
const snaps = store.snapshots(p1.id);
assert.strictEqual(snaps.length, 3);
assert.strictEqual(snaps[0].label, 'v4');
assert.strictEqual(store.restoreSnapshot(p1.id, snaps[2].id).stack.length, 2);
assert.strictEqual(store.deleteSnapshot(p1.id, snaps[0].id), true);
assert.strictEqual(store.snapshots(p1.id).length, 2);

// export / import round trip
const json = store.exportProject(p1.id, { favourites: ['a', 'b', 7] });
const imported = store.importProject(json);
assert.deepStrictEqual(imported.extras.favourites, ['a', 'b'], 'starred components travel with the file (non-strings dropped)');
assert.notStrictEqual(imported.id, p1.id);
assert.strictEqual(imported.name, 'Acme');
assert.strictEqual(imported.state.stack.length, 2);
assert.strictEqual(imported.snapshots.length, 2);
assert.strictEqual(store.activeId(), imported.id);
assert.throws(() => store.importProject('not json'), /not valid JSON/);
assert.throws(() => store.importProject(JSON.stringify({ hello: 1 })), /not a Web Builder project/);
assert.throws(() => store.importProject(JSON.stringify({ format: 'web-builder-project', project: { state: {} } })), /no page content/);

// remove switches active project
assert.strictEqual(store.remove(imported.id), true);
assert.strictEqual(store.activeId(), p1.id);
assert.strictEqual(store.remove('missing'), false);

// corrupted storage is tolerated
mem['web_builder_projects_v1'] = '{oops';
assert.deepStrictEqual(store.list(), []);

// quota errors do not throw from saveState, but create reports them
const full = createProjectStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
assert.throws(() => full.create({ name: 'x', state }), /storage is full/);

// stack manager: page settings and overrides
const m = createStackManager();
m.addSection('hero');
const id = m.getStack()[0].id;
m.setPage({ title: 'Acme', fontBody: 'Inter', bogus: 'ignored' });
assert.strictEqual(m.getState().page.title, 'Acme');
assert.strictEqual(m.getState().page.bogus, undefined);
assert.strictEqual(m.setSectionOverride(id, 'h1', 'Hello', { selector: 'h1', type: 'text' }), true);
assert.deepStrictEqual(m.getStack()[0].overrides.h1, { selector: 'h1', type: 'text', value: 'Hello' });
m.setSectionOverride(id, 'h1', 'Changed');
assert.strictEqual(m.getStack()[0].overrides.h1.value, 'Changed', 'definition is kept when only the value changes');
m.setSectionOverride(id, 'h1', '');
assert.deepStrictEqual(m.getStack()[0].overrides, {});
assert.strictEqual(m.setSectionOverride('nope', 'x', 'y', { selector: 'p' }), false);

console.log('✅ Project store tests passed!');
