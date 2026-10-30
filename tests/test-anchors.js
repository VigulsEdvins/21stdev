/** Anchor names for sections (scripts/builder/anchors.js): defaults, clashes, reserved names, client-set names. */
const assert = require('assert');
const A = require('../scripts/builder/anchors.js');

const s = (id, slug, extra) => Object.assign({ id, slug, title: '' }, extra);

// clean: accents, symbols, case, length
assert.strictEqual(A.clean('Café & Bar!'), 'cafe-bar');
assert.strictEqual(A.clean('  --Hello   World--  '), 'hello-world');
assert.strictEqual(A.clean('<b>Prices</b>'), 'prices');
assert.strictEqual(A.clean('日本語'), '');
assert.strictEqual(A.clean(null), '');
assert(A.clean('x'.repeat(100)).length <= 40);

// an everyday kind gets the word a visitor expects; other blocks use their title
let m = A.assign([s('a', 'pricing-table-switch', { title: 'Pricing Table' }), s('b', 'faq-accordion-smooth', { title: 'FAQ accordion' }), s('c', 'earth-limb-landing', { title: 'Earth Limb Landing' })]);
assert.deepStrictEqual(m, { a: 'pricing', b: 'faq', c: 'earth-limb-landing' });

// no title: the slug; nothing at all: "section"
m = A.assign([s('a', 'my-block'), s('b', '')]);
assert.deepStrictEqual(m, { a: 'my-block', b: 'section' });

// two of the same kind: -2, -3
m = A.assign([s('a', 'faq-accordion-smooth'), s('b', 'slit-type-faq'), s('c', 'faq-accordion-smooth')]);
assert.deepStrictEqual(m, { a: 'faq', b: 'faq-2', c: 'faq-3' });

// headers and footers by category
m = A.assign([s('h', 'centered-logo-header', { category: 'Headers & Nav' }), s('f', 'cta-footer', { category: 'Footers & Endings' })]);
assert.deepStrictEqual(m, { h: 'header', f: 'footer' });

// "top" is always taken; reserved names (page keys of a single-file site) are never handed out
m = A.assign([s('a', 'x', { title: 'Top' }), s('b', 'about-story', { title: 'About' })], { reserved: ['About'] });
assert.deepStrictEqual(m, { a: 'top-2', b: 'about-2' });

// the client's own name wins over a default that would have taken it, and survives a later duplicate default
m = A.assign([s('a', 'faq-accordion-smooth'), s('b', 'x', { title: 'Questions', anchor: 'faq' })]);
assert.deepStrictEqual(m, { a: 'faq-2', b: 'faq' });
// two clients' names the same: the first keeps it
m = A.assign([s('a', 'x', { anchor: 'Our Work' }), s('b', 'y', { anchor: 'our-work' })]);
assert.deepStrictEqual(m, { a: 'our-work', b: 'our-work-2' });
// a client's name that is not usable falls back to the default
m = A.assign([s('a', 'about-story', { anchor: '???' })]);
assert.deepStrictEqual(m, { a: 'about' });

// hidden sections and preloaders get none; junk input is fine
m = A.assign([s('a', 'about-story', { hidden: true }), s('b', 'cool-preloader'), null, { slug: 'no-id' }, s('c', 'about-story')]);
assert.deepStrictEqual(m, { c: 'about' });
assert.deepStrictEqual(A.assign(undefined), {});

// a long title never makes a name longer than the limit, even with a counter
const long = 'y'.repeat(60);
m = A.assign([s('a', 'x', { title: long }), s('b', 'x', { title: long })]);
assert(m.a.length <= 40 && m.b.length <= 40 && m.a !== m.b);

// every name is safe to put in an id attribute and a link
Object.values(A.assign([s('a', 'x', { title: '"><script>alert(1)</script>' }), s('b', 'x', { anchor: 'a b"c' })])).forEach(n => assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n), n));

// ---- the exports ----
const Asm = require('../scripts/assembler.js');
const theme = {};
const stack = [
  { id: 's1', slug: 'about-story', title: 'About', html: '<h2>About</h2>', css: '', js: '' },
  { id: 's2', slug: 'pricing-table-switch', title: 'Pricing', html: '<h2>Pricing</h2>', css: '', js: '' },
  { id: 's3', slug: 'faq-accordion-smooth', title: 'FAQ', html: '<h2>FAQ</h2>', css: '', js: '', hidden: true }
];
const index = Asm.generateExportBundle(stack, theme, {}, {})['index.html'];
assert(/<span class="edv-anchor" id="about" data-for="s1"><\/span>\s*<section class="page-section[^"]*" id="s1"/.test(index), 'multi-file export: the anchor sits right before its section');
assert(/<span class="edv-anchor" id="pricing" data-for="s2"><\/span>/.test(index));
assert(!/id="faq"/.test(index), 'a hidden section gets no anchor');
assert((index.match(/id="s1"/g) || []).length === 1, 'the section keeps its own id');

// a menu link to #pricing now has a target (the page check counts ids)
const PC = require('../scripts/builder/page-checks.js');
const withMenu = index.replace('<section', '<a data-edv-cta href="#pricing">Plans</a><section');
assert(!PC.checkPage(withMenu, {}).some(i => i.id === 'cta-no-link'), 'a link to #pricing is no longer a link to nowhere');

// single file: the export has anchors, the live preview does not, and the keys of the other pages are never handed out
const single = Asm.generateSingleFileBundle(stack, theme, {}, {});
assert(/<span class="edv-anchor" id="pricing" data-for="s2"><\/span>/.test(single), 'single-file export has anchors');
assert(!/edv-anchor/.test(Asm.assemblePreviewDocument(stack, theme, {}, {})), 'the live preview has none');
const multi = Asm.generateSingleFileBundle(stack, theme, {}, { reservedAnchors: ['about', 'home'] });
assert(/id="about-2" data-for="s1"/.test(multi) && !/id="about" /.test(multi), 'a page called "about" keeps its address');

// the router opens the page that owns an anchor, and hides the anchors of the pages it hides
const SP = require('../scripts/builder/single-pages.js');
const routed = SP.addRouter(single, [{ key: 'home', title: 'Home', ids: ['s1'] }, { key: 'more', title: 'More', ids: ['s2'] }]);
assert(/getAttribute\('data-for'\)/.test(routed) && /\[data-for=/.test(routed), 'router knows anchors');

// the stack manager keeps a client's own name, cleaned; empty goes back to the automatic one
global.window = { BuilderAnchors: A };
const SM = require('../scripts/stack-manager.js');
const sm = SM.createStackManager ? SM.createStackManager() : (SM.default ? SM.default() : null);
if (sm) {
  sm.setStack([{ id: 'q', slug: 'faq-accordion-smooth' }]);
  sm.setSectionAnchor('q', 'Our  Q&A!');
  assert.strictEqual(sm.getStack()[0].anchor, 'our-q-a');
  sm.setSectionAnchor('q', '  ');
  assert(!('anchor' in sm.getStack()[0]));
  assert.strictEqual(sm.setSectionAnchor('nope', 'x'), null);
}
delete global.window;

// ---- menu items find their section by name
(function () {
  const names = ['header', 'about', 'pricing', 'reviews', 'contact', 'faq-2'];
  assert.strictEqual(A.matchLabel('Pricing', names), 'pricing');
  assert.strictEqual(A.matchLabel('  Plans & Pricing ', names), 'pricing');
  assert.strictEqual(A.matchLabel('Customers', names), 'reviews', 'a word for the same place');
  assert.strictEqual(A.matchLabel('Say hello', names), 'contact');
  assert.strictEqual(A.matchLabel('About', names), 'about');
  assert.strictEqual(A.matchLabel('Shop', names), '', 'no such section, no guess');
  assert.strictEqual(A.matchLabel('FAQ', names), '', 'the only faq is called faq-2: not guessed');
  assert.strictEqual(A.matchLabel('', names), '');
  const html = '<nav><a href="#" data-edv-nav="1">Pricing</a><a href="#" data-edv-nav="2"><span>02</span><i>About</i></a><a href="#" data-edv-nav="3">Shop</a><a href="https://x.example/" data-edv-nav="4">Contact</a><a href="#">Contact</a><a data-edv-nav="5" href="">Contact</a></nav>';
  const out = A.linkNav(html, names);
  assert(out.includes('<a href="#pricing" data-edv-nav="1">Pricing</a>'));
  assert(out.includes('<a href="#about" data-edv-nav="2"><span>02</span><i>About</i></a>'), 'text inside nested tags counts');
  assert(out.includes('<a href="#" data-edv-nav="3">Shop</a>'), 'unmatched stays as it was');
  assert(out.includes('href="https://x.example/" data-edv-nav="4"'), 'a set address is never replaced');
  assert(out.includes('<a href="#">Contact</a>'), 'a plain link without data-edv-nav is not touched');
  assert(out.includes('data-edv-nav="5" href="#contact"'), 'an empty address counts as none');
  assert.strictEqual(A.linkNav(html, []), html, 'no sections, no change');
  // in an export, the header's "Pricing" goes to the pricing section
  const Asm2 = require('../scripts/assembler.js');
  const st = [
    { id: 'hd', slug: 'x-nav', title: 'Menu', category: 'Headers & Nav', html: '<nav><a href="#" data-edv-nav="1">Pricing</a><a href="#" data-edv-nav="2">Shop</a></nav>', css: '', js: '' },
    { id: 'pr', slug: 'pricing-table-switch', title: 'Pricing', html: '<h2>P</h2>', css: '', js: '' }
  ];
  const ex = Asm2.generateExportBundle(st, {}, {}, {})['index.html'];
  assert(/<a href="#pricing" data-edv-nav="1">Pricing<\/a>/.test(ex), 'export links what it can');
  assert(!/>Shop<\/a>/.test(ex) && /<!-- edv-nav-hidden: Shop -->/.test(ex), 'an item that goes nowhere is left out, with a note');
  // a link set in the admin panel (applied when the page loads, so only in overrides) keeps the item
  const kept = Asm2.generateExportBundle([Object.assign({}, st[0], { overrides: { 'nav-2': { selector: ':scope [data-edv-nav="2"]', type: 'link', value: 'https://shop.example/' } } }), st[1]], {}, {}, {})['index.html'];
  assert(/data-edv-nav="2">Shop<\/a>/.test(kept) && !/edv-nav-hidden/.test(kept), 'a linked item stays');
  // the editor's copy keeps every item, so its fields are all listed
  assert(/>Shop<\/a>/.test(Asm2.generateSingleFileBundle(st, {}, {}, { keepUnlinkedNav: true })), 'keepUnlinkedNav');
  assert(/<a href="#pricing"[^>]*>Pricing<\/a>/.test(Asm2.generateSingleFileBundle(st, {}, {}, {})), 'single file too');
  assert(!/>Shop<\/a>/.test(Asm2.generateSingleFileBundle(st, {}, {}, {})), 'single file leaves it out too');
  assert(!/href="#pricing"/.test(Asm2.assemblePreviewDocument(st, {}, {}, {})), 'the live preview is unchanged');
})();

// ---- leaving out menu items that go nowhere
(function () {
  const keep = A.linkedItems({ a: { type: 'link', selector: ':scope [data-edv-nav="2"]', value: 'https://x.example' }, b: { type: 'link', selector: ':scope [data-edv-nav="3"]', value: '#' }, c: { type: 'text', selector: ':scope [data-edv-nav="4"]', value: 'x' }, d: null });
  assert.deepStrictEqual([...keep], ['2'], 'only a real address counts');
  let r = A.hideUnlinked('<ul><li style="--i:0"><a href="#" data-edv-nav="1"><span>01</span>Studio <em>Roster</em></a></li><li><a href="#pricing" data-edv-nav="2">Prices</a></li></ul>', new Set());
  assert.strictEqual(r.html, '<ul><li><a href="#pricing" data-edv-nav="2">Prices</a></li></ul>');
  assert.deepStrictEqual(r.hidden, ['01 Studio Roster']);
  r = A.hideUnlinked('<ul><li><a href="#" data-edv-nav="1">A</a></li></ul><p>x</p>', new Set());
  assert.strictEqual(r.html, '<p>x</p>', 'a list left empty goes too');
  r = A.hideUnlinked('<nav><a href="#" data-edv-nav="1">A</a><a data-edv-nav="2">B</a><a href="" data-edv-nav="3">C</a><a href="#" data-edv-nav="4">D</a></nav>', new Set(['4']));
  assert.strictEqual(r.html, '<nav><a href="#" data-edv-nav="4">D</a></nav>', 'no address and an empty address are the same as "#"; an address set in the panel keeps the item');
  assert.deepStrictEqual(r.hidden, ['A', 'B', 'C']);
  r = A.hideUnlinked('<a href="#">Plain</a><a href="https://a.example" data-edv-nav="1">Out</a>', new Set());
  assert.strictEqual(r.hidden.length, 0, 'only marked items, only the ones with no address');
  assert(!/--/.test(A.hiddenNote(['a -- b', '<x>']).replace(/^<!--|-->\n$/g, '')), 'a note cannot end its own comment');
})();

// the headers made for a many-page site are drafts (hidden unless "Drafts" is ticked); the rest of the headers are not
(function () {
  const reg = require('../registry.json').items;
  const status = (slug) => (reg.find(f => f.slug === slug) || {}).status;
  assert.strictEqual(status('mega-menu-header'), 'draft');
  assert.strictEqual(status('sticky-shrink-header'), 'stable');
  assert(!require('../scripts/catalog-search.js').matchesFilters(reg.find(f => f.slug === 'mega-menu-header'), {}), 'hidden from the picker');
  assert(require('../scripts/catalog-search.js').matchesFilters(reg.find(f => f.slug === 'mega-menu-header'), { showDrafts: true }), 'shown with Drafts ticked');
})();

console.log('✅ Anchor names passed!');
