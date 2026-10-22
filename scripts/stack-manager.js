/**
 * Active Stack Controller & State Manager
 * Pure state operations for managing sections, themes, and viewport configurations.
 * Compatible with Node.js (CommonJS) and browser (window.createStackManager).
 */

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
    viewport: initialConfig.viewport || 'desktop'
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
      customColors: { ...state.customColors }
    };
  }

  function getStack() {
    return [...state.stack];
  }

  function addSection(slugOrSection, extraProps = {}) {
    let section;
    if (typeof slugOrSection === 'string') {
      section = {
        id: generateId(),
        slug: slugOrSection,
        ...extraProps
      };
    } else if (slugOrSection && typeof slugOrSection === 'object') {
      section = {
        id: slugOrSection.id || generateId(),
        slug: slugOrSection.slug || '',
        ...slugOrSection,
        ...extraProps
      };
    } else {
      throw new Error('Invalid section provided to addSection');
    }

    state.stack.push(section);
    notify();
    return section;
  }

  function removeSection(id) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1) return false;

    state.stack.splice(index, 1);
    notify();
    return true;
  }

  function moveSection(id, delta) {
    const index = state.stack.findIndex(s => s.id === id);
    if (index === -1) return state.stack;

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

    state.stack.splice(index + 1, 0, duplicate);
    notify();
    return duplicate;
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

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    getState,
    getStack,
    addSection,
    removeSection,
    moveSection,
    duplicateSection,
    reorderStack,
    clearStack,
    setTheme,
    setCustomColors,
    setViewport,
    subscribe
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStackManager };
}

if (typeof window !== 'undefined') {
  window.createStackManager = createStackManager;
  window.StackManager = { createStackManager };
}
