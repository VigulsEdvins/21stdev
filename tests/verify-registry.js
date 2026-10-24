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

// Test 3: Verify carousel-gallery-play extracted features (6 items)
const carouselPlaySlugs = [
  'cylindrical-3d-carousel',
  'cursor-image-trail',
  'client-logo-marquee',
  'athletes-filter-showcase',
  'custom-magnetic-cursor',
  'faq-accordion-smooth'
];

for (const slug of carouselPlaySlugs) {
  verifyFeatureFolder(slug, ['meta.json', 'index.html', 'style.css', 'script.js']);
}

console.log('Task 3 carousel-gallery-play feature checks passed.');

// Test 4: Verify betteroff (The Lookback) extracted features (5 items)
const betteroffSlugs = [
  'surf-3d-ribbon',
  'timeline-inertia-drag',
  'conveyor-scroll-loop',
  'audio-jukebox-player',
  'article-slide-drawer'
];

for (const slug of betteroffSlugs) {
  verifyFeatureFolder(slug, ['meta.json', 'index.html', 'style.css', 'script.js']);
}

console.log('Task 4 betteroff feature checks passed.');

// Test 5: Verify vivmgmt (6), 21st-crafted (4), mom (4+1), cvmaker (4+1), and full website templates (5) -> Total 36 items
const task5Slugs = [
  'parallax-5col-gallery',
  'split-screen-entrance',
  'fullscreen-parallax-footer',
  'news-3col-masonry',
  'artist-portfolio-lightbox',
  'responsive-burger-menu',
  'oklch-ambient-glow-hero',
  'spotlight-bento-grid',
  'liquid-metal-shader-card',
  'kinetic-typography-strapline',
  'template-betteroff',
  'template-carousel-play',
  'template-vivmgmt',
  'template-mom',
  'template-cvmaker',
  'editorial-3x3-hover-grid',
  'multilingual-lang-switcher',
  'portfolio-masonry-filter',
  'studio-info-drawer',
  'a4-resume-previewer',
  'job-keyword-matcher',
  'star-verb-enhancer',
  'before-after-resume-slider'
];

for (const slug of task5Slugs) {
  verifyFeatureFolder(slug, ['meta.json', 'index.html', 'style.css', 'script.js']);
}

const synced = syncRegistry(ROOT);
assert(synced.count >= 36, `Expected at least 36 features in registry, got ${synced.count}`);
for (const item of synced.items) {
  assert(item.files && item.files.combined && item.files.combined.length > 50, `Invalid combined HTML for ${item.slug}`);
}

console.log(`Task 5 all ${synced.count} features & templates verified.`);

// Test 6: Verify main 21st.local Web Application (index.html, styles.css, app.js)
for (const appFile of ['index.html', 'styles.css', 'app.js']) {
  const p = path.join(ROOT, appFile);
  assert(fs.existsSync(p), `Missing main application file: ${appFile}`);
}

const mainHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert(mainHtml.includes('registry.js'), 'index.html must load registry.js');
assert(mainHtml.includes('catalogView') && mainHtml.includes('workbenchView'), 'index.html must include both Catalog Grid and IDE Workbench views');
assert(mainHtml.includes('inspectorModal') && mainHtml.includes('addFeatureModal'), 'index.html must include Inspector Modal and Add Feature Studio Modal');
assert(!/sign in|log in|pricing|pro tier/i.test(mainHtml), 'index.html must have zero login/auth/pricing bloat');
assert(mainJs.includes('FEATURE_REGISTRY'), 'app.js must consume window.FEATURE_REGISTRY');
assert(mainJs.includes('IntersectionObserver'), 'app.js must lazy-mount live preview iframes via IntersectionObserver');
assert(mainJs.includes('localStorage'), 'app.js must support localStorage custom feature persistence');

const vm = require('vm');
const regCtx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'registry.js'), 'utf8'), regCtx);
const loadedItems = Array.isArray(regCtx.window.FEATURE_REGISTRY)
  ? regCtx.window.FEATURE_REGISTRY
  : (regCtx.window.FEATURE_REGISTRY && regCtx.window.FEATURE_REGISTRY.items);
assert(Array.isArray(loadedItems) && loadedItems.length === synced.count, `window.FEATURE_REGISTRY must load all ${synced.count} items in browser context`);
for (const it of loadedItems) {
  assert(it.name && it.title && it.slug, `Missing name/title/slug on registry item ${it.slug}`);
}

console.log('Task 6 main 21st.local web application verified.');

// Test 7: every meta.json conforms to the schema (fixed categories, required filter attributes)
const { validateMeta, CATEGORIES } = require('../scripts/schema.js');
let schemaProblems = [];
for (const slug of fs.readdirSync(path.join(ROOT, 'features'))) {
  const metaPath = path.join(ROOT, 'features', slug, 'meta.json');
  if (!fs.existsSync(metaPath)) continue;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.slug = meta.slug || slug;
  validateMeta(meta).forEach(p => schemaProblems.push(`features/${slug}: ${p}`));
}
assert.strictEqual(schemaProblems.length, 0, `meta.json schema violations:\n${schemaProblems.slice(0, 20).join('\n')}`);
assert(synced.items.every(i => CATEGORIES.includes(i.category)), 'every registry item must use a category from the fixed list');

console.log('Task 7 meta.json schema validation passed.');
