// Every kit is made of components that exist, are stable and not heavy; no kit repeats a section.
const assert = require('assert');
const { KITS, listKits } = require('../scripts/builder/kits.js');
const registry = require('../registry.json').items;

assert(KITS.length >= 6, 'at least six kits');
const shown = listKits(registry);
assert.deepStrictEqual(shown.map(k => k.id), KITS.map(k => k.id), 'every kit is usable: ' + KITS.filter(k => !shown.find(s => s.id === k.id)).map(k => k.id).join(', '));
KITS.forEach(k => {
  assert.strictEqual(new Set(k.sections).size, k.sections.length, k.id + ' repeats a section');
  assert(k.sections.length >= 5 && k.sections.length <= 9, k.id + ' has a sensible length');
});
assert(listKits([]).length === 0, 'a kit with missing components is hidden');
const broken = listKits(registry.map(i => (i.slug === 'cta-band' ? { ...i, weight: 'heavy' } : i)));
assert(!broken.some(k => k.id === 'saas-launch'), 'a heavy component hides its kit');
console.log('✅ Kits tests passed!');
