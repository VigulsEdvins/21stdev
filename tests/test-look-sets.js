const assert = require('assert');
const S = require('../scripts/builder/look-sets.js');
assert(S.COLOUR_SETS.length >= 6 && S.COLOUR_SETS.length <= 8, '6 to 8 colour sets');
for (const c of S.COLOUR_SETS) {
  assert(S.contrast(c.text, c.bg) >= S.TEXT_MIN, c.id + ' text ' + S.contrast(c.text, c.bg));
  assert(S.contrast(c.accent, c.bg) >= S.ACCENT_MIN, c.id + ' accent ' + S.contrast(c.accent, c.bg));
  assert.deepStrictEqual(S.check(c), [], c.id + ' passes its own guard');
}
assert(Math.abs(S.contrast('#000000', '#ffffff') - 21) < 0.01);
assert.strictEqual(S.contrast('red', '#fff'), null);
// the guard flags weak colours and its fix really reaches the limit
const bad = { bg: '#ffffff', text: '#aaaaaa', accent: '#ffee99' };
const found = S.check(bad);
assert.deepStrictEqual(found.map((f) => f.kind), ['text', 'accent']);
const fixedAll = Object.assign({}, bad, ...found.map((f) => f.fix));
assert.deepStrictEqual(S.check(fixedAll), [], 'the fixes together clear every problem');
const darkBad = { bg: '#101010', text: '#333333', accent: '#222222' };
S.check(darkBad).forEach((f) => assert(S.contrast(f.fix.text || f.fix.accent, '#101010') >= 3));
assert.strictEqual(S.bestText('#101010'), '#FFFFFF');
assert.strictEqual(S.bestText('#f0f0f0'), '#111111');
// fonts and roundness values are plain strings the page settings accept
S.FONT_PAIRS.forEach((p) => assert(/^[A-Za-z ]{0,60}$/.test(p.display + '') && /^[A-Za-z ]{0,60}$/.test(p.body + '')));
S.ROUNDNESS.forEach((r) => assert(r.value === '' || /^\d+px$/.test(r.value) && r.value.length <= 8));
console.log('look sets ok: ' + S.COLOUR_SETS.length + ' colour sets, ' + S.FONT_PAIRS.length + ' font pairs, ' + S.ROUNDNESS.length + ' roundness options');
