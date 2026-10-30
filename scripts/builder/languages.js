/**
 * Languages in the guided builder. A client who wants the page in two or more languages adds them here; each added language is a
 * linked copy of every page (the engine's own "translation of" link), written in its own words in step 2. The first time a second
 * language exists, a language switcher block is put at the top of each page, so visitors can change language; it goes away again
 * when only one language is left. The exported site is the existing multi-page export: index.html for the first language,
 * index-lv.html and so on for the others, with hreflang links and the switcher wired to the translated files (single-pages.js).
 * The first part of this file is pure (a page snapshot in, a new snapshot out); the second part draws two small boxes: the
 * "Languages" box under the blocks in step 1, and a "Writing in" row at the top of step 2.
 * Everything is set with DOM calls and textContent; nothing here builds HTML from text.
 */
(function () {
  'use strict';

  const SWITCHER = 'multilingual-lang-switcher';
  const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;
  // [code, the language's own name, English name]; the list a small business is likely to need
  const LANGUAGES = [
    ['en', 'English', 'English'], ['lv', 'Latviešu', 'Latvian'], ['lt', 'Lietuvių', 'Lithuanian'], ['et', 'Eesti', 'Estonian'], ['ru', 'Русский', 'Russian'],
    ['de', 'Deutsch', 'German'], ['fr', 'Français', 'French'], ['es', 'Español', 'Spanish'], ['it', 'Italiano', 'Italian'], ['pt', 'Português', 'Portuguese'],
    ['nl', 'Nederlands', 'Dutch'], ['pl', 'Polski', 'Polish'], ['sv', 'Svenska', 'Swedish'], ['da', 'Dansk', 'Danish'], ['fi', 'Suomi', 'Finnish'],
    ['no', 'Norsk', 'Norwegian'], ['cs', 'Čeština', 'Czech'], ['uk', 'Українська', 'Ukrainian']
  ];
  const nameOf = (code) => { const l = LANGUAGES.find((x) => x[0] === code); return l ? l[1] : String(code).toUpperCase(); };
  const englishOf = (code) => { const l = LANGUAGES.find((x) => x[0] === code); return l ? l[2] : String(code).toUpperCase(); };
  const label = (code) => (nameOf(code) === englishOf(code) ? nameOf(code) : nameOf(code) + ' (' + englishOf(code) + ')');

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const rand = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const freshId = (prefix) => prefix + '-' + rand();
  const withNewIds = (stack) => clone(stack || []).map((s) => Object.assign(s, { id: freshId('sec') }));

  /** The site language: pages without a language code of their own are written in it. */
  const siteLanguage = (snap) => (snap.page && snap.page.lang) || 'en';
  const langOf = (p, site) => p.lang || site;
  /** The pages of a snapshot; a single-page project is shown as one page (the id is a stand-in until pages are made for real). */
  function pagesOf(snap) {
    if (snap.pages && snap.pages.length) return clone(snap.pages);
    return [{ id: 'page-single', title: 'Home', slug: 'index', description: '', lang: '', translationOf: '', stack: clone(snap.stack || []) }];
  }
  const isSingle = (snap) => !(snap.pages && snap.pages.length);

  /** The languages of the project, the site language first, then the others in page order: [code]. */
  function languagesOf(snap) {
    const site = siteLanguage(snap), out = [site];
    pagesOf(snap).forEach((p) => { const l = langOf(p, site); if (!out.includes(l)) out.push(l); });
    return out;
  }

  /** The page in language `code` that goes with the open page (its original or one of its translations); null when there is none. */
  function pageFor(snap, code) {
    const pages = pagesOf(snap), site = siteLanguage(snap);
    const active = pages.find((p) => p.id === snap.activePageId) || pages[0];
    const root = active.translationOf || active.id;
    return pages.find((p) => (p.id === root || p.translationOf === root) && langOf(p, site) === code) || null;
  }
  const activeLanguage = (snap) => {
    const pages = pagesOf(snap), site = siteLanguage(snap);
    const active = pages.find((p) => p.id === snap.activePageId) || pages[0];
    return langOf(active, site);
  };

  function uniqueSlug(base, pages) {
    const taken = new Set(pages.map((p) => p.slug));
    let slug = base, n = 2;
    while (taken.has(slug)) slug = base + '-' + n++;
    return slug;
  }
  /** The headers marked `langSlot` in the registry (in the browser); nothing in a plain test run. */
  const registryHasButton = (slug) => typeof window !== 'undefined' && Array.isArray(window.FEATURE_REGISTRY) && window.FEATURE_REGISTRY.some((f) => f.slug === slug && f.langSlot);
  const hasSwitcher = (stack) => stack.some((s) => s.slug === SWITCHER);
  /** True for a block that carries the language button itself (a header marked `langSlot` in the registry); the switcher block is not needed beside it. */
  const hasButtonHeader = (stack, hasButton) => typeof hasButton === 'function' && stack.some((s) => !s.hidden && hasButton(s.slug));
  const switcherSection = () => ({ id: freshId('sec'), slug: SWITCHER, title: 'Language switcher', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } });

  /** Why a language cannot be added, or '' when it can. */
  function whyNotAdd(snap, code) {
    if (!LANG_RE.test(String(code || ''))) return 'Pick a language from the list.';
    if (languagesOf(snap).includes(code)) return englishOf(code) + ' is already on your page.';
    return '';
  }

  /**
   * Adds a language: every original page gets a linked copy (new ids, same blocks and words, ready to translate), and every page gets the language
   * switcher block at the top if it has none and no header with the language button (`hasButton(slug)`). Returns the new snapshot; the open page stays open.
   */
  function addLanguage(snap, code, hasButton = registryHasButton) {
    if (whyNotAdd(snap, code)) throw new Error(whyNotAdd(snap, code));
    const single = isSingle(snap);
    let pages = pagesOf(snap);
    if (single) pages[0].id = freshId('page');
    const activeId = single ? pages[0].id : (snap.activePageId || pages[0].id);
    const originals = pages.filter((p) => !p.translationOf);
    originals.forEach((o) => {
      pages.push({ id: freshId('page'), title: (o.title + ' (' + nameOf(code) + ')').slice(0, 60), slug: uniqueSlug(o.slug + '-' + code, pages), description: o.description || '', lang: code, translationOf: o.id, stack: withNewIds(o.stack) });
    });
    // a page whose header has the button needs no switcher block (an old one is taken out: two headers would show); other pages get the block
    pages = pages.map((p) => {
      if (hasButtonHeader(p.stack, hasButton)) return Object.assign(p, { stack: p.stack.filter((x) => x.slug !== SWITCHER) });
      return hasSwitcher(p.stack) ? p : Object.assign(p, { stack: [switcherSection()].concat(p.stack) });
    });
    const active = pages.find((p) => p.id === activeId);
    return Object.assign({}, snap, { pages, activePageId: activeId, stack: clone(active.stack) });
  }

  /** Removes a language and its pages (the first language cannot be removed). Back to one language, the switcher blocks go and a one-page site is one page again. */
  function removeLanguage(snap, code) {
    const site = siteLanguage(snap);
    if (code === site) throw new Error('The first language cannot be removed.');
    let pages = pagesOf(snap);
    const gone = pages.filter((p) => p.translationOf && langOf(p, site) === code).map((p) => p.id);
    if (!gone.length) return snap;
    const active = pages.find((p) => p.id === snap.activePageId) || pages[0];
    let activeId = gone.includes(active.id) ? active.translationOf : active.id;
    pages = pages.filter((p) => !gone.includes(p.id));
    const left = new Set(pages.map((p) => langOf(p, site)));
    if (left.size < 2) pages = pages.map((p) => Object.assign(p, { stack: p.stack.filter((s) => s.slug !== SWITCHER) }));
    if (pages.length === 1) return Object.assign({}, snap, { pages: [], activePageId: null, stack: clone(pages[0].stack) });
    if (!pages.some((p) => p.id === activeId)) activeId = pages[0].id;
    return Object.assign({}, snap, { pages, activePageId: activeId, stack: clone(pages.find((p) => p.id === activeId).stack) });
  }

  /** Changes the language the page is written in; refused (null and a reason) when that language is already one of the translations. */
  function setSiteLanguage(snap, code) {
    if (!LANG_RE.test(String(code || ''))) return { error: 'Pick a language from the list.' };
    if (code === siteLanguage(snap)) return { snap };
    if (languagesOf(snap).includes(code)) return { error: englishOf(code) + ' is already one of your languages. Remove it first, or pick another.' };
    return { snap: Object.assign({}, snap, { page: Object.assign({}, snap.page, { lang: code }) }) };
  }

  const api = { SWITCHER, LANGUAGES, LANG_RE, nameOf, englishOf, label, siteLanguage, languagesOf, pageFor, activeLanguage, whyNotAdd, addLanguage, removeLanguage, setSiteLanguage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;
  window.BuilderLanguages = api;

  // ---- the two small boxes ---------------------------------------------------------------------------------------------------------
  function el(doc, tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }

  function init(sm, doc = document, win = window) {
    const hostBlocks = doc.getElementById('paneElements');
    const picker = doc.getElementById('blockPicker');
    if (!hostBlocks || !sm || doc.getElementById('languagesBox')) return null;
    const preview = () => win.builderPreview;
    const snap = () => preview().serializeState();
    const live = el(doc, 'p', { class: 'bp-live', id: 'langLive', role: 'status', 'aria-live': 'polite' });
    const say = (t) => { live.textContent = t; };

    const siteSelect = el(doc, 'select', { class: 'lg-select', id: 'langSite', 'aria-label': 'The language your page is written in' });
    LANGUAGES.forEach((l) => siteSelect.append(el(doc, 'option', { value: l[0], text: label(l[0]) })));
    const lead = el(doc, 'p', { class: 'lg-lead', id: 'langLead' });
    const list = el(doc, 'ul', { class: 'lg-list', id: 'langList' });
    const addSelect = el(doc, 'select', { class: 'lg-select', id: 'langAddSelect', 'aria-label': 'Language to add' });
    const addBtn = el(doc, 'button', { type: 'button', class: 'bp-btn lg-add', id: 'langAdd', text: 'Add this language' });
    const note = el(doc, 'p', { class: 'lg-note', id: 'langNote', hidden: '' });
    const box = el(doc, 'section', { class: 'languages-box', id: 'languagesBox', 'aria-label': 'Languages of your page' },
      el(doc, 'h3', { class: 'bp-h', text: 'Languages' }), lead,
      el(doc, 'label', { class: 'lg-label', for: 'langSite', text: 'Your page is written in' }), siteSelect,
      list,
      el(doc, 'label', { class: 'lg-label', for: 'langAddSelect', text: 'Add a language' }), el(doc, 'div', { class: 'lg-row' }, addSelect, addBtn), note, live);
    hostBlocks.insertBefore(box, picker ? picker.nextSibling : hostBlocks.firstChild);

    // "Writing in" row at the top of step 2 (the Words step), so the language being written is always in view
    const wordsBody = doc.querySelector('#paneContent .content-pane-body');
    const bar = el(doc, 'div', { class: 'lang-bar', id: 'langBar', role: 'group', 'aria-label': 'Language you are writing in', hidden: '' });
    if (wordsBody) wordsBody.insertBefore(bar, wordsBody.firstChild);

    function apply(next, message) {
      const p = preview();
      if (!p || !p.applyState) return;
      p.applyState(Object.assign(p.serializeState(), next)); // one history step: one Undo brings the old page back
      if (message) say(message);
    }
    function editIn(code) {
      const target = pageFor(snap(), code);
      if (target && target.id !== sm.getActivePageId()) { sm.switchPage(target.id); say('Now writing in ' + englishOf(code) + '.'); }
    }

    let removing = null;
    function render() {
      const p = preview();
      if (!p || !p.serializeState) return;
      const s = snap(), langs = languagesOf(s), site = siteLanguage(s), here = activeLanguage(s);
      siteSelect.value = LANGUAGES.some((l) => l[0] === site) ? site : 'en';
      lead.textContent = langs.length < 2
        ? 'Your page is in ' + englishOf(site) + '. Want it in more than one language? Each language is a copy of the page with its own words. Visitors choose from a language button in the header.'
        : 'Your page is in ' + langs.length + ' languages. Pick the one you want to write in. Every language has its own copy of each block.';
      list.replaceChildren();
      if (langs.length > 1) {
        langs.forEach((code) => {
          const li = el(doc, 'li', { class: 'lg-item', 'data-lang': code }, el(doc, 'b', { text: label(code) }), el(doc, 'small', { text: code === site ? ' first language' : '' }));
          if (code === here) li.append(el(doc, 'span', { class: 'lg-here', text: 'Writing in this one' }));
          else { const b = el(doc, 'button', { type: 'button', class: 'bp-btn', text: 'Write in ' + englishOf(code), 'aria-label': 'Write the page in ' + englishOf(code) }); b.addEventListener('click', () => editIn(code)); li.append(b); }
          if (code !== site) {
            if (removing === code) {
              const yes = el(doc, 'button', { type: 'button', class: 'bp-btn', text: 'Yes, remove it' }), no = el(doc, 'button', { type: 'button', class: 'bp-btn', text: 'Keep it' });
              yes.addEventListener('click', () => { removing = null; apply(removeLanguage(snap(), code), englishOf(code) + ' removed. Undo brings it back.'); });
              no.addEventListener('click', () => { removing = null; render(); });
              li.append(el(doc, 'span', { class: 'lg-sure', text: 'Remove ' + englishOf(code) + ' and its words? You can undo it.' }), yes, no);
            } else {
              const rm = el(doc, 'button', { type: 'button', class: 'bp-btn', text: 'Remove', 'aria-label': 'Remove ' + englishOf(code) });
              rm.addEventListener('click', () => { removing = code; render(); });
              li.append(rm);
            }
          }
          list.append(li);
        });
      }
      const free = LANGUAGES.filter((l) => !langs.includes(l[0]));
      const keep = addSelect.value;
      addSelect.replaceChildren(el(doc, 'option', { value: '', text: 'Choose a language' }), ...free.map((l) => el(doc, 'option', { value: l[0], text: label(l[0]) })));
      if (free.some((l) => l[0] === keep)) addSelect.value = keep;
      note.hidden = langs.length < 2;
      note.textContent = langs.length < 2 ? '' : 'A language switcher block sits at the top of each page. Write the words of each language in step 2.';
      // the Words row
      bar.hidden = langs.length < 2;
      bar.replaceChildren();
      if (langs.length > 1) {
        bar.append(el(doc, 'span', { class: 'lb-label', text: 'Writing in' }));
        langs.forEach((code) => {
          const b = el(doc, 'button', { type: 'button', class: 'lb-btn' + (code === here ? ' is-here' : ''), text: nameOf(code), 'aria-label': 'Write the page in ' + englishOf(code), 'aria-pressed': String(code === here) });
          b.addEventListener('click', () => editIn(code));
          bar.append(b);
        });
      }
    }

    addBtn.addEventListener('click', () => {
      const code = addSelect.value, why = whyNotAdd(snap(), code);
      if (why) { say(why); return; }
      apply(addLanguage(snap(), code), englishOf(code) + ' added. Its copy has the same blocks and words, ready for you to translate in step 2.');
      addSelect.value = '';
    });
    siteSelect.addEventListener('change', () => {
      const r = setSiteLanguage(snap(), siteSelect.value);
      if (r.error) { say(r.error); render(); return; }
      apply(r.snap, 'Your page is written in ' + englishOf(siteSelect.value) + '.');
    });
    // the language switcher block in the preview lists these languages and opens the page of the one chosen (features/multilingual-lang-switcher/script.js)
    win.__edvLangs = {
      list: () => { const s = snap(), here = activeLanguage(s); return languagesOf(s).map((code) => ({ code, name: nameOf(code), here: code === here })); },
      open: (code) => editIn(code)
    };
    sm.subscribe(render);
    render();
    return { box, bar, render };
  }

  window.BuilderLanguagesUI = { init };
  let tries = 0;
  const start = () => {
    if (window.builderManager && window.builderPreview && window.BuilderBlockPicker && document.getElementById('paneElements')) { window.builderLanguages = init(window.builderManager, document, window); return; }
    if (++tries < 100) setTimeout(start, 50);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
