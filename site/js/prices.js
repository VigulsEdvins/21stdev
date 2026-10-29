/* The one price table for the public site (draft prices, see the design doc section 11).
   The home page, the questions and the tests all read these numbers; nothing else may hard-code a price. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvPrices = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // Every table ever sold keeps its id: a customer is quoted at the table they paid at for 12 months (design doc D7a).
  // To change a price, add a new id here, make it CURRENT, and leave the old one alone.
  const VERSIONS = { v1: { base: 39, included: 3, extra: 9, editor: 39, doneSetup: 150, donePerBlock: 35 } };
  const CURRENT = 'v1';
  const T = VERSIONS[CURRENT];
  const tableFor = (version) => {
    if (!Object.prototype.hasOwnProperty.call(VERSIONS, version)) throw new Error('Unknown price table: ' + String(version).slice(0, 20));
    return VERSIONS[version];
  };
  const n = (blocks) => Math.max(0, Math.round(Number(blocks) || 0));
  /** What the visitor pays to build it themselves. */
  function self(blocks, editor) {
    const b = n(blocks);
    return T.base + Math.max(0, b - T.included) * T.extra + (editor ? T.editor : 0);
  }
  /** The same page when edvlabs does the work: the self price plus a set-up fee and a fee per block. */
  function done(blocks, editor) {
    return self(blocks, editor) + T.doneSetup + n(blocks) * T.donePerBlock;
  }
  /**
   * The price of changing a page that is already paid for (D7a). `paid` is { allowance, editor, version }: the blocks
   * and editor the customer already has, at the table they paid at. Only blocks above the allowance cost anything, each at
   * the extra-block price of THAT table (never the whole price again, never today's price); the editor, if not yet bought,
   * costs its price. Removing or swapping blocks is free and never lowers the allowance.
   */
  function upgrade(paid, blocks, wantEditor) {
    const t = tableFor(paid.version), b = n(blocks), allowance = Math.max(0, n(paid.allowance));
    const extraBlocks = Math.max(0, b - allowance);
    const editorPrice = wantEditor && !paid.editor ? t.editor : 0;
    const blocksPrice = extraBlocks * t.extra;
    return { version: paid.version, extraBlocks, blocksPrice, editorPrice, total: blocksPrice + editorPrice, newAllowance: allowance + extraBlocks, newEditor: !!(paid.editor || wantEditor) };
  }
  const eur = (v) => '€' + v;
  return { table: T, version: CURRENT, versions: VERSIONS, tableFor, self, done, upgrade, eur };
});
