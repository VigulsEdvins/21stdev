const assert = require('assert');
const { buildContent, injectTags } = require('../scripts/builder/cms-export.js');

console.log('Testing CMS export helpers...');

const field = { id: 'f1', label: 'Headline', type: 'text', selector: ':scope > h1:nth-of-type(1)', value: 'Hi </script><b>' };
const text = buildContent({ site: 'Shop', pages: [{ file: 'index.html', title: 'Home', sections: [{ id: 'a', slug: 'hero', title: 'Hero', fields: [field] }] }] });
assert(!/<\/script>/i.test(text), 'a field value cannot close the script tag');
const data = new Function('window', text + '; return window.EDV_CMS;')({});
assert.strictEqual(data.pages[0].sections[0].fields[0].value, 'Hi </script><b>', 'the value survives the escaping');
assert.deepStrictEqual(data.published, {}, 'nothing is published at export time');

const html = '<body><script src="script.js"></script></body>';
const out = injectTags(html, 'script.js');
assert(out.indexOf('cms-content.js') > out.indexOf('script.js') && out.indexOf('cms.js') > out.indexOf('cms-content.js'), 'CMS scripts load after the page script, content first');
assert.throws(() => injectTags(html, 'about.js'), /not linked/, 'a missing script tag is an error, not a silent skip');

// the names menu links use to scroll to a section travel with the content (the editor's "go to" list)
const withAnchor = new Function('window', buildContent({ site: 'S', pages: [{ file: 'index.html', title: 'Home', sections: [{ id: 'a', slug: 'x', title: 'X', anchor: 'pricing', fields: [] }, { id: 'b', slug: 'y', title: 'Y', fields: [] }] }] }) + '; return window.EDV_CMS;')({});
assert.strictEqual(withAnchor.pages[0].sections[0].anchor, 'pricing');
assert(!('anchor' in withAnchor.pages[0].sections[1]), 'no anchor, no key');

// languages: pages carry their language and group; a bad site language is dropped
const ml = new Function('window', buildContent({ site: 'S', siteLang: 'en', pages: [{ file: 'index.html', title: 'Home', lang: 'en', group: 'p1', sections: [] }, { file: 'index-lv.html', title: 'Home (LV)', lang: 'lv', group: 'p1', sections: [] }] }) + '; return window.EDV_CMS;')({});
assert.strictEqual(ml.siteLang, 'en');
assert.deepStrictEqual([ml.pages[1].lang, ml.pages[1].group], ['lv', 'p1']);
const noLang = new Function('window', buildContent({ site: 'S', siteLang: '"><x', pages: [{ file: 'index.html', title: 'Home', sections: [] }] }) + '; return window.EDV_CMS;')({});
assert(!('siteLang' in noLang) && !('lang' in noLang.pages[0]), 'no language, no keys');

console.log('✅ CMS export helper tests passed!');
