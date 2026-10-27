const assert = require('assert');
const {
  assemblePreviewDocument,
  generateExportBundle,
  scopeSectionStyles,
  isolateSectionMarkup,
  isolateSectionScript,
  THEME_PRESETS
} = require('../scripts/assembler.js');

// Test 1: Empty stack returns valid empty state HTML
const emptyDoc = assemblePreviewDocument([], THEME_PRESETS['midnight-dark'], {});
assert(emptyDoc.includes('Add sections to start previewing'), 'Should show empty state');
assert(emptyDoc.includes('<!DOCTYPE html>'), 'Empty state should be a valid HTML document');
assert(emptyDoc.includes('--preview-bg'), 'Theme variables should be in empty state');

// Test 2: Assembling 2 mock sections generates isolated roots
const mockSections = [
  { id: 'sec-1', slug: 'feat-a', html: '<div id="root">A</div>', css: 'body { color: red; }', js: 'console.log("A");' },
  { id: 'sec-2', slug: 'feat-b', html: '<div id="root">B</div>', css: '#root { height: 100vh; }', js: 'console.log("B");' }
];
const fullDoc = assemblePreviewDocument(mockSections, THEME_PRESETS['cyber-glow'], {});
assert(fullDoc.includes('id="root-sec-1"'), 'Section 1 root should be isolated');
assert(fullDoc.includes('id="root-sec-2"'), 'Section 2 root should be isolated');
assert(fullDoc.includes('--preview-accent'), 'Theme variables should be present');
assert(fullDoc.includes('.page-section#sec-1'), 'Scoped body CSS should target .page-section#sec-1');
assert(fullDoc.includes('#root-sec-2'), 'Scoped root CSS should target #root-sec-2');
assert(!fullDoc.includes('#root { height: 100vh; }'), '100vh should be scoped/replaced with min-height: auto');

// Test 3: Export bundle contains all 4 files with clear section comments
const bundle = generateExportBundle(mockSections, THEME_PRESETS['midnight-dark'], {});
assert(bundle['index.html'] && bundle['style.css'] && bundle['script.js'] && bundle['README.md']);
assert(bundle['index.html'].includes('<!-- Section: feat-a -->'), 'index.html should have section comment');
assert(bundle['index.html'].includes('<!-- Section: feat-b -->'), 'index.html should have section comment');
assert(bundle['index.html'].includes('<link rel="stylesheet" href="style.css">'), 'index.html links style.css');
assert(bundle['index.html'].includes('<script defer src="script.js"></script>'), 'index.html links script.js (deferred)');
assert(bundle['style.css'].includes(':root {'), 'style.css defines :root');
assert(bundle['style.css'].includes('--preview-bg'), 'style.css defines --preview-bg');
assert(bundle['script.js'].includes('document.addEventListener("DOMContentLoaded"'), 'script.js wraps in DOMContentLoaded');
assert(bundle['README.md'].includes('feat-a'), 'README mentions feat-a');
assert(bundle['README.md'].includes('How to Run'), 'README contains How to Run section');

// Test 4: Verify theme presets
const expectedPresets = ['midnight-dark', 'cyber-glow', 'clean-minimal', 'warm-editorial', 'modern-slate'];
expectedPresets.forEach(presetKey => {
  assert(THEME_PRESETS[presetKey], `Preset ${presetKey} should exist`);
  assert(THEME_PRESETS[presetKey].bg, `Preset ${presetKey} should have bg`);
  assert(THEME_PRESETS[presetKey].text, `Preset ${presetKey} should have text`);
  assert(THEME_PRESETS[presetKey].accent, `Preset ${presetKey} should have accent`);
  assert(THEME_PRESETS[presetKey].cardBg, `Preset ${presetKey} should have cardBg`);
  assert(THEME_PRESETS[presetKey].border, `Preset ${presetKey} should have border`);
});

// Test 5: Verify helper functions
if (typeof scopeSectionStyles === 'function') {
  const scoped = scopeSectionStyles('body { color: green; } #root { height: 100vh; overflow: hidden; }', 'my-sec');
  assert(scoped.includes('.page-section#my-sec'), 'body should be transformed to .page-section#my-sec');
  assert(scoped.includes('#root-my-sec'), '#root should be transformed to #root-my-sec');
  assert(scoped.includes('min-height: auto'), 'height: 100vh should become min-height: auto');
}

if (typeof isolateSectionMarkup === 'function') {
  const isolated = isolateSectionMarkup('<!DOCTYPE html><html><body><div id="root">App</div></body></html>', 'test-sec');
  assert(isolated.includes('id="root-test-sec"'), 'id="root" should be isolated');
  assert(!isolated.includes('<!DOCTYPE'), 'Doctype should be stripped from inner section markup');
  assert(!isolated.includes('<body'), 'body tag should be unwrapped');
}

if (typeof isolateSectionScript === 'function') {
  const jsWithBackticks = 'const el = document.getElementById(`root`); const q = document.querySelector(`#root`);';
  const isolatedJs = isolateSectionScript(jsWithBackticks, 'sec-bt');
  assert(isolatedJs.includes('getElementById(`root-sec-bt`)'), 'isolateSectionScript should support backticks in getElementById');
  assert(isolatedJs.includes('querySelector(`#root-sec-bt`)'), 'isolateSectionScript should support backticks in querySelector');
}

// Test 6: Verify console.error slug hardening
const quoteSlugSections = [
  { id: 'sec-q', slug: 'feat"quote', html: '<div id="root">Q</div>', css: '', js: 'console.log("Q");' }
];
const quoteDoc = assemblePreviewDocument(quoteSlugSections, THEME_PRESETS['midnight-dark'], {});
assert(quoteDoc.includes('console.error(\'Error in section \' + "feat\\"quote" + \':\', err);'), 'assemblePreviewDocument should safely stringify slug in console.error');

const quoteBundle = generateExportBundle(quoteSlugSections, THEME_PRESETS['midnight-dark'], {});
assert(quoteBundle['script.js'].includes('console.error(\'Error executing \' + "feat\\"quote" + \':\', err);'), 'generateExportBundle script.js should safely stringify slug in console.error');

console.log('✅ All assembler unit tests passed!');
