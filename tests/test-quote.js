/** The buying flow's one price calculation: lines, today's total, hosting, refused combinations and the difference for a project already bought. */
const assert = require('assert');
const { quote } = require('../functions/lib/quote.js');
const Prices = require('../site/js/prices.js');

let count = 0;
const test = (name, fn) => { fn(); count++; };
const base = { blocks: 5, editor: true, destination: 'edvlabs', hosting: 'monthly', deployHelp: false };
const keys = (q) => q.lines.map((l) => l.key);

test('5 blocks with the admin panel on an edvlabs address, monthly: 39 + 2x9 + 39 today, hosting 3 after a 30-day free month', () => {
  const q = quote(base);
  assert.strictEqual(q.ok, true);
  assert.deepStrictEqual(keys(q), ['base', 'extra', 'editor']);
  assert.strictEqual(q.lines[0].amount, 39); assert.strictEqual(q.lines[1].amount, 18); assert.strictEqual(q.lines[1].qty, 2); assert.strictEqual(q.lines[2].amount, 39);
  assert.strictEqual(q.payToday, 96);
  assert.deepStrictEqual(q.hosting, { plan: 'monthly', amount: 3, trialDays: 30 });
  assert.strictEqual(q.priceVersion, Prices.version); assert.strictEqual(q.newAllowance, 5);
});

test('yearly hosting costs 29; download alone has no hosting and 3 blocks cost 39', () => {
  assert.strictEqual(quote({ ...base, hosting: 'yearly' }).hosting.amount, 29);
  const q = quote({ blocks: 3, editor: false, destination: 'download', hosting: null, deployHelp: false });
  assert.strictEqual(q.payToday, 39); assert.strictEqual(q.hosting, null); assert.deepStrictEqual(keys(q), ['base']);
});

test('deploy help adds 30 once, for a own domain or a download', () => {
  const q = quote({ ...base, destination: 'domain', deployHelp: true });
  assert.strictEqual(q.payToday, 126); assert.deepStrictEqual(keys(q), ['base', 'extra', 'editor', 'deployHelp']);
  assert.strictEqual(quote({ blocks: 3, editor: false, destination: 'download', hosting: null, deployHelp: true }).payToday, 69);
});

test('combinations that are not offered are refused: deploy help on an edvlabs address, hosting on a download, no hosting on a hosted site, unknown values', () => {
  const bad = (o) => assert.deepStrictEqual(quote({ ...base, ...o }), { ok: false, reason: 'bad-combination' });
  bad({ deployHelp: true }); bad({ destination: 'download' }); bad({ hosting: null }); bad({ hosting: 'weekly' }); bad({ destination: 'moon' });
  bad({ destination: 'download', hosting: null, deployHelp: 'yes' });
});

test('a project with no blocks cannot be bought; fractions and junk are not blocks', () => {
  for (const blocks of [0, -2, NaN, undefined, 'x']) assert.deepStrictEqual(quote({ ...base, blocks }), { ok: false, reason: 'no-blocks' });
  assert.strictEqual(quote({ ...base, blocks: 4.6 }).newAllowance, 5);
});

test('a project already bought pays only the difference, at the table it was bought at', () => {
  const paid = { allowance: 5, editor: false, version: 'v1' };
  const q = quote({ ...base, blocks: 6, paid });
  assert.deepStrictEqual(keys(q), ['extra', 'editor']); assert.strictEqual(q.payToday, 48); assert.strictEqual(q.newAllowance, 6);
  const same = quote({ ...base, blocks: 4, editor: false, paid, hosting: 'yearly' });
  assert.strictEqual(same.payToday, 0); assert.strictEqual(same.hosting.amount, 29, 'hosting is still bought on its own');
  assert.deepStrictEqual(quote({ blocks: 5, editor: false, destination: 'download', hosting: null, deployHelp: false, paid }), { ok: false, reason: 'nothing-to-pay' });
});

console.log('quote: ' + count + ' tests passed');
