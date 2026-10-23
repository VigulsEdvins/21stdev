const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');
const { assemblePreviewDocument, generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');

console.log('Testing Creative Elements Widgets (Tables, Buttons, Cards, Badges)...');

const sm = createStackManager();
const sec = sm.addSection('hero-section');

// 1. Add 5 distinct button styles
const btnNeon = sm.addElement(sec.id, {
  type: 'button',
  text: 'Launch Terminal',
  style: 'neon',
  link: '#terminal'
});
assert.strictEqual(btnNeon.style, 'neon');

const btnGlass = sm.addElement(sec.id, {
  type: 'button',
  text: 'Glass Action',
  style: 'glass'
});
assert.strictEqual(btnGlass.style, 'glass');

const btnShine = sm.addElement(sec.id, {
  type: 'button',
  text: 'Shine Premium',
  style: 'shine'
});
assert.strictEqual(btnShine.style, 'shine');

const btnSolid = sm.addElement(sec.id, {
  type: 'button',
  text: 'Get Started',
  style: 'solid'
});
assert.strictEqual(btnSolid.style, 'solid');

const btnOutline = sm.addElement(sec.id, {
  type: 'button',
  text: 'Documentation',
  style: 'outline'
});
assert.strictEqual(btnOutline.style, 'outline');

// 2. Add Pricing / Comparison Table Element
const pricingTable = sm.addElement(sec.id, {
  type: 'table',
  tableType: 'pricing',
  title: 'Pro Plan',
  price: '$29/mo',
  features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support']
});
assert.strictEqual(pricingTable.type, 'table');
assert.strictEqual(pricingTable.tableType, 'pricing');

// 3. Add Feature Card Element
const featureCard = sm.addElement(sec.id, {
  type: 'card',
  cardType: 'feature',
  title: 'Real-time Analytics',
  description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
  badgeText: 'HOT'
});
assert.strictEqual(featureCard.type, 'card');

// 4. Add Glowing / Pulse Badge
const pulseBadge = sm.addElement(sec.id, {
  type: 'badge',
  text: 'v2.0 LIVE',
  badgeStyle: 'pulse'
});
assert.strictEqual(pulseBadge.type, 'badge');

// 5. Test Assembler Preview Document Rendering
const previewDoc = assemblePreviewDocument(sm.getStack(), THEME_PRESETS['midnight-dark']);

assert(previewDoc.includes('btn-style-neon'), 'Preview must render neon button class');
assert(previewDoc.includes('btn-style-glass'), 'Preview must render glass button class');
assert(previewDoc.includes('btn-style-shine'), 'Preview must render shine button class');
assert(previewDoc.includes('Launch Terminal'), 'Preview must render button text');
assert(previewDoc.includes('element-table-pricing'), 'Preview must render pricing table widget');
assert(previewDoc.includes('$29/mo'), 'Preview must render pricing table price');
assert(previewDoc.includes('Unlimited Projects'), 'Preview must render pricing table feature');
assert(previewDoc.includes('element-card-feature'), 'Preview must render feature card widget');
assert(previewDoc.includes('Real-time Analytics'), 'Preview must render card title');
assert(previewDoc.includes('badge-style-pulse'), 'Preview must render pulse badge widget');

// 6. Test Export Bundle Rendering
const bundle = generateExportBundle(sm.getStack(), THEME_PRESETS['midnight-dark']);
const indexHtml = bundle['index.html'];
const styleCss = bundle['style.css'];

assert(indexHtml.includes('btn-style-neon'), 'Exported index.html must retain neon button');
assert(indexHtml.includes('element-table-pricing'), 'Exported index.html must retain pricing table');
assert(styleCss.includes('.btn-style-shine'), 'Exported style.css must include shine button styles');
assert(styleCss.includes('.element-table-pricing'), 'Exported style.css must include pricing table styles');
assert(styleCss.includes('.element-card-feature'), 'Exported style.css must include card styles');

console.log('✅ Creative Elements Widgets tests passed!');
