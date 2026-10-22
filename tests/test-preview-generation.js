const fs = require('fs');
const assert = require('assert');
const { assemblePreviewDocument, THEME_PRESETS } = require('../scripts/assembler.js');

// Test 1: Baseline preview document generation and theme propagation (from Task 4 spec)
const sections = [
  { id: '1', slug: 'nav', html: '<nav>Logo</nav>', css: 'nav { background: var(--preview-bg); }', js: '' },
  { id: '2', slug: 'hero', html: '<h1>Title</h1>', css: 'h1 { color: var(--preview-text); }', js: '' }
];

const doc = assemblePreviewDocument(sections, THEME_PRESETS['clean-minimal']);
assert(doc.includes('--preview-bg: #ffffff') || doc.includes('--preview-bg: #f8fafc'), 'Light theme background injected');
assert(doc.includes('<nav>Logo</nav>'));
assert(doc.includes('<h1>Title</h1>'));

// Test 2: Verify custom theme color injection
const customTheme = {
  id: 'custom',
  name: 'Custom Brand',
  bg: '#1a1d24',
  text: '#e2e8f0',
  accent: '#f43f5e'
};
const customDoc = assemblePreviewDocument(sections, customTheme);
assert(customDoc.includes('--preview-bg: #1a1d24'), 'Custom bg color must be present in :root');
assert(customDoc.includes('--preview-text: #e2e8f0'), 'Custom text color must be present in :root');
assert(customDoc.includes('--preview-accent: #f43f5e'), 'Custom accent color must be present in :root');

// Test 3: Verify all 5 theme presets propagate correct variables
const presetKeys = ['midnight-dark', 'cyber-glow', 'clean-minimal', 'warm-editorial', 'modern-slate'];
presetKeys.forEach(key => {
  const preset = THEME_PRESETS[key];
  const pDoc = assemblePreviewDocument(sections, key);
  assert(pDoc.includes(`--preview-bg: ${preset.bg}`), `Preset ${key} bg mismatch`);
  assert(pDoc.includes(`--preview-text: ${preset.text}`), `Preset ${key} text mismatch`);
  assert(pDoc.includes(`--preview-accent: ${preset.accent}`), `Preset ${key} accent mismatch`);
});

// Test 4: Verify live preview HTML structure contains sandbox friendly viewport and meta tags
assert(doc.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'Must include responsive viewport meta');
assert(doc.includes('class="page-section" id="1"'), 'Section 1 container must be present');
assert(doc.includes('class="page-section" id="2"'), 'Section 2 container must be present');
assert(doc.includes('UPDATE_THEME'), 'Preview document must contain postMessage listener for UPDATE_THEME');

// Test 5: Verify builder.css viewport controls and frame shadows
const cssContent = fs.readFileSync('builder.css', 'utf8');
assert(cssContent.includes('data-active-viewport="desktop"'), 'CSS must define desktop viewport stage');
assert(cssContent.includes('data-active-viewport="tablet"'), 'CSS must define tablet viewport stage');
assert(cssContent.includes('data-active-viewport="mobile"'), 'CSS must define mobile viewport stage');
assert(cssContent.includes('768px'), 'Tablet viewport must specify 768px width');
assert(cssContent.includes('375px'), 'Mobile viewport must specify 375px width');
assert(cssContent.includes('box-shadow: 0 24px 60px'), 'Tablet/Mobile viewports must have frame shadow');

// Test 6: Verify builder.js contains feature cache and open in new tab handlers
const builderJsContent = fs.readFileSync('builder.js', 'utf8');
assert(builderJsContent.includes('featureCache'), 'builder.js must declare client-side featureCache');
assert(builderJsContent.includes('fetchFeatureFiles'), 'builder.js must contain fetchFeatureFiles');
assert(builderJsContent.includes('openInTabBtn') || builderJsContent.includes('openNewTabBtn'), 'builder.js must wire open tab button');
assert(builderJsContent.includes('URL.createObjectURL'), 'builder.js must create a Blob URL for open in new tab');
assert(builderJsContent.includes('applyDynamicTheme'), 'builder.js must contain dynamic theme propagation');

console.log('✅ Preview generation and theme propagation test passed!');
