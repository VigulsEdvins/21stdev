const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Creative Elements Real Component Catalog & Categories...');

// 1. Verify DOM structure in builder.html
const builderHtml = fs.readFileSync(path.resolve(__dirname, '../builder.html'), 'utf8');
assert(builderHtml.includes('id="paneElements"'), 'builder.html must contain #paneElements');
assert(builderHtml.includes('id="elementsSearchInput"'), 'builder.html must contain #elementsSearchInput');
assert(builderHtml.includes('id="clearElementsSearchBtn"'), 'builder.html must contain #clearElementsSearchBtn');
assert(builderHtml.includes('id="elementsCategoryPills"'), 'builder.html must contain #elementsCategoryPills');
assert(builderHtml.includes('id="elementsCardsGrid"'), 'builder.html must contain #elementsCardsGrid');
assert(builderHtml.includes('id="elementsTotalCount"'), 'builder.html must contain #elementsTotalCount');
assert(builderHtml.includes('data-category="Pricing &amp; Tables"'), 'builder.html must contain Pricing & Tables category pill');
assert(builderHtml.includes('data-category="Buttons &amp; UI"'), 'builder.html must contain Buttons & UI category pill');

// 2. Verify Styles in builder.css
const builderCss = fs.readFileSync(path.resolve(__dirname, '../builder.css'), 'utf8');
assert(builderCss.includes('.elements-catalog-header'), 'builder.css must style .elements-catalog-header');
assert(builderCss.includes('.elements-cards-grid'), 'builder.css must style .elements-cards-grid');
assert(builderCss.includes('.element-feature-card'), 'builder.css must style .element-feature-card');
assert(builderCss.includes('.element-add-btn'), 'builder.css must style .element-add-btn');
assert(builderCss.includes('.element-card-badge'), 'builder.css must style .element-card-badge');

// 3. Verify Category Taxonomy in builder.js and registry.json
const registry = require('../registry.json');
assert.strictEqual(registry.items.length, 209, 'Must contain all 209 real vault features');

const { matchesCategory } = require('../builder.js');
assert(typeof matchesCategory === 'function', 'builder.js must export matchesCategory');

// Category check assertions
const heroFeatures = registry.items.filter(f => matchesCategory(f, 'Heroes'));
assert.strictEqual(heroFeatures.length, 15, `Heroes must contain 15 features, got ${heroFeatures.length}`);

const navFeatures = registry.items.filter(f => matchesCategory(f, 'Headers & Nav'));
assert.strictEqual(navFeatures.length, 4, `Headers & Nav must contain 4 features, got ${navFeatures.length}`);

const footerFeatures = registry.items.filter(f => matchesCategory(f, 'Footers'));
assert.strictEqual(footerFeatures.length, 8, `Footers must contain 8 features, got ${footerFeatures.length}`);

const pricingFeatures = registry.items.filter(f => matchesCategory(f, 'Pricing & Tables'));
assert.strictEqual(pricingFeatures.length, 2, `Pricing & Tables must contain 2 features, got ${pricingFeatures.length}`);
assert(pricingFeatures.some(f => f.slug === 'ink-orbit-pricing'), 'ink-orbit-pricing must be in Pricing & Tables');
assert(pricingFeatures.some(f => f.slug === 'constellation-turntable'), 'constellation-turntable must be in Pricing & Tables');

const buttonFeatures = registry.items.filter(f => matchesCategory(f, 'Buttons & UI'));
assert.strictEqual(buttonFeatures.length, 6, `Buttons & UI must contain 6 features, got ${buttonFeatures.length}`);

const carouselFeatures = registry.items.filter(f => matchesCategory(f, '3D & Carousels'));
assert.strictEqual(carouselFeatures.length, 22, `3D & Carousels must contain 22 features, got ${carouselFeatures.length}`);

const allFeatures = registry.items.filter(f => matchesCategory(f, 'all'));
assert.strictEqual(allFeatures.length, 209, 'All category must match 209 features');

console.log('✅ Creative Elements Real Component Catalog tests passed successfully!');
