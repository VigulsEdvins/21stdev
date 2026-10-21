const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { combineFeatureHtml, syncRegistry } = require('../scripts/sync-registry.js');

const ROOT = path.resolve(__dirname, '..');

// Test 1: combineFeatureHtml preserves special $ replacement tokens in JS/CSS
const sampleHtml = '<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"></head><body><script src="script.js"></script></body></html>';
const sampleCss = '.box { content: "$& $1"; }';
const sampleJs = 'const str = "price $100 $& $\'"; console.log(str);';
const combined = combineFeatureHtml(sampleHtml, sampleCss, sampleJs);
assert(combined.includes('const str = "price $100 $& $\'";'), 'JS special $ tokens must not be corrupted');
assert(combined.includes('.box { content: "$& $1"; }'), 'CSS special $ tokens must not be corrupted');
assert(!combined.includes('href="style.css"'), 'External style.css link should be replaced');
assert(!combined.includes('src="script.js"'), 'External script.js tag should be replaced');

console.log('Unit tests for combineFeatureHtml passed.');

// Test 2: Verify photo-caroulsel extracted features (works-wheel-3d & polaroid-string-carousel)
function verifyFeatureFolder(slug, requiredFiles, requiredSnippets = []) {
  const dir = path.join(ROOT, 'features', slug);
  assert(fs.existsSync(dir), `Missing feature directory: features/${slug}`);
  for (const file of requiredFiles) {
    const filePath = path.join(dir, file);
    assert(fs.existsSync(filePath), `Missing ${file} in features/${slug}`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.trim().length > 20, `Empty or near-empty ${file} in features/${slug}`);
  }
  const jsContent = fs.readFileSync(path.join(dir, 'script.js'), 'utf8');
  for (const snippet of requiredSnippets) {
    assert(jsContent.includes(snippet), `Expected "${snippet}" in features/${slug}/script.js`);
  }
}

verifyFeatureFolder(
  'works-wheel-3d',
  ['meta.json', 'index.html', 'style.css', 'script.js', 'component.tsx'],
  ['bowAt', 'WHEEL_UNITS', 'DRAG_UNITS', 'rotateX']
);

verifyFeatureFolder(
  'polaroid-string-carousel',
  ['meta.json', 'index.html', 'style.css', 'script.js', 'component.tsx'],
  ['stringY', 'springStep', 'swingStep', 'paintLandscape']
);

console.log('Task 2 photo-caroulsel feature checks passed.');
