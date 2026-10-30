/** Sticky header: the class on the section, the saved field, the default of the two blocks made for it. */
const assert = require('assert');
const Asm = require('../scripts/assembler.js');
const { sanitizeState } = require('../scripts/project-sanitize.js');

const stack = (sticky) => [
  Object.assign({ id: 'hd', slug: 'x-header', title: 'Menu', category: 'Headers & Nav', html: '<header>h</header>', css: '', js: '' }, sticky === undefined ? {} : { sticky }),
  { id: 'ab', slug: 'about-story', title: 'About', html: '<h2>a</h2>', css: '', js: '' }
];
const idx = (st) => Asm.generateExportBundle(st, {}, {}, {})['index.html'];
assert(/<section class="page-section is-sticky[ "]/.test(idx(stack(true))) && !/id="ab"[^>]*is-sticky|is-sticky[^>]*id="ab"/.test(idx(stack(true))), 'only the header section sticks');
assert(!/is-sticky"/.test(idx(stack(undefined))) && !/is-sticky"/.test(idx(stack(false))), 'absent or false: it scrolls');
assert(/\.page-section\.is-sticky\s*\{\s*position:\s*sticky;\s*top:\s*0;/.test(Asm.generateExportBundle(stack(true), {}, {}, {})['style.css']), 'the rule is in the page CSS, after the base rule');
const css = Asm.generateExportBundle(stack(true), {}, {}, {})['style.css'];
assert(css.indexOf('.page-section.is-sticky') > css.indexOf('.page-section {'), 'it comes after position: relative so it wins');
assert(/class="page-section is-sticky/.test(Asm.generateSingleFileBundle(stack(true), {}, {}, {})), 'single file');
assert(/class="page-section is-sticky/.test(Asm.assemblePreviewDocument(stack(true), {}, {}, {})), 'preview');

// saving keeps only true
const kept = sanitizeState({ stack: [{ id: 'a1', slug: 'about-story', sticky: true }, { id: 'a2', slug: 'about-story', sticky: 'yes' }, { id: 'a3', slug: 'about-story', sticky: false }] }).state.stack;
assert.strictEqual(kept[0].sticky, true);
assert(!('sticky' in kept[1]) && !('sticky' in kept[2]));

// a new header made for it starts sticky; others and saved sections do not
global.window = { FEATURE_REGISTRY: [{ slug: 'sticky-shrink-header', stickyDefault: true }, { slug: 'centered-logo-header' }] };
const { createStackManager } = require('../scripts/stack-manager.js');
const sm = createStackManager();
sm.insertSection(0, 'sticky-shrink-header'); sm.insertSection(1, 'centered-logo-header'); sm.insertSection(2, { slug: 'sticky-shrink-header' });
const [a, b, c] = sm.getStack();
assert.strictEqual(a.sticky, true); assert(!('sticky' in b)); assert(!('sticky' in c), 'a saved header keeps what it had');
sm.setSectionSticky(b.id, true); assert.strictEqual(sm.getStack()[1].sticky, true);
sm.setSectionSticky(b.id, false); assert(!('sticky' in sm.getStack()[1]));
delete global.window;

// the registry carries the default of exactly the two blocks
const meta = (slug) => require('../features/' + slug + '/meta.json');
assert.strictEqual(meta('sticky-shrink-header').stickyDefault, true);
assert.strictEqual(meta('dither-sweep-navbar').stickyDefault, true);
assert(!meta('centered-logo-header').stickyDefault);
console.log('✅ Sticky header passed!');
