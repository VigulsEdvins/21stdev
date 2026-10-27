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
console.log('✅ Single-file page router tests passed!');
