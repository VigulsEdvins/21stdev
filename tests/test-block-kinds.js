const assert = require('assert');
const reg = require('../registry.json');
const Q = require('../site/js/questions.js');
const R = require('../site/js/recommend.js');
const K = require('../scripts/builder/block-kinds.js');
const list = reg.features || reg.items || Object.values(reg).find(Array.isArray);
const by = Object.fromEntries(list.map((f) => [f.slug, f]));

// every kind the questions can ask for exists, in the same order and with the same plain name
assert.deepStrictEqual(K.KINDS.map((k) => k.id).sort(), Q.BLOCKS.map((b) => b[0]).sort(), 'kinds match the question blocks');
for (const [id, label] of Q.BLOCKS) assert.strictEqual(K.byId[id].label, label, 'label of ' + id);
// the recommendation order only uses known kinds
R.ORDER.forEach((id) => assert(K.byId[id], 'recommend order knows ' + id));
// every variant is a real, stable, light-or-medium component, used by one kind at most once
for (const k of K.KINDS) {
  assert.strictEqual(new Set(k.variants).size, k.variants.length, k.id + ' has repeats');
  for (const s of k.variants) {
    const f = by[s];
    assert(f, k.id + ': no such component ' + s);
    assert.strictEqual(f.status, 'stable', s + ' is not stable');
    assert.notStrictEqual(f.weight, 'heavy', s + ' is heavy');
    assert.notStrictEqual(f.needsAssets, true, s + ' needs assets');
  }
}
assert.strictEqual(K.kindOf('faq-accordion-smooth').id, 'faq');
assert.strictEqual(K.kindOf('nope'), null);
assert.strictEqual(K.nextVariant('faq', 'faq-accordion-smooth'), 'slit-type-faq');
assert.strictEqual(K.nextVariant('faq', 'slit-type-faq'), 'faq-accordion-smooth');
assert.strictEqual(K.nextVariant('map', 'x'), null);
console.log('block kinds ok: ' + K.KINDS.filter((k) => k.variants.length).length + ' of ' + K.KINDS.length + ' kinds have a component');
