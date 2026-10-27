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

console.log('✅ CMS export helper tests passed!');
