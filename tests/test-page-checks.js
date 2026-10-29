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

// pictures described in the Content tab are applied at load time: they count as fixed
const noAlt = '<html lang="en"><body><section class="page-section" id="s1"><h1>H</h1><img src="a.jpg"><img src="b.jpg"></section></body></html>';
const meta = { title: 'T', description: 'D' };
assert.strictEqual(checkPage(noAlt, meta).filter(i => i.id === 'img-alt').length, 2);
assert.strictEqual(checkPage(noAlt, meta, { s1: 1 }).filter(i => i.id === 'img-alt').length, 1, 'one described picture is credited');
assert.strictEqual(checkPage(noAlt, meta, { s1: 2 }).filter(i => i.id === 'img-alt').length, 0);
console.log('✅ Alt credit tests passed!');

// plan buttons (data-edv-cta) must lead somewhere: "#", an empty address or an anchor nothing has are flagged; a link set in the admin panel counts
{
  const cta = (h) => `<html lang="en"><body><section class="page-section" id="p"><h1>Plans</h1><div id="here"></div>${h}</section></body></html>`;
  const n = (html, page, fixed) => checkPage(html, page || { title: 'T', description: 'D' }, {}, fixed || {}).filter((i) => i.id === 'cta-no-link').length;
  assert.strictEqual(n(cta('<a class="b" href="#" data-edv-cta>Go</a>')), 1);
  assert.strictEqual(n(cta('<a class="b" href="" data-edv-cta>Go</a>')), 1);
  assert.strictEqual(n(cta('<a class="b" data-edv-cta>Go</a>')), 1);
  assert.strictEqual(n(cta('<a class="b" href="#starter" data-edv-cta>Go</a>')), 1, 'an anchor nothing on the page has');
  assert.strictEqual(n(cta('<a class="b" href="#here" data-edv-cta>Go</a>')), 0, 'an anchor that exists is a real link');
  assert.strictEqual(n(cta('<a class="b" href="https://pay.example/x" data-edv-cta>Go</a>')), 0);
  assert.strictEqual(n(cta('<a class="b" href="#a" data-edv-cta>A</a><a href="#b" data-edv-cta>B</a><a href="#c" data-edv-cta>C</a>')), 3);
  assert.strictEqual(n(cta('<a href="#a" data-edv-cta>A</a><a href="#b" data-edv-cta>B</a><a href="#c" data-edv-cta>C</a>'), null, { p: 2 }), 1, 'two links set in the admin panel clear two warnings');
  assert.strictEqual(n(cta('<a href="#a" data-edv-cta>A</a>'), null, { p: 5 }), 0);
  assert.strictEqual(n(cta('<a class="b" href="#" >Plain</a>')), 0, 'only marked buttons');
  assert(!checkPage(cta('<a href="#" data-edv-cta>Go</a>'), { title: 'T', description: 'D' }).some((i) => i.id === 'link-empty'), 'one warning, not two');
  const { overrideCounts } = require('../scripts/builder/page-checks.js');
  assert.deepStrictEqual(overrideCounts([{ id: 'a', overrides: { x: { type: 'link', value: 'https://p.example' }, y: { type: 'link', value: '#' }, z: { type: 'alt', value: 'cat' }, w: { type: 'text', value: 'hi' } } }, { id: 'b' }]), { alt: { a: 1 }, link: { a: 1 } });
  console.log('✅ Plan button link tests passed!');
}
