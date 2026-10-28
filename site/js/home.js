/* Fills every price on the home page from the one price table, so the page can never disagree with it. */
(function () {
  const P = window.EdvPrices, T = P.table;
  document.querySelectorAll('[data-price]').forEach((el) => {
    const blocks = Number(el.dataset.blocks);
    const v = { self: () => P.self(blocks, false), done: () => P.done(blocks, false), extra: () => T.extra, editor: () => T.editor, setup: () => T.doneSetup, perblock: () => T.donePerBlock }[el.dataset.price];
    if (v) el.textContent = P.eur(v());
  });
  const band = document.getElementById('band-from');
  if (band) band.textContent = 'From ' + P.eur(P.self(T.included, false));
})();
