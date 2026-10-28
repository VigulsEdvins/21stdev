/* The one price table for the public site (draft prices, see the design doc section 11).
   The home page, the questions and the tests all read these numbers; nothing else may hard-code a price. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvPrices = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const T = { base: 39, included: 3, extra: 9, editor: 39, doneSetup: 150, donePerBlock: 35 };
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
  const eur = (v) => '€' + v;
  return { table: T, self, done, eur };
});
