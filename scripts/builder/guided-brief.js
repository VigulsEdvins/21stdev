/**
 * Entry from the questions (plan E6.1): when the visitor already answered the questions on the public site, the builder
 * offers to start from those answers in one click: the recommended blocks (site/js/recommend.js), a colour set and font
 * pair that fit the "how should it feel" answer, and the editor choice. The brief is read from this browser's storage
 * (key edvlabs.brief_v1, the same one the questions write) and checked with the shared brief checker before use.
 */
(function () {
  'use strict';

  const BRIEF_KEY = 'edvlabs.brief_v1';
  const DISMISS_KEY = 'web_builder_brief_dismissed';
  // the first "feel" word picked decides the look; ids are the ones in look-sets.js
  const FEEL = {
    warm: ['paper', 'warm'], calm: ['lake', 'clean'], bold: ['night', 'bold'], playful: ['sun', 'modern'],
    serious: ['slate', 'classic'], elegant: ['rose', 'elegant'], simple: ['ink', 'clean'], friendly: ['forest', 'warm']
  };

  /** Pure part: from a brief to what the builder should do. `deps` = { Kinds, Look, Recommend, Questions } */
  function plan(brief, deps) {
    const { Kinds, Look, Recommend, Questions } = deps;
    const rec = Recommend.recommend(brief);
    const blocks = [], missing = [];
    rec.blocks.forEach((b) => {
      const k = Kinds.byId[b.id];
      if (k && k.variants.length) blocks.push({ id: b.id, label: b.label, because: b.because, slug: k.variants[0] });
      else missing.push({ id: b.id, label: b.label });
    });
    const feel = brief.answers && brief.answers.feel && !brief.answers.feel.unknown ? [].concat(brief.answers.feel.value || []) : [];
    const pick = FEEL[feel[0]] || null;
    const colours = pick ? Look.COLOUR_SETS.find((s) => s.id === pick[0]) : null;
    const fonts = pick ? Look.FONT_PAIRS.find((p) => p.id === pick[1]) : null;
    return { chosen: rec.chosen, blocks, missing, colours, fonts, editor: Questions.wantsEditor(brief.answers || {}) };
  }

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function readBrief(win) {
    try {
      const b = JSON.parse(win.localStorage.getItem(BRIEF_KEY));
      if (!b || !win.EdvBrief || win.EdvBrief.check(b).length) return null;
      return b;
    } catch (_) { return null; }
  }

  function init(sm, doc = document, win = window) {
    const host = doc.getElementById('paneElements');
    const brief = readBrief(win);
    if (!host || !brief || doc.getElementById('briefOffer')) return null;
    let dismissed = false;
    try { dismissed = win.sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { /* shown again next time */ }
    const deps = { Kinds: win.BuilderBlockKinds, Look: win.BuilderLookSets, Recommend: win.EdvRecommend, Questions: win.EdvQuestions };
    if (!deps.Kinds || !deps.Look || !deps.Recommend || !deps.Questions) return null;
    const p = plan(brief, deps);
    if (!p.blocks.length) return null;

    const list = el(doc, 'ul', { class: 'bo-list' });
    p.blocks.forEach((b) => list.append(el(doc, 'li', {}, el(doc, 'b', { text: b.label }), el(doc, 'small', { text: ' ' + b.because }))));
    const use = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'briefUse', text: 'Start with these blocks' });
    const no = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'briefNo', text: 'No thanks' });
    const warn = el(doc, 'p', { class: 'bo-warn', id: 'briefWarn' });
    const live = el(doc, 'p', { class: 'bp-live', id: 'briefLive', role: 'status', 'aria-live': 'polite' });
    const box = el(doc, 'section', { class: 'brief-offer', id: 'briefOffer', 'aria-label': 'Start from your answers' },
      el(doc, 'h3', { class: 'bp-h', text: 'We have your answers' }),
      el(doc, 'p', { class: 'bo-lead', text: p.chosen ? 'These are the blocks you chose:' : 'From your answers, we suggest these blocks:' }),
      list,
      p.missing.length ? el(doc, 'p', { class: 'bo-missing', text: 'Not ready yet, so left out: ' + p.missing.map((m) => m.label).join(', ') + '. Ask edvlabs and we will add them for you.' }) : el(doc, 'span'),
      warn, el(doc, 'div', { class: 'bo-actions' }, use, no), live);
    host.insertBefore(box, host.firstChild);

    function syncVisibility() {
      box.hidden = dismissed;
      warn.textContent = sm.getStack().length ? 'This replaces the blocks you have now. You can undo it.' : '';
    }
    sm.subscribe(syncVisibility);
    syncVisibility();

    no.addEventListener('click', () => { dismissed = true; try { win.sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* fine */ } box.hidden = true; });
    use.addEventListener('click', () => {
      const api = win.builderPreview;
      if (api && api.serializeState && api.applyState) {
        // the whole page in one step, so a single Undo brings the old page back
        const snap = api.serializeState();
        const stamp = Date.now().toString(36);
        snap.stack = p.blocks.map((b, i) => ({ id: 'brief-' + stamp + '-' + i, slug: b.slug, title: b.label, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }));
        if (p.colours) { snap.theme = 'custom'; snap.customColors = { bg: p.colours.bg, text: p.colours.text, accent: p.colours.accent, cardBg: p.colours.cardBg, border: p.colours.border }; }
        if (p.fonts) snap.page = Object.assign({}, snap.page, { fontDisplay: p.fonts.display, fontBody: p.fonts.body });
        api.applyState(snap);
      } else {
        sm.clearStack();
        p.blocks.forEach((b) => sm.addSection(b.slug, { title: b.label }));
        if (p.colours) { sm.setCustomColors({ bg: p.colours.bg, text: p.colours.text, accent: p.colours.accent, cardBg: p.colours.cardBg, border: p.colours.border }); sm.setTheme('custom'); }
        if (p.fonts) sm.setPage({ fontDisplay: p.fonts.display, fontBody: p.fonts.body });
      }
      try { win.localStorage.setItem('web_builder_editor', p.editor ? '1' : '0'); } catch (_) { /* kept for this visit */ }
      const ed = doc.getElementById('getEditor'); if (ed) { ed.checked = p.editor; ed.dispatchEvent(new Event('change')); }
      dismissed = true; try { win.sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* fine */ }
      box.hidden = true;
      live.textContent = p.blocks.length + ' blocks added from your answers.';
    });
    return { plan: p, box };
  }

  const api = { init, plan, readBrief, FEEL, BRIEF_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedBrief = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm && window.BuilderBlockPicker && window.BuilderLookSets && document.getElementById('paneElements')) { window.builderGuidedBrief = init(sm, document, window); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
