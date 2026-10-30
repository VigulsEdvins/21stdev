/* The language button in headers (scripts/assembler/lang-slot.js): slot kept or removed, CSS/JS added once, export wiring. */
const assert = require('assert');
const LS = require('../scripts/assembler/lang-slot.js');
const SP = require('../scripts/builder/single-pages.js');
const A = require('../scripts/assembler.js');

const html = '<header><div data-edv-lang></div></header>';
assert(!LS.hasLangSlot(html), 'an empty slot is not a button yet');
assert.strictEqual(LS.fillLangSlots(html, false), '<header></header>', 'one language: the slot goes');
const kept = LS.fillLangSlots(html, true);
assert(LS.hasLangSlot(kept) && /class="lsw-menu"/.test(kept) && /lsw-lang" data-edv-lang="on" hidden>/.test(kept), 'translations: a hidden button');
console.log('  ✓ slot becomes a hidden button or is removed');

const features = { 'h-a': { html: '<header class="h"><div data-edv-lang></div><a href="#top">x</a></header>', css: '.h{display:flex}', js: '' } };
const stack = [{ id: 'sec-1', slug: 'h-a', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }];
const exp = (langSwitch) => A.generateExportBundle(stack, 'dark', features, { page: { title: 'T', lang: 'en' }, langSwitch });
const one = exp(false), two = exp(true);
assert(!/data-edv-lang|lsw-/.test(one['index.html'] + one['style.css'] + one['script.js']), 'one language: no button, no CSS, no JS');
assert(/data-edv-lang="on"/.test(two['index.html']) && two['style.css'].split('.lsw-current {').length === 2 && two['script.js'].split('data-lsw-ready').length === 3, 'translations: button, CSS once, JS once');
console.log('  ✓ export: nothing for one language; button, CSS and JS once with translations');

const members = [{ id: 'a', lang: 'en', index: 0, slug: 'index' }, { id: 'b', lang: 'lv', index: 1, slug: 'index-lv' }];
const sw = '<div class="lsw-lang" data-edv-lang="on" hidden><span class="lsw-code" data-cms-skip>EN</span><ul class="lsw-menu" hidden></ul></div><div class="lsw-lang"><span class="lsw-code">EN</span><ul class="lsw-menu"></ul></div>';
const w = SP.wireLanguageSwitcher(sw, members, 'b', (m) => (m.index === 0 ? 'index.html' : m.slug + '.html'));
assert.strictEqual(w.html.split('data-href="index-lv.html"').length, 3, 'both switchers list the files');
assert(!/data-edv-lang="on" hidden/.test(w.html) && w.html.split('>LV<').length === 3, 'the header button shows and both show the current language');
console.log('  ✓ wireLanguageSwitcher fills every switcher and shows the header button');
