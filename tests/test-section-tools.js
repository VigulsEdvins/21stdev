// Lock, hide and the guards around them.
const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');
const A = require('../scripts/assembler.js');

const sm = createStackManager();
const a = sm.addSection('hero-a');
const b = sm.addSection('hero-b');
const c = sm.addSection('hero-c');

sm.setSectionFlag(b.id, 'locked', true);
assert(sm.isLocked(b.id));
assert.strictEqual(sm.removeSection(b.id), false, 'locked section cannot be removed');
sm.moveSection(b.id, -1);
assert.deepStrictEqual(sm.getStack().map(s => s.id), [a.id, b.id, c.id], 'locked section does not move');
sm.reorderStack(1, 0);
assert.strictEqual(sm.getStack()[0].id, a.id, 'locked section is not dragged');
assert.strictEqual(sm.replaceSection(b.id, 'other'), null, 'locked section cannot be replaced');
assert.strictEqual(sm.updateSectionSizing(b.id, { heightMode: 'screen' }), null, 'locked sizing unchanged');
assert.strictEqual(sm.setSectionOverride(b.id, 'f', 'x', { selector: 'h1', type: 'text' }), null);
const dup = sm.duplicateSection(b.id);
assert(dup && !dup.locked, 'a duplicate of a locked section is not locked');
sm.setSectionFlag(b.id, 'locked', false);
assert(!sm.isLocked(b.id));
assert.strictEqual(sm.removeSection(b.id), true, 'unlocked section can be removed again');
assert.strictEqual(sm.setSectionFlag(a.id, 'bogus', true), null, 'only locked/hidden flags exist');

// hidden sections are left out of the preview and the exports
const feats = { 'hero-a': { html: '<h1>AAA</h1>', css: '', js: '' }, 'hero-c': { html: '<h1>CCC</h1>', css: '', js: '' } };
sm.setSectionFlag(a.id, 'hidden', true);
const stack = sm.getStack();
assert(stack.find(s => s.id === a.id).hidden);
const preview = A.assemblePreviewDocument(stack, 'midnight-dark', feats);
assert(!preview.includes('AAA') && preview.includes('CCC'), 'hidden section is not in the preview');
const bundle = A.generateExportBundle(stack, 'midnight-dark', feats);
assert(!bundle['index.html'].includes('AAA') && bundle['index.html'].includes('CCC'), 'hidden section is not in the ZIP');
assert(!A.generateSingleFileBundle(stack, 'midnight-dark', feats).includes('AAA'), 'hidden section is not in the single file');
console.log('✅ Section tools tests passed!');
