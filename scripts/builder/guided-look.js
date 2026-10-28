/**
 * Guided step 3, "Look" (plan E6.5): pick a colour set, a font pair and how round the corners are, each in one click,
 * with a contrast guard that says in plain words when text or buttons would be hard to read and offers a one-click fix.
 * It drives the same stack manager as the Styling tab (theme "custom" + custom colours, page fonts, page radius), so the
 * preview, history and export follow without extra wiring. Advanced mode keeps the classic Styling tab untouched.
 */
(function () {
  'use strict';

  const Sets = (typeof window !== 'undefined' && window.BuilderLookSets) || require('./look-sets.js');
  const ADVANCED_FIELDS = ['pageFontDisplayInput', 'pageFontBodyInput', 'pageShareImageInput', 'pageCanonicalInput', 'pageRobotsInput', 'pageBizTypeInput', 'pageBizNameInput', 'pageBizPhoneInput', 'pageBizAddressInput', 'pageLangInput', 'pageRadiusInput', 'importTokensBtn'];

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

  function init(sm, doc = document, win = window) {
    const host = doc.querySelector('#paneStyling .styling-pane-content');
    if (!host || doc.getElementById('lookPicker')) return null;

    const colourBox = el(doc, 'div', { class: 'lk-grid', role: 'group', 'aria-label': 'Colours' });
    const fontBox = el(doc, 'div', { class: 'lk-grid lk-grid--wide', role: 'group', 'aria-label': 'Fonts' });
    const roundBox = el(doc, 'div', { class: 'lk-grid', role: 'group', 'aria-label': 'Corners' });
    const guard = el(doc, 'p', { class: 'lk-guard', id: 'lookGuard', role: 'status', 'aria-live': 'polite' });
    const fixBtn = el(doc, 'button', { type: 'button', class: 'builder-btn-primary lk-fix', id: 'lookFix', text: 'Fix it for me' });
    const root = el(doc, 'section', { class: 'look-picker', id: 'lookPicker', 'aria-label': 'Look of your page' },
      el(doc, 'h3', { class: 'lk-h', text: 'Colours' }), colourBox, guard, fixBtn,
      el(doc, 'h3', { class: 'lk-h', text: 'Fonts' }), fontBox,
      el(doc, 'h3', { class: 'lk-h', text: 'Corners' }), roundBox);
    host.insertBefore(root, host.firstChild);

    // the page settings that only make sense in Advanced get a marker the stylesheet hides in guided mode
    ADVANCED_FIELDS.forEach((id) => { const n = doc.getElementById(id); const f = n && (n.closest('.ps-field') || n); if (f) f.classList.add('adv-only'); });

    const colours = () => {
      const st = sm.getState();
      if (st.theme === 'custom') return st.customColors;
      const p = (win.Assembler && win.Assembler.THEME_PRESETS && win.Assembler.THEME_PRESETS[st.theme]) || {};
      return { bg: p.bg, text: p.text, accent: p.accent };
    };

    function choice(box, label, selected, onPick, swatch) {
      const b = el(doc, 'button', { type: 'button', class: 'lk-btn' + (selected ? ' is-on' : ''), 'aria-pressed': String(!!selected) });
      if (swatch) b.append(swatch);
      b.append(el(doc, 'span', { text: label }));
      b.addEventListener('click', onPick);
      box.append(b);
    }

    function render() {
      const st = sm.getState(), c = colours(), page = st.page;
      colourBox.replaceChildren(); fontBox.replaceChildren(); roundBox.replaceChildren();
      Sets.COLOUR_SETS.forEach((s) => {
        const on = st.theme === 'custom' && same(c.bg, s.bg) && same(c.text, s.text) && same(c.accent, s.accent);
        const sw = el(doc, 'span', { class: 'lk-swatch', 'aria-hidden': 'true' });
        sw.style.background = s.bg; sw.style.borderColor = s.accent; sw.style.color = s.text;
        sw.append(el(doc, 'i', { text: 'Aa' }));
        const dot = el(doc, 'u'); dot.style.background = s.accent; sw.append(dot);
        choice(colourBox, s.label, on, () => { sm.setCustomColors({ bg: s.bg, text: s.text, accent: s.accent, cardBg: s.cardBg, border: s.border }); sm.setTheme('custom'); }, sw);
      });
      Sets.FONT_PAIRS.forEach((p) => {
        const on = same(page.fontDisplay, p.display) && same(page.fontBody, p.body);
        const sw = el(doc, 'span', { class: 'lk-font', 'aria-hidden': 'true', text: p.display ? 'Ag' : '—' });
        choice(fontBox, p.label, on, () => sm.setPage({ fontDisplay: p.display, fontBody: p.body }), sw);
      });
      Sets.ROUNDNESS.forEach((r) => {
        const sw = el(doc, 'span', { class: 'lk-corner', 'aria-hidden': 'true' });
        sw.style.borderTopLeftRadius = r.value || '10px';
        choice(roundBox, r.label, same(page.radius, r.value), () => sm.setPage({ radius: r.value }), sw);
      });

      const problems = Sets.check(c);
      const fix = Object.assign({}, ...problems.map((p) => p.fix));
      const words = problems.map((p) => p.kind === 'text'
        ? 'Your text is hard to read on this background (' + p.ratio.toFixed(1) + ' to 1, it should be at least ' + Sets.TEXT_MIN + ').'
        : 'Your buttons and links are hard to see on this background (' + p.ratio.toFixed(1) + ' to 1, it should be at least ' + Sets.ACCENT_MIN + ').');
      guard.textContent = problems.length ? words.join(' ') : 'Text and buttons are easy to read on these colours.';
      guard.classList.toggle('is-bad', problems.length > 0);
      fixBtn.hidden = !problems.length;
      fixBtn._fix = fix;
    }
    fixBtn.addEventListener('click', () => {
      if (!fixBtn._fix) return;
      const st = sm.getState();
      const base = colours();
      sm.setCustomColors(Object.assign({ bg: base.bg, text: base.text, accent: base.accent }, fixBtn._fix));
      if (st.theme !== 'custom') sm.setTheme('custom');
    });

    sm.subscribe(render);
    render();
    return { render, root };
  }

  const api = { init };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedLook = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm && document.getElementById('paneStyling')) { window.builderGuidedLook = init(sm, document, window); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
