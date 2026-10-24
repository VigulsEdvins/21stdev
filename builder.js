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

    // Components that keep their own palette under some page themes (meta.json "nativeWhen")
    const nativeMap = {};
    const licenseMap = {};
    registry.forEach(feature => {
      if (Array.isArray(feature.nativeWhen) && feature.nativeWhen.length) nativeMap[feature.slug] = feature.nativeWhen;
      if (feature.origin && feature.origin.license) licenseMap[feature.slug] = feature.origin.license;
    });

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

    // Creative Elements Sidebar Catalog Elements
    const elementsTargetBanner = document.getElementById('elementsTargetBanner');
    const elementsTargetSectionName = document.getElementById('elementsTargetSectionName');

    // Elements Sidebar State
    const catalogSearch = window.CatalogSearch || require('./scripts/catalog-search.js');
    const catalogLib = catalogSearch.createLibraryStore((() => {
      try { return window.localStorage; } catch (_) { return { getItem: () => null, setItem: () => {} }; }
    })());
    const elementsFilters = { mood: '', industry: '', weight: '', showDrafts: false };
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

    // History (undo/redo) and autosave (scripts/builder/history.js)
    const historyCtl = (window.BuilderHistory || require('./scripts/builder/history.js')).createHistory({
      stackManager, applyDynamicTheme, setViewportMode, updatePreview,
      renderStackList: () => renderStackList(), // defined further down, so resolved at call time
      themePresetSelect, customColorsControls, customThemeToggle, bgColorInput, textColorInput, accentColorInput,
      undoBtn, redoBtn
    });
    const {
      MAX_HISTORY, STORAGE_KEY, updateHistoryUI, serializeState, applyState, saveStateToStorage,
      scheduleAutoSave, pushHistorySnapshot, applyHistoryState, undoAction, redoAction, handleHistoryKeydown
    } = historyCtl;


    // 3. Active sections list (scripts/builder/stack-list.js)
    const stackListController = (window.BuilderStackList || require('./scripts/builder/stack-list.js')).createStackList({
      LANDING_PAGE_SINGLETONS, featuresMap, getSingletonType, pageStackList, previewFrame, setActiveSection,
      stackManager, updateActiveSectionUI, updatePreview,
      requestPreloaderReplay: () => { preloaderForceReplay = true; forceFullPreviewReload = true; updatePreview(); }
    });
    const { renderStackList } = stackListController;

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
        { suppressPreloader, page: latestState.page, nativeMap }
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
      if (historyCtl.state.extras && tabName === 'content') historyCtl.state.extras.onContentTabShown();
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

    // Elements sidebar catalogue (scripts/builder/elements-catalog.js)
    const elementsCatalog = (window.BuilderElements || require('./scripts/builder/elements-catalog.js')).createElementsCatalog({
      addOrReplaceLandingSection, canvas, catalogLib, catalogSearch, elementsFilters, getActiveSection,
      previewFrame, registry, setActiveSection, stackManager, updateActiveSectionUI
    });
    const { renderElementsCatalog } = elementsCatalog;

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
      if (!historyCtl.state.applying) {
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
      const prevApplying = historyCtl.state.applying;
      historyCtl.state.applying = true;
      stackManager.clearStack();
      STARTER_SECTIONS.forEach(item => {
        stackManager.addSection(item.slug, {
          title: item.title,
          category: item.category
        });
      });
      historyCtl.state.applying = prevApplying;
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
      historyCtl.state.viewport = mode;
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
      stackManager, featureCache, featuresData, fetchFeatureFiles, openDrawer, nativeMap, licenseMap
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
            const prevApplying = historyCtl.state.applying;
            historyCtl.state.applying = true;
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
            historyCtl.state.applying = prevApplying;
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
        historyCtl.state.applying = false;
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
    historyCtl.state.stack = [];
    historyCtl.state.index = -1;
    pushHistorySnapshot();

    if (typeof window !== 'undefined' && window.BuilderExtras) {
      historyCtl.state.extras = window.BuilderExtras.create({
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
        switchSidebarTab,
        getFavourites: () => catalogLib.favourites(),
        mergeFavourites: (list) => {
          const added = catalogLib.mergeFavourites(list);
          if (added) renderElementsCatalog();
          return added;
        }
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
      getHistoryStack: () => [...historyCtl.state.stack],
      getHistoryIndex: () => historyCtl.state.index
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
