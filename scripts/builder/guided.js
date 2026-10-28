/**
 * The guided path of the builder (plan E6.2): five steps, one job each, over the same engine and the same panels.
 *   1 Blocks (add and order)   2 Words (the Content tab)   3 Look (the Styling tab)   4 Check   5 Get it (the export window)
 * The classic tabs and tools stay in the page; the guided mode hides the ones a first-time visitor does not need and the
 * "Advanced tools" switch brings them back. The choice is kept in localStorage; ?advanced=1 or ?guided=1 overrides it.
 */
(function () {
  'use strict';

  const KEY = 'web_builder_mode';
  const STEPS = [
    { id: 'blocks', label: 'Blocks', hint: 'Choose the blocks of your page and put them in order.', tab: 'tabElementsBtn' },
    { id: 'words', label: 'Words', hint: 'Write your own words and add your photos.', tab: 'tabContentBtn' },
    { id: 'look', label: 'Look', hint: 'Pick colours and type.', tab: 'tabStylingBtn' },
    { id: 'check', label: 'Check', hint: 'See what still needs doing before you take your page.', modal: 'checks' },
    { id: 'get', label: 'Get it', hint: 'Take your finished page.', modal: 'download' }
  ];

  function readMode(win) {
    const q = new URLSearchParams(win.location.search);
    if (q.get('advanced') === '1') return 'advanced';
    if (q.get('guided') === '1') return 'guided';
    try { return win.localStorage.getItem(KEY) === 'advanced' ? 'advanced' : 'guided'; } catch (_) { return 'guided'; }
  }
  function saveMode(win, mode) { try { win.localStorage.setItem(KEY, mode); } catch (_) { /* the choice lasts until reload */ } }

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(doc = document, win = window) {
    const header = doc.querySelector('.builder-header');
    if (!header || doc.getElementById('guidedBar')) return null;
    const body = doc.body;
    let mode = readMode(win), current = 0;

    const stepButtons = STEPS.map((s, i) => {
      const num = el(doc, 'span', { class: 'guided-num', 'aria-hidden': 'true', text: String(i + 1) });
      const b = el(doc, 'button', { type: 'button', class: 'guided-step', id: 'guidedStep-' + s.id, 'data-step': String(i + 1) }, num, el(doc, 'span', { class: 'guided-label', text: s.label }));
      b.addEventListener('click', () => go(i));
      return b;
    });
    const list = el(doc, 'ol', { class: 'guided-steps' });
    stepButtons.forEach((b) => list.append(el(doc, 'li', null, b)));

    const hint = el(doc, 'p', { class: 'guided-hint', id: 'guidedHint', 'aria-live': 'polite' });
    const prev = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle guided-prev', id: 'guidedPrev', text: 'Back' });
    const next = el(doc, 'button', { type: 'button', class: 'builder-btn-primary guided-next', id: 'guidedNext', text: 'Next' });
    prev.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => go(current + 1));

    const sw = el(doc, 'input', { type: 'checkbox', role: 'switch', id: 'guidedAdvancedSwitch' });
    sw.checked = mode === 'advanced';
    sw.addEventListener('change', () => setMode(sw.checked ? 'advanced' : 'guided'));
    const swLabel = el(doc, 'label', { class: 'guided-switch', for: 'guidedAdvancedSwitch' }, sw, el(doc, 'span', { text: 'Advanced' }));
    // the switch lives in the header so it is always there; the step bar itself disappears in Advanced mode
    const actions = header.querySelector('.builder-actions') || header;
    actions.insertBefore(swLabel, actions.firstChild);

    const bar = el(doc, 'nav', { class: 'guided-bar', id: 'guidedBar', 'aria-label': 'Steps to your page' },
      el(doc, 'div', { class: 'guided-inner' }, list, el(doc, 'div', { class: 'guided-actions' }, prev, next)),
      hint);
    header.insertAdjacentElement('afterend', bar);

    function openModal(kind) {
      const open = doc.getElementById('openExportModalBtn');
      if (open) open.click();
      const target = kind === 'checks' ? doc.getElementById('exportChecks') : doc.getElementById('tabZip');
      win.setTimeout(() => { if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center' }); if (target && target.focus && kind !== 'checks') target.focus(); }, 60);
    }

    function render() {
      stepButtons.forEach((b, i) => {
        b.classList.toggle('is-current', i === current);
        b.classList.toggle('is-done', i < current);
        if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      hint.textContent = 'Step ' + (current + 1) + ' of ' + STEPS.length + '. ' + STEPS[current].hint;
      prev.disabled = current === 0;
      next.hidden = current === STEPS.length - 1;
      body.setAttribute('data-step', String(current + 1));
    }

    function go(i) {
      if (i < 0 || i >= STEPS.length) return;
      current = i;
      const s = STEPS[i];
      if (s.tab) { const t = doc.getElementById(s.tab); if (t) t.click(); }
      if (s.modal) openModal(s.modal);
      render();
    }

    function setMode(m) {
      mode = m; saveMode(win, m);
      body.classList.toggle('is-guided', m === 'guided');
      body.classList.toggle('is-advanced', m === 'advanced');
      sw.checked = m === 'advanced';
      bar.hidden = m === 'advanced';
    }

    setMode(mode); render();
    return { go, setMode, get mode() { return mode; }, get step() { return current + 1; }, STEPS };
  }

  const api = { init, STEPS, KEY, readMode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuided = api;
    const start = () => { window.builderGuided = init(document, window); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
