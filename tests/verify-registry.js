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

// Test 5: Verify vivmgmt (6), 21st-crafted (4), and full website templates (3) -> Total 26 items
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
  'template-vivmgmt'
];

for (const slug of task5Slugs) {
  verifyFeatureFolder(slug, ['meta.json', 'index.html', 'style.css', 'script.js']);
}

const synced = syncRegistry(ROOT);
assert.strictEqual(synced.count, 26, `Expected exactly 26 features in registry, got ${synced.count}`);
for (const item of synced.items) {
  assert(item.files && item.files.combined && item.files.combined.length > 50, `Invalid combined HTML for ${item.slug}`);
}

console.log('Task 5 all 26 features & templates verified.');



