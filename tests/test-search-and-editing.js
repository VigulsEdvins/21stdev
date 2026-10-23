const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createStackManager } = require('../scripts/stack-manager.js');
const { renderSectionOverlayHtml } = require('../scripts/assembler.js');

console.log('Testing Dark Frosted Search Bar & Double/Right-Click Text Editing...');

const cssContent = fs.readFileSync(path.resolve(__dirname, '../builder.css'), 'utf8');
const htmlContent = fs.readFileSync(path.resolve(__dirname, '../builder.html'), 'utf8');
const jsContent = fs.readFileSync(path.resolve(__dirname, '../builder.js'), 'utf8');

// -------------------------------------------------------------
// 1. Test CSS Rules for Dark Frosted Search Bar
// -------------------------------------------------------------
console.log('  Testing builder.css search bar styling...');

assert(cssContent.includes('.elements-search-box'), 'builder.css must style .elements-search-box');
assert(cssContent.includes('.elements-search-box:focus-within'), 'builder.css must style .elements-search-box:focus-within');
assert(cssContent.includes('.elements-search-input'), 'builder.css must style .elements-search-input');
assert(cssContent.includes('#clearElementsSearchBtn') || cssContent.includes('.clear-search-btn'), 'builder.css must style clear elements search button');

// Extract .elements-search-box rule
const searchBoxRuleMatch = cssContent.match(/\.elements-search-box\s*\{([^}]+)\}/);
assert(searchBoxRuleMatch, '.elements-search-box rule block must exist in builder.css');
const searchBoxRule = searchBoxRuleMatch[1];
assert(searchBoxRule.includes('background: rgba(255, 255, 255, 0.04)'), '.elements-search-box must have dark frosted background');
assert(!searchBoxRule.includes('background: #fff') && !searchBoxRule.includes('background: white'), 'Search box must not have white background');

// Focus-within rule
const focusWithinRuleMatch = cssContent.match(/\.elements-search-box:focus-within\s*\{([^}]+)\}/);
assert(focusWithinRuleMatch, '.elements-search-box:focus-within must exist');
const focusWithinRule = focusWithinRuleMatch[1];
assert(focusWithinRule.includes('#a855f7'), 'focus-within must include purple border/glow #a855f7');
assert(focusWithinRule.includes('box-shadow'), 'focus-within must include glow box-shadow');

// Input styling
const inputRuleMatch = cssContent.match(/\.elements-search-input\s*\{([^}]+)\}/);
assert(inputRuleMatch, '.elements-search-input rule must exist');
const inputRule = inputRuleMatch[1];
assert(inputRule.includes('background: transparent'), '.elements-search-input must have transparent background');
assert(!inputRule.includes('background: #fff') && !inputRule.includes('background: white'), '.elements-search-input must not have white background');

console.log('  ✓ Search bar CSS styling passed');

// -------------------------------------------------------------
// 2. Test builder.html Context Menu for Edit Text Action
// -------------------------------------------------------------
console.log('  Testing builder.html context menu items...');

assert(htmlContent.includes('id="canvasContextMenu"'), 'builder.html must have #canvasContextMenu');
assert(htmlContent.includes('data-action="edit-text"'), '#canvasContextMenu must include data-action="edit-text" button');
assert(htmlContent.includes('Edit Text'), '#canvasContextMenu must have Edit Text label');

console.log('  ✓ Context menu edit-text action item verified');

// -------------------------------------------------------------
// 3. Test builder.js Double-Click & Right-Click Edit Logic
// -------------------------------------------------------------
console.log('  Testing builder.js event wiring...');

assert(jsContent.includes("'dblclick'") || jsContent.includes('"dblclick"'), 'builder.js must listen for dblclick events on canvas');
assert(jsContent.includes('edit-text'), 'builder.js must handle context menu edit-text action');
assert(jsContent.includes('toolbarBtnText'), 'builder.js must reference toolbarBtnText');
assert(jsContent.includes('toolbarCardTitle'), 'builder.js must reference toolbarCardTitle');
assert(jsContent.includes('toolbarTableTitle'), 'builder.js must reference toolbarTableTitle');
assert(jsContent.includes('toolbarBadgeText'), 'builder.js must reference toolbarBadgeText');

console.log('  ✓ Double-click and right-click event handling verified');

// -------------------------------------------------------------
// 4. Test Text Editing & Model Propagation in stackManager
// -------------------------------------------------------------
console.log('  Testing stackManager text updates & renderSectionOverlayHtml...');

const stackManager = createStackManager();
const sec = stackManager.addSection('hero-section', 0);
const secId = sec.id;

// Add Button
const btnEl = stackManager.addElement(secId, { type: 'button', text: 'Original Button', x: 50, y: 50 });
// Add Card
const cardEl = stackManager.addElement(secId, { type: 'card', title: 'Original Headline', description: 'Original Desc', x: 30, y: 30 });
// Add Table
const tableEl = stackManager.addElement(secId, { type: 'table', title: 'Starter Plan', price: '$9/mo', x: 60, y: 40 });
// Add Badge
const badgeEl = stackManager.addElement(secId, { type: 'badge', text: 'V1 RELEASE', x: 20, y: 20 });
// Add File Card
const fileEl = stackManager.addElement(secId, { type: 'file-card', fileName: 'Original.pdf', x: 40, y: 60 });
// Add Folder Card
const folderEl = stackManager.addElement(secId, { type: 'folder-card', label: 'Original Project', x: 70, y: 60 });

// Verify initial rendering
let overlayHtml = renderSectionOverlayHtml(stackManager.getSectionElements(secId));
assert(overlayHtml.includes('Original Button'), 'Initial button text rendered');
assert(overlayHtml.includes('Original Headline'), 'Initial card headline rendered');
assert(overlayHtml.includes('Starter Plan'), 'Initial table title rendered');
assert(overlayHtml.includes('V1 RELEASE'), 'Initial badge text rendered');
assert(overlayHtml.includes('Original.pdf'), 'Initial file card name rendered');
assert(overlayHtml.includes('Original Project'), 'Initial folder label rendered');

// Perform live updates (simulating user typing in toolbar text inputs)
stackManager.updateElement(secId, btnEl.id, { text: 'Updated CTA Now →' }, true);
stackManager.updateElement(secId, cardEl.id, { title: 'Updated Feature Header', description: 'Updated feature explanation' }, true);
stackManager.updateElement(secId, tableEl.id, { title: 'Enterprise Mega Plan', price: '$199/mo' }, true);
stackManager.updateElement(secId, badgeEl.id, { text: '2.0 LIVE' }, true);
stackManager.updateElement(secId, fileEl.id, { fileName: 'Updated-Spec-2026.pdf', title: 'Updated-Spec-2026.pdf' }, true);
stackManager.updateElement(secId, folderEl.id, { label: 'Updated Vault 2026', title: 'Updated Vault 2026' }, true);

// Verify updated rendering
overlayHtml = renderSectionOverlayHtml(stackManager.getSectionElements(secId));
assert(overlayHtml.includes('Updated CTA Now →'), 'Updated button text must render in overlay');
assert(overlayHtml.includes('Updated Feature Header'), 'Updated card headline must render in overlay');
assert(overlayHtml.includes('Updated feature explanation'), 'Updated card description must render in overlay');
assert(overlayHtml.includes('Enterprise Mega Plan'), 'Updated table title must render in overlay');
assert(overlayHtml.includes('$199/mo'), 'Updated table price must render in overlay');
assert(overlayHtml.includes('2.0 LIVE'), 'Updated badge text must render in overlay');
assert(overlayHtml.includes('Updated-Spec-2026.pdf'), 'Updated file card name must render in overlay');
assert(overlayHtml.includes('Updated Vault 2026'), 'Updated folder label must render in overlay');

console.log('  ✓ Text updates live sync verified across all element types');
console.log('✅ ALL SEARCH BAR & TEXT EDITING TESTS PASSED!');
