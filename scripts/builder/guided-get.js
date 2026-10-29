/**
 * Guided step 5, "Get it" (plan E6.7, E6.8): the price in plain lines, the editor choice, the way to the download,
 * and "Ask edvlabs to do it", which is also in the step bar so it is there at every step.
 * Every number comes from site/js/prices.js (EdvPrices), the single price table the public pages and the calculator use.
 */
(function () {
  'use strict';

  const EDITOR_KEY = 'web_builder_editor';
  // where "Ask edvlabs to do it" goes: the staged page (scripts/build-site.js) names it in a contact-url tag; from the repository root it is site/contact/
  const HELP_URL = (typeof document !== 'undefined' && (document.querySelector('meta[name="contact-url"]') || {}).content) || 'site/contact/';

  /** Pure part: the lines of the price meter for a block count and the editor choice. */
  function meter(P, blocks, editor) {
    const T = P.table, n = Math.max(0, Math.round(Number(blocks) || 0)), extra = Math.max(0, n - T.included);
    const lines = [['Base price, includes ' + T.included + ' blocks', P.eur(T.base)]];
    if (extra) lines.push([extra + ' extra block' + (extra === 1 ? '' : 's') + ' at ' + P.eur(T.extra), P.eur(extra * T.extra)]);
    if (editor) lines.push(['The editor, so you can change words later', P.eur(T.editor)]);
    return { blocks: n, lines, self: P.self(n, editor), done: P.done(n, editor) };
  }

  /**
   * Pure part: checks the web address typed in "What will your web address be?" (plan E7.7). Returns { ok, value, message }.
   * A bare name gets https:// in front; http:// is refused; no sign-in details, query or fragment (they can hold secrets and are not part of a page address).
   * An empty answer is allowed: it means "not known yet" and the sitemap and canonical link are left out.
   */
  function checkAddress(raw) {
    let v = String(raw == null ? '' : raw).trim();
    if (!v) return { ok: true, value: '', message: '' };
    if (/^http:\/\//i.test(v)) return { ok: false, value: v, message: 'Please use https:// (with the padlock), not http://.' };
    if (!/^https:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
    if (/\s/.test(v)) return { ok: false, value: v, message: 'The address has a space in it.' };
    let u;
    try { u = new URL(v); } catch (_) { return { ok: false, value: v, message: 'That does not look like a web address, for example https://yourname.com/' }; }
    if (u.username || u.password) return { ok: false, value: v, message: 'Leave out any user name or password.' };
    if (u.search || u.hash) return { ok: false, value: v, message: 'Leave out anything after ? or #. Use just the address of the page.' };
    const labels = u.hostname.split('.');
    if (!(labels.length > 1 && labels.every((l) => /^[a-z0-9-]{1,63}$/i.test(l))) && u.hostname !== 'localhost') return { ok: false, value: v, message: 'That does not look like a web address, for example https://yourname.com/' };
    return { ok: true, value: u.origin + (u.pathname === '/' ? '/' : u.pathname), message: '' };
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
    const addrInput = el(doc, 'input', { type: 'text', id: 'getAddress', class: 'gt-input', placeholder: 'https://yourname.com/', autocomplete: 'off', inputmode: 'url', maxlength: '300' });
    const addrMsg = el(doc, 'small', { id: 'getAddressNote', role: 'status', 'aria-live': 'polite' });
    const addrLabel = el(doc, 'label', { class: 'gt-address', for: 'getAddress' }, el(doc, 'b', { text: 'What will your web address be?' }),
      el(doc, 'small', { text: 'The address people will type, like https://yourname.com/. It goes into the page so search engines know where it lives. Not sure yet? Leave it empty: your download will have no sitemap and no canonical link, and you can fill it in later and download again.' }), addrInput, addrMsg);
    const go = el(doc, 'button', { type: 'button', class: 'builder-btn-primary gt-go', id: 'getDownload', text: 'Go to the download' });
    const note = el(doc, 'p', { class: 'gt-note', id: 'getNote', text: 'Payment is not switched on yet, so downloading is free for now.' });
    const helpBox = el(doc, 'div', { class: 'gt-help' }, el(doc, 'p', { class: 'gt-done', id: 'getDone' }),
      el(doc, 'a', { class: 'builder-btn-subtle gt-ask', id: 'getAsk', href: HELP_URL, target: '_blank', rel: 'noopener', text: 'Ask edvlabs to do it' }));
    const pane = el(doc, 'div', { class: 'sidebar-tab-pane get-pane', id: 'paneGet' }, el(doc, 'div', { class: 'ck-body' }, head, lines, edLabel, addrLabel, total, go, note, helpBox));
    aside.append(pane);

    function render() {
      const n = sm.getStack().filter((s) => !s.hidden && s.slug !== 'multilingual-lang-switcher').length; // the language switcher is added for you, so it is not a block you pay for
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
    function syncAddress() {
      if (doc.activeElement === addrInput) return;
      const cur = (sm.getState().page || {}).canonical || '';
      if (addrInput.value !== cur) addrInput.value = cur;
      addrMsg.textContent = cur ? '' : 'Left empty: no sitemap and no canonical link in your download yet.';
    }
    addrInput.addEventListener('change', () => {
      const r = checkAddress(addrInput.value);
      if (!r.ok) { addrMsg.textContent = r.message; addrInput.setAttribute('aria-invalid', 'true'); return; }
      addrInput.removeAttribute('aria-invalid');
      addrInput.value = r.value;
      sm.setPage({ canonical: r.value });
      addrMsg.textContent = r.value ? 'Saved.' : 'Left empty: no sitemap and no canonical link in your download yet.';
    });
    sm.subscribe(() => { render(); syncAddress(); });
    render();
    syncAddress();

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

  const api = { init, meter, checkAddress, HELP_URL, EDITOR_KEY };
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
