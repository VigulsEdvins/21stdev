const assert = require('assert');
const P = require('../site/js/prices.js');
const G = require('../scripts/builder/guided-get.js');
// the meter is the calculator: same totals for every block count, with and without the editor
for (let n = 0; n <= 30; n++) for (const ed of [false, true]) {
  const m = G.meter(P, n, ed);
  assert.strictEqual(m.self, P.self(n, ed)); assert.strictEqual(m.done, P.done(n, ed));
  // and the lines add up to the total
  const sum = m.lines.reduce((t, l) => t + Number(l[1].replace('€', '')), 0);
  assert.strictEqual(sum, n === 0 ? P.table.base + (ed ? P.table.editor : 0) : m.self, n + ' blocks, editor ' + ed);
}
const three = G.meter(P, 3, false); assert.strictEqual(three.lines.length, 1, 'three blocks have no extra line');
const five = G.meter(P, 5, true);
assert.deepStrictEqual(five.lines.map((l) => l[1]), ['€39', '€18', '€39']); assert.strictEqual(five.self, 96);
assert(/2 extra blocks/.test(five.lines[1][0]) && /1 extra block at/.test(G.meter(P, 4, false).lines[1][0]));
assert(!/<|€\d+\.\d/.test(JSON.stringify(five.lines)), 'plain lines');
console.log('guided get ok');
