/**
 * Guided step 2, "Words" (plan E6.4): the Content tab's field editor, walked one block at a time.
 *  - a status line says how many blocks already carry the visitor's own words (the rest still shows sample text)
 *  - "Previous block" / "Next block" move through the page without the drop-down
 *  - clicking a block in the preview picks it in the editor
 * The field editor itself (builder-extras.js) is unchanged; this only drives its section select.
 */
(function () {
  'use strict';

  const own = (section) => Object.entries(section.overrides || {}).filter(([k, v]) => v && v.type !== 'alt' && v.type !== 'hide' && v.type !== 'move' && !/__alt$/.test(k) && v.value !== '' && v.value != null).length;

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(sm, doc = document) {
    const body = doc.querySelector('#paneContent .content-pane-body');
    const select = doc.getElementById('contentSectionSelect');
    if (!body || !select || doc.getElementById('wordsStatus')) return null;
    const quick = body.querySelector('details.quick-edit');
    if (quick) quick.open = true;

    const status = el(doc, 'p', { class: 'words-status', id: 'wordsStatus', role: 'status', 'aria-live': 'polite' });
    const prev = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'wordsPrev', text: 'Previous block' });
    const next = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'wordsNext', text: 'Next block' });
    const nav = el(doc, 'div', { class: 'words-nav' }, prev, next);
    body.insertBefore(status, body.firstChild);
    if (quick) quick.insertBefore(nav, quick.querySelector('summary').nextSibling);

    function stepBy(d) {
      const i = select.selectedIndex + d;
      if (i < 0 || i >= select.options.length) return;
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      refresh();
    }
    prev.addEventListener('click', () => stepBy(-1));
    next.addEventListener('click', () => stepBy(1));

    function refresh() {
      const stack = sm.getStack().filter((s) => s.slug !== 'multilingual-lang-switcher'); // the language switcher is added for you; it has no words of yours to write
      const done = stack.filter((s) => own(s) > 0).length;
      status.textContent = !stack.length ? 'Add blocks first (step 1), then write your words here.'
        : done === 0 ? 'None of your ' + stack.length + ' blocks has your own words yet. They still show sample text.'
        : done === stack.length ? 'All ' + stack.length + ' blocks have your words.'
        : done + ' of ' + stack.length + ' blocks have your words. The rest still show sample text.';
      prev.disabled = select.selectedIndex <= 0;
      next.disabled = select.selectedIndex < 0 || select.selectedIndex >= select.options.length - 1;
    }

    // a click on a block in the preview picks it in the editor
    const hooked = new WeakSet();
    function hook() {
      const f = doc.querySelector('.viewport-frame-wrapper iframe') || doc.querySelector('iframe');
      let d = null; try { d = f && f.contentDocument; } catch (_) { return; }
      if (!d || hooked.has(d)) return;
      hooked.add(d);
      d.addEventListener('click', (e) => {
        if (!doc.body.classList.contains('is-guided')) return;
        const ids = new Set(sm.getStack().map((s) => s.id));
        for (let n = e.target; n && n.nodeType === 1; n = n.parentElement) {
          if (n.id && ids.has(n.id)) {
            const i = Array.from(select.options).findIndex((o) => o.value === n.id);
            if (i >= 0 && select.selectedIndex !== i) { select.selectedIndex = i; select.dispatchEvent(new Event('change', { bubbles: true })); refresh(); }
            return;
          }
        }
      }, true);
    }
    sm.subscribe(() => { refresh(); setTimeout(hook, 300); });
    select.addEventListener('change', refresh);
    new MutationObserver(refresh).observe(select, { childList: true }); // the editor refills the list a moment after the page changes
    const t = setInterval(() => { hook(); refresh(); }, 1500); // the preview reloads its document; hook again when it does
    refresh(); hook();
    return { refresh, hook, stop: () => clearInterval(t) };
  }

  const api = { init, own };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedWords = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm && document.getElementById('contentSectionSelect')) { window.builderGuidedWords = init(sm, document); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
