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
    const altBox = el(doc, 'div', { class: 'lk-grid', role: 'group', 'aria-label': 'Other look' });
    const altInputs = {};
    const altWarn = el(doc, 'p', { class: 'lk-guard is-bad', hidden: '' });
    const altOwn = el(doc, 'div', { class: 'lk-grid', role: 'group', 'aria-label': 'Your own colours for the other look', hidden: '' });
    const guard = el(doc, 'p', { class: 'lk-guard', id: 'lookGuard', role: 'status', 'aria-live': 'polite' });
    const fixBtn = el(doc, 'button', { type: 'button', class: 'builder-btn-primary lk-fix', id: 'lookFix', text: 'Fix it for me' });
    const altSection = el(doc, 'div', { class: 'lk-alt' },
      el(doc, 'h3', { class: 'lk-h', text: 'Other look' }), el(doc, 'p', { class: 'lk-guard', text: 'Visitors can switch your page to this look with the sun/moon button in the header.' }), altBox, altOwn);
    const root = el(doc, 'section', { class: 'look-picker', id: 'lookPicker', 'aria-label': 'Look of your page' },
      el(doc, 'h3', { class: 'lk-h', text: 'Colours' }), colourBox, guard, fixBtn,
      el(doc, 'h3', { class: 'lk-h', text: 'Fonts' }), fontBox,
      el(doc, 'h3', { class: 'lk-h', text: 'Corners' }), roundBox,
      altSection);
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
      colourBox.replaceChildren(); fontBox.replaceChildren(); roundBox.replaceChildren(); altBox.replaceChildren();
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

      // the look the visitor's dark/light button switches to: a theme of the opposite polarity (the default is marked until one is picked)
      const A = win.Assembler;
      // only while a header on the page has the light/dark button and it is not switched off (Light/dark mode tab of the admin panel)
      const reg = win.FEATURE_REGISTRY || [];
      const wantAlt = page.modeButton !== 'off' && st.stack.some((sec) => !sec.hidden && reg.some((f) => f.slug === sec.slug && f.langSlot));
      altSection.hidden = !wantAlt;
      if (A && A.THEME_PRESETS && wantAlt) {
        const now = st.theme === 'custom' ? st.customColors : st.theme;
        const curDark = A.isDarkTheme(A.resolveTheme(now));
        const swatchOf = (bg, text, accent) => { const sw = el(doc, 'span', { class: 'lk-swatch', 'aria-hidden': 'true' }); sw.style.background = bg; sw.style.borderColor = accent; sw.style.color = text; sw.append(el(doc, 'i', { text: 'Aa' })); return sw; };
        const shown = A.altTheme(now, page.altTheme || '').id;
        Object.keys(A.THEME_PRESETS).filter((k) => A.isDarkTheme(A.THEME_PRESETS[k]) !== curDark).forEach((k) => {
          const t = A.THEME_PRESETS[k];
          choice(altBox, t.name, shown === k && page.altTheme !== 'custom', () => sm.setPage({ altTheme: k }), swatchOf(t.bg, t.text, t.accent));
        });
        // the client's own colours: three colour boxes, and the look has to be the opposite of the page's
        const HEX = /^#[0-9a-fA-F]{6}$/, dflt = A.altTheme(now, '');
        const own = { bg: HEX.test(page.altBg) ? page.altBg : dflt.bg, text: HEX.test(page.altText) ? page.altText : dflt.text, accent: HEX.test(page.altAccent) ? page.altAccent : dflt.accent };
        const isCustom = page.altTheme === 'custom';
        choice(altBox, 'Your own colours', isCustom, () => sm.setPage({ altTheme: 'custom', altBg: own.bg, altText: own.text, altAccent: own.accent }), swatchOf(own.bg, own.text, own.accent));
        altOwn.hidden = !isCustom;
        if (isCustom) {
          // the colour boxes are made once, so a colour picker that is open is not rebuilt under the client's hand
          if (!altOwn.firstChild) {
            let timer = null;
            [['bg', 'Background'], ['text', 'Text'], ['accent', 'Buttons and links']].forEach(([k, label]) => {
              const inp = el(doc, 'input', { type: 'color', 'aria-label': label });
              altInputs[k] = inp;
              inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => sm.setPage({ altTheme: 'custom', altBg: altInputs.bg.value, altText: altInputs.text.value, altAccent: altInputs.accent.value }), 150); });
              altOwn.append(el(doc, 'label', { class: 'lk-btn' }, el(doc, 'span', { text: label }), inp));
            });
            altOwn.append(altWarn);
          }
          ['bg', 'text', 'accent'].forEach((k) => { if (doc.activeElement !== altInputs[k]) altInputs[k].value = own[k]; });
          altWarn.hidden = A.isDarkTheme({ bg: own.bg }) !== curDark;
          altWarn.textContent = 'The background needs to be ' + (curDark ? 'light' : 'dark') + ' to be the other look.';
        }
      }

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
