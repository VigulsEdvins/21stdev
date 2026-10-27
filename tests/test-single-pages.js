// Single-file multi-page router: keys, link targets and the injected script.
const assert = require('assert');
const { pageKeys, addRouter } = require('../scripts/builder/single-pages.js');

const keys = pageKeys([{ id: 'a', slug: 'index', title: 'Home' }, { id: 'b', slug: 'about-us', title: 'About' }, { id: 'c', slug: 'about-us', title: 'About again' }, { id: 'd', slug: '', title: 'Ünï cødé!' }]);
assert.strictEqual(keys.a, 'home');
assert.strictEqual(keys.b, 'about-us');
assert.notStrictEqual(keys.c, keys.b, 'keys are unique');
assert(/^[a-z0-9-]+$/.test(keys.d), 'keys are URL safe: ' + keys.d);

const html = addRouter('<html><body><section id="s1"></section></body></html>', [{ key: 'home', title: 'Site', ids: ['s1'] }, { key: 'x', title: '</script><b>', ids: ['s2'] }]);
assert(html.indexOf('id="page-router"') < html.indexOf('</body>'), 'router sits before </body>');
assert(!/<\/script><b>/.test(html), 'a page title cannot close the script');
assert(addRouter('<p>x</p>', []).includes('page-router'), 'works without </body>');

// hreflang alternates
const { translationAlternates } = require('../scripts/builder/single-pages.js');
const pagesT = [{ id: 'h', slug: 'index', title: 'Home', lang: '' }, { id: 'a', slug: 'about', title: 'About', lang: '' }, { id: 'hl', slug: 'sakums', title: 'Sākums', lang: 'lv', translationOf: 'h' }, { id: 'x', slug: 'same', title: 'Same', lang: '', translationOf: 'a' }];
const alt = translationAlternates(pagesT, { canonical: 'https://site.example/', lang: 'en' });
assert.deepStrictEqual(alt.h, [{ lang: 'en', href: 'https://site.example/' }, { lang: 'lv', href: 'https://site.example/sakums.html' }, { lang: 'x-default', href: 'https://site.example/' }]);
assert.deepStrictEqual(alt.hl, alt.h, 'the translation lists the same set');
assert(!alt.a && !alt.x, 'a group whose pages share a language gets nothing');
assert.deepStrictEqual(translationAlternates(pagesT, { canonical: '', lang: 'en' }), {}, 'no live address, no hreflang');
assert.deepStrictEqual(translationAlternates(pagesT, { canonical: 'javascript:alert(1)', lang: 'en' }), {});
assert.strictEqual(translationAlternates(pagesT, { canonical: 'https://site.example/index.html', lang: 'en' }).h[1].href, 'https://site.example/sakums.html', 'a canonical that names a file still gives the folder');

// the page head writes them
const A = require('../scripts/assembler.js');
const head = A.renderPageHead({ lang: 'lv', alternates: alt.h.concat([{ lang: 'bad lang', href: 'https://x.example/' }, { lang: 'de', href: 'javascript:x' }]) }).headTags;
assert((head.match(/rel="alternate" hreflang=/g) || []).length === 3, 'three valid alternates: ' + head);
assert(head.includes('hreflang="x-default" href="https://site.example/"'));
console.log('✅ Single-file page router tests passed!');
