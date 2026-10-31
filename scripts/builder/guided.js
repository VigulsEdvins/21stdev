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
    { id: 'blocks', label: 'Blocks', hint: 'Choose the blocks of your page and put them in order.', help: 'A block is one part of your page, like the opening banner or the prices. Press Add to put one on your page, use the arrows to move it, and Another look if you want a different style. You can always change your mind later.', tab: 'tabElementsBtn' },
    { id: 'words', label: 'Words', hint: 'Write your own words and add your photos.', help: 'The text on your page is sample text for now. Pick a block, then type your own words in the boxes. Click a block in the preview to pick it. Pictures can be uploaded from your computer.', tab: 'tabContentBtn' },
    { id: 'look', label: 'Look', hint: 'Pick colours and type.', help: 'Choose a set of colours, a pair of fonts and how round the corners are. Everything changes in the preview straight away. If your text is hard to read, we will tell you and fix it with one click.', tab: 'tabStylingBtn' },
    { id: 'check', label: 'Check', hint: 'See what still needs doing before you take your page.', help: 'This list shows what is still missing, in plain words. You do not have to fix everything, and you can go on whenever you like.', pane: 'check' },
    { id: 'get', label: 'Get it', hint: 'See the price and take your finished page.', help: 'The price depends on how many blocks you use, and on whether you add the editor. Prefer not to do it yourself? Press Ask edvlabs to do it.', pane: 'get' }
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
      const b = el(doc, 'button', { type: 'button', class: 'guided-step', id: 'guidedStep-' + s.id, 'data-step': String(i + 1), 'aria-label': 'Step ' + (i + 1) + ': ' + s.label }, num, el(doc, 'span', { class: 'guided-label', text: s.label }));
      b.addEventListener('click', () => go(i));
      return b;
    });
    const list = el(doc, 'ol', { class: 'guided-steps' });
    stepButtons.forEach((b) => list.append(el(doc, 'li', null, b)));

    const hint = el(doc, 'p', { class: 'guided-hint', id: 'guidedHint', 'aria-live': 'polite' });
    const helpBtn = el(doc, 'button', { type: 'button', class: 'guided-helpbtn', id: 'guidedHelpBtn', 'aria-expanded': 'false', 'aria-controls': 'guidedHelp', text: 'Need help?' });
    const helpText = el(doc, 'p', { class: 'guided-help', id: 'guidedHelp', hidden: '' });
    helpBtn.addEventListener('click', () => { const open = helpText.hidden; helpText.hidden = !open; helpBtn.setAttribute('aria-expanded', String(open)); });
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
    // In Advanced mode there is no step bar, so the header carries the way to step 5 (price, payment, download). It takes the place of the old Export button.
    const checkout = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'guidedCheckoutBtn', title: 'See the price and take your finished page', text: 'Get your page' });
    checkout.addEventListener('click', () => {
      setMode('guided'); go(STEPS.length - 1);
      // then do what step 5's main button does, so the popup opens as it does there: the buying window when buying is on, otherwise the download window
      const buy = doc.getElementById('buyProceed'), dl = doc.getElementById('getDownload');
      const main = buy && !buy.hidden ? buy : dl;
      if (main && !main.disabled) main.click();
    });
    const oldExport = doc.getElementById('openExportModalBtn');
    if (oldExport && oldExport.parentNode) oldExport.parentNode.insertBefore(checkout, oldExport); else actions.append(checkout);

    const bar = el(doc, 'nav', { class: 'guided-bar', id: 'guidedBar', 'aria-label': 'Steps to your page' },
      el(doc, 'div', { class: 'guided-inner' }, list, el(doc, 'div', { class: 'guided-actions' }, prev, next)),
      hint, helpBtn, helpText);
    const skel = doc.getElementById('guidedSkel');
    if (skel) skel.remove(); // it only held the place of the bar
    header.insertAdjacentElement('afterend', bar);

    function openModal(kind) {
      const open = doc.getElementById('openExportModalBtn');
      if (open) open.click();
      const target = kind === 'checks' ? doc.getElementById('exportChecks') : doc.getElementById('tabZip');
      win.setTimeout(() => { if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center' }); if (target && target.focus && kind !== 'checks') target.focus(); }, 60);
    }

    // on a phone the panel and the preview take turns: one button flips between them
    const flip = el(doc, 'button', { type: 'button', class: 'guided-flip', id: 'guidedFlip', 'aria-pressed': 'false', text: 'See your page' });
    flip.addEventListener('click', () => {
      const on = !body.classList.contains('show-preview');
      body.classList.toggle('show-preview', on);
      flip.setAttribute('aria-pressed', String(on));
      flip.textContent = on ? 'Back to editing' : 'See your page';
    });
    body.append(flip);

    function render() {
      stepButtons.forEach((b, i) => {
        b.classList.toggle('is-current', i === current);
        b.classList.toggle('is-done', i < current);
        if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      hint.textContent = 'Step ' + (current + 1) + ' of ' + STEPS.length + '. ' + STEPS[current].hint;
      helpText.textContent = STEPS[current].help;
      prev.disabled = current === 0;
      next.hidden = current === STEPS.length - 1;
      body.setAttribute('data-step', String(current + 1));
    }

    function go(i) {
      if (i < 0 || i >= STEPS.length) return;
      current = i;
      const s = STEPS[i];
      const panes = { check: win.builderGuidedCheck, get: win.builderGuidedGet };
      Object.entries(panes).forEach(([k, p]) => { if (p && s.pane !== k) p.hide(); });
      if (s.tab) { const t = doc.getElementById(s.tab); if (t) t.click(); }
      if (s.pane && panes[s.pane]) panes[s.pane].show();
      if (s.modal) openModal(s.modal);
      render();
    }

    function setMode(m) {
      mode = m; saveMode(win, m);
      body.classList.toggle('is-guided', m === 'guided');
      body.classList.toggle('is-advanced', m === 'advanced');
      sw.checked = m === 'advanced';
      bar.hidden = m === 'advanced';
      checkout.hidden = m !== 'advanced';
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
