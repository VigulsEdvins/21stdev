// Imported project files are cleaned: no custom code, no javascript: links, bounded sizes.
const assert = require('assert');
const { sanitizeState, safeUrl } = require('../scripts/project-sanitize.js');
const { createProjectStore } = require('../scripts/projects.js');

const evil = {
  theme: 'midnight-dark',
  bogusKey: '<script>alert(1)</script>',
  customColors: { bg: '#111111', text: 'red; background:url(javascript:1)' },
  page: { title: 'Hi', canonical: 'javascript:alert(1)', shareImage: 'https://ok.example/a.png', favicon: 'javascript:alert(2)', extra: 'x' },
  stack: [
    { id: 'a1', slug: 'hero-a', html: '<script>alert(1)</script>', js: 'alert(2)', css: 'x', title: 'Hero', sizing: { heightMode: 'bogus', customHeight: 99999 },
      overrides: { h1: { selector: 'h1', type: 'text', value: '<img onerror=x>' }, cta: { selector: 'a', type: 'link', value: ' JaVa\nScRiPt:alert(1)' }, 'bad key!': { selector: 'a', value: 'x' } },
      elements: [{ id: 'el"onmouseover="x', type: 'button', x: 500, y: -5, link: 'javascript:alert(3)' }, { id: 'el-ok', type: 'image', x: 10, y: 20, width: '120px', imageUrl: 'data:text/html;base64,AAAA', nested: { a: 1 } }] },
    { slug: '../etc/passwd' },
    'not an object',
    { id: 'a2', slug: 'hero-b', locked: true, hidden: true }
  ]
};
const { state, removed } = sanitizeState(evil);
assert.strictEqual(state.bogusKey, undefined, 'unknown top-level keys dropped');
assert.deepStrictEqual(state.stack.map(s => s.slug), ['hero-a', 'hero-b'], 'bad slugs and non-objects dropped');
const a = state.stack[0];
assert(!('html' in a) && !('js' in a) && !('css' in a), 'custom code on a section is dropped');
assert.strictEqual(a.sizing.heightMode, 'auto');
assert.strictEqual(a.sizing.customHeight, 5000);
assert.deepStrictEqual(Object.keys(a.overrides), ['h1', 'cta'], 'bad override keys dropped');
assert.strictEqual(a.overrides.cta.value, '#', 'javascript: link blocked even with spaces and case tricks');
assert.strictEqual(a.elements.length, 1, 'element with a quote in its id dropped');
const el = a.elements[0];
assert.strictEqual(el.id, 'el-ok');
assert.strictEqual(el.imageUrl, '#', 'data:text/html blocked');
assert.strictEqual(el.nested, undefined, 'objects inside elements dropped');
assert.strictEqual(el.width, '120px');
assert(state.stack[1].locked && state.stack[1].hidden, 'lock and hide survive');
assert.strictEqual(state.page.canonical, '', 'non-http canonical dropped');
assert.strictEqual(state.page.favicon, '#');
assert.strictEqual(state.page.extra, undefined);
assert.strictEqual(state.page.shareImage, 'https://ok.example/a.png');
assert.deepStrictEqual(state.customColors, { bg: '#111111' });
assert(removed >= 8, 'removed count reported: ' + removed);
assert.strictEqual(safeUrl('data:image/png;base64,AA', { n: 0 }), 'data:image/png;base64,AA', 'image data URIs are fine');
assert.strictEqual(safeUrl('https://x.example/', { n: 0 }), 'https://x.example/');

// a clean state passes through unchanged in meaning
const clean = sanitizeState({ theme: 'midnight-dark', page: { title: 'T' }, stack: [{ id: 's1', slug: 'hero-a', sizing: { heightMode: 'custom', customHeight: 700, paddingY: 'large' } }] });
assert.strictEqual(clean.removed, 0);
assert.deepStrictEqual(clean.state.stack[0].sizing, { heightMode: 'custom', customHeight: 700, paddingY: 'large' });

// the store sanitises on import and refuses oversized files
const mem = { d: {}, getItem(k) { return this.d[k] || null; }, setItem(k, v) { this.d[k] = v; } };
const store = createProjectStore(mem);
const file = JSON.stringify({ format: 'web-builder-project', version: 3, project: { name: 'Evil', state: evil } });
const imported = store.importProject(file);
assert(!JSON.stringify(imported.state).includes('alert(1)') || !JSON.stringify(imported.state.stack).includes('<script>'), 'no script text in the imported stack');
assert(imported.sanitizedCount >= 8);
assert.throws(() => store.importProject('x'.repeat(21 * 1024 * 1024)), /too large/);
console.log('✅ Project sanitize tests passed!');

// multi-page projects
{
  const multi = sanitizeState({ theme: 'midnight-dark', stack: [], activePageId: 'p2', pages: [
    { id: 'p1', title: 'Home', slug: 'whatever', stack: [{ id: 's1', slug: 'hero-a', html: '<script>x</script>' }] },
    { id: 'p2', title: 'About <b>', slug: 'About Us!', description: 'd', stack: [{ id: 's2', slug: 'hero-b' }] },
    { id: 'p2', title: 'Dup', slug: 'dup', stack: [] },
    { id: 'bad id', title: 'x', stack: [] }
  ] });
  assert.strictEqual(multi.state.pages.length, 2, 'duplicate and invalid page ids dropped');
  assert.strictEqual(multi.state.pages[0].slug, 'index', 'the first page is always index');
  assert.strictEqual(multi.state.pages[1].slug, 'page-2', 'an invalid slug is replaced');
  assert(!('html' in multi.state.pages[0].stack[0]), 'pages are cleaned like the main stack');
  assert.deepStrictEqual(multi.state.stack.map(s => s.slug), ['hero-b'], 'the active page is the live stack');
  assert.strictEqual(multi.state.activePageId, 'p2');
  assert.deepStrictEqual(sanitizeState({ stack: [{ id: 'a', slug: 'x' }], pages: [{ id: 'only', title: 'One', stack: [] }] }).state.pages, [], 'a single "page" is not multi-page');
  console.log('✅ Multi-page sanitize tests passed!');
}
