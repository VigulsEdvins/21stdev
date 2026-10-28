/* The price calculator on the pricing page. Every number comes from EdvPrices, the one price table. */
(function () {
  const P = window.EdvPrices, T = P.table;
  const $ = (id) => document.getElementById(id);
  const blocksEl = $('calc-blocks'), editorEl = $('calc-editor');
  function update() {
    let n = Math.round(Number(blocksEl.value));
    if (!(n >= 1)) n = 1; if (n > 30) n = 30;
    const ed = editorEl.checked, extra = Math.max(0, n - T.included);
    $('calc-incl').textContent = String(T.included);
    $('calc-base').textContent = P.eur(T.base);
    $('calc-extra-n').textContent = String(extra);
    $('calc-extra').textContent = P.eur(extra * T.extra);
    $('calc-ed').textContent = ed ? P.eur(T.editor) : 'not chosen';
    $('calc-self').textContent = P.eur(P.self(n, ed));
    $('calc-done').textContent = P.eur(P.done(n, ed));
  }
  blocksEl.form.addEventListener('submit', (e) => e.preventDefault());
  blocksEl.addEventListener('input', update); editorEl.addEventListener('change', update);
  update();
})();
