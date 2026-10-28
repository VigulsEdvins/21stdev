/* The free-blocks list: which components a signed-out visitor may use (meta.json "access"), and that the builder's own kinds start with a free look. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const K = require('../scripts/builder/block-kinds.js');
const { validateMeta } = require('../scripts/schema.js');

const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry.json'), 'utf8')).items;
const by = Object.fromEntries(reg.map((i) => [i.slug, i]));
const free = reg.filter((i) => i.access === 'free').map((i) => i.slug);
assert(reg.every((i) => i.access === 'free' || i.access === 'account'), 'every component is free or account');
assert.strictEqual(by['multilingual-lang-switcher'].access, 'free', 'the language switcher is added for the visitor, so it is free');
const kindSlugs = K.KINDS.flatMap((k) => k.variants);
kindSlugs.forEach((v) => assert.strictEqual(by[v].access, 'free', v + ': every look of every everyday block kind is free'));
const STARTER = ['responsive-burger-menu', 'oklch-ambient-glow-hero', 'cylindrical-3d-carousel', 'beam-wordmark-footer']; // the starter page's header, hero, 3D section and footer (builder.js STARTER_SECTIONS); its pricing and form are everyday kinds
assert.deepStrictEqual(free.slice().sort(), [...new Set(kindSlugs.concat(['multilingual-lang-switcher'], STARTER))].sort(), 'the free list is exactly: every look of the everyday block kinds, the language switcher and the header, hero, 3D section and footer of the starter page');
const src = fs.readFileSync(path.join(__dirname, '..', 'builder.js'), 'utf8');
const starter = eval(src.match(/const STARTER_SECTIONS = (\[[\s\S]*?\]);/)[1]);
starter.forEach((x) => assert.strictEqual(by[x.slug].access, 'free', x.slug + ': every section of the starter page is free, so signed-out visitors get the whole page'));
assert(reg.filter((i) => i.access === 'account').length > 150, 'the rest of the library needs an account');
console.log('  ✓ the free list: every look of each everyday kind (' + kindSlugs.length + ') and the language switcher');

const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'features', 'faq-accordion-smooth', 'meta.json'), 'utf8'));
assert.deepStrictEqual(validateMeta(meta), [], 'a free component still validates');
assert(validateMeta(Object.assign({}, meta, { access: 'paid' })).some((e) => /access must be/.test(e)), 'a wrong value is refused');
console.log('  ✓ meta.json accepts access: free or account only');
console.log('access ok');
