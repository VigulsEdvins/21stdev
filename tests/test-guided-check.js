const assert = require('assert');
const C = require('../scripts/builder/guided-check.js');
const sec = (id, ov) => ({ id, slug: 's-' + id, title: 'Block ' + id, overrides: ov || {} });
const good = { bg: '#ffffff', text: '#111111', accent: '#2b4dd8' };
// empty page
assert.deepStrictEqual(C.buildItems({ stack: [], issues: [], colours: good }).map((i) => i.id), ['empty']);
// everything fine -> nothing to list
const done = sec('a', { x: { type: 'text', value: 'hi', selector: 'h1' } });
assert.deepStrictEqual(C.buildItems({ stack: [done], issues: [], colours: good }), []);
// developer-only notes are left out, known ones get plain words
const items = C.buildItems({ stack: [done], issues: [{ id: 'heading-skip', severity: 'info', message: 'x' }, { id: 'img-alt', severity: 'error', message: 'x', sectionId: 'a' }, { id: 'page-title', severity: 'warning', message: 'x' }], colours: good });
assert.deepStrictEqual(items.map((i) => i.id), ['img-alt', 'page-title']);
assert(/picture has no description/.test(items[0].text) && items[0].sectionId === 'a' && items[0].kind === 'block');
assert.strictEqual(items[1].kind, 'title');
// sample text and weak colours
const mixed = C.buildItems({ stack: [done, sec('b'), sec('c', { alt1: { type: 'alt', value: 'only a picture note' } })], issues: [], colours: { bg: '#ffffff', text: '#cccccc', accent: '#2b4dd8' } });
assert.deepStrictEqual(mixed.map((i) => i.id), ['contrast-text', 'sample-b', 'sample-c'], 'a picture description alone is not "own words"');
assert(mixed[0].fix && mixed[0].fix.text, 'contrast item carries its fix');
// every message is plain: no tag names or jargon
Object.values(C.WORDS).forEach((w) => assert(!/<|alt attribute|aria|href|meta/i.test(w), w));
console.log('guided check ok');
