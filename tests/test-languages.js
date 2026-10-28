/* Adding and removing languages (scripts/builder/languages.js): pure snapshot in, snapshot out. */
const assert = require('assert');
const L = require('../scripts/builder/languages.js');
const SP = require('../scripts/builder/single-pages.js');

const sec = (slug, id) => ({ id, slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' }, overrides: { headline: { value: 'Hello ' + slug } } });
const one = () => ({ stack: [sec('hero-a', 's1'), sec('faq-b', 's2')], page: { lang: 'en' }, pages: [], activePageId: null, theme: 'x' });

// one language to start with
let s = one();
assert.deepStrictEqual(L.languagesOf(s), ['en']);
assert.strictEqual(L.whyNotAdd(s, 'lv'), '');
assert(/already/.test(L.whyNotAdd(s, 'en')) && L.whyNotAdd(s, 'zz-') !== '' && L.whyNotAdd(s, '') !== '');
console.log('  ✓ one language, nothing to refuse for a new one');

// add Latvian: a second page, linked, with copied words and the switcher on both
s = L.addLanguage(s, 'lv');
assert.strictEqual(s.pages.length, 2);
const [home, lv] = s.pages;
assert.strictEqual(home.slug, 'index'); assert.strictEqual(lv.slug, 'index-lv'); assert.strictEqual(lv.lang, 'lv'); assert.strictEqual(lv.translationOf, home.id);
assert.strictEqual(s.activePageId, home.id, 'the open page stays open'); assert.deepStrictEqual(s.stack, home.stack, 'and the loose stack is that page');
assert.deepStrictEqual(home.stack.map((x) => x.slug), [L.SWITCHER, 'hero-a', 'faq-b'], 'switcher on top of the original');
assert.deepStrictEqual(lv.stack.map((x) => x.slug), [L.SWITCHER, 'hero-a', 'faq-b'], 'and of the copy');
assert.deepStrictEqual(lv.stack[1].overrides, home.stack[1].overrides, 'the words are copied, ready to translate');
const ids = [...home.stack, ...lv.stack].map((x) => x.id); assert.strictEqual(new Set(ids).size, ids.length, 'every block has its own id');
assert.deepStrictEqual(L.languagesOf(s), ['en', 'lv']);
assert.strictEqual(L.pageFor(s, 'lv').id, lv.id); assert.strictEqual(L.pageFor(s, 'en').id, home.id); assert.strictEqual(L.activeLanguage(s), 'en');
const groups = SP.translationGroups(s.pages, 'en'); assert(groups[home.id] && groups[lv.id], 'the export sees them as translations of each other');
console.log('  ✓ add Latvian: linked copy, words copied, switcher on both pages, export groups them');

// a third language, and a multi-page site: every original page is copied
s = L.addLanguage(s, 'de');
assert.deepStrictEqual(L.languagesOf(s), ['en', 'lv', 'de']); assert.strictEqual(s.pages.length, 3);
assert.strictEqual(s.pages[2].slug, 'index-de'); assert.strictEqual(s.pages[2].stack.filter((x) => x.slug === L.SWITCHER).length, 1, 'only one switcher per page');
let multi = { stack: [sec('hero-a', 'a1')], page: { lang: 'en' }, activePageId: 'p1', pages: [
  { id: 'p1', title: 'Home', slug: 'index', lang: '', translationOf: '', description: '', stack: [sec('hero-a', 'a1')] },
  { id: 'p2', title: 'About', slug: 'about', lang: '', translationOf: '', description: 'About us', stack: [sec('about-x', 'a2')] }] };
multi = L.addLanguage(multi, 'lv');
assert.deepStrictEqual(multi.pages.map((p) => p.slug), ['index', 'about', 'index-lv', 'about-lv']);
assert.strictEqual(multi.pages[3].translationOf, 'p2'); assert.strictEqual(multi.pages[3].description, 'About us');
multi = L.addLanguage(multi, 'de'); assert.strictEqual(multi.pages.length, 6, 'a second added language copies the originals only, not the copies');
console.log('  ✓ a third language; every page of a multi-page site is copied once per language');

// switch language: the page that goes with the open one
multi.activePageId = 'p2'; assert.strictEqual(L.pageFor(multi, 'lv').slug, 'about-lv');
multi.activePageId = multi.pages.find((p) => p.slug === 'about-de').id; assert.strictEqual(L.activeLanguage(multi), 'de'); assert.strictEqual(L.pageFor(multi, 'en').slug, 'about');
console.log('  ✓ write-in-another-language lands on the matching page');

// remove
let r = L.removeLanguage(s, 'de');
assert.deepStrictEqual(L.languagesOf(r), ['en', 'lv']); assert.strictEqual(r.pages.length, 2);
assert(r.pages.every((p) => hasSwitcher(p)), 'two languages left: the switchers stay');
r = L.removeLanguage(r, 'lv');
assert.deepStrictEqual(r.pages, [], 'back to a single page'); assert.strictEqual(r.activePageId, null);
assert.deepStrictEqual(r.stack.map((x) => x.slug), ['hero-a', 'faq-b'], 'and the switcher is gone');
assert.throws(() => L.removeLanguage(s, 'en'), /first language/);
const onCopy = Object.assign({}, s, { activePageId: s.pages[1].id });
assert.strictEqual(L.removeLanguage(onCopy, 'lv').activePageId, s.pages[0].id, 'removing the open language opens its original');
const m2 = L.removeLanguage(multi, 'lv'); assert(!m2.pages.some((p) => p.lang === 'lv') && m2.pages.length === 4 && m2.pages.every((p) => hasSwitcher(p)), 'multi-page: only that language goes');
function hasSwitcher(p) { return p.stack.some((x) => x.slug === L.SWITCHER); }
console.log('  ✓ remove: pages and switchers go, back to one page, the open page is kept sensible');

// the first language
let c = L.setSiteLanguage(one(), 'lv'); assert.strictEqual(c.snap.page.lang, 'lv');
assert(/already one of your languages/.test(L.setSiteLanguage(s, 'lv').error));
assert.strictEqual(L.setSiteLanguage(one(), 'x').error, 'Pick a language from the list.');
assert.strictEqual(L.activeLanguage(c.snap), 'lv');
console.log('  ✓ choosing the first language');
console.log('languages ok');
