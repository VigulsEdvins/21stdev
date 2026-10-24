const assert = require('assert');
const A = require('../scripts/assembler.js');
const { validateMeta } = require('../scripts/schema.js');

console.log('Testing native-palette sections and licence flags...');

const sections = [
  { id: 'a', slug: 'dark-footer', html: '<footer>Hi</footer>' },
  { id: 'b', slug: 'adaptive', html: '<p>Hello</p>' },
  { id: 'c', slug: 'cream-grid', html: '<p>Grid</p>' }
];
const nativeMap = { 'dark-footer': ['light'], 'cream-grid': ['dark'] };

// A native section keeps the opposite palette under the page theme that would make it unreadable
const lightPage = A.assemblePreviewDocument(sections, 'clean-minimal', {}, { nativeMap });
assert(/id="a" data-section-slug="dark-footer" data-theme="dark" data-native-for="light"/.test(lightPage), 'dark-native section renders dark under a light page');
assert(/id="b" data-section-slug="adaptive" data-theme="light"/.test(lightPage), 'adaptive section follows the page');
assert(/id="c" data-section-slug="cream-grid" data-theme="light" data-native-for="dark"/.test(lightPage), 'cream section follows a light page (native only under dark)');
assert(lightPage.includes(':root[data-theme="light"] .page-section#a[data-native-for~="light"]'), 'scoped palette CSS emitted');
assert(!lightPage.includes('.page-section#b[data-native-for'), 'no scoped CSS for adaptive sections');

const darkPage = A.assemblePreviewDocument(sections, 'midnight-dark', {}, { nativeMap });
assert(/id="c" data-section-slug="cream-grid" data-theme="light" data-native-for="dark"/.test(darkPage), 'cream section is native (light) under a dark page');
assert(/id="a" data-section-slug="dark-footer" data-theme="dark" data-native-for="light"/.test(darkPage), 'dark section is simply dark under a dark page');

// the same rules reach the export
const bundle = A.generateExportBundle(sections, 'clean-minimal', {}, { nativeMap });
assert(bundle['index.html'].includes('data-native-for="light"'));
assert(bundle['style.css'].includes('Native-palette sections'));
assert(/--preview-bg: #0b0f19/.test(bundle['style.css'].split('Native-palette sections')[1]), 'native block carries the dark preset variables');

// live theme switch: the applyThemeToDocument path leaves native sections alone
const secEl = (nativeFor, theme) => {
  const attrs = { 'data-native-for': nativeFor, 'data-theme': theme };
  return { style: {}, classList: { contains: () => false }, getAttribute: k => attrs[k] || null, setAttribute: (k, v) => { attrs[k] = v; }, closest() { return this; }, attrs };
};
const nativeSec = secEl('light', 'dark');
const plainSec = secEl(null, 'dark');
const doc = {
  getElementById: () => null,
  documentElement: { style: { setProperty() {} }, setAttribute() {} },
  body: { setAttribute() {} },
  head: null,
  querySelectorAll: sel => (sel === '[data-theme]' ? [nativeSec, plainSec] : sel.includes('page-section') ? [nativeSec, plainSec] : [])
};
A.applyThemeToDocument(doc, 'clean-minimal');
assert.strictEqual(nativeSec.style.backgroundColor, '', 'native section gets no inline theme background');
assert.strictEqual(nativeSec.attrs['data-theme'], 'dark', 'native section keeps the opposite polarity');
assert.notStrictEqual(plainSec.style.backgroundColor, '', 'adaptive section gets the page background');
assert.strictEqual(plainSec.attrs['data-theme'], 'light');

// meta validation
const base = { slug: 'x-y', title: 'T', description: 'a long enough description', tags: ['a', 'b', 'c'], dependencies: ['x'], category: 'Heroes', type: 'component', status: 'stable', mood: ['dark'], industry: ['general'], weight: 'light', needsAssets: false, origin: { source: 'custom', license: 'own' }, updatedAt: '2026-10-24', customizable: [] };
assert.deepStrictEqual(validateMeta({ ...base, nativeWhen: ['light'] }), []);
assert(validateMeta({ ...base, nativeWhen: ['sepia'] }).length > 0, 'unknown polarity rejected');

// licence warnings in the export README
const readme = A.generateExportBundle(sections, 'midnight-dark', {}, { licenseMap: { adaptive: 'unverified', 'dark-footer': 'MIT' } })['README.md'];
assert(readme.includes('Licences to check before delivery'));
assert(readme.includes('`adaptive`') && !/- .*`dark-footer`.*\n\n## Page/.test(readme.split('Licences to check before delivery')[1].split('## Page')[0].replace('`adaptive`', '')), 'only unverified components are listed');
assert(!A.generateExportBundle(sections, 'midnight-dark', {}, { licenseMap: { adaptive: 'MIT' } })['README.md'].includes('Licences to check'), 'no warning when everything is verified');

console.log('✅ Native palette and licence tests passed!');
