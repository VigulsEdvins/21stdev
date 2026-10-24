const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createStackManager } = require('../scripts/stack-manager.js');
const { renderSectionOverlayHtml, OVERLAY_ELEMENT_CSS, assemblePreviewDocument, THEME_PRESETS } = require('../scripts/assembler.js');

console.log('Testing Universal Custom Width & Height Sizing Controls & Corner/Edge Live Handles...');

// 1. StackManager element width and height handling & clamping
const sm = createStackManager();
const sec = sm.addSection('hero-section');

// Test addElement with width and height
const btn = sm.addElement(sec.id, {
  type: 'button',
  text: 'Explore Platform',
  width: 240,
  height: 54
});

assert(btn, 'Button element should be created');
assert.strictEqual(btn.width, 240, 'Button width should be 240');
assert.strictEqual(btn.height, 54, 'Button height should be 54');

// Test min width (30px) and min height (20px) clamping on addElement
const tinyEl = sm.addElement(sec.id, {
  type: 'button',
  width: 10,
  height: 5
});
assert.strictEqual(tinyEl.width, 30, 'Width below 30 should clamp to 30');
assert.strictEqual(tinyEl.height, 20, 'Height below 20 should clamp to 20');

// Test updateElement with width and height (and clamping)
sm.updateElement(sec.id, btn.id, { width: 320, height: 60 });
const updatedBtn = sm.getSectionElements(sec.id).find(e => e.id === btn.id);
assert.strictEqual(updatedBtn.width, 320, 'Updated width should be 320');
assert.strictEqual(updatedBtn.height, 60, 'Updated height should be 60');

sm.updateElement(sec.id, btn.id, { width: 15, height: 10 });
const clampedBtn = sm.getSectionElements(sec.id).find(e => e.id === btn.id);
assert.strictEqual(clampedBtn.width, 30, 'Updated width below 30 should clamp to 30');
assert.strictEqual(clampedBtn.height, 20, 'Updated height below 20 should clamp to 20');

// Test string px dimensions support
sm.updateElement(sec.id, btn.id, { width: '400px', height: '80px' });
const pxBtn = sm.getSectionElements(sec.id).find(e => e.id === btn.id);
assert.strictEqual(pxBtn.width, '400px', 'String width with px should be preserved/clamped');
assert.strictEqual(pxBtn.height, '80px', 'String height with px should be preserved/clamped');

// 2. Assembler renderSectionOverlayHtml styling
const overlayHtml = renderSectionOverlayHtml([
  {
    id: 'el-sized-1',
    type: 'button',
    x: 50,
    y: 50,
    width: 250,
    height: 50,
    text: 'Sized Button'
  },
  {
    id: 'el-sized-2',
    type: 'image',
    x: 30,
    y: 40,
    width: '360px',
    height: '240px',
    imageUrl: 'https://example.com/test.jpg'
  }
]);

assert(overlayHtml.includes('width: 250px;'), 'renderSectionOverlayHtml must render numeric width with px');
assert(overlayHtml.includes('height: 50px;'), 'renderSectionOverlayHtml must render numeric height with px');
assert(overlayHtml.includes('width: 360px;'), 'renderSectionOverlayHtml must render string width');
assert(overlayHtml.includes('height: 240px;'), 'renderSectionOverlayHtml must render string height');

// 3. OVERLAY_ELEMENT_CSS checks for handles & sizing
assert(OVERLAY_ELEMENT_CSS.includes('.el-resize-handle'), 'OVERLAY_ELEMENT_CSS must include .el-resize-handle styles');
assert(OVERLAY_ELEMENT_CSS.includes('nwse-resize'), 'OVERLAY_ELEMENT_CSS must include nwse-resize cursor');
assert(OVERLAY_ELEMENT_CSS.includes('nesw-resize'), 'OVERLAY_ELEMENT_CSS must include nesw-resize cursor');
assert(OVERLAY_ELEMENT_CSS.includes('ns-resize'), 'OVERLAY_ELEMENT_CSS must include ns-resize cursor');
assert(OVERLAY_ELEMENT_CSS.includes('ew-resize'), 'OVERLAY_ELEMENT_CSS must include ew-resize cursor');

// 4. builder.html validation
const builderHtml = fs.readFileSync(path.join(__dirname, '../builder.html'), 'utf-8');
assert(builderHtml.includes('id="toolbarBtnWidth"'), 'builder.html must include #toolbarBtnWidth');
assert(builderHtml.includes('id="toolbarBtnHeight"'), 'builder.html must include #toolbarBtnHeight');
assert(builderHtml.includes('id="toolbarImgWidth"'), 'builder.html must include #toolbarImgWidth');
assert(builderHtml.includes('id="toolbarImgHeight"'), 'builder.html must include #toolbarImgHeight');
assert(builderHtml.includes('data-action="resize-element"'), 'builder.html context menu must include resize-element option');

console.log('✅ All element sizing tests passed successfully!');
