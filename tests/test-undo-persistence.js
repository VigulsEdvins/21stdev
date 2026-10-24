const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createStackManager } = require('../scripts/stack-manager.js');

console.log('Testing Undo / Redo History Stack & Continuous LocalStorage Persistence...');

// ============================================================================
// 1. DOM validation for Undo, Redo, and Reset Canvas buttons in builder.html
// ============================================================================
console.log('  Testing builder.html markup...');
const builderHtml = fs.readFileSync(path.resolve(__dirname, '../builder.html'), 'utf8');

assert(builderHtml.includes('id="undoBtn"'), 'builder.html must contain #undoBtn');
assert(builderHtml.includes('id="redoBtn"'), 'builder.html must contain #redoBtn');
assert(builderHtml.includes('history-btn'), 'builder.html buttons must include class history-btn');
assert(builderHtml.includes('id="resetCanvasBtn"'), 'builder.html must contain #resetCanvasBtn');

// Validate default disabled attribute on undo & redo buttons
const undoMatch = builderHtml.match(/<button[^>]*id="undoBtn"[^>]*>/);
assert(undoMatch, '#undoBtn button tag must exist');
assert(undoMatch[0].includes('disabled'), '#undoBtn must be disabled by default');

const redoMatch = builderHtml.match(/<button[^>]*id="redoBtn"[^>]*>/);
assert(redoMatch, '#redoBtn button tag must exist');
assert(redoMatch[0].includes('disabled'), '#redoBtn must be disabled by default');

const resetMatch = builderHtml.match(/<button[^>]*id="resetCanvasBtn"[^>]*>/);
assert(resetMatch, '#resetCanvasBtn button tag must exist');
assert(resetMatch[0].includes('Reset to Starter'), '#resetCanvasBtn must have title "Reset to Starter"');

console.log('  ✓ builder.html markup verified');

// ============================================================================
// 2. CSS validation for .history-btn and #resetCanvasBtn in builder.css
// ============================================================================
console.log('  Testing builder.css rules...');
const builderCss = fs.readFileSync(path.resolve(__dirname, '../builder.css'), 'utf8');

assert(builderCss.includes('.history-btn'), 'builder.css must style .history-btn');
assert(builderCss.includes('.history-btn:disabled') || builderCss.includes('.history-btn[disabled]'),
  'builder.css must style .history-btn:disabled');
assert(builderCss.includes('#resetCanvasBtn') || builderCss.includes('.reset-canvas-btn'),
  'builder.css must style #resetCanvasBtn');

console.log('  ✓ builder.css styling verified');

// ============================================================================
// 3. builder.js History Stack & LocalStorage logic verification
// ============================================================================
console.log('  Testing builder.js history & persistence implementation...');
const builderJs = require('./helpers/builder-source.js').readBuilderSource();

assert(builderJs.includes('MAX_HISTORY'), 'builder.js must define MAX_HISTORY (50)');
assert(builderJs.includes('pushHistorySnapshot'), 'builder.js must implement pushHistorySnapshot');
assert(builderJs.includes('applyHistoryState'), 'builder.js must implement applyHistoryState');
assert(builderJs.includes('undoAction'), 'builder.js must implement undoAction');
assert(builderJs.includes('redoAction'), 'builder.js must implement redoAction');
assert(builderJs.includes('web_builder_state_v2'), 'builder.js must use localStorage key web_builder_state_v2');
assert(builderJs.includes('resetCanvasBtn'), 'builder.js must wire resetCanvasBtn');

// ============================================================================
// 4. Runtime Simulation of History Stack Engine & LocalStorage
// ============================================================================
console.log('  Testing history stack runtime mechanics & LocalStorage persistence...');

// Mock localStorage
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.has(key) ? mockStorage.get(key) : null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

// Mock minimal DOM window environment for initBuilder test
const elements = {
  undoBtn: { disabled: true, addEventListener: () => {} },
  redoBtn: { disabled: true, addEventListener: () => {} },
  resetCanvasBtn: { addEventListener: () => {} }
};

global.window = {
  createStackManager,
  FEATURE_REGISTRY: [],
  Assembler: { THEME_PRESETS: { 'midnight-dark': { bg: '#0b0f19', text: '#f3f4f6', accent: '#6366f1' } } },
  addEventListener: () => {},
  removeEventListener: () => {},
  confirm: () => true
};

global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  readyState: 'complete'
};

const { initBuilder } = require('../builder.js');
const builder = initBuilder();
assert(builder, 'initBuilder must return builder controller');

// Validate exposed methods
assert(typeof builder.pushHistorySnapshot === 'function', 'builder must expose pushHistorySnapshot');
assert(typeof builder.applyHistoryState === 'function', 'builder must expose applyHistoryState');
assert(typeof builder.undoAction === 'function', 'builder must expose undoAction');
assert(typeof builder.redoAction === 'function', 'builder must expose redoAction');
assert(typeof builder.getHistoryStack === 'function', 'builder must expose getHistoryStack');
assert(typeof builder.getHistoryIndex === 'function', 'builder must expose getHistoryIndex');

// Initial state should have 1 snapshot (the starter template)
const stack0 = builder.getHistoryStack();
assert.strictEqual(stack0.length, 1, 'Initial history stack should contain 1 initial snapshot');
assert.strictEqual(builder.getHistoryIndex(), 0, 'Initial history index must be 0');
assert.strictEqual(elements.undoBtn.disabled, true, 'Undo button must be disabled at index 0');
assert.strictEqual(elements.redoBtn.disabled, true, 'Redo button must be disabled with no future states');

// Perform action: add a section
builder.stackManager.addSection('new-test-section', { title: 'Test Section' });
builder.pushHistorySnapshot();

assert.strictEqual(builder.getHistoryStack().length, 2, 'History stack should have 2 snapshots after action');
assert.strictEqual(builder.getHistoryIndex(), 1, 'History index should be 1');
assert.strictEqual(elements.undoBtn.disabled, false, 'Undo button should be enabled after 1st action');
assert.strictEqual(elements.redoBtn.disabled, true, 'Redo button should be disabled at latest action');

// Test duplicate state suppression: pushing without changes should NOT create a new snapshot
builder.pushHistorySnapshot();
assert.strictEqual(builder.getHistoryStack().length, 2, 'Duplicate snapshot should be skipped');

// Test Undo
builder.undoAction();
assert.strictEqual(builder.getHistoryIndex(), 0, 'History index should revert to 0 after undo');
assert.strictEqual(elements.undoBtn.disabled, true, 'Undo button should be disabled at index 0');
assert.strictEqual(elements.redoBtn.disabled, false, 'Redo button should be enabled after undo');
const activeStackAfterUndo = builder.stackManager.getStack();
assert(
  !activeStackAfterUndo.some(s => s.slug === 'new-test-section'),
  'Undone section should not exist in active stack'
);

// Boundary test: Extra undo at index 0 should be a no-op
builder.undoAction();
assert.strictEqual(builder.getHistoryIndex(), 0, 'Boundary undo at index 0 must remain 0');

// Test Redo
builder.redoAction();
assert.strictEqual(builder.getHistoryIndex(), 1, 'History index should advance to 1 after redo');
assert.strictEqual(elements.undoBtn.disabled, false, 'Undo button should be enabled after redo');
assert.strictEqual(elements.redoBtn.disabled, true, 'Redo button should be disabled at top of stack');
const activeStackAfterRedo = builder.stackManager.getStack();
assert(
  activeStackAfterRedo.some(s => s.slug === 'new-test-section'),
  'Redone section must be restored in active stack'
);

// Boundary test: Extra redo at top of stack should be a no-op
builder.redoAction();
assert.strictEqual(builder.getHistoryIndex(), 1, 'Boundary redo at top of stack must remain at index 1');

// Test Discarding Redo branch on new action after undo
builder.undoAction();
assert.strictEqual(builder.getHistoryIndex(), 0);
builder.stackManager.addSection('alternative-branch-section', { title: 'Alt Branch' });
builder.pushHistorySnapshot();
assert.strictEqual(builder.getHistoryIndex(), 1);
assert.strictEqual(builder.getHistoryStack().length, 2);
assert.strictEqual(builder.getHistoryStack()[1].stack.some(s => s.slug === 'alternative-branch-section'), true);
assert.strictEqual(builder.getHistoryStack()[1].stack.some(s => s.slug === 'new-test-section'), false);
assert.strictEqual(elements.redoBtn.disabled, true, 'Redo branch must be cleared after branching');

// Test MAX_HISTORY cap (50)
for (let i = 0; i < 60; i++) {
  builder.stackManager.addSection(`stress-sec-${i}`);
  builder.pushHistorySnapshot();
}
assert(builder.getHistoryStack().length <= 50, `History stack should be capped at 50, got ${builder.getHistoryStack().length}`);

// Test LocalStorage persistence & Corrupted JSON resilience
console.log('  Testing LocalStorage serialization & corrupted data resilience...');
const STORAGE_KEY = 'web_builder_state_v2';
assert(typeof builder.saveStateToStorage === 'function', 'builder must expose saveStateToStorage');
builder.saveStateToStorage();
const savedRaw = localStorage.getItem(STORAGE_KEY);
assert(savedRaw, 'localStorage should have saved data');
const parsed = JSON.parse(savedRaw);
assert(Array.isArray(parsed.stack), 'Saved state must include stack array');
assert(parsed.theme, 'Saved state must include theme');

// Corrupted JSON resilience test
localStorage.setItem(STORAGE_KEY, '{ invalid corrupted json !!! ');
assert.doesNotThrow(() => {
  // Simulating fresh load with corrupted storage
  const freshBuilder = initBuilder();
  assert(freshBuilder, 'Builder must safely initialize even when localStorage is corrupted');
  assert(freshBuilder.stackManager.getStack().length > 0, 'Builder should fall back to starter template');
}, 'Corrupted localStorage must not crash builder');

console.log('✅ ALL UNDO/REDO & PERSISTENCE TESTS PASSED!');
