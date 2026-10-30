/** Automatic menu (scripts/builder/menu.js): which sections get an item, and how a header's markup is filled. */
const assert = require('assert');
const M = require('../scripts/builder/menu.js');

const sec = (id, slug, extra) => Object.assign({ id, slug, title: slug }, extra);
const names = (list) => Object.fromEntries(list.map(s => [s.id, s.slug + '-n']));

// ---- which sections
let st = [sec('h', 'x-header', { category: 'Headers & Nav' }), sec('b', 'ink-orbit-hero', { category: 'Heroes' }), sec('a', 'about-story'), sec('p', 'pricing-table-switch'), sec('c', 'custom-block', { title: 'Our Work' }), sec('f', 'cta-footer', { category: 'Footers & Endings' })];
let out = M.items(st, names(st));
assert.deepStrictEqual(out.map(i => i.label), ['About', 'Pricing', 'Our Work'], 'header, opening banner and footer are left out; kinds get their everyday word');
assert.deepStrictEqual(out.map(i => i.anchor), ['about-story-n', 'pricing-table-switch-n', 'custom-block-n']);
// a banner that is not first is a section like the others; a first section that is not a banner is listed
st = [sec('a', 'about-story'), sec('b', 'ink-orbit-hero', { category: 'Heroes' })];
assert.deepStrictEqual(M.items(st, names(st)).map(i => i.label), ['About', 'ink-orbit-hero']);
// switched off, hidden (no anchor) and renamed
st = [sec('a', 'about-story', { inMenu: false }), sec('p', 'pricing-table-switch', { menuLabel: '  Plans   and prices  ' }), sec('h', 'faq-accordion-smooth')];
out = M.items(st, { p: 'pricing', h: undefined });
assert.deepStrictEqual(out.map(i => i.label), ['Plans and prices'], 'inMenu false, no anchor, custom label');
assert.strictEqual(M.items([sec('x', 'q', { menuLabel: 'y'.repeat(80) })], { x: 'q' })[0].label.length, M.LABEL_MAX);
assert.deepStrictEqual(M.items(undefined, {}), []);
// category looked up for a stack item that has none
assert.deepStrictEqual(M.items([sec('h', 'x', {}), sec('a', 'about-story')], { h: 'h', a: 'a' }, { categoryOf: s => (s.id === 'h' ? 'Headers & Nav' : '') }).map(i => i.id), ['a']);

// ---- filling a header
const three = [{ label: 'About', anchor: 'about' }, { label: 'Pricing', anchor: 'pricing' }, { label: 'Say <hi> & "bye"', anchor: 'contact' }];
// one list of plain links
let h = '<header><nav class="n" data-edv-menu data-edv-menu-max="6"><a href="#" data-edv-nav="1">Product</a><a href="#" data-edv-nav="2">Pricing</a></nav><a class="cta" href="#" data-edv-nav="5">Go</a></header>';
let r = M.fill(h, three);
assert.strictEqual(r.html, '<header><nav class="n" data-edv-menu data-edv-menu-max="6"><a href="#about" data-edv-auto>About</a><a href="#pricing" data-edv-auto>Pricing</a><a href="#contact" data-edv-auto>Say &lt;hi&gt; &amp; &quot;bye&quot;</a></nav><a class="cta" href="#" data-edv-nav="5">Go</a></header>', 'generated items replace the hand-made ones; the button stays');
assert.deepStrictEqual(r.overflow, []);
// numbered list items with a running index (the burger menu)
h = '<ul data-edv-menu data-edv-menu-max="8" class="menu-links"><li style="--i:0"><a href="#" data-edv-nav="1"><span data-edv-count>01</span><i class="bm-label" data-edv-label>Studio <em>Roster</em></i></a></li><li style="--i:1"><a href="#" data-edv-nav="2"><span data-edv-count>02</span><i data-edv-label>x</i></a></li></ul>';
r = M.fill(h, three);
assert(/<li style="--i:0"><a href="#about" data-edv-auto><span>01<\/span><i class="bm-label">About<\/i><\/a><\/li><li style="--i:1"><a href="#pricing" data-edv-auto><span>02<\/span><i class="bm-label">Pricing<\/i><\/a><\/li><li style="--i:2">/.test(r.html), r.html);
assert(!/data-edv-label|data-edv-count|data-edv-nav/.test(r.html), 'no marker is left on a generated item');
// a text-carrying inner element (the dithered link) and a kept button
h = '<nav data-edv-menu data-edv-menu-max="5"><a class="dn-link" href="#" data-edv-nav="1"><canvas></canvas><span data-edv-label>Studio</span></a><a class="dn-link" href="#" data-edv-nav="2"><canvas></canvas><span data-edv-label>Journal</span></a><a class="dn-link dn-cta" href="#" data-edv-nav="4" data-edv-keep><canvas></canvas><span>Say hello</span></a></nav>';
r = M.fill(h, three.slice(0, 2));
assert.strictEqual(r.html, '<nav data-edv-menu data-edv-menu-max="5"><a href="#about" data-edv-auto class="dn-link"><canvas></canvas><span>About</span></a><a href="#pricing" data-edv-auto class="dn-link"><canvas></canvas><span>Pricing</span></a><a class="dn-link dn-cta" href="#" data-edv-nav="4" data-edv-keep><canvas></canvas><span>Say hello</span></a></nav>');
// the language switcher's translation keys must not stay on a generated link
r = M.fill('<nav data-edv-menu><a href="#" data-edv-nav="1" data-i18n="work">Work</a></nav>', three.slice(0, 1));
assert.strictEqual(r.html, '<nav data-edv-menu><a href="#about" data-edv-auto>About</a></nav>');
// two lists: the first gets the larger half, a list never gets more than it holds
h = '<header><nav data-edv-menu data-edv-menu-max="3"><a href="#">A</a><a href="#">B</a></nav><b>logo</b><nav data-edv-menu data-edv-menu-max="3"><a href="#">C</a></nav></header>';
const five = ['a', 'b', 'c', 'd', 'e'].map(k => ({ label: k.toUpperCase(), anchor: k }));
r = M.fill(h, five);
assert.strictEqual(r.html.match(/data-edv-auto/g).length, 5);
assert(/<nav data-edv-menu data-edv-menu-max="3"><a href="#a" data-edv-auto>A<\/a><a href="#b" data-edv-auto>B<\/a><a href="#c" data-edv-auto>C<\/a><\/nav><b>logo<\/b><nav data-edv-menu data-edv-menu-max="3"><a href="#d" data-edv-auto>D<\/a><a href="#e" data-edv-auto>E<\/a><\/nav>/.test(r.html), r.html);
r = M.fill(h, five.concat([{ label: 'F', anchor: 'f' }, { label: 'G', anchor: 'g' }]));
assert.deepStrictEqual(r.overflow, ['G'], 'room for six: the seventh is reported');
r = M.fill(h, five.slice(0, 1));
assert(/<nav data-edv-menu data-edv-menu-max="3"><a href="#a" data-edv-auto>A<\/a><\/nav><b>logo<\/b><nav data-edv-menu data-edv-menu-max="3"><\/nav>/.test(r.html), 'the second list is empty, not broken: ' + r.html);
// no sections: an empty list, never broken markup
r = M.fill(h, []);
assert(/<nav data-edv-menu data-edv-menu-max="3"><\/nav><b>logo<\/b><nav data-edv-menu data-edv-menu-max="3"><\/nav>/.test(r.html));
// a header without a menu list, or a list without a pattern, is untouched
assert.strictEqual(M.fill('<nav><a href="#">x</a></nav>', three).html, '<nav><a href="#">x</a></nav>');
assert.strictEqual(M.fill('<nav data-edv-menu></nav>', three).html, '<nav data-edv-menu></nav>');
// nested tags of the same name inside the list do not end it early
r = M.fill('<div data-edv-menu data-edv-menu-max="4"><div><a href="#">x</a></div></div><p>after</p>', three.slice(0, 1));
assert(r.html.endsWith('<p>after</p>'), r.html);
// hostile text and anchors cannot add markup
r = M.fill('<nav data-edv-menu><a href="#">x</a></nav>', [{ label: '"><img src=x onerror=alert(1)>', anchor: 'a' }]);
assert(!/<img/.test(r.html) && /<a href="#a" data-edv-auto>/.test(r.html), r.html);

// ---- in an export
const Asm = require('../scripts/assembler.js');
const nav = '<nav data-edv-menu data-edv-menu-max="2"><a href="#" data-edv-nav="1">Old one</a><a href="#" data-edv-nav="2">Old two</a></nav><a href="#" data-edv-nav="3">Button</a>';
const page = (mode, extra) => [
  Object.assign({ id: 'hd', slug: 'x-header', title: 'Menu', category: 'Headers & Nav', html: nav, css: '', js: '' }, mode ? { menuMode: mode } : {}),
  { id: 'ab', slug: 'about-story', title: 'About', html: '<h2>a</h2>', css: '', js: '' },
  { id: 'pr', slug: 'pricing-table-switch', title: 'Pricing', html: '<h2>p</h2>', css: '', js: '' },
  { id: 'fq', slug: 'faq-accordion-smooth', title: 'FAQ', html: '<h2>f</h2>', css: '', js: '', ...(extra || {}) }
];
let ex = Asm.generateExportBundle(page('auto'), {}, {}, {})['index.html'];
assert(/<a href="#about" data-edv-auto>About<\/a><a href="#pricing" data-edv-auto>Pricing<\/a>/.test(ex), 'the header lists its sections: ' + ex.match(/<nav data[\s\S]{0,260}/));
assert(!/Old one|Old two/.test(ex), 'hand-made items are gone');
assert(/<!-- edv-menu-overflow: FAQ -->/.test(ex), 'room for two: the third section is reported');
assert(/>Button<\/a>/.test(ex) === false, 'the button had no link and no section: left out as before');
// switching a section off and hiding one change the menu
ex = Asm.generateExportBundle(page('auto', { inMenu: false }), {}, {}, {})['index.html'];
assert(!/overflow/.test(ex) && /data-edv-auto>Pricing/.test(ex) && !/data-edv-auto>FAQ/.test(ex));
// a header without the mode keeps its own items, as before
ex = Asm.generateExportBundle(page(''), {}, {}, {})['index.html'];
assert(!/data-edv-auto/.test(ex), 'saved headers stay manual');
// the live preview shows the same menu, and the single file too
const pv = Asm.assemblePreviewDocument(page('auto'), {}, {}, { navPreview: true });
assert(/data-edv-auto>About/.test(pv), 'preview');
assert(/data-edv-auto>About/.test(Asm.generateSingleFileBundle(page('auto'), {}, {}, {})), 'single file');
assert(!/data-edv-auto/.test(Asm.assemblePreviewDocument(page('auto'), {}, {}, {})), 'without navPreview (plain preview) nothing changes');

console.log('✅ Automatic menu passed!');
