/* The builder's screen translator (scripts/builder/ui-lang.js) and its Latvian dictionary (scripts/builder/ui-lang-lv.js): exact and template entries, plural forms,
   spaces kept, and a check of the dictionary itself (every {name} in the English is in the Latvian and the other way round). */
const assert = require('assert');
const L = require('../scripts/builder/ui-lang.js');
global.window = {}; require('../scripts/builder/ui-lang-lv.js');
const dict = window.BuilderUiLangLv, c = L.compile(dict);

assert.strictEqual(L.lookup(c, 'Back'), 'Atpakaļ');
assert.strictEqual(L.lookup(c, '\n   Back  \n'), '\n   Atpakaļ  \n', 'the spaces and line breaks around it are kept');
assert.strictEqual(L.lookup(c, 'A line\n    break'), null, 'no entry, no change');
assert.strictEqual(L.lookup(c, 'Step 1 of 5. Choose the blocks of your page and put them in order.'), '1. solis no 5. Izvēlieties lapas blokus un sakārtojiet tos.');
assert.strictEqual(L.lookup(c, '  Choose   the blocks of your page\n and put them in order.'), '  Izvēlieties lapas blokus un sakārtojiet tos.', 'line breaks inside count as one space');
console.log('  ✓ exact entries, spaces kept, unknown text left alone');

assert.strictEqual(L.lookup(c, 'Remove Prices'), 'Noņemt “Prices”');
assert.strictEqual(L.lookup(c, 'Add the editor (€39)'), 'Pievienot redaktoru (€39)', 'a specific template beats a general one (“Add {name}”)');
for (const [n, word] of [[1, 'bloks'], [2, 'bloki'], [9, 'bloki'], [10, 'bloku'], [11, 'bloku'], [12, 'bloku'], [21, 'bloks'], [22, 'bloki'], [100, 'bloku'], [101, 'bloks']]) {
  assert.strictEqual(L.lookup(c, 'Your page has ' + n + ' blocks'), 'Jūsu lapā ir ' + n + ' ' + word, n + ' → ' + word);
}
console.log('  ✓ templates, most specific first, Latvian plural forms (1, 21 → bloks; 2–9 → bloki; 0, 10–19 → bloku)');

// the dictionary itself
const holes = (s) => [...new Set((s.match(/\{(\w+)(?::|\})/g) || []).map((x) => x.replace(/[{}:]/g, '')))].sort().join(',');
for (const [en, lv] of Object.entries(dict.texts)) {
  assert(typeof lv === 'string' && lv.trim() && lv !== en, 'a real Latvian text for: ' + en);
  assert.strictEqual(holes(lv), holes(en), '{names} match between English and Latvian: ' + en);
  assert(!/\{\w+:[^}]*\}/.test(en), 'plural forms only in the Latvian: ' + en);
  const parts = (lv.match(/\{\w+:([^}]*)\}/g) || []);
  parts.forEach((p) => assert.strictEqual(p.split('|').length, 3, 'three forms in ' + p));
}
const keys = Object.keys(dict.texts).map(L.norm);
assert.strictEqual(new Set(keys).size, keys.length, 'no two entries for the same English text');
console.log('  ✓ dictionary: ' + keys.length + ' entries, names and plural forms consistent');
console.log('ui-lang ok');
