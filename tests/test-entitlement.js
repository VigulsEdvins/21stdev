// D7a changes after purchase / E7.2 entitlements, as prices and as rules.
const assert = require('assert');
const P = require('../site/js/prices.js');
const E = require('../functions/lib/entitlement.js');

const now = '2026-11-01T10:00:00Z';
// the language switcher and hidden blocks are not counted
assert.strictEqual(E.countBlocks([{ slug: 'a' }, { slug: 'multilingual-lang-switcher' }, { slug: 'b', hidden: true }, { slug: 'c' }]), 2);
assert.strictEqual(E.countBlocks(null), 0);

// a purchase of 5 blocks
const ent = E.create({ blocks: 5, editor: false, now });
assert.strictEqual(ent.allowance, 5); assert.strictEqual(ent.priceVersion, 'v1'); assert.strictEqual(ent.expiresAt, '2027-11-01T10:00:00.000Z');
assert.strictEqual(E.create({ blocks: 1, now }).allowance, 3, 'the included blocks are always bought');

// free: any count at or below the allowance, swaps keep the count
for (const n of [0, 1, 3, 4, 5]) { const c = E.check(ent, { blocks: n, editor: false }, now); assert(c.ok && c.total === 0 && c.extraBlocks === 0, n + ' blocks'); }
// above: only the extra blocks, at the price of the locked table
const six = E.check(ent, { blocks: 6, editor: false }, now);
assert(!six.ok && six.reason === 'payment-needed' && six.extraBlocks === 1 && six.total === P.table.extra && six.newAllowance === 6);
assert.strictEqual(E.check(ent, { blocks: 9, editor: false }, now).total, 4 * P.table.extra, 'four extra blocks, never the whole price again');
// after paying for the sixth block the allowance is six for good; undoing back is free and quotes nothing
const ent2 = E.applyPayment(ent, six);
assert.strictEqual(ent2.allowance, 6);
assert(E.check(ent2, { blocks: 6, editor: false }, now).ok && E.check(ent2, { blocks: 2, editor: false }, now).ok);
assert.strictEqual(E.applyPayment(ent2, E.check(ent2, { blocks: 2, editor: false }, now)).allowance, 6, 'removing blocks never lowers the allowance');
assert.strictEqual(E.check(ent2, { blocks: 7, editor: false }, now).total, P.table.extra, 'only the seventh is owed');
// the editor can be bought later at its price, once
const ed = E.check(ent2, { blocks: 6, editor: true }, now);
assert(!ed.ok && ed.total === P.table.editor && ed.newEditor);
const ent3 = E.applyPayment(ent2, ed);
assert(ent3.editor && E.check(ent3, { blocks: 6, editor: true }, now).ok, 'the editor is not charged twice');
assert.strictEqual(E.check(ent3, { blocks: 7, editor: true }, now).total, P.table.extra);

// price lock: a new table does not change this customer's quote within 12 months
P.versions.v2 = { base: 59, included: 3, extra: 15, editor: 59, doneSetup: 200, donePerBlock: 45 };
const keep = Object.getOwnPropertyDescriptor(P, 'version');
try {
  P.version = 'v2'; // the table "today" moves on
  assert.strictEqual(E.check(ent, { blocks: 6, editor: false }, '2027-10-01T00:00:00Z').total, 9, 'still the old extra-block price');
  assert.strictEqual(E.check(ent, { blocks: 6, editor: false }, '2027-10-01T00:00:00Z').priceVersion, 'v1');
  // after 12 months: refused until renewed, and then the current table applies
  const late = '2027-11-02T00:00:00Z';
  const refused = E.check(ent, { blocks: 4, editor: false }, late);
  assert(!refused.ok && refused.reason === 'expired', 'a download after 12 months is refused');
  const renewed = E.renew(ent, late);
  assert.strictEqual(renewed.priceVersion, 'v2'); assert.strictEqual(renewed.allowance, 5, 'the allowance survives renewal');
  assert(E.check(renewed, { blocks: 5, editor: false }, late).ok);
  assert.strictEqual(E.check(renewed, { blocks: 6, editor: false }, late).total, 15, 'new blocks after renewal use current prices');
} finally { delete P.versions.v2; P.version = keep.value; }

// not paid, unknown table, nonsense input
assert.strictEqual(E.check(null, { blocks: 1 }, now).reason, 'not-paid');
assert.strictEqual(E.check({ status: 'none' }, { blocks: 1 }, now).reason, 'not-paid');
assert.throws(() => P.tableFor('v99')); assert.throws(() => P.tableFor('__proto__'));
assert.strictEqual(E.check(ent, { blocks: -4, editor: false }, now).ok, true);
assert.strictEqual(E.check(ent, { blocks: 'x', editor: false }, now).ok, true);
assert(E.identityLocked(ent) && !E.identityLocked(null));
// the old self/done prices are unchanged
assert.strictEqual(P.self(5, true), 96); assert.strictEqual(P.done(3, false), 39 + 150 + 105);
console.log('✅ Entitlement tests passed!');
