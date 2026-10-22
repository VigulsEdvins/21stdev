const fs = require('fs');
const assert = require('assert');
const {
  generateExportBundle,
  generateSingleFileBundle,
  createZipArchive,
  THEME_PRESETS
} = require('../scripts/assembler.js');

// -------------------------------------------------------------
// Test 1: Baseline export bundle validity (from Task 5 brief)
// -------------------------------------------------------------
const sections = [
  { id: 's1', slug: 'minimal-navbar', html: '<nav class="nav">Nav</nav>', css: '.nav { display: flex; }', js: 'console.log("nav");' },
  { id: 's2', slug: 'tilt-hero', html: '<header class="hero">Hero</header>', css: '.hero { padding: 40px; }', js: 'console.log("hero");' }
];

const bundle = generateExportBundle(sections, THEME_PRESETS['midnight-dark']);

// Check index.html
assert(bundle['index.html'].includes('<!DOCTYPE html>'), 'index.html must have <!DOCTYPE html>');
assert(bundle['index.html'].includes('<!-- Section: minimal-navbar -->'), 'index.html must have section minimal-navbar comment');
assert(bundle['index.html'].includes('<!-- Section: tilt-hero -->'), 'index.html must have section tilt-hero comment');
assert(bundle['index.html'].includes('<link rel="stylesheet" href="style.css">'), 'index.html must link style.css');
assert(bundle['index.html'].includes('<script src="script.js"></script>'), 'index.html must link script.js');

// Check style.css
assert(bundle['style.css'].includes(':root {'), 'style.css must have :root selector');
assert(bundle['style.css'].includes('--preview-bg'), 'style.css must define --preview-bg');
assert(bundle['style.css'].includes('.nav {'), 'style.css must contain section CSS');

// Check script.js
assert(bundle['script.js'].includes('document.addEventListener("DOMContentLoaded"'), 'script.js must wrap inside DOMContentLoaded');

// Check README.md
assert(bundle['README.md'].includes('minimal-navbar'), 'README.md must mention minimal-navbar');
assert(bundle['README.md'].includes('tilt-hero'), 'README.md must mention tilt-hero');
assert(bundle['README.md'].includes('How to Run'), 'README.md must have How to Run instructions');

// -------------------------------------------------------------
// Test 2: Single-file bundle generation
// -------------------------------------------------------------
if (typeof generateSingleFileBundle === 'function') {
  const singleHtml = generateSingleFileBundle(sections, THEME_PRESETS['midnight-dark']);
  assert(singleHtml.includes('<!DOCTYPE html>'), 'Single HTML bundle must be a complete HTML5 document');
  assert(singleHtml.includes('<style>'), 'Single HTML bundle must include embedded <style>');
  assert(singleHtml.includes('<script>'), 'Single HTML bundle must include embedded <script>');
  assert(singleHtml.includes('data-section-slug="minimal-navbar"'), 'Single HTML bundle must contain section attributes');
  assert(singleHtml.includes('data-section-slug="tilt-hero"'), 'Single HTML bundle must contain section attributes');
}

// -------------------------------------------------------------
// Test 3: Standalone pure-JS ZIP archive creation
// -------------------------------------------------------------
if (typeof createZipArchive === 'function') {
  const zipBuffer = createZipArchive(bundle);
  assert(zipBuffer && zipBuffer.length > 0, 'Zip buffer must not be empty');
  // Check PK\x03\x04 signature at offset 0
  assert.strictEqual(zipBuffer[0], 0x50, 'Byte 0 must be P');
  assert.strictEqual(zipBuffer[1], 0x4b, 'Byte 1 must be K');
  assert.strictEqual(zipBuffer[2], 0x03, 'Byte 2 must be 0x03');
  assert.strictEqual(zipBuffer[3], 0x04, 'Byte 3 must be 0x04');

  // Convert to string to verify file paths exist in the zip
  const zipStr = zipBuffer.toString('binary');
  assert(zipStr.includes('index.html'), 'Zip must contain index.html');
  assert(zipStr.includes('style.css'), 'Zip must contain style.css');
  assert(zipStr.includes('script.js'), 'Zip must contain script.js');
  assert(zipStr.includes('README.md'), 'Zip must contain README.md');
}

// -------------------------------------------------------------
// Test 4: Verify builder.html DOM elements for Export Modal
// -------------------------------------------------------------
const builderHtml = fs.readFileSync('builder.html', 'utf8');
assert(builderHtml.includes('id="exportModal"'), 'Must have #exportModal');
assert(builderHtml.includes('id="openExportModalBtn"'), 'Must have #openExportModalBtn');
assert(builderHtml.includes('id="closeExportModalBtn"'), 'Must have #closeExportModalBtn');
assert(builderHtml.includes('id="downloadZipBtn"'), 'Must have #downloadZipBtn');
assert(builderHtml.includes('id="exportCodeViewer"'), 'Must have #exportCodeViewer textarea');
assert(builderHtml.includes('id="copyCodeBtn"'), 'Must have #copyCodeBtn');

// -------------------------------------------------------------
// Test 5: Verify builder.js export modal wiring
// -------------------------------------------------------------
const builderJs = fs.readFileSync('builder.js', 'utf8');
assert(builderJs.includes('openExportModal'), 'builder.js must define or handle openExportModal');
assert(builderJs.includes('downloadZipBtn') || builderJs.includes('downloadZip'), 'builder.js must wire downloadZipBtn');
assert(builderJs.includes('my-assembled-page.zip') || builderJs.includes('assembled-page.zip'), 'builder.js must specify zip filename');
assert(builderJs.includes('copyCodeBtn') || builderJs.includes('copyToClipboard'), 'builder.js must wire copy code button');
assert(builderJs.includes('Copied!') || builderJs.includes('showToast'), 'builder.js must provide copy feedback');

// -------------------------------------------------------------
// Test 6: Verify 4 Code View Tabs in builder.html
// -------------------------------------------------------------
assert(builderHtml.includes('data-code-file="index.html"'), 'builder.html must have index.html code tab');
assert(builderHtml.includes('data-code-file="style.css"'), 'builder.html must have style.css code tab');
assert(builderHtml.includes('data-code-file="script.js"'), 'builder.html must have script.js code tab');
assert(builderHtml.includes('data-code-file="single-html"'), 'builder.html must have single-html code tab');

// -------------------------------------------------------------
// Test 7: Verify Zero-Section Guard
// -------------------------------------------------------------
assert(builderHtml.includes('id="exportEmptyGuard"'), 'builder.html must have #exportEmptyGuard container');
assert(builderHtml.includes('Your page stack is empty'), 'builder.html must have friendly empty prompt text');
assert(builderJs.includes('Please add at least one section before exporting'), 'builder.js must have zero-section guard check');

// -------------------------------------------------------------
// Test 8: Verify Copy and Download Labels & Buttons
// -------------------------------------------------------------
assert(builderJs.includes('Copy HTML'), 'builder.js must handle Copy HTML label');
assert(builderJs.includes('Copy CSS'), 'builder.js must handle Copy CSS label');
assert(builderJs.includes('Copy JS'), 'builder.js must handle Copy JS label');
assert(builderJs.includes('Copy Bundle'), 'builder.js must handle Copy Bundle label');
assert(builderHtml.includes('id="downloadSingleHtmlBtn"'), 'builder.html must have #downloadSingleHtmlBtn');

// -------------------------------------------------------------
// Test 9: Verify ZIP Generator Supports JSZip & Native Fallback
// -------------------------------------------------------------
assert(builderJs.includes('window.JSZip'), 'builder.js must check for window.JSZip');
assert(builderJs.includes('createZipArchive'), 'builder.js must use native createZipArchive fallback');

console.log('✅ Export bundle validation test passed!');

