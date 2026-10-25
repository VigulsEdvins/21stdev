const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');
const { assemblePreviewDocument, generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');

console.log('Testing Section Sizing & Resize Controls...');

// 1. StackManager Section Sizing State
const sm = createStackManager();
const sec1 = sm.addSection('hero-section');
const sec2 = sm.addSection('content-section');

// Default sizing
assert.deepStrictEqual(sec1.sizing, {
  heightMode: 'auto',
  customHeight: 600,
  paddingY: 'none'
});

// Update sizing for sec1 to Screen (100vh) with medium padding
sm.updateSectionSizing(sec1.id, {
  heightMode: 'screen',
  paddingY: 'medium'
});

// Update sizing for sec2 to Custom height 820px
sm.updateSectionSizing(sec2.id, {
  heightMode: 'custom',
  customHeight: 820,
  paddingY: 'compact'
});

const updatedSec1 = sm.getStack().find(s => s.id === sec1.id);
assert.strictEqual(updatedSec1.sizing.heightMode, 'screen');
assert.strictEqual(updatedSec1.sizing.paddingY, 'medium');

const updatedSec2 = sm.getStack().find(s => s.id === sec2.id);
assert.strictEqual(updatedSec2.sizing.heightMode, 'custom');
assert.strictEqual(updatedSec2.sizing.customHeight, 820);
assert.strictEqual(updatedSec2.sizing.paddingY, 'compact');

// 2. Preview Document Sizing & Resize Handles
const previewDoc = assemblePreviewDocument(sm.getStack(), THEME_PRESETS['midnight-dark']);

// Check section 1 sizing rules in preview
assert(previewDoc.includes('min-height: 100vh'), 'Preview must apply min-height: 100vh for screen mode');
assert(previewDoc.includes('padding-top: 64px'), 'Preview must apply padding-top: 64px for medium padding');
assert(previewDoc.includes('padding-bottom: 64px'), 'Preview must apply padding-bottom: 64px for medium padding');

// Check section 2 custom height
assert(previewDoc.includes('min-height: 820px'), 'Preview must apply custom height 820px');
assert(previewDoc.includes('padding-top: 32px'), 'Preview must apply compact padding');

// Check bottom resize handle injected for live interactive dragging
assert(previewDoc.includes('class="section-resize-handle"'), 'Preview must include .section-resize-handle');
assert(previewDoc.includes(`data-resize-section="${sec1.id}"`), 'Resize handle must reference section id');

// 3. Export Bundle Sizing
const bundle = generateExportBundle(sm.getStack(), THEME_PRESETS['midnight-dark']);
const indexHtml = bundle['index.html'];

assert(indexHtml.includes('min-height: 100vh'), 'Exported index.html must retain section sizing');
assert(indexHtml.includes('min-height: 820px'), 'Exported index.html must retain custom height');

console.log('✅ Section Sizing tests passed!');

// 2. Fit scale: shrinking a section shrinks its content down to the component's minimum, then stops
const SectionFit = require('../scripts/builder/section-fit.js');
assert.deepStrictEqual(SectionFit.fit(800, 600, 0.6), { height: 800, scale: 1, minHeight: 360, atMinimum: false });
assert.strictEqual(SectionFit.fit(450, 600, 0.6).scale, 0.75);
const floor = SectionFit.fit(100, 600, 0.6);
assert.strictEqual(floor.height, 360);
assert.strictEqual(floor.scale, 0.6);
assert.strictEqual(floor.atMinimum, true);
assert.strictEqual(SectionFit.fit(100, 600, 0.8).height, 480);
assert.strictEqual(SectionFit.fit(100, 600, 'junk').scale, SectionFit.DEFAULT_MIN_SCALE);

const fitSm = createStackManager();
const fitSec = fitSm.addSection('hero-section');
fitSm.updateSectionSizing(fitSec.id, { heightMode: 'custom', customHeight: 450, fitScale: 0.75 });
const fitDoc = assemblePreviewDocument(fitSm.getStack(), THEME_PRESETS.dark || Object.values(THEME_PRESETS)[0], {});
assert.ok(fitDoc.includes('zoom: 0.75'), 'preview applies the fit scale');
fitSm.updateSectionSizing(fitSec.id, { heightMode: 'auto' });
assert.ok(!assemblePreviewDocument(fitSm.getStack(), THEME_PRESETS.dark || Object.values(THEME_PRESETS)[0], {}).includes('zoom: 0.75'), 'auto height drops the scale');
console.log('Section fit scale OK');
