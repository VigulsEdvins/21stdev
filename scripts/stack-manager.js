/**
 * Active Stack Controller & State Manager
 * Pure state operations for managing sections, themes, and viewport configurations.
 * Compatible with Node.js (CommonJS) and browser (window.createStackManager).
 */

/** Page-level settings exported with every build. */
const DEFAULT_PAGE = {
  title: 'Assembled Web Page',
  description: '',
  favicon: '', // emoji, image URL or data URI
  fontDisplay: '', // Google Fonts family name, empty = leave section fonts alone
  fontBody: '',
  lang: 'en',
  shareImage: '', // full https:// URL of the picture shown when the page is shared (og:image)
  canonical: '', // full https:// URL of the live page
  robots: '', // '' = let search engines index the page, 'noindex' = ask them not to
  bizType: '', // '' | 'Organization' | 'LocalBusiness': writes JSON-LD for search engines
  bizName: '',
  bizPhone: '',
  bizAddress: ''
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
    page: { ...DEFAULT_PAGE, ...(initialConfig.page || {}) }
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
      page: { ...state.page }
    };
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
      section = {
        id: generateId(),
        slug: slugOrSection,
        sizing: { ...defaultSizing, ...(extraProps.sizing || {}) },
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
