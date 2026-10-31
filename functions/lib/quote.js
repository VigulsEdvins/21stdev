/* The buying flow's one price calculation (plan 2026-10-31-buying-flow.md, spec docs/superpowers/specs/2026-10-31-buying-flow-design.md).
   Pure: no database, no clock, no network. The server calls it with the block count it read from the saved project; the browser only shows the answer.
   quote({ blocks, editor, destination, hosting, deployHelp, paid? }) -> { ok: true, lines, payToday, hosting, priceVersion, newAllowance } | { ok: false, reason }
   destination: 'edvlabs' | 'domain' | 'download'. hosting: 'monthly' | 'yearly' for the first two, null for a download. deployHelp (30 EUR, once) only with 'domain' or 'download'.
   paid ({ allowance, editor, version }) is what the project already bought: only the difference is charged, at the table it was bought at (entitlement.upgrade). */
const Prices = require('../../site/js/prices.js');
const Entitlement = require('./entitlement.js');

const DESTINATIONS = ['edvlabs', 'domain', 'download'];
const TRIAL_DAYS = 30;

function quote(order) {
  const o = order || {};
  const blocks = Math.round(Number(o.blocks));
  if (!Number.isFinite(blocks) || blocks < 1) return { ok: false, reason: 'no-blocks' };
  const hosted = o.destination === 'edvlabs' || o.destination === 'domain';
  if (!DESTINATIONS.includes(o.destination) || (o.editor !== undefined && typeof o.editor !== 'boolean') || typeof o.deployHelp !== 'boolean') return { ok: false, reason: 'bad-combination' };
  if (hosted ? (o.hosting !== 'monthly' && o.hosting !== 'yearly') : o.hosting !== null) return { ok: false, reason: 'bad-combination' };
  if (o.deployHelp && o.destination === 'edvlabs') return { ok: false, reason: 'bad-combination' }; // publishing there is automatic
  const editor = !!o.editor, T = Prices.table, lines = [];
  let newAllowance;
  if (o.paid) {
    const u = Prices.upgrade(o.paid, blocks, editor), t = Prices.tableFor(o.paid.version);
    if (u.extraBlocks) lines.push({ key: 'extra', label: u.extraBlocks + ' more block' + (u.extraBlocks === 1 ? '' : 's'), qty: u.extraBlocks, amount: u.blocksPrice });
    if (u.editorPrice) lines.push({ key: 'editor', label: 'Admin panel', amount: t.editor });
    newAllowance = u.newAllowance;
  } else {
    const extra = Math.max(0, blocks - T.included);
    lines.push({ key: 'base', label: 'Website, ' + T.included + ' blocks included', amount: T.base });
    if (extra) lines.push({ key: 'extra', label: extra + ' more block' + (extra === 1 ? '' : 's'), qty: extra, amount: extra * T.extra });
    if (editor) lines.push({ key: 'editor', label: 'Admin panel', amount: T.editor });
    newAllowance = Math.max(T.included, blocks);
  }
  if (o.deployHelp) lines.push({ key: 'deployHelp', label: 'We put it online for you', amount: T.deployHelp });
  const trialDays = Number.isInteger(o.trialDays) && o.trialDays >= 0 && o.trialDays <= 90 ? o.trialDays : TRIAL_DAYS;
  const hosting = hosted ? { plan: o.hosting, amount: o.hosting === 'monthly' ? T.hostingMonth : T.hostingYear, trialDays } : null;
  const payToday = lines.reduce((sum, l) => sum + l.amount, 0);
  if (payToday === 0 && !hosting) return { ok: false, reason: 'nothing-to-pay' };
  return { ok: true, lines, payToday, hosting, priceVersion: o.paid ? o.paid.version : Prices.version, newAllowance };
}

/** The blocks a saved page holds, as the client pays for them: all pages of a multi-page site (the open page's live stack replaces its stored copy), visible blocks only. */
function countProjectBlocks(state) {
  if (!state || typeof state !== 'object') return 0;
  if (Array.isArray(state.pages) && state.pages.length > 1) {
    return state.pages.reduce((sum, p) => sum + Entitlement.countBlocks(p && p.id === state.activePageId && Array.isArray(state.stack) ? state.stack : p && p.stack), 0);
  }
  return Entitlement.countBlocks(state.stack);
}

module.exports = { quote, countProjectBlocks, DESTINATIONS, TRIAL_DAYS };
