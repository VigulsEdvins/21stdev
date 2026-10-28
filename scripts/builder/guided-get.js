/**
 * Guided step 5, "Get it" (plan E6.7, E6.8): the price in plain lines, the editor choice, the way to the download,
 * and "Ask edvlabs to do it", which is also in the step bar so it is there at every step.
 * Every number comes from site/js/prices.js (EdvPrices), the single price table the public pages and the calculator use.
 */
(function () {
  'use strict';

  const EDITOR_KEY = 'web_builder_editor';
  const HELP_URL = 'site/contact/'; // where "Ask edvlabs to do it" goes; the deployed site puts the builder next to this page

  /** Pure part: the lines of the price meter for a block count and the editor choice. */
  function meter(P, blocks, editor) {
    const T = P.table, n = Math.max(0, Math.round(Number(blocks) || 0)), extra = Math.max(0, n - T.included);
    const lines = [['Base price, includes ' + T.included + ' blocks', P.eur(T.base)]];
    if (extra) lines.push([extra + ' extra block' + (extra === 1 ? '' : 's') + ' at ' + P.eur(T.extra), P.eur(extra * T.extra)]);
    if (editor) lines.push(['The editor, so you can change words later', P.eur(T.editor)]);
    return { blocks: n, lines, self: P.self(n, editor), done: P.done(n, editor) };
  }

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(sm, doc = document, win = window) {
    const P = win.EdvPrices || (typeof require === 'function' ? require('../../site/js/prices.js') : null);
    const aside = doc.getElementById('paneElements') && doc.getElementById('paneElements').parentElement;
    if (!P || !aside || doc.getElementById('paneGet')) return null;
    let editor = false;
    try { editor = win.localStorage.getItem(EDITOR_KEY) === '1'; } catch (_) { /* the choice lasts until reload */ }

    const head = el(doc, 'h3', { class: 'ck-h', id: 'getHead' });
    const lines = el(doc, 'dl', { class: 'gt-lines', id: 'getLines' });
    const total = el(doc, 'p', { class: 'gt-total', id: 'getTotal', role: 'status', 'aria-live': 'polite' });
    const edBox = el(doc, 'input', { type: 'checkbox', id: 'getEditor' });
    edBox.checked = editor;
    const edLabel = el(doc, 'label', { class: 'gt-editor', for: 'getEditor' }, edBox,
      el(doc, 'span', {}, el(doc, 'b', { text: 'Add the editor (' + P.eur(P.table.editor) + ')' }), el(doc, 'small', { text: 'A simple page where you can change words and pictures later, without the builder.' })));
    const go = el(doc, 'button', { type: 'button', class: 'builder-btn-primary gt-go', id: 'getDownload', text: 'Go to the download' });
    const note = el(doc, 'p', { class: 'gt-note', id: 'getNote', text: 'Payment is not switched on yet, so downloading is free for now.' });
    const helpBox = el(doc, 'div', { class: 'gt-help' }, el(doc, 'p', { class: 'gt-done', id: 'getDone' }),
      el(doc, 'a', { class: 'builder-btn-subtle gt-ask', id: 'getAsk', href: HELP_URL, target: '_blank', rel: 'noopener', text: 'Ask edvlabs to do it' }));
    const pane = el(doc, 'div', { class: 'sidebar-tab-pane get-pane', id: 'paneGet' }, el(doc, 'div', { class: 'ck-body' }, head, lines, edLabel, total, go, note, helpBox));
    aside.append(pane);

    function render() {
      const n = sm.getStack().filter((s) => !s.hidden).length;
      const m = meter(P, n, edBox.checked);
      head.textContent = n ? 'Your page has ' + n + ' block' + (n === 1 ? '' : 's') : 'Your page has no blocks yet';
      lines.replaceChildren();
      if (n) m.lines.forEach(([k, v]) => { lines.append(el(doc, 'dt', { text: k }), el(doc, 'dd', { text: v })); });
      total.textContent = n ? 'Build it yourself: ' + P.eur(m.self) : 'Add blocks in step 1 to see the price.';
      doc.getElementById('getDone').textContent = n ? 'Or let edvlabs build it for you: ' + P.eur(m.done) + '. That adds a set-up fee and a fee per block.' : '';
      go.disabled = !n;
    }
    edBox.addEventListener('change', () => { try { win.localStorage.setItem(EDITOR_KEY, edBox.checked ? '1' : '0'); } catch (_) { /* kept for this visit only */ } render(); });
    go.addEventListener('click', () => { const open = doc.getElementById('openExportModalBtn'); if (open) open.click(); });
    sm.subscribe(render);
    render();

    // "Ask edvlabs to do it" in the step bar, so it is one click away on every step
    const bar = doc.querySelector('#guidedBar .guided-actions');
    if (bar && !doc.getElementById('guidedAsk')) bar.insertBefore(el(doc, 'a', { class: 'guided-ask', id: 'guidedAsk', href: HELP_URL, target: '_blank', rel: 'noopener', text: 'Ask edvlabs to do it' }), bar.firstChild);

    return {
      render,
      show() { doc.querySelectorAll('.sidebar-tab-pane').forEach((p) => p.classList.remove('is-active')); pane.classList.add('is-active'); render(); },
      hide() { pane.classList.remove('is-active'); },
      get editor() { return edBox.checked; }
    };
  }

  const api = { init, meter, HELP_URL, EDITOR_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedGet = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm && window.EdvPrices && document.getElementById('guidedBar')) { window.builderGuidedGet = init(sm, document, window); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
