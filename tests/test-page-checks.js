// Pre-export page checks on small HTML fixtures.
const assert = require('assert');
const { checkPage } = require('../scripts/builder/page-checks.js');

const ids = (html, page) => checkPage(html, page).map(i => i.id);
const good = `<html lang="en"><body>
<section class="page-section" id="a" data-section-slug="hero"><h1>Hello</h1><h2>Sub</h2><img src="x.jpg" alt="A dentist"><a href="/x">Book</a>
<label for="e">Email</label><input id="e" type="email"><button>Go</button></section></body></html>`;
assert.deepStrictEqual(ids(good, { title: 'Zephyr', description: 'Dentist' }), [], 'clean page has no issues');

const bad = `<html><body>
<section class="page-section" id="s1" data-section-slug="hero"><h1>One</h1><h1>Two</h1><h4>Skip</h4><img src="x.jpg"><a href="#"><span></span></a><input type="text" placeholder="Email"><button></button></section>
<section class="page-section" id="s2" data-section-slug="foot"><img src="y.jpg" alt=""><script>var x = '<img src=z>';</script></section></body></html>`;
const got = checkPage(bad, { title: 'Assembled Web Page' });
const has = id => got.find(i => i.id === id);
for (const id of ['page-title', 'page-description', 'html-lang', 'h1-multiple', 'heading-skip', 'img-alt', 'link-name', 'link-empty', 'field-label', 'button-name', 'img-alt-empty']) assert(has(id), 'expected ' + id);
assert.strictEqual(has('img-alt').sectionId, 's1', 'issue names its section');
assert.strictEqual(has('img-alt-empty').sectionId, 's2');
assert.strictEqual(got.filter(i => i.id === 'img-alt').length, 1, 'script text is not scanned');
assert.strictEqual(got[0].severity, 'error', 'errors come first');
assert(ids('<html lang="en"><body><p>no heading</p></body></html>', { title: 'T', description: 'D' }).includes('h1-missing'));
console.log('✅ Page checks tests passed!');
