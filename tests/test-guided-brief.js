const assert = require('assert');
const deps = { Kinds: require('../scripts/builder/block-kinds.js'), Look: require('../scripts/builder/look-sets.js'), Recommend: require('../site/js/recommend.js'), Questions: require('../site/js/questions.js') };
const B = require('../scripts/builder/guided-brief.js');
const brief = (a) => ({ v: 1, path: 'self', answers: a });
// every feel word is a real question option and points at a real colour set and font pair
const feelOpts = deps.Questions.QUESTIONS.find((q) => q.id === 'feel').options.map((o) => o[0]);
assert.deepStrictEqual(Object.keys(B.FEEL).sort(), feelOpts.slice().sort(), 'a look for every feel word');
Object.values(B.FEEL).forEach(([c, f]) => { assert(deps.Look.COLOUR_SETS.some((s) => s.id === c), c); assert(deps.Look.FONT_PAIRS.some((p) => p.id === f), f); });
// the visitor's own list wins, in page order, with real components
let p = B.plan(brief({ blocks: { value: ['contact', 'banner', 'faq'], unknown: false } }), deps);
assert.deepStrictEqual(p.blocks.map((b) => b.id), ['banner', 'faq', 'contact']);
assert(p.chosen && p.blocks.every((b) => deps.Kinds.byId[b.id].variants[0] === b.slug));
// a kind with no component is reported, not silently dropped
const gap = JSON.parse(JSON.stringify(deps.Kinds.KINDS)).map((k) => (k.id === 'map' ? Object.assign(k, { variants: [] }) : k)); // pretend the map block does not exist
const depsGap = Object.assign({}, deps, { Kinds: Object.assign({}, deps.Kinds, { KINDS: gap, byId: Object.fromEntries(gap.map((k) => [k.id, k])) }) });
p = B.plan(brief({ blocks: { value: ['banner', 'map', 'contact'], unknown: false } }), depsGap);
assert.deepStrictEqual(p.missing.map((m) => m.id), ['map']); assert.deepStrictEqual(p.blocks.map((b) => b.id), ['banner', 'contact']);
// with the real catalogue the map block is there
p = B.plan(brief({ blocks: { value: ['banner', 'map', 'contact'], unknown: false } }), deps);
assert.deepStrictEqual(p.missing, []); assert.deepStrictEqual(p.blocks.map((b) => b.id), ['banner', 'map', 'contact']);
// unknown answers give the safe set, no look, no editor
p = B.plan(brief({ blocks: { unknown: true }, feel: { unknown: true }, editor: { unknown: true } }), deps);
assert(!p.chosen && p.blocks.length >= 5 && !p.colours && !p.fonts && p.editor === false);
// feel and editor are used
p = B.plan(brief({ feel: { value: ['bold', 'calm'], unknown: false }, editor: { value: 'yes', unknown: false } }), deps);
assert.strictEqual(p.colours.id, 'night'); assert.strictEqual(p.fonts.id, 'bold'); assert.strictEqual(p.editor, true);
console.log('guided brief ok');
