// Pure helpers of the catalogue page (scripts/catalog/helpers.js).
const assert = require('assert');
const H = require('../scripts/catalog/helpers.js');

assert.strictEqual(H.escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
assert.strictEqual(H.escapeHtml(null), '');
assert.strictEqual(H.getItemName({ slug: 's', title: 'T' }), 'T');
assert.strictEqual(H.getItemName({ slug: 's', name: 'N', title: 'T' }), 'N');
assert.strictEqual(H.getAbsoluteFolderPath({ slug: 'x' }), '/home/edvins/features-for-web/web-for-options/features/x');
assert.strictEqual(H.getAbsoluteFolderPath({ slug: 'x', sourceFolder: '/other/x' }), '/other/x');
assert(H.getAgentReference({ slug: 'x', title: 'X' }).includes('"X"'));

const combined = H.combineRuntimeHtml('<link rel="stylesheet" href="style.css"><p>a</p><script src="script.js"></script>', 'p{color:red}', 'run()');
assert(combined.includes('<style>\np{color:red}\n</style>') && combined.includes('<script>\nrun()\n</script>') && !combined.includes('style.css'));

const tabs = H.getAvailableTabs({ slug: 's', type: 'component', files: { combined: 'c', html: 'h', css: 's', js: 'j', tsx: 't' } });
assert.deepStrictEqual(tabs.map(t => t.id), ['combined', 'html', 'css', 'js', 'tsx', 'meta']);
const tpl = H.getAvailableTabs({ slug: 's', type: 'template', files: { combined: 'c', siteHtml: 'x', siteCss: 'y' } });
assert(tpl[0].id === 'siteHtml' && tpl.some(t => t.id === 'siteCss') && tpl.some(t => t.id === 'combined'));
assert(JSON.parse(tabs.find(t => t.id === 'meta').content).slug === 's');
console.log('✅ Catalogue helper tests passed!');
