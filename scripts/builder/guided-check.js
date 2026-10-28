/**
 * Guided step 4, "Check" (plan E6.6): what still needs doing before the page is taken, in plain words, each item with the
 * quickest fix. It reuses the export page checks (PageChecks, the same ones the export window shows) plus two the guided
 * path adds: blocks still showing sample text, and colours that are hard to read. Nothing here blocks the next step.
 */
(function () {
  'use strict';

  const Sets = (typeof window !== 'undefined' && window.BuilderLookSets) || require('./look-sets.js');

  // plain-words messages; ids not listed here are left out (they are notes for developers, not for the visitor)
  const WORDS = {
    'page-title': 'Your page still has the placeholder title. It shows on the browser tab and in search results.',
    'page-description': 'Add a sentence or two about your page. Search results show it under the title.',
    'h1-missing': 'Your page has no main heading.',
    'img-alt': 'A picture has no description, so people using screen readers cannot tell what it shows.',
    'link-name': 'A link has no readable text.',
    'link-empty': 'A link goes nowhere yet.',
    'button-name': 'A button has no label.',
    'field-label': 'A form box has no label.',
    'heading-empty': 'A heading is empty.'
  };
  const own = (s) => Object.values(s.overrides || {}).filter((v) => v && v.type !== 'alt' && v.value !== '' && v.value != null).length;

  /** Pure part: turns the raw findings into the list shown. items: { id, text, kind, sectionId?, fix? } */
  function buildItems({ stack, issues, colours, page }) {
    const items = [];
    if (!stack.length) return [{ id: 'empty', text: 'Your page has no blocks yet.', kind: 'blocks' }];
    (issues || []).forEach((i) => {
      if (!WORDS[i.id]) return;
      items.push({ id: i.id, text: WORDS[i.id], kind: i.id === 'page-title' ? 'title' : i.id === 'page-description' ? 'description' : 'block', sectionId: i.sectionId });
    });
    Sets.check(colours || {}).forEach((p) => items.push({ id: 'contrast-' + p.kind, text: p.kind === 'text' ? 'Your text is hard to read on this background.' : 'Your buttons and links are hard to see on this background.', kind: 'contrast', fix: p.fix }));
    stack.forEach((s) => { if (own(s) === 0) items.push({ id: 'sample-' + s.id, text: (s.title || s.slug) + ' still shows sample text.', kind: 'words', sectionId: s.id }); });
    return items;
  }

  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(sm, doc = document, win = window) {
    const aside = doc.querySelector('.builder-sidebar, aside') || doc.getElementById('paneElements').parentElement;
    if (!aside || doc.getElementById('paneCheck')) return null;
    const head = el(doc, 'h3', { class: 'ck-h', id: 'checkHead', role: 'status', 'aria-live': 'polite' });
    const list = el(doc, 'ul', { class: 'ck-list', id: 'checkList' });
    const pane = el(doc, 'div', { class: 'sidebar-tab-pane check-pane', id: 'paneCheck' }, el(doc, 'div', { class: 'ck-body' }, head, list));
    aside.append(pane);
    let visible = false, timer = null, seq = 0;

    const guided = () => win.builderGuided;
    function toBlock(sectionId, stepIndex) {
      const g = guided(); if (!g) return;
      g.go(stepIndex);
      const sel = doc.getElementById('contentSectionSelect');
      if (sel && sectionId) { sel.value = sectionId; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    const btn = (text, label, fn) => { const b = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle ck-btn', text, 'aria-label': label }); b.addEventListener('click', fn); return b; };

    function field(kind) {
      const isTitle = kind === 'title';
      const input = isTitle ? el(doc, 'input', { type: 'text', maxlength: '120', 'aria-label': 'Page title', autocomplete: 'off' }) : el(doc, 'textarea', { rows: '2', maxlength: '300', 'aria-label': 'Page description' });
      input.className = 'ck-input';
      const save = btn('Save', isTitle ? 'Save the page title' : 'Save the page description', () => {
        const v = input.value.trim(); if (!v) return;
        sm.setPage(isTitle ? { title: v } : { description: v });
      });
      return [input, save];
    }

    async function refresh() {
      const mine = ++seq;
      const st = sm.getState();
      let issues = [];
      const api = win.builderPreview;
      if (st.stack.length && api && api.prepareExportData && win.PageChecks) {
        try {
          const r = await api.prepareExportData();
          const html = r && r.bundle && r.bundle['index.html'];
          if (html) {
            const altFixed = {};
            st.stack.forEach((s) => { const n = Object.values(s.overrides || {}).filter((o) => o && o.type === 'alt' && o.value).length; if (n) altFixed[s.id] = n; });
            issues = win.PageChecks.checkPage(html, st.page, altFixed);
          }
        } catch (_) { /* the list still shows the checks that need no export */ }
      }
      if (mine !== seq) return; // a newer refresh is on its way
      const c = st.theme === 'custom' ? st.customColors : ((win.Assembler && win.Assembler.THEME_PRESETS && win.Assembler.THEME_PRESETS[st.theme]) || {});
      const items = buildItems({ stack: st.stack, issues, colours: { bg: c.bg, text: c.text, accent: c.accent }, page: st.page });
      head.textContent = items.length ? items.length + (items.length === 1 ? ' thing' : ' things') + ' to look at. You can still go on.' : 'Nothing left to fix. Your page is ready to take.';
      list.replaceChildren();
      const seen = new Set();
      items.forEach((it) => {
        const key = it.id + '|' + (it.sectionId || '');
        if (seen.has(key)) return; seen.add(key);
        const li = el(doc, 'li', { class: 'ck-item', 'data-check': it.id });
        li.append(el(doc, 'span', { class: 'ck-text', text: it.text }));
        const act = el(doc, 'span', { class: 'ck-act' });
        if (it.kind === 'title' || it.kind === 'description') act.append(...field(it.kind));
        else if (it.kind === 'contrast') act.append(btn('Fix it for me', 'Make the colours easier to read', () => { sm.setCustomColors(Object.assign({ bg: c.bg, text: c.text, accent: c.accent }, it.fix)); if (st.theme !== 'custom') sm.setTheme('custom'); }));
        else if (it.kind === 'blocks') act.append(btn('Add blocks', 'Go to step 1 and add blocks', () => guided() && guided().go(0)));
        else if (it.kind === 'words') act.append(btn('Write your words', 'Write your own words in ' + it.text, () => toBlock(it.sectionId, 1)));
        else if (it.sectionId) act.append(btn('Show the block', 'Show the block this is about', () => toBlock(it.sectionId, 1)));
        li.append(act);
        list.append(li);
      });
    }

    sm.subscribe(() => { if (!visible) return; clearTimeout(timer); timer = setTimeout(refresh, 500); });
    return {
      refresh,
      show() { visible = true; doc.querySelectorAll('.sidebar-tab-pane').forEach((p) => p.classList.remove('is-active')); pane.classList.add('is-active'); return refresh(); },
      hide() { visible = false; pane.classList.remove('is-active'); },
      get visible() { return visible; }
    };
  }

  const api = { init, buildItems, WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedCheck = api;
    let tries = 0;
    const start = () => {
      const sm = window.builderManager;
      if (sm && document.getElementById('paneElements')) { window.builderGuidedCheck = init(sm, document, window); return; }
      if (++tries < 100) setTimeout(start, 50);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
