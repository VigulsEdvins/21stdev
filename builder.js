/**
 * Page Preview & Assemble Studio Controller (builder.js)
 * Manages active section stack, component picker drawer, theming, and preview integration.
 */

(function () {
  'use strict';

  // Shared helpers live in scripts/builder/*.js (loaded first by builder.html; required in Node).
  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./scripts/builder/ui-helpers.js');
  const { getNormalizedCategory, matchesCategory } = (typeof window !== 'undefined' && window.BuilderCategories) || require('./scripts/builder/categories.js');
  const WIDGET_CATALOG_ITEMS = (typeof window !== 'undefined' && window.WidgetCatalog) || require('./scripts/builder/widget-catalog.js');

  function initBuilder() {
    // 1. Initialize State Manager
    const stackManager = typeof window.createStackManager === 'function'
      ? window.createStackManager()
      : (window.StackManager && window.StackManager.createStackManager ? window.StackManager.createStackManager() : null);

    if (!stackManager) {
      console.error('StackManager not found. Ensure scripts/stack-manager.js is loaded.');
      return;
    }

    // Expose on window for tests and other scripts
    window.builderManager = stackManager;

    // Cache features from window.FEATURE_REGISTRY
    const featuresMap = new Map();
    const featuresData = {};
    const featureCache = new Map();
    const registry = Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY : [];

    registry.forEach(feature => {
      featuresMap.set(feature.slug, feature);
      if (feature.files && (feature.files.html || feature.files.css || feature.files.js)) {
        featuresData[feature.slug] = {
          html: feature.files.html || '',
          css: feature.files.css || '',
          js: feature.files.js || ''
        };
        featureCache.set(feature.slug, featuresData[feature.slug]);
      }
    });

    // Landing Page Singleton Rules:
    // Singletons: Preloader (Optional, index 0), Header (Essential, top), Hero (Essential, after header), Footer (Essential, bottom).
    const LANDING_PAGE_SINGLETONS = {
      preloader: {
        type: 'preloader',
        name: 'Preloader',
        category: 'Preloaders & Shaders',
        necessity: 'optional',
        needLabel: 'Optional',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('preloader') || s.includes('preloader') || t.includes('preloader');
        }
      },
      header: {
        type: 'header',
        name: 'Header',
        category: 'Headers & Nav',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('nav') || c.includes('header') || s.includes('header') || s.includes('nav') || s.includes('burger') || s.includes('menu') || t.includes('header') || t.includes('navbar') || t.includes('navigation');
        }
      },
      hero: {
        type: 'hero',
        name: 'Hero Section',
        category: 'Heroes',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c === 'heroes' || c.includes('hero') || s.includes('hero') || t.includes('hero');
        }
      },
      footer: {
        type: 'footer',
        name: 'Footer',
        category: 'Footers & Endings',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('footer') || s.includes('footer') || t.includes('footer');
        }
      }
    };

    function getSingletonType(slug, title, cat) {
      if (!slug && !title && !cat) return null;
      for (const [key, def] of Object.entries(LANDING_PAGE_SINGLETONS)) {
        if (def.match(slug, title, cat)) return key;
      }
      return null;
    }

    function findExistingSingleton(type) {
      if (!type || !stackManager) return null;
      const stack = stackManager.getStack();
      return stack.find(sec => {
        const feat = featuresMap.get(sec.slug);
        const title = sec.title || (feat ? (feat.title || feat.name) : '');
        const cat = sec.category || (feat ? feat.category : '');
        return getSingletonType(sec.slug, title, cat) === type;
      }) || null;
    }

    // Preloader play state tracking:
    // "It need to play once after I add it and other times only if I run it"
    let playedPreloaderId = null;
    let preloaderForceReplay = false;

    function addOrReplaceLandingSection(slug, extraProps = {}, preferredIndex = null) {
      catalogLib.addRecent(slug);
      const title = extraProps.title || slug;
      const category = extraProps.category || '';
      const singletonType = getSingletonType(slug, title, category);

      if (singletonType === 'preloader') {
        // Explicitly added or replaced preloader: play once
        preloaderForceReplay = true;
        playedPreloaderId = null;
      }

      if (singletonType) {
        const singletonDef = LANDING_PAGE_SINGLETONS[singletonType];
        const existing = findExistingSingleton(singletonType);

        if (existing) {
          // Landing page can only have one! Replace the existing singleton in place
          let replaced;
          if (typeof stackManager.replaceSection === 'function') {
            replaced = stackManager.replaceSection(existing.id, slug, extraProps);
          } else {
            const stack = stackManager.getStack();
            const idx = stack.findIndex(s => s.id === existing.id);
            stackManager.removeSection(existing.id);
            replaced = stackManager.insertSection(idx >= 0 ? idx : stackManager.getStack().length, slug, extraProps);
          }

          // Ensure proper canonical position if needed (Preloader at 0, Header at 0/1, Footer at bottom)
          if (singletonType === 'preloader') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx > 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, -currIdx);
            }
          } else if (singletonType === 'header') {
            const stack = stackManager.getStack();
            const preloader = findExistingSingleton('preloader');
            const targetPos = preloader ? 1 : 0;
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx !== targetPos && currIdx >= 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, targetPos - currIdx);
            }
          } else if (singletonType === 'footer') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx >= 0 && currIdx < stack.length - 1) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, (stack.length - 1) - currIdx);
            }
          }

          showToast(`Landing page can only have one ${singletonDef.name}. Replaced with "${title}".`);
          return { section: replaced, replaced: true, singletonType };
        } else {
          // No existing singleton: insert at canonical position
          let targetIndex = preferredIndex;
          if (singletonType === 'preloader') {
            targetIndex = 0; // Preloaders always go at the very top (entry screen)
          } else if (singletonType === 'header') {
            const preloader = findExistingSingleton('preloader');
            targetIndex = preloader ? 1 : 0; // Header goes after preloader if present, else 0
          } else if (singletonType === 'hero') {
            const header = findExistingSingleton('header');
            if (header) {
              const stack = stackManager.getStack();
              const headerIdx = stack.findIndex(s => s.id === header.id);
              targetIndex = headerIdx >= 0 ? headerIdx + 1 : 1;
            } else {
              const preloader = findExistingSingleton('preloader');
              targetIndex = preloader ? 1 : 0;
            }
          } else if (singletonType === 'footer') {
            targetIndex = stackManager.getStack().length;
          } else if (targetIndex === null || targetIndex === undefined) {
            const footer = findExistingSingleton('footer');
            if (footer) {
              const stack = stackManager.getStack();
              const footerIdx = stack.findIndex(s => s.id === footer.id);
              targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
            } else {
              targetIndex = stackManager.getStack().length;
            }
          }

          const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
          showToast(`Added ${singletonDef.name}: "${title}"`);
          return { section: newSec, replaced: false, singletonType };
        }
      }

      // Non-singleton component: if footer exists at end, keep footer at bottom by inserting before it
      let targetIndex = preferredIndex;
      if (targetIndex === null || targetIndex === undefined) {
        const footer = findExistingSingleton('footer');
        if (footer) {
          const stack = stackManager.getStack();
          const footerIdx = stack.findIndex(s => s.id === footer.id);
          targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
        } else {
          targetIndex = stackManager.getStack().length;
        }
      }

      const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
      showToast(`Added "${title}"`);
      return { section: newSec, replaced: false, singletonType: null };
    }

    /**
     * Client-side memory cache for feature source files.
     * Fetches features/<slug>/index.html, style.css, script.js if not yet cached.
     */
    async function fetchFeatureFiles(slug) {
      if (!slug) return { html: '', css: '', js: '' };

      if (featureCache.has(slug)) {
        return featureCache.get(slug);
      }

      if (featuresData[slug] && (featuresData[slug].html || featuresData[slug].css || featuresData[slug].js)) {
        featureCache.set(slug, featuresData[slug]);
        return featuresData[slug];
      }

      let html = '';
      let css = '';
      let js = '';

      // Node.js fallback (for tests and headless environments)
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
          const fs = require('fs');
          const path = require('path');
          const dir = path.resolve(process.cwd(), 'features', slug);
          if (fs.existsSync(path.join(dir, 'index.html'))) {
            html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
          }
          if (fs.existsSync(path.join(dir, 'style.css'))) {
            css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
          }
          if (fs.existsSync(path.join(dir, 'script.js'))) {
            js = fs.readFileSync(path.join(dir, 'script.js'), 'utf8');
          }
        } catch (_) {}
      }

      // Browser HTTP fetch
      if (!html && !css && !js && typeof fetch === 'function') {
        try {
          const [htmlRes, cssRes, jsRes] = await Promise.all([
            fetch(`features/${slug}/index.html`).catch(() => null),
            fetch(`features/${slug}/style.css`).catch(() => null),
            fetch(`features/${slug}/script.js`).catch(() => null)
          ]);

          if (htmlRes && htmlRes.ok) html = await htmlRes.text();
          if (cssRes && cssRes.ok) css = await cssRes.text();
          if (jsRes && jsRes.ok) js = await jsRes.text();
        } catch (err) {
          console.warn(`Could not fetch sources for feature "${slug}":`, err);
        }
      }

      const files = { html, css, js };
      featureCache.set(slug, files);
      featuresData[slug] = files;
      return files;
    }

    // 2. DOM Elements
    const pageStackList = document.getElementById('pageStackList');
    const stackEmptyPlaceholder = document.getElementById('stackEmptyPlaceholder');
    const stackCountBadge = document.getElementById('stackCountBadge');
    const clearStackBtn = document.getElementById('clearStackBtn');
    const loadStarterBtn = document.getElementById('loadStarterBtn');
    const resetCanvasBtn = document.getElementById('resetCanvasBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    // Drawer Elements

    // Viewport & Preview Elements
    const previewFrame = document.getElementById('previewFrame');
    const viewportStage = document.getElementById('viewportStage');
    const viewportDimensionLabel = document.getElementById('viewportDimensionLabel');
    const viewportDesktopBtn = document.getElementById('viewportDesktopBtn');
    const viewportTabletBtn = document.getElementById('viewportTabletBtn');
    const viewportMobileBtn = document.getElementById('viewportMobileBtn');

    // Theme Elements
    const themePresetSelect = document.getElementById('themePresetSelect');
    const customThemeToggle = document.getElementById('customThemeToggle');
    const customColorsControls = document.getElementById('customColorsControls');
    const bgColorInput = document.getElementById('bgColor');
    const textColorInput = document.getElementById('textColor');
    const accentColorInput = document.getElementById('accentColor');

    // Sidebar 3-Tab Elements
    const tabElementsBtn = document.getElementById('tabElementsBtn');
    const tabSectionsBtn = document.getElementById('tabSectionsBtn');
    const tabStylingBtn = document.getElementById('tabStylingBtn');
    const paneElements = document.getElementById('paneElements');
    const paneSections = document.getElementById('paneSections');
    const paneStyling = document.getElementById('paneStyling');
    const tabContentBtn = document.getElementById('tabContentBtn');
    const paneContent = document.getElementById('paneContent');
    const tabSectionsCount = document.getElementById('tabSectionsCount');

    // Creative Elements Sidebar Catalog Elements
    const elementsSearchInput = document.getElementById('elementsSearchInput');
    const clearElementsSearchBtn = document.getElementById('clearElementsSearchBtn');
    const elementsCategoryPills = document.getElementById('elementsCategoryPills');
    const elementsCardsGrid = document.getElementById('elementsCardsGrid');
    const elementsTotalCount = document.getElementById('elementsTotalCount');
    const elementsViewVisualBtn = document.getElementById('elementsViewVisualBtn');
    const elementsViewCompactBtn = document.getElementById('elementsViewCompactBtn');
    const elementsTargetBanner = document.getElementById('elementsTargetBanner');
    const elementsTargetSectionName = document.getElementById('elementsTargetSectionName');
    const elementsScopeToggle = document.querySelector('.elements-scope-toggle');
    const similarChip = document.getElementById('similarChip');
    const similarChipText = document.getElementById('similarChipText');

    // Elements Sidebar State
    let elementsCategory = 'all';
    let elementsSearch = '';
    let elementsScope = 'all'; // 'all' | 'widgets' | 'sections'
    const catalogSearch = window.CatalogSearch || require('./scripts/catalog-search.js');
    const catalogLib = catalogSearch.createLibraryStore((() => {
      try { return window.localStorage; } catch (_) { return { getItem: () => null, setItem: () => {} }; }
    })());
    const elementsFilters = { mood: '', industry: '', weight: '', showDrafts: false };
    let elementsQuick = null; // null | 'favourites' | 'recents'
    let elementsSimilarTo = null; // slug of the component results should resemble
    let elementsVisualMode = true; // true = visual with live previews
    let activeTargetSectionId = null;

    // Styling Tab Elements
    const themePresetCards = document.getElementById('themePresetCards');
    const sidebarBgColor = document.getElementById('sidebarBgColor');
    const sidebarTextColor = document.getElementById('sidebarTextColor');
    const sidebarAccentColor = document.getElementById('sidebarAccentColor');

    // Canvas Context Menu & Freeform Element Edit Toolbar Elements
    const canvasContextMenu = document.getElementById('canvasContextMenu');
    const elementEditToolbar = document.getElementById('elementEditToolbar');

    // Toolbar Table Fields

    // Toolbar Card Fields

    // Toolbar Button Fields

    // Toolbar Image Fields

    // Toolbar Badge Fields

    // Drawer state

    // =========================================================================
    // History Stack Engine (Undo / Redo) & Continuous LocalStorage Persistence
    // =========================================================================
    const MAX_HISTORY = 50;
    const STORAGE_KEY = 'web_builder_state_v2';
    let historyStack = [];
    let historyIndex = -1;
    let isApplyingHistory = false;
    let currentViewport = 'desktop';
    let autoSaveTimer = null;
    let builderExtras = null; // client projects, page settings, content editor (scripts/builder-extras.js)

    function updateHistoryUI() {
      const currentUndoBtn = document.getElementById('undoBtn') || undoBtn;
      const currentRedoBtn = document.getElementById('redoBtn') || redoBtn;
      if (currentUndoBtn) {
        currentUndoBtn.disabled = historyIndex <= 0;
      }
      if (currentRedoBtn) {
        currentRedoBtn.disabled = historyIndex >= historyStack.length - 1;
      }
    }

    /** The persisted shape of the page: what autosave, history snapshots and client projects store. */
    function serializeState() {
      const st = stackManager.getState();
      return {
        stack: stackManager.getStack(),
        theme: st.theme || 'midnight-dark',
        customColors: { ...(st.customColors || {}) },
        page: { ...st.page },
        viewport: currentViewport
      };
    }

    /** Replaces the whole page (used when switching client projects) and records it in history. */
    function applyState(snapshot) {
      applyHistoryState(snapshot);
      pushHistorySnapshot();
      saveStateToStorage();
    }

    function saveStateToStorage() {
      if (typeof localStorage === 'undefined') return;
      try {
        const currentState = serializeState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
        if (builderExtras) builderExtras.onStateSaved(currentState);
      } catch (err) {
        console.warn('Failed to save builder state to localStorage:', err);
      }
    }

    function scheduleAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        saveStateToStorage();
      }, 200);
    }

    // Autosave is debounced; flush it when the tab is closed or hidden so the last 200ms of edits survive.
    function flushAutoSave() {
      if (!autoSaveTimer) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      saveStateToStorage();
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', flushAutoSave);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAutoSave(); });
      }
    }

    function pushHistorySnapshot() {
      if (isApplyingHistory) return;
      const currentSnapshot = {
        stack: JSON.parse(JSON.stringify(stackManager.getStack())),
        theme: stackManager.getState().theme || 'midnight-dark',
        customColors: { ...(stackManager.getState().customColors || {}) },
        page: { ...stackManager.getState().page },
        viewport: currentViewport
      };

      // If current state matches last snapshot, skip duplicate
      if (historyStack.length > 0 && historyIndex >= 0 && historyIndex < historyStack.length) {
        const lastSnapshot = historyStack[historyIndex];
        if (JSON.stringify(lastSnapshot) === JSON.stringify(currentSnapshot)) {
          return;
        }
      }

      // Discards future redo states
      historyStack = historyStack.slice(0, historyIndex + 1);

      // Appends snapshot, trims to MAX_HISTORY
      historyStack.push(currentSnapshot);
      if (historyStack.length > MAX_HISTORY) {
        historyStack = historyStack.slice(historyStack.length - MAX_HISTORY);
      }
      historyIndex = historyStack.length - 1;
      updateHistoryUI();
    }

    function applyHistoryState(snapshot) {
      if (!snapshot) return;
      isApplyingHistory = true;

      try {
        // Restore stack
        if (typeof stackManager.setStack === 'function') {
          stackManager.setStack(snapshot.stack || []);
        } else {
          stackManager.clearStack();
          (snapshot.stack || []).forEach(sec => {
            stackManager.insertSection(stackManager.getStack().length, sec);
          });
        }

        if (snapshot.page && typeof stackManager.setPage === 'function') stackManager.setPage(snapshot.page);

        // Restore theme & custom colors
        const theme = snapshot.theme || 'midnight-dark';
        stackManager.setTheme(theme);
        if (themePresetSelect) {
          themePresetSelect.value = theme;
        }

        const customColors = snapshot.customColors || {};
        stackManager.setCustomColors(customColors);

        if (theme === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          if (bgColorInput && customColors.bg) bgColorInput.value = customColors.bg;
          if (textColorInput && customColors.text) textColorInput.value = customColors.text;
          if (accentColorInput && customColors.accent) accentColorInput.value = customColors.accent;
          applyDynamicTheme(customColors);
        } else {
          if (customColorsControls) customColorsControls.style.display = 'none';
          if (customThemeToggle) customThemeToggle.classList.remove('is-active');
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[theme];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
        }

        // Restore viewport
        if (snapshot.viewport) {
          setViewportMode(snapshot.viewport);
        }

        // Update UI and preview frame
        renderStackList();
        updatePreview();
      } finally {
        isApplyingHistory = false;
      }
    }

    function undoAction() {
      if (historyIndex > 0) {
        historyIndex--;
        applyHistoryState(historyStack[historyIndex]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Undo');
      }
    }

    function redoAction() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        applyHistoryState(historyStack[historyIndex]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Redo');
      }
    }

    function handleHistoryKeydown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = (e.key || '').toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoAction();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redoAction();
      }
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', undoAction);
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', redoAction);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleHistoryKeydown);
    }

    // 3. Render Stack List
    function renderStackList() {
      if (!pageStackList) return;

      const stack = stackManager.getStack();
      if (stackCountBadge) {
        stackCountBadge.textContent = String(stack.length);
      }
      if (tabSectionsCount) {
        tabSectionsCount.textContent = String(stack.length);
      }

      // Remove existing item cards
      const existingCards = pageStackList.querySelectorAll('.stack-item-card');
      existingCards.forEach(card => card.remove());

      if (stack.length === 0) {
        if (stackEmptyPlaceholder) stackEmptyPlaceholder.style.display = 'flex';
        return;
      }

      if (stackEmptyPlaceholder) {
        stackEmptyPlaceholder.style.display = 'none';
      }

      // Drag and drop tracking
      let draggedId = null;

      stack.forEach((item, index) => {
        const feature = featuresMap.get(item.slug);
        const title = item.title || (feature ? (feature.title || feature.name) : item.slug);
        const category = item.category || (feature ? feature.category : 'Component');
        const sizing = item.sizing || { heightMode: 'auto', customHeight: 600, paddingY: 'none' };

        const singletonType = getSingletonType(item.slug, title, category);
        const singletonDef = singletonType ? LANDING_PAGE_SINGLETONS[singletonType] : null;
        const singletonLabel = singletonDef ? singletonDef.name : null;
        const isOptional = singletonDef && singletonDef.necessity === 'optional';
        const badgeClass = isOptional ? 'singleton-badge badge-optional' : 'singleton-badge badge-required';
        const badgeText = isOptional ? 'Need: Optional · 1 Only' : 'Need: Essential · 1 Only';

        const card = document.createElement('div');
        card.className = 'stack-item-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-section-id', item.id);
        card.setAttribute('draggable', 'true');

        card.innerHTML = `
          <div class="stack-item-top-row">
            <div class="stack-item-main">
              <span class="stack-item-order">${index + 1}</span>
              <div class="stack-item-info">
                <div class="stack-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                <div class="stack-item-category">
                  <span>${escapeHtml(category)}</span>
                  ${singletonDef ? `<span class="${badgeClass}" title="${isOptional ? 'Optional: Use when heavy 3D or assets need loading' : 'Essential component for landing pages'}">${badgeText}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="stack-item-tools">
              ${singletonType === 'preloader' ? `
                <button type="button" class="stack-tool-btn btn-replay" title="Replay Preloader Intro Animation" aria-label="Replay preloader animation">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              ` : `
                <button type="button" class="stack-tool-btn btn-sizing" title="Adjust Sizing" aria-label="Adjust section sizing">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 3L3 21"></path>
                    <path d="M14 3h7v7"></path>
                    <path d="M10 21H3v-7"></path>
                  </svg>
                </button>
              `}
              <button type="button" class="stack-tool-btn btn-move-up" title="Move Up" aria-label="Move section up" ${index === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-move-down" title="Move Down" aria-label="Move section down" ${index === stack.length - 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-duplicate ${singletonType ? 'is-disabled' : ''}" title="${singletonType ? `Landing page can only have one ${singletonLabel}` : 'Duplicate Section'}" aria-label="Duplicate section" ${singletonType ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-remove" title="Remove Section" aria-label="Remove section">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="stack-item-sizing-drawer" style="display: none;">
            <div class="sizing-row">
              <span class="sizing-label">Height:</span>
              <div class="sizing-pills height-mode-pills">
                <button type="button" class="sizing-pill ${sizing.heightMode === 'auto' ? 'is-active' : ''}" data-mode="auto">Auto</button>
                <button type="button" class="sizing-pill ${sizing.heightMode === 'screen' ? 'is-active' : ''}" data-mode="screen">100vh</button>
                <button type="button" class="sizing-pill ${sizing.heightMode === 'custom' ? 'is-active' : ''}" data-mode="custom">Custom</button>
              </div>
            </div>
            <div class="sizing-row custom-height-row" style="${sizing.heightMode === 'custom' ? 'display:flex;' : 'display:none;'}">
              <span class="sizing-label">Height (px):</span>
              <input type="range" class="custom-height-slider" min="200" max="1400" step="20" value="${sizing.customHeight || 600}" />
              <span class="custom-height-val">${sizing.customHeight || 600}px</span>
            </div>
            <div class="sizing-row">
              <span class="sizing-label">Padding:</span>
              <div class="sizing-pills padding-pills">
                <button type="button" class="sizing-pill ${sizing.paddingY === 'none' ? 'is-active' : ''}" data-pad="none">0px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'compact' ? 'is-active' : ''}" data-pad="compact">32px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'medium' ? 'is-active' : ''}" data-pad="medium">64px</button>
                <button type="button" class="sizing-pill ${sizing.paddingY === 'large' ? 'is-active' : ''}" data-pad="large">120px</button>
              </div>
            </div>
          </div>
        `;

        // Wire Action Buttons
        const sizingBtn = card.querySelector('.btn-sizing');
        const sizingDrawer = card.querySelector('.stack-item-sizing-drawer');
        if (sizingBtn && sizingDrawer) {
          sizingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = sizingDrawer.style.display === 'none';
            sizingDrawer.style.display = isHidden ? 'flex' : 'none';
            sizingBtn.classList.toggle('is-active', isHidden);
          });
        }

        // Height Mode Pills
        const heightPills = card.querySelectorAll('.height-mode-pills .sizing-pill');
        const customHeightRow = card.querySelector('.custom-height-row');
        heightPills.forEach(pill => {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = pill.dataset.mode;
            heightPills.forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            if (customHeightRow) customHeightRow.style.display = (mode === 'custom') ? 'flex' : 'none';
            stackManager.updateSectionSizing(item.id, { heightMode: mode });
          });
        });

        // Custom Height Slider
        const slider = card.querySelector('.custom-height-slider');
        const valLabel = card.querySelector('.custom-height-val');
        if (slider && valLabel) {
          slider.addEventListener('input', (e) => {
            const val = e.target.value;
            valLabel.textContent = `${val}px`;
            try {
              const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
              const secEl = doc.getElementById(item.id);
              if (secEl) {
                secEl.style.height = `${val}px`;
                secEl.style.minHeight = `${val}px`;
                secEl.style.overflow = 'hidden';
                const contentEl = secEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
                if (contentEl) {
                  contentEl.style.flex = '1 1 auto';
                  contentEl.style.height = '100%';
                  contentEl.style.minHeight = '100%';
                  if (contentEl.firstElementChild) {
                    contentEl.firstElementChild.style.flex = '1 1 auto';
                    contentEl.firstElementChild.style.height = '100%';
                    contentEl.firstElementChild.style.minHeight = '100%';
                  }
                }
              }
            } catch (_) {}
          });
          slider.addEventListener('change', (e) => {
            stackManager.updateSectionSizing(item.id, { heightMode: 'custom', customHeight: Number(e.target.value) });
          });
        }

        // Padding Pills
        const paddingPills = card.querySelectorAll('.padding-pills .sizing-pill');
        paddingPills.forEach(pill => {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const pad = pill.dataset.pad;
            paddingPills.forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            stackManager.updateSectionSizing(item.id, { paddingY: pad });
          });
        });

        const moveUpBtn = card.querySelector('.btn-move-up');
        if (moveUpBtn) {
          moveUpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.moveSection(item.id, -1);
          });
        }

        const moveDownBtn = card.querySelector('.btn-move-down');
        if (moveDownBtn) {
          moveDownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.moveSection(item.id, 1);
          });
        }

        const replayBtn = card.querySelector('.btn-replay');
        if (replayBtn) {
          replayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast('Running preloader intro animation...');
            preloaderForceReplay = true;
            forceFullPreviewReload = true;
            updatePreview();
          });
        }

        const duplicateBtn = card.querySelector('.btn-duplicate');
        if (duplicateBtn) {
          duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (singletonType) {
              showToast(`A landing page can only have one ${singletonLabel}.`);
              return;
            }
            stackManager.duplicateSection(item.id);
            showToast(`Duplicated "${title}"`);
          });
        }

        const removeBtn = card.querySelector('.btn-remove');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.removeSection(item.id);
            showToast(`Removed "${title}"`);
          });
        }

        // Drag and drop reordering
        card.addEventListener('dragstart', (e) => {
          draggedId = item.id;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', item.id);
          card.style.opacity = '0.5';
        });

        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
          const cards = pageStackList.querySelectorAll('.stack-item-card');
          cards.forEach(c => c.classList.remove('is-drag-over'));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('is-drag-over');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('is-drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('is-drag-over');
          const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
          if (sourceId && sourceId !== item.id) {
            const currentStack = stackManager.getStack();
            const fromIndex = currentStack.findIndex(s => s.id === sourceId);
            const toIndex = currentStack.findIndex(s => s.id === item.id);
            if (fromIndex !== -1 && toIndex !== -1) {
              stackManager.reorderStack(fromIndex, toIndex);
            }
          }
        });

        // Click card to select as target section for widgets
        card.addEventListener('click', () => {
          setActiveSection(item.id);
        });

        pageStackList.appendChild(card);
      });

      updateActiveSectionUI();
    }

    // Listen for section clicks inside live preview frame
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SECTION_CLICKED' && event.data.sectionId) {
        setActiveSection(event.data.sectionId);
      }
    });

    /**
     * Propagates theme variables to the live preview iframe.
     * Uses postMessage and direct DOM property injection for instantaneous 60fps color updates without reload flicker.
     */
    function applyDynamicTheme(themeConfig) {
      const theme = (window.Assembler && typeof window.Assembler.resolveTheme === 'function')
        ? window.Assembler.resolveTheme(themeConfig)
        : themeConfig;

      if (!theme) return;

      // 1. PostMessage to iframe for dynamic zero-flicker update
      if (previewFrame && previewFrame.contentWindow) {
        try {
          previewFrame.contentWindow.postMessage({
            type: 'UPDATE_THEME',
            theme: theme
          }, '*');
        } catch (_) {}
      }

      // 2. Direct style property update on iframe documentElement if same-origin accessible
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          if (window.Assembler && typeof window.Assembler.applyThemeToDocument === 'function') {
            window.Assembler.applyThemeToDocument(doc, theme);
          } else if (doc.documentElement) {
            if (theme.bg) {
              doc.documentElement.style.setProperty('--preview-bg', theme.bg);
              doc.querySelectorAll('.page-section').forEach(s => s.style.backgroundColor = theme.bg);
            }
            if (theme.text) {
              doc.documentElement.style.setProperty('--preview-text', theme.text);
              doc.querySelectorAll('.page-section').forEach(s => s.style.color = theme.text);
            }
            if (theme.accent) doc.documentElement.style.setProperty('--preview-accent', theme.accent);
            if (theme.cardBg) doc.documentElement.style.setProperty('--preview-card-bg', theme.cardBg);
            if (theme.border) doc.documentElement.style.setProperty('--preview-border', theme.border);
          }
        }
      } catch (_) {}
    }

    // 4. Update Live Preview Iframe
    let isUpdatingPreview = false;
    let pendingPreviewUpdate = false;

    async function updatePreview() {
      if (!previewFrame) return;

      if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
        return;
      }

      const state = stackManager.getState();
      const currentStack = state.stack;

      // Identify any sections whose source files need fetching
      const missingSlugs = currentStack
        .map(item => item.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        if (isUpdatingPreview) {
          pendingPreviewUpdate = true;
          return;
        }
        isUpdatingPreview = true;
        try {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        } catch (err) {
          console.error('Error fetching feature files for preview:', err);
        } finally {
          isUpdatingPreview = false;
          if (pendingPreviewUpdate) {
            pendingPreviewUpdate = false;
            updatePreview();
            return;
          }
        }
      }

      // Re-read latest state and assemble preview document
      const latestState = stackManager.getState();
      const themeConfig = latestState.theme === 'custom' ? latestState.customColors : latestState.theme;

      // Preloader play-state tracking:
      // Requirement: Play ONCE when newly added; suppressed on subsequent section additions/modifications
      // and runs again only when user explicitly runs it via the Replay (▶) button.
      const preloaderSection = latestState.stack.find(s => {
        const slug = s.slug || '';
        const cat = s.category || '';
        return slug.includes('preloader') || cat.toLowerCase().includes('preloader');
      });

      let suppressPreloader = false;
      if (preloaderSection) {
        if (preloaderForceReplay) {
          // Explicitly triggered via Run/Replay button
          suppressPreloader = false;
          preloaderForceReplay = false;
          playedPreloaderId = preloaderSection.id;
        } else if (playedPreloaderId === preloaderSection.id) {
          // Already played: suppress on subsequent section additions/modifications
          suppressPreloader = true;
        } else {
          // Newly added preloader: play once
          suppressPreloader = false;
          playedPreloaderId = preloaderSection.id;
        }
      } else {
        playedPreloaderId = null;
        preloaderForceReplay = false;
      }

      // Only sizing and overlay elements are patched in place; anything else (sections, their
      // source, theme, preloader state) changes this key and triggers a full reload.
      // Yield so callers can set canvas.state.pendingElement right after the state change that notified us
      await Promise.resolve();
      const structureKey = JSON.stringify({
        theme: themeConfig,
        suppressPreloader,
        page: latestState.page,
        stack: latestState.stack.map(({ elements, sizing, overrides, ...rest }) => rest)
      });
      const canPatch = !forceFullPreviewReload && structureKey === lastPreviewStructureKey;
      forceFullPreviewReload = false;
      if (canPatch && patchPreviewInPlace(latestState.stack)) {
        return;
      }

      const assembledHtml = window.Assembler.assemblePreviewDocument(
        latestState.stack,
        themeConfig,
        featuresData,
        { suppressPreloader, page: latestState.page }
      );

      lastPreviewStructureKey = structureKey;
      previewFrame.srcdoc = assembledHtml;
    }

    let lastPreviewStructureKey = null;
    let forceFullPreviewReload = false;
    /**
     * Patches the loaded preview in place (see scripts/builder/preview-patch.js), then restores the
     * canvas selection on the rebuilt overlay the way the iframe load handler does.
     * Returns false when a full reload is needed instead.
     */
    function patchPreviewInPlace(stack) {
      let doc;
      try {
        doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
      } catch (_) {
        return false;
      }
      if (!(window.PreviewPatch || require('./scripts/builder/preview-patch.js')).patchPreview({ doc, win: previewFrame.contentWindow, stack, assembler: window.Assembler })) return false;

      if (canvas.state.pendingElement) {
        const el = doc.getElementById(canvas.state.pendingElement.elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          selectCanvasElement(canvas.state.pendingElement.sectionId, canvas.state.pendingElement.elementId);
          closeToolbarPopup();
        }
        canvas.state.pendingElement = null;
      } else if (canvas.state.selected) {
        const el = doc.getElementById(canvas.state.selected.elementId);
        if (el) {
          el.classList.add('is-selected');
          ensureResizeHandles(el);
          if (elementEditToolbar && elementEditToolbar.style.display !== 'none') updateToolbarPosition();
        } else {
          clearElementSelection();
        }
      }
      return true;
    }

    // Freeform canvas: overlay widgets, context menu, edit toolbar, selection (scripts/builder/canvas.js)
    const canvas = (window.BuilderCanvas || require('./scripts/builder/canvas.js')).createCanvasController({
      stackManager, previewFrame, canvasContextMenu, elementEditToolbar,
      addOrReplaceLandingSection, getActiveSection, setActiveSection,
      handleHistoryKeydown, pushHistorySnapshot
    });
    const { closeToolbarPopup, clearElementSelection, selectCanvasElement, updateToolbarPosition, ensureResizeHandles } = canvas;

    // Sidebar 3-Tab Controller
    function switchSidebarTab(tabName) {
      [tabElementsBtn, tabSectionsBtn, tabStylingBtn, tabContentBtn].forEach(btn => {
        if (btn) {
          const isActive = btn.dataset.tab === tabName;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
      });
      if (paneElements) paneElements.classList.toggle('is-active', tabName === 'elements');
      if (paneSections) paneSections.classList.toggle('is-active', tabName === 'sections');
      if (paneStyling) paneStyling.classList.toggle('is-active', tabName === 'styling');
      if (paneContent) paneContent.classList.toggle('is-active', tabName === 'content');
      if (builderExtras && tabName === 'content') builderExtras.onContentTabShown();
    }

    if (tabElementsBtn) tabElementsBtn.addEventListener('click', () => switchSidebarTab('elements'));
    if (tabSectionsBtn) tabSectionsBtn.addEventListener('click', () => switchSidebarTab('sections'));
    if (tabStylingBtn) tabStylingBtn.addEventListener('click', () => switchSidebarTab('styling'));
    if (tabContentBtn) tabContentBtn.addEventListener('click', () => switchSidebarTab('content'));

    // -------------------------------------------------------------
    // Active Target Section Management (for in-section widgets)
    // -------------------------------------------------------------
    function getActiveSection() {
      const stack = stackManager.getStack();
      if (!Array.isArray(stack) || stack.length === 0) return null;
      if (activeTargetSectionId) {
        const found = stack.find(s => s.id === activeTargetSectionId);
        if (found) return found;
      }
      return stack[stack.length - 1]; // Fallback to last section
    }

    function setActiveSection(id) {
      activeTargetSectionId = id;
      updateActiveSectionUI();
    }

    function updateActiveSectionUI() {
      const sec = getActiveSection();
      if (elementsTargetSectionName) {
        if (sec) {
          elementsTargetSectionName.textContent = `${sec.title || sec.slug} (${sec.id})`;
        } else {
          elementsTargetSectionName.textContent = 'None (auto-creates section)';
        }
      }
      if (pageStackList) {
        pageStackList.querySelectorAll('.stack-item-card').forEach(card => {
          const isTarget = sec && card.dataset.sectionId === sec.id;
          card.classList.toggle('is-selected-target', isTarget);
        });
      }
    }

    if (elementsTargetBanner) {
      elementsTargetBanner.addEventListener('click', () => {
        const stack = stackManager.getStack();
        if (stack.length <= 1) return;
        const cur = getActiveSection();
        const curIdx = cur ? stack.findIndex(s => s.id === cur.id) : -1;
        const nextIdx = (curIdx + 1) % stack.length;
        setActiveSection(stack[nextIdx].id);
        showToast(`Target section switched to: ${stack[nextIdx].title || stack[nextIdx].slug}`);
      });
    }

    // -------------------------------------------------------------
    // View Switcher (Visual Cards with live previews vs Compact list)
    // -------------------------------------------------------------
    if (elementsViewVisualBtn && elementsViewCompactBtn) {
      elementsViewVisualBtn.addEventListener('click', () => {
        elementsVisualMode = true;
        elementsViewVisualBtn.classList.add('is-active');
        elementsViewCompactBtn.classList.remove('is-active');
        if (elementsCardsGrid) elementsCardsGrid.classList.remove('is-compact');
        renderElementsCatalog();
      });

      elementsViewCompactBtn.addEventListener('click', () => {
        elementsVisualMode = false;
        elementsViewCompactBtn.classList.add('is-active');
        elementsViewVisualBtn.classList.remove('is-active');
        if (elementsCardsGrid) elementsCardsGrid.classList.add('is-compact');
        renderElementsCatalog();
      });
    }

    // -------------------------------------------------------------
    // Scope Switcher (All vs In-Section Widgets vs Full-Row Sections)
    // -------------------------------------------------------------
    if (elementsScopeToggle) {
      const scopePills = elementsScopeToggle.querySelectorAll('.scope-pill');
      scopePills.forEach(pill => {
        pill.addEventListener('click', () => {
          scopePills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          elementsScope = pill.dataset.scope || 'all';
          renderElementsCatalog();
        });
      });
    }

    // -------------------------------------------------------------
    // Library quick filters, attribute filters, similar-to chip
    // -------------------------------------------------------------
    const quickFavBtn = document.getElementById('quickFavouritesBtn');
    const quickRecentBtn = document.getElementById('quickRecentsBtn');
    function setQuick(mode) {
      elementsQuick = elementsQuick === mode ? null : mode;
      if (quickFavBtn) { quickFavBtn.classList.toggle('is-active', elementsQuick === 'favourites'); quickFavBtn.setAttribute('aria-pressed', String(elementsQuick === 'favourites')); }
      if (quickRecentBtn) { quickRecentBtn.classList.toggle('is-active', elementsQuick === 'recents'); quickRecentBtn.setAttribute('aria-pressed', String(elementsQuick === 'recents')); }
      renderElementsCatalog();
    }
    if (quickFavBtn) quickFavBtn.addEventListener('click', () => setQuick('favourites'));
    if (quickRecentBtn) quickRecentBtn.addEventListener('click', () => setQuick('recents'));

    [['filterMood', 'mood'], ['filterIndustry', 'industry'], ['filterWeight', 'weight']].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { elementsFilters[key] = el.value; renderElementsCatalog(); });
    });
    const showDraftsCheck = document.getElementById('showDraftsCheck');
    if (showDraftsCheck) showDraftsCheck.addEventListener('change', () => { elementsFilters.showDrafts = showDraftsCheck.checked; renderElementsCatalog(); });
    const similarChipClear = document.getElementById('similarChipClear');
    if (similarChipClear) similarChipClear.addEventListener('click', () => { elementsSimilarTo = null; renderElementsCatalog(); });

    // Lazy Preview Observer for Sidebar Section Cards
    const elementsPreviewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const box = entry.target;
            const slug = box.getAttribute('data-slug');
            if (!slug) return;
            if (box.hasAttribute('data-thumb')) return; // thumbnail cards mount a live preview on hover instead
            let iframe = box.querySelector('iframe');
            if (entry.isIntersecting) {
              if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.title = slug;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                iframe.setAttribute('loading', 'lazy');
                iframe.src = `features/${slug}/index.html`;
                const placeholder = box.querySelector('.element-card-preview-placeholder');
                iframe.addEventListener('load', () => {
                  if (placeholder) placeholder.style.display = 'none';
                });
                iframe.addEventListener('error', () => {
                  if (placeholder) placeholder.innerHTML = `<span style="font-size:10px;color:#a1a1aa;">Preview unavailable</span>`;
                });
                box.appendChild(iframe);
              }
            } else if (iframe) {
              iframe.remove();
              const placeholder = box.querySelector('.element-card-preview-placeholder');
              if (placeholder) placeholder.style.display = '';
            }
          });
        }, { root: document.getElementById('elementsCatalogScroll') || null, rootMargin: '350px 0px' })
      : null;

    // -------------------------------------------------------------
    // Unified Creative Elements Catalog Render Engine
    // -------------------------------------------------------------
    function renderElementsCatalog() {
      if (!elementsCardsGrid) return;

      if (elementsPreviewObserver) {
        elementsPreviewObserver.disconnect();
      }

      updateActiveSectionUI();

      const q = elementsSearch.toLowerCase().trim();

      // Collect items matching scope
      let itemsToFilter = [];
      if (elementsScope === 'widgets') {
        itemsToFilter = WIDGET_CATALOG_ITEMS;
      } else if (elementsScope === 'sections') {
        itemsToFilter = registry;
      } else {
        itemsToFilter = [...WIDGET_CATALOG_ITEMS, ...registry];
      }

      const quickSlugs = elementsQuick === 'favourites' ? catalogLib.favourites()
        : elementsQuick === 'recents' ? catalogLib.recents() : null;
      const attrFilters = Object.assign({}, elementsFilters, quickSlugs ? { onlySlugs: quickSlugs } : {});

      let filtered = itemsToFilter.filter(item => {
        const matchesCat = item.isWidget
          ? (elementsCategory === 'all' || matchesCategory({ category: item.category }, elementsCategory))
          : matchesCategory(item, elementsCategory);
        return matchesCat && catalogSearch.matchesFilters(item, attrFilters);
      });

      const similarBase = elementsSimilarTo ? registry.find(f => f.slug === elementsSimilarTo) : null;
      if (similarBase) {
        filtered = catalogSearch.similarItems(filtered, similarBase, 24);
      } else if (q) {
        filtered = catalogSearch.searchItems(filtered, q);
      }
      if (elementsQuick === 'recents') {
        filtered.sort((x, y) => quickSlugs.indexOf(x.slug) - quickSlugs.indexOf(y.slug));
      }

      if (similarChip && similarChipText) {
        similarChip.hidden = !similarBase;
        if (similarBase) similarChipText.textContent = `Similar to ${similarBase.title || similarBase.slug}`;
      }

      if (elementsTotalCount) {
        elementsTotalCount.textContent = `${filtered.length} items`;
      }

      if (filtered.length === 0) {
        elementsCardsGrid.innerHTML = `
          <div style="padding: 36px 14px; text-align: center; color: var(--text-muted, #a1a1aa);">
            <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-main, #fafafa);">No items found</div>
            <div style="font-size: 11px; color: var(--text-dim, #71717a);">Try clearing the search, filters or switching scope/categories</div>
          </div>
        `;
        return;
      }

      elementsCardsGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'element-feature-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-slug', item.slug);
        card.setAttribute('draggable', 'true');

        const title = item.title || item.name || item.slug;
        const desc = item.desc || item.description || (item.isWidget ? 'In-section interactive widget' : 'Production-ready vault component');
        const normCat = item.isWidget ? item.category : getNormalizedCategory(item);
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

        let badgeClass = 'badge-templates';
        const catLower = normCat.toLowerCase();
        if (catLower.includes('hero')) badgeClass = 'badge-heroes';
        else if (catLower.includes('nav') || catLower.includes('header')) badgeClass = 'badge-nav';
        else if (catLower.includes('pricing') || catLower.includes('table')) badgeClass = 'badge-pricing';
        else if (catLower.includes('button') || catLower.includes('ui')) badgeClass = 'badge-buttons';
        else if (catLower.includes('footer')) badgeClass = 'badge-footers';
        else if (catLower.includes('card')) badgeClass = 'badge-cards';
        else if (catLower.includes('galleries') || catLower.includes('bento')) badgeClass = 'badge-galleries';
        else if (catLower.includes('3d') || catLower.includes('carousel')) badgeClass = 'badge-3d';
        else if (catLower.includes('scroll') || catLower.includes('parallax')) badgeClass = 'badge-scroll';
        else if (catLower.includes('audio') || catLower.includes('shader')) badgeClass = 'badge-shaders';
        else if (catLower.includes('physics') || catLower.includes('cursor')) badgeClass = 'badge-physics';

        const scopeBadgeHtml = item.isWidget
          ? '<span class="element-scope-badge scope-widget">Widget</span>'
          : '<span class="element-scope-badge scope-section">Section</span>';

        const btnLabel = item.isWidget ? '+ Add to Section' : '+ Add Section';

        // Preview box HTML: rendered widget preview for widgets, live iframe box for sections
        const previewBoxHtml = item.isWidget
          ? `<div class="element-widget-preview">${item.previewHtml || ''}</div>`
          : `
            <div class="element-card-preview-box" data-slug="${item.slug}"${item.thumb ? ` data-thumb="${escapeHtml(item.thumb)}"` : ''}>
              ${item.thumb
                ? `<img class="element-card-thumb" src="${escapeHtml(item.thumb)}" alt="" loading="lazy" decoding="async" /><span class="element-card-live-hint">Hover for live preview</span>`
                : `<div class="element-card-preview-placeholder"><div class="spinner-ring"></div><span>Live Preview</span></div>`}
            </div>
          `;

        card.innerHTML = `
          ${previewBoxHtml}
          <div class="element-card-content">
            <div class="element-card-header">
              <div style="display:flex;align-items:center;gap:6px;">
                ${scopeBadgeHtml}
                <span class="element-card-badge ${badgeClass}">${escapeHtml(normCat)}</span>
              </div>
              <div class="element-card-actions">
                <button type="button" class="element-icon-btn element-fav-btn${catalogLib.isFavourite(item.slug) ? ' is-on' : ''}" aria-pressed="${catalogLib.isFavourite(item.slug)}" aria-label="Favourite ${escapeHtml(title)}" title="Add to favourites">&#9733;</button>
                ${item.isWidget ? '' : `<button type="button" class="element-icon-btn element-similar-btn" aria-label="Find components similar to ${escapeHtml(title)}" title="Find similar">&#8776;</button>`}
              </div>
              <button type="button" class="element-add-btn" aria-label="${escapeHtml(btnLabel)}">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>${escapeHtml(btnLabel)}</span>
              </button>
            </div>
            <div class="element-card-title">${escapeHtml(title)}</div>
            <div class="element-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
            ${tags.length ? `
              <div class="element-card-tags">
                ${tags.map(t => `<span class="element-tag">#${escapeHtml(t)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;

        if (!item.isWidget) {
          const previewBox = card.querySelector('.element-card-preview-box');
          if (previewBox && previewBox.hasAttribute('data-thumb')) {
            let hoverTimer = null;
            previewBox.addEventListener('mouseenter', () => {
              hoverTimer = setTimeout(() => {
                if (previewBox.querySelector('iframe')) return;
                const iframe = document.createElement('iframe');
                iframe.title = item.slug;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                iframe.src = `features/${item.slug}/index.html`;
                previewBox.appendChild(iframe);
              }, 250);
            });
            previewBox.addEventListener('mouseleave', () => {
              clearTimeout(hoverTimer);
              const iframe = previewBox.querySelector('iframe');
              if (iframe) iframe.remove();
            });
          } else if (previewBox && elementsPreviewObserver) {
            elementsPreviewObserver.observe(previewBox);
          }
        }

        const addBtn = card.querySelector('.element-add-btn');

        const favBtn = card.querySelector('.element-fav-btn');
        if (favBtn) {
          favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const on = catalogLib.toggleFavourite(item.slug);
            favBtn.classList.toggle('is-on', on);
            favBtn.setAttribute('aria-pressed', String(on));
            if (elementsQuick === 'favourites') renderElementsCatalog();
          });
        }
        const similarBtn = card.querySelector('.element-similar-btn');
        if (similarBtn) {
          similarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elementsSimilarTo = item.slug;
            elementsScope = 'sections';
            elementsScopeToggle && elementsScopeToggle.querySelectorAll('.scope-pill').forEach(p => p.classList.toggle('is-active', p.dataset.scope === 'sections'));
            renderElementsCatalog();
            const scroller = document.getElementById('elementsCatalogScroll');
            if (scroller) scroller.scrollTop = 0;
          });
        }

        const triggerAction = () => {
          catalogLib.addRecent(item.slug);
          if (item.isWidget) {
            // Add directly into active section
            let targetSec = getActiveSection();
            if (!targetSec) {
              targetSec = stackManager.addSection('oklch-ambient-glow-hero', {
                title: 'Hero Section',
                category: 'Heroes'
              });
              setActiveSection(targetSec.id);
            }

            const newEl = stackManager.addElement(targetSec.id, item.elData);
            if (newEl) {
              canvas.state.pendingElement = { sectionId: targetSec.id, elementId: newEl.id };
              showToast(`Added ${title} into ${targetSec.title || targetSec.id}`);
            }
          } else {
            // Add as new page section row
            const res = addOrReplaceLandingSection(item.slug, {
              title: title,
              category: normCat
            });
            if (res && res.section) {
              setActiveSection(res.section.id);
              canvas.state.pendingSection = res.section.id;
            }
          }

          if (addBtn) {
            if (!addBtn.dataset.originalHtml) {
              addBtn.dataset.originalHtml = addBtn.innerHTML;
            }
            if (addBtn._restoreTimer) {
              clearTimeout(addBtn._restoreTimer);
            }
            addBtn.innerHTML = `<span>✓ Added!</span>`;
            addBtn.style.background = '#10b981';
            addBtn.style.borderColor = '#10b981';
            addBtn.style.color = '#ffffff';

            addBtn._restoreTimer = setTimeout(() => {
              if (addBtn.dataset.originalHtml) {
                addBtn.innerHTML = addBtn.dataset.originalHtml;
                delete addBtn.dataset.originalHtml;
              }
              addBtn.style.background = '';
              addBtn.style.borderColor = '';
              addBtn.style.color = '';
              addBtn._restoreTimer = null;
            }, 900);
          }
        };

        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerAction();
          });
        }

        card.addEventListener('click', () => {
          triggerAction();
        });

        card.addEventListener('dragstart', (e) => {
          const payload = {
            isWidget: !!item.isWidget,
            slug: item.slug,
            title: item.title || item.name || item.slug,
            normCat: normCat,
            elData: item.elData || null
          };
          canvas.state.dragPayload = payload;
          if (e.dataTransfer) {
            try {
              e.dataTransfer.setData('application/json', JSON.stringify(payload));
              e.dataTransfer.setData('text/plain', JSON.stringify(payload));
            } catch (_) {}
            e.dataTransfer.effectAllowed = 'copy';
          }
          card.classList.add('is-dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('is-dragging');
          canvas.state.dragPayload = null;
          try {
            const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
            if (doc) {
              doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));
              doc.querySelectorAll('.section-drop-indicator').forEach(el => el.remove());
            }
          } catch (_) {}
        });

        fragment.appendChild(card);
      });

      elementsCardsGrid.appendChild(fragment);
    }

    // Elements Sidebar Search & Filters
    if (elementsSearchInput) {
      elementsSearchInput.addEventListener('input', () => {
        elementsSearch = elementsSearchInput.value;
        if (clearElementsSearchBtn) {
          clearElementsSearchBtn.style.display = elementsSearch.length ? 'inline-flex' : 'none';
        }
        renderElementsCatalog();
      });
    }

    if (clearElementsSearchBtn) {
      clearElementsSearchBtn.addEventListener('click', () => {
        if (elementsSearchInput) elementsSearchInput.value = '';
        elementsSearch = '';
        clearElementsSearchBtn.style.display = 'none';
        renderElementsCatalog();
      });
    }

    if (elementsCategoryPills) {
      const pills = elementsCategoryPills.querySelectorAll('.elements-cat-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          elementsCategory = pill.dataset.category || 'all';
          renderElementsCatalog();
        });
      });
    }

    // Styling Tab Theme Preset & Color Handling
    if (themePresetCards) {
      themePresetCards.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-card-btn');
        if (!btn) return;
        const theme = btn.dataset.theme;
        themePresetCards.querySelectorAll('.theme-card-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        if (themePresetSelect) themePresetSelect.value = theme;
        stackManager.setTheme(theme);
        const name = btn.querySelector('.theme-name') ? btn.querySelector('.theme-name').textContent : theme;
        showToast(`Theme changed to ${name}`);
      });
    }

    function syncColorsFromSidebar(colors) {
      if (colors.bg && bgColorInput) bgColorInput.value = colors.bg;
      if (colors.text && textColorInput) textColorInput.value = colors.text;
      if (colors.accent && accentColorInput) accentColorInput.value = colors.accent;
      stackManager.setCustomColors(colors);
      if (stackManager.getState().theme !== 'custom') {
        stackManager.setTheme('custom');
        if (themePresetSelect) themePresetSelect.value = 'custom';
        if (themePresetCards) themePresetCards.querySelectorAll('.theme-card-btn').forEach(b => b.classList.remove('is-active'));
      }
    }

    if (sidebarBgColor) sidebarBgColor.addEventListener('input', (e) => syncColorsFromSidebar({ bg: e.target.value }));
    if (sidebarTextColor) sidebarTextColor.addEventListener('input', (e) => syncColorsFromSidebar({ text: e.target.value }));
    if (sidebarAccentColor) sidebarAccentColor.addEventListener('input', (e) => syncColorsFromSidebar({ accent: e.target.value }));

    // Subscribe to stack changes
    stackManager.subscribe(() => {
      renderStackList();
      updatePreview();
      if (!isApplyingHistory) {
        pushHistorySnapshot();
        scheduleAutoSave();
      }
    });

    // Clear Stack Action
    if (clearStackBtn) {
      clearStackBtn.addEventListener('click', () => {
        if (stackManager.getStack().length > 0) {
          stackManager.clearStack();
          showToast('Cleared all sections from page stack');
        }
      });
    }

    // Complete High-Converting Landing Page Architecture (10 Sections)
    // Structure: 1 Header (top) -> 1 Hero -> Social Proof Marquee -> Features -> Showcase -> Testimonials -> Pricing -> FAQ -> Final CTA -> 1 Footer (bottom)
    const STARTER_SECTIONS = [
      { slug: 'responsive-burger-menu', title: 'Morphing Burger & Staggered Overlay Menu', category: 'Headers & Nav' },
      { slug: 'oklch-ambient-glow-hero', title: 'OKLCH Ambient Aurora Hero', category: 'Heroes' },
      { slug: 'client-logo-marquee', title: 'Infinite Dual-Direction Partner Logo Marquee', category: 'Galleries & Bento' },
      { slug: 'ink-orbit-features', title: 'Ink Orbit Features & Benefits', category: 'Interactions & Physics' },
      { slug: 'polaroid-string-carousel', title: 'Polaroid Sagging String & Breeze Physics Carousel', category: '3D & Carousels' },
      { slug: 'stagger-testimonials', title: 'Staggered Customer Testimonials', category: 'Cards & Tiles' },
      { slug: 'ink-orbit-pricing', title: 'Interactive Tiered Pricing Matrix', category: 'Pricing & Tables' },
      { slug: 'faq-accordion-smooth', title: 'Editorial Smooth-Height FAQ Accordion', category: 'Buttons & UI' },
      { slug: 'postmark-cta', title: 'Postmark High-Conversion Final CTA', category: 'Buttons & UI' },
      { slug: 'beam-wordmark-footer', title: 'Beam Wordmark Footer', category: 'Footers & Endings' }
    ];

    function loadStarterTemplate(silent = false) {
      const prevApplying = isApplyingHistory;
      isApplyingHistory = true;
      stackManager.clearStack();
      STARTER_SECTIONS.forEach(item => {
        stackManager.addSection(item.slug, {
          title: item.title,
          category: item.category
        });
      });
      isApplyingHistory = prevApplying;
      pushHistorySnapshot();
      saveStateToStorage();
      if (!silent) {
        showToast('Loaded complete 10-section landing page template');
      }
    }

    if (loadStarterBtn) {
      loadStarterBtn.addEventListener('click', () => {
        loadStarterTemplate();
      });
    }

    if (resetCanvasBtn) {
      resetCanvasBtn.addEventListener('click', () => {
        const confirmed = typeof window.confirm === 'function'
          ? window.confirm('Reset canvas to starter template? Any unsaved changes will be replaced.')
          : true;
        if (confirmed) {
          loadStarterTemplate(false);
        }
      });
    }

    // 5. Component drawer (scripts/builder/drawer.js)
    const drawer = (window.BuilderDrawer || require('./scripts/builder/drawer.js')).createDrawerController({
      LANDING_PAGE_SINGLETONS, addOrReplaceLandingSection, catalogSearch, elementsFilters, featuresMap,
      findExistingSingleton, getSingletonType, registry, setActiveSection
    });
    const { openDrawer, renderDrawerFeatures } = drawer;

    // 6. Viewport Controls
    function setViewportMode(mode) {
      currentViewport = mode;
      stackManager.setViewport(mode);
      if (viewportStage) {
        viewportStage.setAttribute('data-active-viewport', mode);
      }

      const frameWrapper = document.getElementById('viewportFrameWrapper');
      if (frameWrapper) {
        frameWrapper.classList.remove('is-desktop', 'is-tablet', 'is-mobile');
        frameWrapper.classList.add(`is-${mode}`);
      }

      const buttons = [
        { el: viewportDesktopBtn, mode: 'desktop', label: 'Desktop (100%)' },
        { el: viewportTabletBtn, mode: 'tablet', label: 'Tablet (768px)' },
        { el: viewportMobileBtn, mode: 'mobile', label: 'Mobile (375px)' }
      ];

      buttons.forEach(b => {
        if (b.el) {
          if (b.mode === mode) {
            b.el.classList.add('is-active');
            b.el.setAttribute('aria-pressed', 'true');
            if (viewportDimensionLabel) viewportDimensionLabel.textContent = b.label;
          } else {
            b.el.classList.remove('is-active');
            b.el.setAttribute('aria-pressed', 'false');
          }
        }
      });
    }

    if (viewportDesktopBtn) {
      viewportDesktopBtn.addEventListener('click', () => setViewportMode('desktop'));
    }
    if (viewportTabletBtn) {
      viewportTabletBtn.addEventListener('click', () => setViewportMode('tablet'));
    }
    if (viewportMobileBtn) {
      viewportMobileBtn.addEventListener('click', () => setViewportMode('mobile'));
    }

    // 7. Theme Controls
    if (themePresetSelect) {
      themePresetSelect.addEventListener('change', (e) => {
        const themeKey = e.target.value;
        if (themeKey === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          const customColors = {
            bg: bgColorInput ? bgColorInput.value : '#0b0f19',
            text: textColorInput ? textColorInput.value : '#f3f4f6',
            accent: accentColorInput ? accentColorInput.value : '#6366f1'
          };
          applyDynamicTheme(customColors);
          if (stackManager.getState().theme !== 'custom') {
            stackManager.setTheme('custom');
          }
          stackManager.setCustomColors(customColors);
        } else {
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[themeKey];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
          stackManager.setTheme(themeKey);
        }
      });
    }

    if (customThemeToggle) {
      customThemeToggle.addEventListener('click', () => {
        if (customColorsControls) {
          const isShown = customColorsControls.style.display !== 'none';
          customColorsControls.style.display = isShown ? 'none' : 'inline-flex';
          customThemeToggle.classList.toggle('is-active', !isShown);
        }
      });
    }

    let themeDebounceTimer = null;

    function handleCustomColorInput() {
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      // Immediately propagate theme variables to iframe in real time via postMessage/DOM
      applyDynamicTheme(colors);

      // Debounce updating state and srcdoc to prevent lag during rapid slider dragging
      clearTimeout(themeDebounceTimer);
      themeDebounceTimer = setTimeout(() => {
        if (stackManager.getState().theme !== 'custom') {
          stackManager.setTheme('custom');
        }
        stackManager.setCustomColors(colors);
      }, 120);
    }

    function handleCustomColorChange() {
      clearTimeout(themeDebounceTimer);
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      applyDynamicTheme(colors);

      // Consolidate updates: set theme only if needed, setCustomColors triggers notify() once
      if (stackManager.getState().theme !== 'custom') {
        stackManager.setTheme('custom');
      }
      stackManager.setCustomColors(colors);
    }

    if (bgColorInput) {
      bgColorInput.addEventListener('input', handleCustomColorInput);
      bgColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (textColorInput) {
      textColorInput.addEventListener('input', handleCustomColorInput);
      textColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (accentColorInput) {
      accentColorInput.addEventListener('input', handleCustomColorInput);
      accentColorInput.addEventListener('change', handleCustomColorChange);
    }

    // 8. Open in New Tab Action
    const openInTabBtn = document.getElementById('openInTabBtn') || document.getElementById('openNewTabBtn');
    if (openInTabBtn) {
      openInTabBtn.addEventListener('click', async () => {
        if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
          showToast('Assembler engine not available');
          return;
        }

        const state = stackManager.getState();
        const missingSlugs = state.stack
          .map(s => s.slug)
          .filter(slug => slug && !featureCache.has(slug));

        if (missingSlugs.length > 0) {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        }

        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const fullDoc = window.Assembler.assemblePreviewDocument(state.stack, themeConfig, featuresData);

        try {
          const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const newTab = window.open(blobUrl, '_blank');
          if (newTab) {
            showToast('Opened live assembled preview in new tab');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          } else {
            showToast('Pop-up was blocked. Please allow pop-ups for this page.');
          }
        } catch (err) {
          console.error('Error opening preview in new tab:', err);
          showToast('Failed to open preview tab');
        }
      });
    }

    // 9. Export modal & project ZIP generator (scripts/builder/export-panel.js)
    const exportController = (window.BuilderExport || require('./scripts/builder/export-panel.js')).createExportController({
      stackManager, featureCache, featuresData, fetchFeatureFiles, openDrawer
    });
    const { prepareExportData, setActiveExportTab, setActiveCodeSubtab, openExportModal, closeExportModal, handleDownloadZip } = exportController;

    // Check localStorage for saved builder state
    let hasLoadedSavedState = false;
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.stack) && parsed.stack.length > 0) {
            const prevApplying = isApplyingHistory;
            isApplyingHistory = true;
            if (typeof stackManager.setStack === 'function') {
              stackManager.setStack(parsed.stack);
            } else {
              stackManager.clearStack();
              parsed.stack.forEach(sec => stackManager.insertSection(stackManager.getStack().length, sec));
            }
            if (parsed.theme) {
              stackManager.setTheme(parsed.theme);
            }
            if (parsed.customColors) {
              stackManager.setCustomColors(parsed.customColors);
            }
            if (parsed.page && typeof stackManager.setPage === 'function') {
              stackManager.setPage(parsed.page);
            }
            if (parsed.viewport) {
              setViewportMode(parsed.viewport);
            }
            isApplyingHistory = prevApplying;
            hasLoadedSavedState = true;

            // If the restored stack already contains a preloader, mark as already played
            const restoredPreloader = stackManager.getStack().find(s => {
              const slug = s.slug || '';
              const cat = s.category || '';
              return slug.includes('preloader') || cat.toLowerCase().includes('preloader');
            });
            if (restoredPreloader) {
              playedPreloaderId = restoredPreloader.id;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved builder state from localStorage:', err);
        isApplyingHistory = false;
      }
    }

    // Auto-seed starter website template on empty initial stack
    if (!hasLoadedSavedState) {
      if (!stackManager.getStack() || stackManager.getStack().length === 0) {
        loadStarterTemplate(true);
      }
    }

    // Initial sync
    const initialState = stackManager.getState();
    setViewportMode(initialState.viewport || 'desktop');
    if (themePresetSelect) {
      themePresetSelect.value = initialState.theme || 'midnight-dark';
    }
    const currentTheme = initialState.theme === 'custom'
      ? initialState.customColors
      : ((window.Assembler && window.Assembler.THEME_PRESETS && window.Assembler.THEME_PRESETS[initialState.theme]) || null);
    if (currentTheme) {
      if (bgColorInput && currentTheme.bg) bgColorInput.value = currentTheme.bg;
      if (textColorInput && currentTheme.text) textColorInput.value = currentTheme.text;
      if (accentColorInput && currentTheme.accent) accentColorInput.value = currentTheme.accent;
    }

    // Initialize history stack with baseline snapshot
    historyStack = [];
    historyIndex = -1;
    pushHistorySnapshot();

    if (typeof window !== 'undefined' && window.BuilderExtras) {
      builderExtras = window.BuilderExtras.create({
        stackManager,
        showToast,
        getRegistry: () => registry,
        serializeState,
        applyState,
        getPreviewDoc: () => {
          try { return previewFrame && (previewFrame.contentDocument || previewFrame.contentWindow.document); } catch (_) { return null; }
        },
        getActiveSection,
        setActiveSection,
        switchSidebarTab
      });
    }

    renderStackList();
    renderElementsCatalog();
    renderDrawerFeatures();
    updatePreview();

    const controller = {
      stackManager,
      featureCache,
      featuresData,
      fetchFeatureFiles,
      updatePreview,
      setViewportMode,
      applyDynamicTheme,
      openExportModal,
      closeExportModal,
      setActiveExportTab,
      setActiveCodeSubtab,
      prepareExportData,
      handleDownloadZip,
      loadStarterTemplate,
      STARTER_SECTIONS,
      renderElementsCatalog,
      getNormalizedCategory,
      matchesCategory,
      WIDGET_CATALOG_ITEMS,
      // Task 5: History Stack Engine & Persistence
      MAX_HISTORY,
      STORAGE_KEY,
      pushHistorySnapshot,
      applyHistoryState,
      undoAction,
      redoAction,
      updateHistoryUI,
      saveStateToStorage,
      serializeState,
      applyState,
      getHistoryStack: () => [...historyStack],
      getHistoryIndex: () => historyIndex
    };

    if (typeof window !== 'undefined') {
      window.builderPreview = controller;
      window.builderExport = controller;
      window.builderHistory = controller;
      window.WIDGET_CATALOG_ITEMS = WIDGET_CATALOG_ITEMS;
    }

    return controller;
  }

  // Auto-run when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBuilder);
    } else {
      initBuilder();
    }
  }

  // Export for testing or modular environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBuilder, matchesCategory, WIDGET_CATALOG_ITEMS };
  }
})();
