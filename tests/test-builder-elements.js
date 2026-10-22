const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');
const {
  assemblePreviewDocument,
  generateExportBundle,
  generateSingleFileBundle,
  THEME_PRESETS
} = require('../scripts/assembler.js');

// -------------------------------------------------------------
// Test 1: StackManager Element CRUD
// -------------------------------------------------------------
const sm = createStackManager();
const sec = sm.addSection('hero-section');
assert(sec && sec.id, 'Section must be created');

// Add Button
const btn = sm.addElement(sec.id, {
  type: 'button',
  x: 35,
  y: 65,
  text: 'Explore Works →',
  link: '#works',
  style: 'glass'
});
assert(btn && btn.id, 'Button element must be created');
assert.strictEqual(btn.x, 35);
assert.strictEqual(btn.y, 65);
assert.strictEqual(btn.text, 'Explore Works →');
assert.strictEqual(btn.style, 'glass');

// Add Image
const img = sm.addElement(sec.id, {
  type: 'image',
  x: 75,
  y: 20,
  imageUrl: 'https://images.unsplash.com/sample.jpg',
  imageSize: 'medium'
});
assert.strictEqual(sm.getSectionElements(sec.id).length, 2);

// Update element coordinates & text
sm.updateElement(sec.id, btn.id, { x: 40, y: 70, text: 'Updated Text' });
const elements = sm.getSectionElements(sec.id);
assert.strictEqual(elements[0].x, 40);
assert.strictEqual(elements[0].y, 70);
assert.strictEqual(elements[0].text, 'Updated Text');

// -------------------------------------------------------------
// Test 2: assemblePreviewDocument with Overlay Elements
// -------------------------------------------------------------
const previewSections = sm.getStack();
const previewHtml = assemblePreviewDocument(previewSections, THEME_PRESETS['midnight-dark']);

assert(previewHtml.includes('class="section-overlay-layer"'), 'Preview must include section-overlay-layer');
assert(previewHtml.includes('class="canvas-element element-button btn-style-glass"'), 'Preview must render button with style class');
assert(previewHtml.includes('Updated Text'), 'Preview must render button text');
assert(previewHtml.includes('left: 40%'), 'Preview must position button at left 40%');
assert(previewHtml.includes('top: 70%'), 'Preview must position button at top 70%');
assert(previewHtml.includes('class="canvas-element element-image img-size-medium"'), 'Preview must render image element');
assert(previewHtml.includes('src="https://images.unsplash.com/sample.jpg"'), 'Preview must render image src');

// -------------------------------------------------------------
// Test 3: Export Bundle with Overlay Elements
// -------------------------------------------------------------
const bundle = generateExportBundle(previewSections, THEME_PRESETS['midnight-dark']);
assert(bundle['index.html'].includes('class="section-overlay-layer"'), 'Exported index.html must include overlay layer');
assert(bundle['index.html'].includes('Updated Text'), 'Exported index.html must include custom button text');
assert(bundle['style.css'].includes('.section-overlay-layer'), 'Exported style.css must define .section-overlay-layer');
assert(bundle['style.css'].includes('.canvas-element'), 'Exported style.css must define .canvas-element');
assert(bundle['style.css'].includes('.btn-style-glass'), 'Exported style.css must define .btn-style-glass');

// -------------------------------------------------------------
// Test 4: Single File Bundle with Overlay Elements
// -------------------------------------------------------------
const singleHtml = generateSingleFileBundle(previewSections, THEME_PRESETS['midnight-dark']);
assert(singleHtml.includes('class="section-overlay-layer"'), 'Single file bundle must include overlay layer');
assert(singleHtml.includes('Updated Text'), 'Single file bundle must include custom button text');

// -------------------------------------------------------------
// Test 5: Remove Element
// -------------------------------------------------------------
const removed = sm.removeElement(sec.id, btn.id);
assert.strictEqual(removed, true, 'Element should be removed');
assert.strictEqual(sm.getSectionElements(sec.id).length, 1);

console.log('✅ All draggable elements tests passed successfully!');
