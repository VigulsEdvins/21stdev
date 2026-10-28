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
    const weightMap = {};
    const exportAssets = {}; // files a component loads at run time (paths built in code), declared in meta.json "exportAssets"
    const lazyMap = {}; // heavy one-screen sections an export starts only when they are about to be seen
    const reserveMap = {}; // space a script-rendered section will fill, reserved in exports so nothing jumps
    const ownPalette = {}; // components whose own colours must not be overridden by the theme engine's heading/text rules
    registry.forEach(feature => {
      if (Array.isArray(feature.nativeWhen) && feature.nativeWhen.length) nativeMap[feature.slug] = feature.nativeWhen;
      if (feature.ownPalette) ownPalette[feature.slug] = true;
      if (feature.reserveHeight) reserveMap[feature.slug] = feature.reserveHeight;
      if (feature.lazy) lazyMap[feature.slug] = true;
      if (feature.weight) weightMap[feature.slug] = feature.weight;
      if (Array.isArray(feature.exportAssets) && feature.exportAssets.length) exportAssets[feature.slug] = feature.exportAssets;
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

    // Landing-page rules and section add/replace (scripts/builder/landing.js)
    const rt = { playedPreloaderId: null, preloaderForceReplay: false, forceFullPreviewReload: false }; // preloader and preview state shared by several modules
    const landing = (window.BuilderLanding || require('./scripts/builder/landing.js')).createLandingSections({ catalogLib, featuresMap, stackManager, rt });
    const { LANDING_PAGE_SINGLETONS, getSingletonType, findExistingSingleton, addOrReplaceLandingSection, addWithTemplateGuard } = landing;
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
      stackManager,
      applyDynamicTheme: (theme) => applyDynamicTheme(theme), // the preview module is created below, so these resolve at call time
      updatePreview: () => updatePreview(),
      setViewportMode: (mode) => setViewportMode(mode), // defined further down, so resolved at call time
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
      stackManager, updateActiveSectionUI, updatePreview: () => updatePreview(), getActiveSection,
      requestPreloaderReplay: () => { rt.preloaderForceReplay = true; rt.forceFullPreviewReload = true; updatePreview(); }
    });
    const { renderStackList } = stackListController;

    // Live preview iframe and theme push (scripts/builder/preview.js)
    const preview = (window.BuilderPreview || require('./scripts/builder/preview.js')).createPreview({
      stackManager, previewFrame, elementEditToolbar, featureCache, featuresData, fetchFeatureFiles,
      nativeMap, ownPalette, rt, getCanvas: () => canvas // the canvas controller is created right after
    });
    const { applyDynamicTheme, updatePreview } = preview;


    // Freeform canvas: overlay widgets, context menu, edit toolbar, selection (scripts/builder/canvas.js)
    const canvas = (window.BuilderCanvas || require('./scripts/builder/canvas.js')).createCanvasController({
      stackManager, previewFrame, canvasContextMenu, elementEditToolbar,
      addOrReplaceLandingSection, addWithTemplateGuard, getActiveSection, setActiveSection,
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
      addOrReplaceLandingSection, addWithTemplateGuard, canvas, catalogLib, catalogSearch, elementsFilters, getActiveSection,
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

    // One place keeps every theme control in step with the project's theme, whichever control (or undo, or a loaded
    // project) changed it: the header select and colour pickers, the Styling tab's preset cards and its palette.
    function syncThemeControls() {
      const st = stackManager.getState();
      const theme = st.theme || 'midnight-dark';
      if (themePresetSelect && themePresetSelect.value !== theme) themePresetSelect.value = theme;
      if (themePresetCards) themePresetCards.querySelectorAll('.theme-card-btn').forEach(b => b.classList.toggle('is-active', b.dataset.theme === theme));
      const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
      const colors = theme === 'custom' ? (st.customColors || {}) : (presets[theme] || {});
      // a project saved with custom colours shows the colour pickers when it is opened
      if (theme === 'custom') {
        if (customColorsControls && customColorsControls.style.display === 'none') customColorsControls.style.display = 'inline-flex';
        if (customThemeToggle) customThemeToggle.classList.add('is-active');
      }
      // the preview width buttons follow the project's viewport (loaded project, API, undo)
      const stage = document.getElementById('viewportStage');
      const vp = st.viewport;
      if (stage && ['desktop', 'tablet', 'mobile'].includes(vp) && stage.getAttribute('data-active-viewport') !== vp) {
        const btn = document.getElementById('viewport' + vp.charAt(0).toUpperCase() + vp.slice(1) + 'Btn');
        if (btn) btn.click();
      }
      [[colors.bg, bgColorInput, sidebarBgColor], [colors.text, textColorInput, sidebarTextColor], [colors.accent, accentColorInput, sidebarAccentColor]].forEach(([value, ...inputs]) => {
        if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return;
        inputs.forEach(input => { if (input && input.value.toLowerCase() !== value.toLowerCase()) input.value = value; });
      });
    }
    syncThemeControls();

    // Subscribe to stack changes
    stackManager.subscribe(() => {
      syncThemeControls();
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
      STARTER_SECTIONS.filter(item => !(window.BuilderAccess && window.BuilderAccess.locked(item.slug))).forEach(item => {
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
      LANDING_PAGE_SINGLETONS, addOrReplaceLandingSection, addWithTemplateGuard, catalogSearch, elementsFilters, featuresMap,
      findExistingSingleton, getSingletonType, registry, setActiveSection
    });
    const { openDrawer, renderDrawerFeatures } = drawer;

    // 6-8. Viewport, theme controls and open-in-tab (scripts/builder/page-controls.js)
    const pageControls = (window.BuilderPageControls || require('./scripts/builder/page-controls.js')).createPageControls({
      stackManager, applyDynamicTheme, featureCache, featuresData, fetchFeatureFiles, historyState: historyCtl.state,
      themePresetSelect, customThemeToggle, customColorsControls, bgColorInput, textColorInput, accentColorInput
    });
    const { setViewportMode } = pageControls;


    // 9. Export modal & project ZIP generator (scripts/builder/export-panel.js)
    const exportController = (window.BuilderExport || require('./scripts/builder/export-panel.js')).createExportController({
      stackManager, featureCache, featuresData, fetchFeatureFiles, openDrawer, nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, exportAssets, weightMap
    });
    const { prepareExportData, setActiveExportTab, setActiveCodeSubtab, openExportModal, closeExportModal, handleDownloadZip } = exportController;

    // Check localStorage for saved builder state
    let hasLoadedSavedState = false;
    {
      try {
        const loaded = historyCtl.autosave.load();
        if (loaded.status === 'recovered') showToast('Your last save could not be read, so the one before it was restored.', 6000);
        if (loaded.status === 'corrupt') showToast('Your saved work could not be read. A copy was kept in this browser; starting a new page.', 7000);
        // what the browser kept is cleaned the same way as an imported project: no javascript: links, no odd ids
        const parsed = loaded.state && window.ProjectSanitize ? window.ProjectSanitize.sanitizeState(loaded.state).state : loaded.state;
        {
          if (parsed && Array.isArray(parsed.stack) && (parsed.stack.length > 0 || (Array.isArray(parsed.pages) && parsed.pages.length > 1))) {
            const prevApplying = historyCtl.state.applying;
            historyCtl.state.applying = true;
            if (typeof stackManager.setStack === 'function') {
              stackManager.setStack(parsed.stack);
            } else {
              stackManager.clearStack();
              parsed.stack.forEach(sec => stackManager.insertSection(stackManager.getStack().length, sec));
            }
            if (Array.isArray(parsed.pages) && parsed.pages.length > 1 && typeof stackManager.setPages === 'function') {
              stackManager.setPages(parsed.pages, parsed.activePageId);
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
              rt.playedPreloaderId = restoredPreloader.id;
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

    if (window.BuilderPageTabs) window.BuilderPageTabs.init({ stackManager, featuresMap, showToast });
    if (window.BuilderTokenImport) window.BuilderTokenImport.init({ stackManager, showToast });
    if (window.BuilderHistoryPanel) window.BuilderHistoryPanel.init({ history: historyCtl });
    const emptyStarterBtn = document.getElementById('emptyStarterBtn');
    if (emptyStarterBtn && loadStarterBtn) emptyStarterBtn.addEventListener('click', () => loadStarterBtn.click());
    if (typeof window !== 'undefined' && window.BuilderTour) window.BuilderTour.start(document); // first visit only

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
