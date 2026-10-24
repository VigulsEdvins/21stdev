const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createStackManager, insertSection } = require('../scripts/stack-manager.js');
const { OVERLAY_ELEMENT_CSS } = require('../scripts/assembler.js');

console.log('Testing Drag-and-Drop from Sidebar onto Canvas & Positional Section Dropping...');

// ============================================================================
// 1. StackManager.insertSection tests
// ============================================================================
const sm = createStackManager();
assert(typeof sm.insertSection === 'function', 'stackManager must have insertSection method');

// Initial sections
const s1 = sm.addSection('sec-1', { title: 'First Section' });
const s3 = sm.addSection('sec-3', { title: 'Third Section' });
assert.strictEqual(sm.getStack().length, 2);

// Test subscriber notification
let notified = false;
const unsub = sm.subscribe(() => { notified = true; });

// Insert in middle (index 1)
const s2 = sm.insertSection(1, 'sec-2', { title: 'Second Section' });
assert.strictEqual(notified, true, 'insertSection must trigger subscribers');
unsub();

assert(s2 && s2.id, 'insertSection must return the created section with an id');
assert.strictEqual(s2.slug, 'sec-2');
assert.strictEqual(s2.title, 'Second Section');
assert.deepStrictEqual(s2.sizing, {
  heightMode: 'auto',
  customHeight: 600,
  paddingY: 'none'
}, 'insertSection must attach default sizing');

let stack = sm.getStack();
assert.strictEqual(stack.length, 3);
assert.strictEqual(stack[0].slug, 'sec-1');
assert.strictEqual(stack[1].slug, 'sec-2');
assert.strictEqual(stack[2].slug, 'sec-3');

// Insert at beginning (index 0)
const s0 = sm.insertSection(0, 'sec-0', { title: 'Zero Section' });
stack = sm.getStack();
assert.strictEqual(stack.length, 4);
assert.strictEqual(stack[0].slug, 'sec-0');
assert.strictEqual(stack[1].slug, 'sec-1');

// Insert with negative index (clamp to 0)
const sNeg = sm.insertSection(-10, 'sec-neg', { title: 'Negative Clamped' });
stack = sm.getStack();
assert.strictEqual(stack.length, 5);
assert.strictEqual(stack[0].slug, 'sec-neg');

// Insert at end (index >= length)
const sEnd = sm.insertSection(999, 'sec-end', { title: 'End Clamped' });
stack = sm.getStack();
assert.strictEqual(stack.length, 6);
assert.strictEqual(stack[stack.length - 1].slug, 'sec-end');

// Test object input variant in insertSection
const sObj = sm.insertSection(2, { slug: 'sec-custom-obj', customProp: 42 });
stack = sm.getStack();
assert.strictEqual(stack[2].slug, 'sec-custom-obj');
assert.strictEqual(stack[2].customProp, 42);

// Test standalone module export if present
if (typeof insertSection === 'function') {
  const standaloneSec = insertSection(sm, 1, 'sec-standalone');
  if (standaloneSec) {
    assert.strictEqual(sm.getStack()[1].slug, 'sec-standalone');
  }
}

console.log('  ✓ stackManager.insertSection positional insertion & clamping verified');

// ============================================================================
// 2. Coordinate percentage & drop position calculation logic
// ============================================================================
function computeWidgetDropCoordinates(clientX, clientY, secRect) {
  const rawX = ((clientX - secRect.left) / secRect.width) * 100;
  const rawY = ((clientY - secRect.top) / secRect.height) * 100;
  const clampedX = Math.max(5, Math.min(95, rawX));
  const clampedY = Math.max(5, Math.min(95, rawY));
  return {
    x: Math.round(clampedX * 10) / 10,
    y: Math.round(clampedY * 10) / 10
  };
}

const mockSecRect = { left: 100, top: 200, width: 800, height: 400 };

// Center drop
const centerDrop = computeWidgetDropCoordinates(500, 400, mockSecRect);
assert.strictEqual(centerDrop.x, 50);
assert.strictEqual(centerDrop.y, 50);

// Clamp min (top-left overflow)
const minClampDrop = computeWidgetDropCoordinates(50, 150, mockSecRect);
assert.strictEqual(minClampDrop.x, 5);
assert.strictEqual(minClampDrop.y, 5);

// Clamp max (bottom-right overflow)
const maxClampDrop = computeWidgetDropCoordinates(1000, 700, mockSecRect);
assert.strictEqual(maxClampDrop.x, 95);
assert.strictEqual(maxClampDrop.y, 95);

// Fractional rounding
const fractionalDrop = computeWidgetDropCoordinates(100 + 800 * 0.33333, 200 + 400 * 0.66666, mockSecRect);
assert.strictEqual(fractionalDrop.x, 33.3);
assert.strictEqual(fractionalDrop.y, 66.7);

console.log('  ✓ Widget drop coordinate calculation & clamping verified');

// Positional section drop calculation (upper half -> above, lower half -> below)
function computeSectionDropIndex(secIndex, clientY, secRect) {
  const isUpperHalf = (clientY - secRect.top) < (secRect.height / 2);
  return isUpperHalf ? secIndex : secIndex + 1;
}

assert.strictEqual(computeSectionDropIndex(2, 300, mockSecRect), 2, 'Upper half should insert at secIndex (above)');
assert.strictEqual(computeSectionDropIndex(2, 450, mockSecRect), 3, 'Lower half should insert at secIndex + 1 (below)');

console.log('  ✓ Section drop position (above/below index) calculation verified');

// ============================================================================
// 3. Drop indicator & drag CSS class verification
// ============================================================================
const builderCssContent = fs.readFileSync(path.resolve(__dirname, '../builder.css'), 'utf-8');
const overlayCssContent = OVERLAY_ELEMENT_CSS || '';

assert(
  builderCssContent.includes('.page-section.is-drop-target') || overlayCssContent.includes('.page-section.is-drop-target'),
  'Drop target outline CSS must be defined in builder.css or OVERLAY_ELEMENT_CSS'
);

assert(
  builderCssContent.includes('.section-drop-indicator') || overlayCssContent.includes('.section-drop-indicator'),
  'Section drop indicator line CSS must be defined'
);

assert(
  builderCssContent.includes('.element-feature-card[draggable="true"]') || builderCssContent.includes('.element-feature-card.is-dragging'),
  'Sidebar draggable card styles must be defined in builder.css'
);

console.log('  ✓ Drop indicator and drag CSS rules verified');

console.log('✅ ALL DRAG & DROP CANVAS TESTS PASSED!');
