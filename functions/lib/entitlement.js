/* Entitlements (plan E7.2, design doc D7a). Pure logic: no database, no clock of its own, no network, so tests need nothing.
   An entitlement says what one project has paid for: a block allowance, whether the editor is included, the price table it was
   bought at, and when the 12 months of editing end. The server stores it per project; the browser only ever asks.

   Rules (D7a):
   - a purchase buys an allowance of blocks; edits, swaps and removals within it are free
   - blocks above the allowance cost the extra-block price of the table paid at, for the extra blocks only, and raise the allowance for good
   - removing blocks again never lowers the allowance, and going back to it quotes nothing
   - the price table is locked for 12 months: a later price rise changes nothing for this customer
   - after 12 months the customer keeps everything already downloaded, but downloading again needs a renewal
   - a project's name and address are fixed after the first purchase */
const Prices = require('../../site/js/prices.js');

const MONTHS = 12;
const LANGUAGE_SWITCHER = 'multilingual-lang-switcher';

const addMonths = (iso, m) => { const d = new Date(iso); if (Number.isNaN(d.getTime())) throw new Error('Bad date'); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString(); };

/** The blocks a customer pays for: visible ones, not counting the language switcher the Languages box adds. */
function countBlocks(stack) {
  return (Array.isArray(stack) ? stack : []).filter((s) => s && !s.hidden && s.slug !== LANGUAGE_SWITCHER).length;
}

/** A new entitlement from the first purchase. `blocks` is what was paid for; at least the included blocks are bought. */
function create({ blocks, editor, now, version }) {
  const v = version || Prices.version, t = Prices.tableFor(v);
  const paidBlocks = Math.max(t.included, Math.round(Number(blocks) || 0));
  return { status: 'paid', allowance: paidBlocks, editor: !!editor, priceVersion: v, purchasedAt: new Date(now).toISOString(), expiresAt: addMonths(now, MONTHS), renewedAt: null };
}

const expired = (ent, now) => new Date(now).getTime() > new Date(ent.expiresAt).getTime();

/**
 * What changing the page to `blocks` blocks (and the editor choice) costs, and whether the download is allowed.
 * Returns { ok, reason?, extraBlocks, total, newAllowance, newEditor, priceVersion }. `ok` is true when nothing is owed.
 * reasons: 'not-paid' (no entitlement), 'expired' (renew first), 'payment-needed' (extra blocks or the editor are owed).
 */
function check(ent, { blocks, editor }, now) {
  if (!ent || ent.status !== 'paid') return { ok: false, reason: 'not-paid', extraBlocks: 0, total: 0, newAllowance: 0, newEditor: false, priceVersion: null };
  if (expired(ent, now)) return { ok: false, reason: 'expired', extraBlocks: 0, total: 0, newAllowance: ent.allowance, newEditor: ent.editor, priceVersion: ent.priceVersion };
  const u = Prices.upgrade({ allowance: ent.allowance, editor: ent.editor, version: ent.priceVersion }, blocks, editor);
  return { ok: u.total === 0, reason: u.total === 0 ? undefined : 'payment-needed', extraBlocks: u.extraBlocks, total: u.total, newAllowance: u.newAllowance, newEditor: u.newEditor, priceVersion: ent.priceVersion };
}

/** After a successful payment for exactly the quote that was shown: raise the allowance (and the editor flag). Never lowers anything. */
function applyPayment(ent, quote) {
  if (!ent || ent.status !== 'paid') throw new Error('No entitlement to update');
  return Object.assign({}, ent, { allowance: Math.max(ent.allowance, quote.newAllowance), editor: ent.editor || quote.newEditor });
}

/** Renewal after 12 months: another 12 months of downloads, at the table current today (the old lock has ended). The renewal fee itself is decided later. */
function renew(ent, now) {
  if (!ent || ent.status !== 'paid') throw new Error('No entitlement to renew');
  return Object.assign({}, ent, { priceVersion: Prices.version, expiresAt: addMonths(now, MONTHS), renewedAt: new Date(now).toISOString() });
}

/** The name and address of a project cannot change once it is paid for (a new website is a new project and a new purchase). */
const identityLocked = (ent) => !!ent && ent.status === 'paid';

module.exports = { MONTHS, countBlocks, create, check, applyPayment, renew, identityLocked, addMonths };
