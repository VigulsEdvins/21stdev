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

// responsive settings: hide per breakpoint, padding per breakpoint
const rm = createStackManager();
const r1 = rm.addSection('hero-a');
rm.setSectionHideOn(r1.id, ['mobile', 'bogus', 'mobile', 'tablet']);
assert.deepStrictEqual(rm.getStack()[0].hideOn, ['mobile', 'tablet'], 'unknown breakpoints dropped, duplicates merged');
rm.updateSectionSizing(r1.id, { paddingYTablet: 'compact', paddingYMobile: 'none' });
const css = A.renderResponsiveCss(rm.getStack());
assert(/@media \(max-width: 767px\) \{[^}]*#[\w-]+ \{ display: none !important; \}/.test(css), 'mobile hide rule');
assert(/@media \(min-width: 768px\) and \(max-width: 1023px\)/.test(css) && css.includes('padding-top: 32px !important'), 'tablet padding rule');
assert(css.includes('padding-top: 0px !important'), 'a zero padding is written, not skipped');
assert(!/min-width: 1024px/.test(css), 'no desktop rule when nothing is hidden there');
assert.strictEqual(A.renderResponsiveCss([{ id: 'a', sizing: {} }]), '', 'nothing set, nothing written');
assert(A.generateExportBundle(rm.getStack(), 'midnight-dark', { 'hero-a': { html: '<h1>x</h1>', css: '', js: '' } })['style.css'].includes('Responsive section settings'), 'export carries the rules');
assert(A.assemblePreviewDocument(rm.getStack(), 'midnight-dark', { 'hero-a': { html: '<h1>x</h1>', css: '', js: '' } }).includes('Responsive section settings'), 'preview carries the rules');
rm.setSectionHideOn(r1.id, []);
assert.strictEqual(rm.getStack()[0].hideOn, undefined);
console.log('✅ Responsive settings tests passed!');
