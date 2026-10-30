/**
 * Active Stack Controller & State Manager
 * Pure state operations for managing sections, themes, and viewport configurations.
 * Compatible with Node.js (CommonJS) and browser (window.createStackManager).
 */

/** A BCP 47 style language code such as en, pt-BR or zh-Hans. */
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;

/** Page-level settings exported with every build. */
const DEFAULT_PAGE = {
  title: 'Assembled Web Page',
  description: '',
  favicon: '', // emoji, image URL or data URI
  fontDisplay: '', // Google Fonts family name, empty = leave section fonts alone
  fontBody: '',
  lang: 'en',
  radius: '', // corner radius for the sections' --radius token, e.g. '8px' or '0.5rem'; empty = component default
  shareImage: '', // full https:// URL of the picture shown when the page is shared (og:image)
  canonical: '', // full https:// URL of the live page
  robots: '', // '' = let search engines index the page, 'noindex' = ask them not to
  bizType: '', // '' | 'Organization' | 'LocalBusiness': writes JSON-LD for search engines
  bizName: '',
  bizPhone: '',
  bizEmail: '', // public contact address: goes into security.txt and the business data
  bizAddress: '',
  formMethod: '', // where form messages go: '' (nowhere yet) | netlify | email | formspree | web3forms | whatsapp | mailto | custom (see scripts/form-delivery.js)
  formTarget: '', // the address, number or key that goes with formMethod
  altTheme: '', // the look the visitor's dark/light button switches to: '' = the default preset of the opposite polarity, a theme preset id, or 'custom' (altBg, altText, altAccent)
  altBg: '',
  altText: '',
  altAccent: '',
  modeButton: '' // '' = the header shows the dark/light button, 'off' = it does not
};

function createStackManager(initialConfig = {}) {
  let counter = 0;

  function generateId(prefix = 'sec') {
    counter++;
    return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const state = {
    stack: Array.isArray(initialConfig.stack) ? [...initialConfig.stack] : [],
    theme: initialConfig.theme || 'midnight-dark',
    customColors: initialConfig.customColors ? { ...initialConfig.customColors } : {},
    viewport: initialConfig.viewport || 'desktop',
    page: { ...DEFAULT_PAGE, ...(initialConfig.page || {}) },
    // Multi-page sites: empty = a single page (the stack above). Otherwise every page is listed here; the active
    // page's own stack is `state.stack` (kept live) and is copied back into its entry when you switch or save.
    pages: [],
    activePageId: null
  };

  const listeners = new Set();

  function notify() {
    const currentState = getState();
    listeners.forEach(fn => {
      try {
        fn(currentState);
      } catch (err) {
        console.error('Error in stack manager subscriber:', err);
      }
    });
  }

  function getState() {
    return {
      ...state,
      stack: [...state.stack],
      customColors: { ...state.customColors },
      page: { ...state.page },
      pages: getPages(),
      activePageId: state.activePageId
    };
  }

  // ---- pages ---------------------------------------------------------------------------------------------
  const cloneJson = (v) => JSON.parse(JSON.stringify(v));

  /** All pages with the active one's live stack filled in; [] for a single-page project. */
  function getPages() {
    return state.pages.map(p => ({ ...p, stack: cloneJson(p.id === state.activePageId ? state.stack : p.stack) }));
  }

  function getActivePageId() {
    return state.activePageId;
  }

  function slugify(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page';
  }

  function uniqueSlug(base, exceptId) {
    const taken = new Set(state.pages.filter(p => p.id !== exceptId).map(p => p.slug));
    let slug = base === 'index' ? 'page' : base; // "index" belongs to the home page
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    return slug;
  }

  function syncActivePage() {
    const active = state.pages.find(p => p.id === state.activePageId);
    if (active) active.stack = cloneJson(state.stack);
  }

  /** Turns a single-page project into a multi-page one: the current stack becomes the Home page. */
  function ensurePages() {
    if (state.pages.length) return;
    state.pages = [{ id: generateId('page'), title: 'Home', slug: 'index', description: '', lang: '', translationOf: '', stack: cloneJson(state.stack) }];
    state.activePageId = state.pages[0].id;
  }

  function addPage(title = 'New page') {
    ensurePages();
    syncActivePage();
    const clean = String(title || '').trim().slice(0, 60) || 'New page';
    const page = { id: generateId('page'), title: clean, slug: uniqueSlug(slugify(clean)), description: '', lang: '', translationOf: '', stack: [] };
    state.pages.push(page);
    state.activePageId = page.id;
    state.stack = [];
    notify();
    return { ...page };
  }

  function switchPage(id) {
    const target = state.pages.find(p => p.id === id);
    if (!target || id === state.activePageId) return null;
    syncActivePage();
    state.activePageId = id;
    state.stack = cloneJson(target.stack);
    notify();
    return { ...target };
  }

  function renamePage(id, title) {
    const page = state.pages.find(p => p.id === id);
    const clean = String(title || '').trim().slice(0, 60);
    if (!page || !clean) return null;
    page.title = clean;
    if (page.slug !== 'index') page.slug = uniqueSlug(slugify(clean), id);
    notify();
    return { ...page, stack: [] };
  }

  function setPageMeta(id, updates = {}) {
    const page = state.pages.find(p => p.id === id);
    if (!page) return null;
    if (typeof updates.description === 'string') page.description = updates.description.slice(0, 300);
    // '' = use the site language from Page Settings
    if (typeof updates.lang === 'string' && (updates.lang === '' || LANG_RE.test(updates.lang))) page.lang = updates.lang;
    // which page this one is a translation of ('' = none); a translation always points at the original, never at another translation
    if (typeof updates.translationOf === 'string') {
      const target = state.pages.find(p => p.id === updates.translationOf);
      const hasTranslations = state.pages.some(p => p.translationOf === page.id);
      if (updates.translationOf === '') page.translationOf = '';
      else if (target && target.id !== page.id && !target.translationOf && !hasTranslations) page.translationOf = target.id;
    }
    notify();
    return { ...page, stack: [] };
  }

  function duplicatePage(id) {
    const source = state.pages.find(p => p.id === id);
    if (!source) return null;
    syncActivePage();
    const stack = cloneJson(source.stack).map(s => ({ ...s, id: generateId() }));
    const title = `${source.title} copy`.slice(0, 60);
    const page = { id: generateId('page'), title, slug: uniqueSlug(slugify(title)), description: source.description, lang: source.lang || '', translationOf: '', stack };
    state.pages.splice(state.pages.indexOf(source) + 1, 0, page);
    state.activePageId = page.id;
    state.stack = cloneJson(stack);
    notify();
    return { ...page, stack: [] };
  }

  function removePage(id) {
    if (state.pages.length <= 1) return false;
    const index = state.pages.findIndex(p => p.id === id);
    if (index === -1) return false;
    syncActivePage();
    const wasActive = id === state.activePageId;
    state.pages.splice(index, 1);
    state.pages.forEach(p => { if (p.translationOf === id) p.translationOf = ''; });
    if (state.pages.length === 1) {
      // back to a single page: its stack is the project's stack
      state.stack = cloneJson(state.pages[0].stack);
      state.pages = [];
      state.activePageId = null;
    } else if (wasActive) {
      const next = state.pages[Math.max(0, index - 1)];
      state.activePageId = next.id;
      state.stack = cloneJson(next.stack);
    }
    notify();
    return true;
  }

  /** Restores pages from a saved project or a history step. `pages` of [] means a single-page project. */
  function setPages(pages, activeId) {
    const list = Array.isArray(pages) ? cloneJson(pages) : [];
    state.pages = list;
    if (!list.length) { state.activePageId = null; return; }
    const active = list.find(p => p.id === activeId) || list[0];
    state.activePageId = active.id;
    state.stack = cloneJson(active.stack || []);
    notify();
  }

  function getStack() {
    return [...state.stack];
  }

  function insertSection(index, slugOrSection, extraProps = {}) {
    const defaultSizing = {
      heightMode: 'auto',
      customHeight: 600,
      paddingY: 'none'
    };

    let section;
    if (typeof slugOrSection === 'string') {
      // a header that can list the page's sections by itself starts doing it (saved headers keep what they have)
      const reg = typeof window !== 'undefined' && Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY.find(f => f.slug === slugOrSection) : null;
      section = {
        id: generateId(),
        slug: slugOrSection,
        sizing: { ...defaultSizing, ...(extraProps.sizing || {}) },
        ...(reg && reg.autoMenu ? { menuMode: 'auto' } : {}),
        ...(reg && reg.stickyDefault ? { sticky: true } : {}),
        ...extraProps
      };
    } else if (slugOrSection && typeof slugOrSection === 'object') {
      section = {
        id: slugOrSection.id || generateId(),
        slug: slugOrSection.slug || '',
        sizing: { ...defaultSizing, ...(slugOrSection.sizing || extraProps.sizing || {}) },
        ...slugOrSection,
        ...extraProps
      };
    } else {
      throw new Error('Invalid section provided to insertSection');
    }

    const targetIndex = typeof index === 'number'
      ? Math.max(0, Math.min(state.stack.length, index))
      : state.stack.length;

    state.stack.splice(targetIndex, 0, section);
    notify();
    return section;
  }

  /** Throws every section away and leaves just this one (a full website replaces the whole page): one change, one undo step. */
  function replaceAllWithSection(slugOrSection, extraProps = {}) {
    const slug = typeof slugOrSection === 'string' ? slugOrSection : (slugOrSection && slugOrSection.slug) || '';
    if (!slug) throw new Error('Invalid section provided to replaceAllWithSection');
    const base = typeof slugOrSection === 'object' ? slugOrSection : {};
    const section = {
      id: generateId(),
      slug,
      sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none', ...(base.sizing || {}), ...(extraProps.sizing || {}) },
      ...base,
      ...extraProps
    };
    section.id = generateId();
    state.stack = [section];
    notify();
    return section;
  }

  function addSection(slugOrSection, extraProps = {}) {
    return insertSection(state.stack.length, slugOrSection, extraProps);
  }

  function updateSectionSizing(sectionId, sizingUpdates = {}) {
    if (isLocked(sectionId)) return null;
    const section = state.stack.find(s => s.id === sectionId);
    if (!section) return null;
    if (!section.sizing) {
      section.sizing = {
        heightMode: 'auto',
        customHeight: 600,
        paddingY: 'none'
      };
    }
    Object.assign(section.sizing, sizingUpdates);
    notify();
    return section.sizing;
  }

  /** Sets the breakpoints a section is hidden on: any of 'mobile', 'tablet', 'desktop'. */
  function setSectionHideOn(id, list) {
    if (isLocked(id)) return null;
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    const clean = Array.from(new Set((Array.isArray(list) ? list : []).filter(b => b === 'mobile' || b === 'tablet' || b === 'desktop')));
    if (clean.length) section.hideOn = clean; else delete section.hideOn;
    notify();
    return section;
  }

  /**
   * How a section treats the page theme: 'match' makes it follow the theme even when the component keeps its own
   * look by default, 'keep' makes it keep its own colours under every page theme (`designPolarity` is how the
   * component was designed, 'dark' or 'light'); anything else goes back to the component's default.
   */
  function setSectionThemeMode(id, mode, designPolarity) {
    if (isLocked(id)) return null;
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    if (mode === 'match' || mode === 'keep') {
      section.themeMode = mode;
      if (mode === 'keep') section.designPolarity = designPolarity === 'light' ? 'light' : 'dark'; else delete section.designPolarity;
    } else {
      delete section.themeMode;
      delete section.designPolarity;
    }
    notify();
    return section;
  }

  function isLocked(id) {
    const section = state.stack.find(s => s.id === id);
    return !!(section && section.locked);
  }

  /** Locks or hides a section. A locked section cannot be moved, replaced, edited or removed; a hidden one stays in the project but is left out of the preview and exports. */
  function setSectionFlag(id, flag, value) {
    if (flag !== 'locked' && flag !== 'hidden') return null;
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    if (value) section[flag] = true; else delete section[flag];
    notify();
    return section;
  }

  /** The client's own name for a section's link ("#pricing"); '' goes back to the automatic name. Letters, digits and dashes only. */
  function setSectionAnchor(id, name) {
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    const A = typeof window !== 'undefined' ? window.BuilderAnchors : null;
    const clean = A ? A.clean(name) : String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    if (clean) section.anchor = clean; else delete section.anchor;
    notify();
    return section;
  }

  /**
   * The automatic menu's settings of a section: `menuMode` ('auto' | 'manual', on a header that can list the sections),
   * `inMenu` (false = not listed), `menuLabel` (the text of its item). Anything else in `patch` is ignored.
   */
  function setSectionMenu(id, patch = {}) {
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    if ('menuMode' in patch) { if (patch.menuMode === 'auto') section.menuMode = 'auto'; else delete section.menuMode; }
    if ('inMenu' in patch) { if (patch.inMenu === false) section.inMenu = false; else delete section.inMenu; }
    if ('menuLabel' in patch) {
      const label = String(patch.menuLabel == null ? '' : patch.menuLabel).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30).trim();
      if (label) section.menuLabel = label; else delete section.menuLabel;
    }
    notify();
    return section;
  }

  /** Keeps a header at the top of the page while it scrolls (`sticky: true`); false removes the field. */
  function setSectionSticky(id, on) {
    const section = state.stack.find(s => s.id === id);
    if (!section) return null;
    if (on === true) section.sticky = true; else delete section.sticky;
    notify();
    return section;
  }

  function removeSection(id) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1 || state.stack[index].locked) return false;

    state.stack.splice(index, 1);
    notify();
    return true;
  }

  function moveSection(id, delta) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1 || state.stack[index].locked) return state.stack;

    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= state.stack.length) {
      return state.stack;
    }

    const [item] = state.stack.splice(index, 1);
    state.stack.splice(targetIndex, 0, item);
    notify();
    return state.stack;
  }

  function duplicateSection(id) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1) return null;

    const original = state.stack[index];
    const duplicate = {
      ...original,
      id: generateId()
    };
    delete duplicate.locked;

    state.stack.splice(index + 1, 0, duplicate);
    notify();
    return duplicate;
  }

  function replaceSection(id, slugOrSection, extraProps = {}) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1 || state.stack[index].locked) return null;

    const defaultSizing = {
      heightMode: 'auto',
      customHeight: 600,
      paddingY: 'none'
    };

    let newSection;
    if (typeof slugOrSection === 'string') {
      newSection = {
        id: generateId(),
        slug: slugOrSection,
        sizing: { ...defaultSizing, ...(extraProps.sizing || {}) },
        ...extraProps
      };
    } else if (slugOrSection && typeof slugOrSection === 'object') {
      newSection = {
        id: slugOrSection.id || generateId(),
        slug: slugOrSection.slug || '',
        sizing: { ...defaultSizing, ...(slugOrSection.sizing || extraProps.sizing || {}) },
        ...slugOrSection,
        ...extraProps
      };
    } else {
      throw new Error('Invalid section provided to replaceSection');
    }

    state.stack[index] = newSection;
    notify();
    return newSection;
  }

  function reorderStack(startIndex, endIndex) {
    if (
      startIndex < 0 ||
      startIndex >= state.stack.length ||
      endIndex < 0 ||
      endIndex >= state.stack.length
    ) {
      return state.stack;
    }
    if (state.stack[startIndex].locked) return state.stack;

    const [item] = state.stack.splice(startIndex, 1);
    state.stack.splice(endIndex, 0, item);
    notify();
    return state.stack;
  }

  function clearStack() {
    state.stack = [];
    notify();
    return state.stack;
  }

  function setStack(newStack) {
    state.stack = Array.isArray(newStack) ? JSON.parse(JSON.stringify(newStack)) : [];
    notify();
    return state.stack;
  }

  function setTheme(theme) {
    state.theme = theme;
    notify();
    return state.theme;
  }

  function setCustomColors(colors = {}) {
    state.customColors = {
      ...state.customColors,
      ...colors
    };
    notify();
    return state.customColors;
  }

  function setViewport(viewport) {
    state.viewport = viewport;
    notify();
    return state.viewport;
  }

  function setPage(updates = {}) {
    state.page = { ...state.page };
    Object.keys(DEFAULT_PAGE).forEach(k => {
      if (typeof updates[k] === 'string') state.page[k] = updates[k];
    });
    notify();
    return { ...state.page };
  }

  /**
   * Sets (or, with an empty value, clears) a client-content override on one section.
   * `def` ({ selector, type, attr? }) is required the first time a field is set and is kept afterwards.
   */
  function setSectionOverride(sectionId, fieldId, value, def = null) {
    if (isLocked(sectionId)) return null;
    const section = state.stack.find(s => s.id === sectionId);
    if (!section || !fieldId) return false;
    const overrides = { ...(section.overrides || {}) };
    if (value === '' || value === null || value === undefined) {
      delete overrides[fieldId];
    } else {
      const existing = overrides[fieldId] || {};
      const selector = (def && def.selector) || existing.selector;
      if (!selector) return false;
      overrides[fieldId] = {
        selector,
        type: (def && def.type) || existing.type || 'text',
        ...(((def && def.attr) || existing.attr) ? { attr: (def && def.attr) || existing.attr } : {}),
        value: String(value)
      };
    }
    section.overrides = overrides;
    notify();
    return true;
  }

  function clampDimension(val, min) {
    if (typeof val === 'number') return Math.max(min, Math.round(val));
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const clamped = Math.max(min, Math.round(num));
        return val.endsWith('px') ? `${clamped}px` : clamped;
      }
    }
    return val;
  }

  function addElement(sectionId, elementData = {}) {
    if (isLocked(sectionId)) return null;
    const section = state.stack.find(s => s.id === sectionId);
    if (!section) return null;
    if (!Array.isArray(section.elements)) {
      section.elements = [];
    }

    const type = elementData.type || 'button';
    const element = {
      id: generateId('el'),
      type: type,
      x: typeof elementData.x === 'number' ? Math.max(0, Math.min(100, elementData.x)) : 50,
      y: typeof elementData.y === 'number' ? Math.max(0, Math.min(100, elementData.y)) : 50,
      text: elementData.text || (type === 'image' ? '' : (type === 'badge' ? 'FEATURED' : 'Click Me →')),
      link: elementData.link || '#',
      style: elementData.style || 'solid', // 'solid' | 'glass' | 'neon' | 'outline'
      imageUrl: elementData.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
      imageSize: elementData.imageSize || 'medium', // 'small' | 'medium' | 'large'
      ...elementData
    };

    if (elementData.width !== undefined) {
      element.width = clampDimension(elementData.width, 30);
    }
    if (elementData.height !== undefined) {
      element.height = clampDimension(elementData.height, 20);
    }

    section.elements.push(element);
    notify();
    return element;
  }

  function updateElement(sectionId, elementId, updates = {}, silent = false) {
    if (isLocked(sectionId)) return null;
    const section = state.stack.find(s => s.id === sectionId);
    if (!section || !Array.isArray(section.elements)) return null;

    const element = section.elements.find(el => el.id === elementId);
    if (!element) return null;

    if (typeof updates.x === 'number') updates.x = Math.max(0, Math.min(100, updates.x));
    if (typeof updates.y === 'number') updates.y = Math.max(0, Math.min(100, updates.y));
    if (updates.width !== undefined) updates.width = clampDimension(updates.width, 30);
    if (updates.height !== undefined) updates.height = clampDimension(updates.height, 20);

    Object.assign(element, updates);
    if (!silent) {
      notify();
    }
    return element;
  }

  function removeElement(sectionId, elementId) {
    if (isLocked(sectionId)) return false;
    const section = state.stack.find(s => s.id === sectionId);
    if (!section || !Array.isArray(section.elements)) return false;

    const index = section.elements.findIndex(el => el.id === elementId);
    if (index === -1) return false;

    section.elements.splice(index, 1);
    notify();
    return true;
  }

  function getSectionElements(sectionId) {
    const section = state.stack.find(s => s.id === sectionId);
    return section && Array.isArray(section.elements) ? [...section.elements] : [];
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    getState,
    getStack,
    addSection,
    insertSection,
    removeSection,
    isLocked,
    setSectionFlag,
    setSectionAnchor,
    setSectionMenu,
    setSectionSticky,
    setSectionHideOn,
    setSectionThemeMode,
    replaceAllWithSection,
    moveSection,
    duplicateSection,
    replaceSection,
    reorderStack,
    clearStack,
    setStack,
    updateSectionSizing,
    addElement,
    updateElement,
    removeElement,
    getSectionElements,
    setTheme,
    setCustomColors,
    setViewport,
    setPage,
    getPages,
    getActivePageId,
    addPage,
    switchPage,
    renamePage,
    setPageMeta,
    duplicatePage,
    removePage,
    setPages,
    setSectionOverride,
    subscribe
  };
}

function insertSection(manager, index, slugOrSection, extraProps) {
  if (manager && typeof manager.insertSection === 'function') {
    return manager.insertSection(index, slugOrSection, extraProps);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStackManager, insertSection, DEFAULT_PAGE };
}

if (typeof window !== 'undefined') {
  window.createStackManager = createStackManager;
  window.StackManager = { createStackManager, DEFAULT_PAGE };
}
