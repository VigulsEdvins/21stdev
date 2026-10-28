/* Fills every price on a page from the one price table, so the page can never disagree with it. */
(function () {
  const P = window.EdvPrices, T = P.table;
  document.querySelectorAll('[data-price]').forEach((el) => {
    const blocks = Number(el.dataset.blocks), ed = el.dataset.editor === '1';
    const v = { self: () => P.self(blocks, ed), done: () => P.done(blocks, ed), included: () => T.included, extra: () => T.extra, editor: () => T.editor, setup: () => T.doneSetup, perblock: () => T.donePerBlock }[el.dataset.price];
    if (v) el.textContent = el.dataset.price === 'included' ? String(v()) : P.eur(v());
  });
  const band = document.getElementById('band-from');
  if (band) band.textContent = 'From ' + P.eur(P.self(T.included, false));
})();
