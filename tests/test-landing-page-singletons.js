const assert = require('assert');
const fs = require('fs');
const { createStackManager } = require('../scripts/stack-manager.js');
const { assemblePreviewDocument, generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');

console.log('Testing Complete Landing Page Example & Singleton Constraints...');

// 1. Verify STARTER_SECTIONS in builder.js
const builderJs = fs.readFileSync('builder.js', 'utf8');
assert(builderJs.includes('LANDING_PAGE_SINGLETONS'), 'builder.js must define LANDING_PAGE_SINGLETONS');
assert(builderJs.includes('addOrReplaceLandingSection'), 'builder.js must define addOrReplaceLandingSection');
assert(builderJs.includes('getSingletonType'), 'builder.js must define getSingletonType');

// Extract STARTER_SECTIONS from builder.js
const starterMatch = builderJs.match(/const STARTER_SECTIONS = (\[[\s\S]*?\]);/);
assert(starterMatch, 'Must find STARTER_SECTIONS in builder.js');
const starterSections = eval(starterMatch[1]);

console.log(`  ✓ Found ${starterSections.length} sections in starter landing page template`);
assert.strictEqual(starterSections.length, 10, 'Starter landing page must have 10 sections covering the full landing page structure');

// Verify Section 1 is Header
assert(
  starterSections[0].category.includes('Nav') || starterSections[0].slug.includes('menu') || starterSections[0].slug.includes('header'),
  'First section must be a Header / Navigation bar'
);

// Verify Section 2 is Hero
assert(
  starterSections[1].category.includes('Hero') || starterSections[1].slug.includes('hero'),
  'Second section must be a Hero section'
);

// Verify Section 10 is Footer
assert(
  starterSections[9].category.includes('Footer') || starterSections[9].slug.includes('footer'),
  'Last section must be a Footer'
);

// Check that there is ONLY ONE Header, ONLY ONE Hero, and ONLY ONE Footer in the starter template
const headers = starterSections.filter(s => s.category.includes('Nav') || s.slug.includes('menu') || s.slug.includes('header'));
const heroes = starterSections.filter(s => s.category.includes('Hero') || s.slug.includes('hero'));
const footers = starterSections.filter(s => s.category.includes('Footer') || s.slug.includes('footer'));

assert.strictEqual(headers.length, 1, 'Landing page template must contain exactly 1 Header');
assert.strictEqual(heroes.length, 1, 'Landing page template must contain exactly 1 Hero');
assert.strictEqual(footers.length, 1, 'Landing page template must contain exactly 1 Footer');

console.log('  ✓ Verified exactly 1 Header, 1 Hero, and 1 Footer in starter template');

// 2. Verify Assembler Preview & Export generation with the complete 10-section landing page
const path = require('path');
const featuresData = {};
starterSections.forEach(s => {
  const dir = path.join(__dirname, '..', 'features', s.slug);
  if (fs.existsSync(dir)) {
    featuresData[s.slug] = {
      html: fs.existsSync(path.join(dir, 'index.html')) ? fs.readFileSync(path.join(dir, 'index.html'), 'utf8') : '',
      css: fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '',
      js: fs.existsSync(path.join(dir, 'script.js')) ? fs.readFileSync(path.join(dir, 'script.js'), 'utf8') : ''
    };
  }
});

const previewDoc = assemblePreviewDocument(starterSections, THEME_PRESETS['midnight-dark'], featuresData);
assert(previewDoc && previewDoc.length > 5000, 'Preview document must be non-empty and comprehensive');
assert(previewDoc.includes('nav-demo-shell') || previewDoc.includes('topbar'), 'Preview must include header markup');
assert(previewDoc.includes('beam-footer') || previewDoc.includes('footer'), 'Preview must include footer markup');

const bundle = generateExportBundle(starterSections, THEME_PRESETS['midnight-dark'], featuresData);
assert(bundle['index.html'] && bundle['index.html'].length > 500, 'Export bundle must contain index.html');
assert(bundle['style.css'] && bundle['style.css'].length > 1000, 'Export bundle must contain style.css');
assert(bundle['script.js'], 'Export bundle must contain script.js');

console.log('  ✓ Full 10-section landing page preview & bundle generated successfully');

// 3. Test stackManager replaceSection capability
const sm = createStackManager();
const sec1 = sm.addSection('responsive-burger-menu', { title: 'Burger Menu', category: 'Headers & Nav' });
const sec2 = sm.addSection('oklch-ambient-glow-hero', { title: 'Aurora Hero', category: 'Heroes' });
const sec3 = sm.addSection('beam-wordmark-footer', { title: 'Beam Footer', category: 'Footers & Endings' });

assert.strictEqual(sm.getStack().length, 3);
assert.strictEqual(typeof sm.replaceSection, 'function', 'stackManager must expose replaceSection');

const replaced = sm.replaceSection(sec1.id, 'dither-sweep-navbar', { title: 'Dither Navbar', category: 'Headers & Nav' });
assert.strictEqual(sm.getStack().length, 3, 'Replacing a section must not alter stack length');
assert.strictEqual(sm.getStack()[0].slug, 'dither-sweep-navbar', 'First section must be replaced in-place');
assert.strictEqual(sm.getStack()[0].title, 'Dither Navbar');

console.log('  ✓ stackManager.replaceSection verified in-place replacement');

// 4. Verify CSS rules for singleton badges and disabled duplicate buttons
const builderCss = fs.readFileSync('builder.css', 'utf8');
assert(builderCss.includes('.singleton-badge'), 'builder.css must style .singleton-badge');
assert(builderCss.includes('.singleton-badge.badge-required'), 'builder.css must style .singleton-badge.badge-required');
assert(builderCss.includes('.singleton-badge.badge-optional'), 'builder.css must style .singleton-badge.badge-optional');
assert(builderCss.includes('.stack-tool-btn.btn-duplicate:disabled'), 'builder.css must style disabled duplicate button');

// 5. Verify Preloader singleton definition & necessity classification
assert(builderJs.includes('preloader:'), 'LANDING_PAGE_SINGLETONS must define preloader singleton');
assert(builderJs.includes("necessity: 'optional'"), 'Preloader must have necessity: optional');
assert(builderJs.includes("necessity: 'required'"), 'Headers/heroes/footers must have necessity: required');
assert(builderJs.includes('Need: Optional'), 'UI must render Need: Optional badge for preloaders');
assert(builderJs.includes('Need: Essential'), 'UI must render Need: Essential badge for essential singletons');

console.log('  ✓ Preloader singleton and necessity classification verified');

// 6. Verify Preloader Play-Once and Suppression logic in assemblePreviewDocument
const preloaderSections = [
  { id: 'sec-pre', slug: 'amour-sunrise-preloader', category: 'Preloaders & Shaders' },
  { id: 'sec-hdr', slug: 'responsive-burger-menu', category: 'Headers & Nav' }
];
const preloaderFeatures = {
  'amour-sunrise-preloader': {
    html: '<div class="amr-root"><div class="amr-gate">Loading</div></div>',
    css: '.amr-root { color: red; }',
    js: 'console.log("running amour preloader animation");'
  },
  'responsive-burger-menu': {
    html: '<nav class="v-nav">Logo</nav>',
    css: '.v-nav { display: flex; }',
    js: 'console.log("nav initialized");'
  }
};

// Test A: Normal / First-time play (suppressPreloader: false)
const activePreviewDoc = assemblePreviewDocument(preloaderSections, THEME_PRESETS['midnight-dark'], preloaderFeatures, { suppressPreloader: false });
assert(activePreviewDoc.includes('class="page-section is-preloader"'), 'Must contain is-preloader class on section element');
assert(!activePreviewDoc.includes('is-suppressed"'), 'Active preview section must NOT contain is-suppressed class');
assert(activePreviewDoc.includes('running amour preloader animation'), 'Active preview must include preloader script');
assert(activePreviewDoc.includes('Preloader Auto-Dismiss Handler'), 'Active preview must include auto-dismiss observer');

// Test B: Suppressed on subsequent section additions (suppressPreloader: true)
const suppressedPreviewDoc = assemblePreviewDocument(preloaderSections, THEME_PRESETS['midnight-dark'], preloaderFeatures, { suppressPreloader: true });
assert(suppressedPreviewDoc.includes('class="page-section is-preloader is-dismissed is-suppressed"'), 'Suppressed preloader section must have is-dismissed and is-suppressed classes');
assert(suppressedPreviewDoc.includes('display: none !important; pointer-events: none !important;'), 'Suppressed preloader must be hidden with display:none !important');
assert(!suppressedPreviewDoc.includes('running amour preloader animation'), 'Suppressed preview must NOT execute preloader animation script');
assert(suppressedPreviewDoc.includes('[PRELOADER SUPPRESSED IN PREVIEW - WILL RUN ON REPLAY OR EXPORT]'), 'Suppressed preview must log suppression placeholder');
assert(!suppressedPreviewDoc.includes('Preloader Auto-Dismiss Handler'), 'Suppressed preview should not add auto-dismiss observer');

// Test C: Export bundle must ALWAYS include active preloader (never suppressed in export)
const exportBundle = generateExportBundle(preloaderSections, THEME_PRESETS['midnight-dark'], preloaderFeatures);
assert(exportBundle['index.html'].includes('is-preloader'), 'Export bundle must contain is-preloader');
assert(!exportBundle['index.html'].includes('is-suppressed"'), 'Export bundle section must NEVER be suppressed');
assert(exportBundle['index.html'].includes('Preloader Auto-Dismiss Handler') || exportBundle['script.js'].includes('Preloader Auto-Dismiss Handler'), 'Export bundle must include preloader dismiss logic');

// Test D: Verify builder.js wiring for play-once state
assert(builderJs.includes('playedPreloaderId'), 'builder.js must track playedPreloaderId');
assert(builderJs.includes('preloaderForceReplay'), 'builder.js must support preloaderForceReplay');
assert(/\{\s*suppressPreloader\b/.test(builderJs), 'builder.js must pass suppressPreloader to assemblePreviewDocument');

console.log('  ✓ Preloader Play-Once and Suppression logic verified');

console.log('✅ ALL LANDING PAGE & SINGLETON CONSTRAINTS TESTS PASSED!');

