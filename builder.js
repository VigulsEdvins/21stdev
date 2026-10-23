/**
 * Page Preview & Assemble Studio Controller (builder.js)
 * Manages active section stack, component picker drawer, theming, and preview integration.
 */

(function () {
  'use strict';

  // Helper: HTML escaping
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Helper: Toast Notifications
  function showToast(message, duration = 2200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'builder-toast';
    toast.style.cssText = `
      background: rgba(18, 18, 24, 0.95);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #fafafa;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      animation: fadeIn 0.2s ease-out;
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#a855f7" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }

  // Normalized Category Resolver
  function getNormalizedCategory(feature) {
    if (!feature) return 'Component';
    const cat = (feature.category || '').trim();
    const slug = (feature.slug || '').toLowerCase();
    const title = (feature.title || feature.name || '').toLowerCase();

    // 1. Footers & Endings
    if (slug.includes('footer') || title.includes('footer') || cat.toLowerCase().includes('footer')) {
      return 'Footers & Endings';
    }

    // 2. Pricing & Tables
    if (slug.includes('pricing') || title.includes('pricing') || slug.includes('turntable') || title.includes('turntable') || slug.includes('matrix')) {
      return 'Pricing & Tables';
    }

    // 3. Headers & Nav
    if (slug.includes('nav') || slug.includes('menu') || slug.includes('burger') || slug.includes('header') || slug.includes('lang-switcher') || cat.toLowerCase().includes('navigation')) {
      return 'Headers & Nav';
    }

    // 4. Heroes
    if (slug.includes('hero') || title.includes('hero') || cat.toLowerCase() === 'heroes') {
      return 'Heroes';
    }

    // 5. Buttons & UI
    if (cat.toLowerCase().includes('button') || slug.includes('btn') || slug.includes('button') || slug.includes('cta') || slug.includes('drawer') || slug.includes('accordion') || slug.includes('tabs')) {
      return 'Buttons & UI';
    }

    // 6. Cards & Tiles
    if (cat.toLowerCase().includes('cards') || slug.includes('card') || slug.includes('ticket') || slug.includes('testimonial')) {
      return 'Cards & Tiles';
    }

    // 7. Galleries & Bento
    if (cat.toLowerCase().includes('galleries') || cat.toLowerCase().includes('layouts') || slug.includes('bento') || slug.includes('gallery') || slug.includes('marquee') || slug.includes('showcase')) {
      return 'Galleries & Bento';
    }

    // 8. 3D & Carousels
    if (cat.toLowerCase().includes('3d') || cat.toLowerCase().includes('carousel') || slug.includes('carousel') || slug.includes('3d') || slug.includes('wheel')) {
      return '3D & Carousels';
    }

    // 9. Scroll & Parallax
    if (cat.toLowerCase().includes('scroll') || cat.toLowerCase().includes('parallax') || slug.includes('parallax') || slug.includes('scroll') || slug.includes('timeline')) {
      return 'Scroll & Parallax';
    }

    // 10. Preloaders & Shaders
    if (cat.toLowerCase().includes('preloader') || slug.includes('preloader')) {
      return 'Preloaders & Shaders';
    }

    // 11. Audio & Shaders
    if (cat.toLowerCase().includes('audio') || slug.includes('audio') || slug.includes('sound') || slug.includes('shader')) {
      return 'Audio & Shaders';
    }

    // 12. Full Templates
    if (cat.toLowerCase().includes('full') || slug.includes('template') || slug.includes('landing')) {
      return 'Full Templates';
    }

    // 13. Interactions & Physics / Cursors
    if (cat.toLowerCase().includes('physics') || cat.toLowerCase().includes('cursor') || cat.toLowerCase().includes('form')) {
      return 'Interactions & Physics';
    }

    return cat || 'Component';
  }

  // Category matching rule: maps registry categories/tags to drawer and sidebar categories
  function matchesCategory(feature, targetCategory) {
    if (!targetCategory || targetCategory === 'all') return true;
    const norm = getNormalizedCategory(feature);
    const targetNorm = targetCategory.toLowerCase().trim();
    const currentNorm = norm.toLowerCase().trim();

    if (currentNorm === targetNorm) return true;
    if ((targetNorm === 'footers' || targetNorm === 'footers & endings') && currentNorm.includes('footer')) return true;
    if ((targetNorm === 'headers & nav' || targetNorm === 'navigation & headers') && currentNorm.includes('nav')) return true;
    if ((targetNorm === 'pricing & tables' || targetNorm === 'tables & pricing') && (currentNorm.includes('pricing') || currentNorm.includes('table'))) return true;
    if (targetNorm === 'buttons & ui' && (currentNorm.includes('button') || currentNorm.includes('ui'))) return true;
    if (targetNorm === 'cards & tiles' && currentNorm.includes('card')) return true;
    if ((targetNorm === 'galleries & bento' || targetNorm === 'galleries & grids') && (currentNorm.includes('galleries') || currentNorm.includes('grid') || currentNorm.includes('bento'))) return true;
    if (targetNorm === '3d & carousels' && (currentNorm.includes('3d') || currentNorm.includes('carousel'))) return true;
    if (targetNorm === 'scroll & parallax' && (currentNorm.includes('scroll') || currentNorm.includes('parallax'))) return true;
    if (targetNorm === 'audio & shaders' && (currentNorm.includes('audio') || currentNorm.includes('shader'))) return true;
    if ((targetNorm === 'interactions & physics' || targetNorm === 'physics & cursors') && currentNorm.includes('physics')) return true;
    if ((targetNorm === 'preloaders & shaders' || targetNorm === 'preloaders') && currentNorm.includes('preloader')) return true;
    if (targetNorm === 'full templates' && currentNorm.includes('template')) return true;

    return currentNorm.includes(targetNorm);
  }

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
    const openDrawerBtn = document.getElementById('openDrawerBtn');
    const emptyBrowseBtn = document.getElementById('emptyBrowseBtn');

    // Drawer Elements
    const componentDrawer = document.getElementById('componentDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerSearchInput = document.getElementById('drawerSearchInput');
    const clearDrawerSearchBtn = document.getElementById('clearDrawerSearchBtn');
    const drawerCategories = document.getElementById('drawerCategories');
    const drawerFeatureGrid = document.getElementById('drawerFeatureGrid');
    const drawerCountBadge = document.getElementById('drawerCountBadge');
    const viewVisualBtn = document.getElementById('viewVisualBtn');
    const viewCompactBtn = document.getElementById('viewCompactBtn');

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

    // Elements Sidebar State
    let elementsCategory = 'all';
    let elementsSearch = '';
    let elementsScope = 'all'; // 'all' | 'widgets' | 'sections'
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
    const toolbarTypeBadge = document.getElementById('toolbarTypeBadge');
    const toolbarCloseBtn = document.getElementById('toolbarCloseBtn');

    // Toolbar Table Fields
    const toolbarGroupTable = document.getElementById('toolbarGroupTable');
    const toolbarTableTitle = document.getElementById('toolbarTableTitle');
    const toolbarTablePrice = document.getElementById('toolbarTablePrice');
    const toolbarTableFeatures = document.getElementById('toolbarTableFeatures');
    const toolbarTableCtaText = document.getElementById('toolbarTableCtaText');
    const toolbarTableCtaLink = document.getElementById('toolbarTableCtaLink');

    // Toolbar Card Fields
    const toolbarGroupCard = document.getElementById('toolbarGroupCard');
    const toolbarCardTitle = document.getElementById('toolbarCardTitle');
    const toolbarCardSubtitle = document.getElementById('toolbarCardSubtitle');
    const toolbarCardDesc = document.getElementById('toolbarCardDesc');
    const toolbarCardBadge = document.getElementById('toolbarCardBadge');
    const toolbarCardLinkText = document.getElementById('toolbarCardLinkText');

    // Toolbar Button Fields
    const toolbarGroupButton = document.getElementById('toolbarGroupButton');
    const toolbarBtnText = document.getElementById('toolbarBtnText');
    const toolbarBtnLink = document.getElementById('toolbarBtnLink');
    const toolbarBtnStylePills = document.getElementById('toolbarBtnStylePills');

    // Toolbar Image Fields
    const toolbarGroupImage = document.getElementById('toolbarGroupImage');
    const toolbarImgUrl = document.getElementById('toolbarImgUrl');
    const toolbarImgSizePills = document.getElementById('toolbarImgSizePills');

    // Toolbar Badge Fields
    const toolbarGroupBadge = document.getElementById('toolbarGroupBadge');
    const toolbarBadgeText = document.getElementById('toolbarBadgeText');
    const toolbarBadgeStylePills = document.getElementById('toolbarBadgeStylePills');
    const toolbarDeleteBtn = document.getElementById('toolbarDeleteBtn');

    // Drawer state
    let activeCategory = 'all';
    let searchQuery = '';

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
                <div class="stack-item-category">${escapeHtml(category)}</div>
              </div>
            </div>
            <div class="stack-item-tools">
              <button type="button" class="stack-tool-btn btn-sizing" title="Adjust Sizing" aria-label="Adjust section sizing">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 3L3 21"></path>
                  <path d="M14 3h7v7"></path>
                  <path d="M10 21H3v-7"></path>
                </svg>
              </button>
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
              <button type="button" class="stack-tool-btn btn-duplicate" title="Duplicate Section" aria-label="Duplicate section">
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

        const duplicateBtn = card.querySelector('.btn-duplicate');
        if (duplicateBtn) {
          duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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
        if (doc && doc.documentElement) {
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
      const assembledHtml = window.Assembler.assemblePreviewDocument(latestState.stack, themeConfig, featuresData);

      previewFrame.srcdoc = assembledHtml;
    }

    // ==========================================================================
    // Freeform Canvas Overlay Elements & Context Menu Controller
    // ==========================================================================
    let activeCanvasContext = null; // { sectionId, xPct, yPct }
    let selectedElementState = null; // { sectionId, elementId, type }
    let pendingSelectedElement = null; // { sectionId, elementId }
    let pendingSelectedSection = null; // sectionId

    function hideContextMenu() {
      if (canvasContextMenu) {
        canvasContextMenu.style.display = 'none';
      }
      activeCanvasContext = null;
    }

    function hideEditToolbar() {
      if (elementEditToolbar) {
        elementEditToolbar.style.display = 'none';
      }
      selectedElementState = null;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
        }
      } catch (_) {}
    }

    function updateToolbarPosition() {
      if (!selectedElementState || !elementEditToolbar || elementEditToolbar.style.display === 'none') return;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (!doc) return;
        const el = doc.getElementById(selectedElementState.elementId);
        if (!el) {
          hideEditToolbar();
          return;
        }
        const elRect = el.getBoundingClientRect();
        const frameRect = previewFrame.getBoundingClientRect();

        const left = frameRect.left + elRect.left + (elRect.width / 2) - 140;
        const top = frameRect.top + elRect.top - 200;

        const clampedLeft = Math.max(10, Math.min(window.innerWidth - 300, left));
        const clampedTop = Math.max(70, Math.min(window.innerHeight - 260, top));

        elementEditToolbar.style.left = `${clampedLeft}px`;
        elementEditToolbar.style.top = `${clampedTop}px`;
      } catch (_) {}
    }

    function openEditToolbar(sectionId, elementId) {
      const elements = stackManager.getSectionElements(sectionId);
      const elData = elements.find(e => e.id === elementId);
      if (!elData) return;

      selectedElementState = { sectionId, elementId, type: elData.type };
      if (toolbarTypeBadge) {
        toolbarTypeBadge.textContent = elData.type.toUpperCase();
      }

      if (toolbarGroupTable) toolbarGroupTable.style.display = elData.type === 'table' ? 'flex' : 'none';
      if (toolbarGroupCard) toolbarGroupCard.style.display = elData.type === 'card' ? 'flex' : 'none';
      if (toolbarGroupButton) toolbarGroupButton.style.display = elData.type === 'button' ? 'flex' : 'none';
      if (toolbarGroupImage) toolbarGroupImage.style.display = elData.type === 'image' ? 'flex' : 'none';
      if (toolbarGroupBadge) toolbarGroupBadge.style.display = elData.type === 'badge' ? 'flex' : 'none';

      if (elData.type === 'table') {
        if (toolbarTableTitle) toolbarTableTitle.value = elData.title || '';
        if (toolbarTablePrice) toolbarTablePrice.value = elData.price || '';
        if (toolbarTableFeatures) toolbarTableFeatures.value = Array.isArray(elData.features) ? elData.features.join('\n') : '';
        if (toolbarTableCtaText) toolbarTableCtaText.value = elData.ctaText || 'Get Started';
        if (toolbarTableCtaLink) toolbarTableCtaLink.value = elData.ctaLink || '#';
      } else if (elData.type === 'card') {
        if (toolbarCardTitle) toolbarCardTitle.value = elData.title || '';
        if (toolbarCardSubtitle) toolbarCardSubtitle.value = elData.subtitle || elData.author || '';
        if (toolbarCardDesc) toolbarCardDesc.value = elData.description || '';
        if (toolbarCardBadge) toolbarCardBadge.value = elData.badgeText || '';
        if (toolbarCardLinkText) toolbarCardLinkText.value = elData.ctaText || 'Learn More →';
      } else if (elData.type === 'button') {
        if (toolbarBtnText) toolbarBtnText.value = elData.text || '';
        if (toolbarBtnLink) toolbarBtnLink.value = elData.link || '#';
        if (toolbarBtnStylePills) {
          toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.style || 'solid'));
          });
        }
      } else if (elData.type === 'image') {
        if (toolbarImgUrl) toolbarImgUrl.value = elData.imageUrl || '';
        if (toolbarImgSizePills) {
          toolbarImgSizePills.querySelectorAll('.size-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.size === (elData.imageSize || 'medium'));
          });
        }
      } else if (elData.type === 'badge') {
        if (toolbarBadgeText) toolbarBadgeText.value = elData.text || '';
        if (toolbarBadgeStylePills) {
          toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.badgeStyle || elData.style || 'pulse'));
          });
        }
      }

      elementEditToolbar.style.display = 'flex';
      updateToolbarPosition();
    }

    // Toolbar Input Event Listeners
    if (toolbarCloseBtn) {
      toolbarCloseBtn.addEventListener('click', hideEditToolbar);
    }

    // Table Toolbar Inputs
    if (toolbarTableTitle) {
      toolbarTableTitle.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { title: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const titleEl = el.querySelector('.pricing-card-title');
            if (titleEl) titleEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTablePrice) {
      toolbarTablePrice.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { price: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const priceEl = el.querySelector('.pricing-card-price');
            if (priceEl) priceEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableFeatures) {
      toolbarTableFeatures.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const features = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { features }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const listEl = el.querySelector('.pricing-card-features');
            if (listEl) {
              listEl.innerHTML = features.map(f => `<li><span class="feature-check">✓</span> ${escapeHtml(f)}</li>`).join('');
            }
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaText) {
      toolbarTableCtaText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { ctaText: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaLink) {
      toolbarTableCtaLink.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { ctaLink: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.href = val;
          }
        } catch (_) {}
      });
    }

    // Card Toolbar Inputs
    if (toolbarCardTitle) {
      toolbarCardTitle.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { title: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const titleEl = el.querySelector('.feature-card-title') || el.querySelector('.testimonial-name');
            if (titleEl) titleEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardDesc) {
      toolbarCardDesc.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { description: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const descEl = el.querySelector('.feature-card-desc') || el.querySelector('.testimonial-quote');
            if (descEl) descEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardBadge) {
      toolbarCardBadge.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { badgeText: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            let badgeEl = el.querySelector('.card-badge');
            if (!badgeEl && val) {
              const header = el.querySelector('.feature-card-header');
              if (header) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'card-badge';
                header.appendChild(badgeEl);
              }
            }
            if (badgeEl) {
              badgeEl.textContent = val;
              badgeEl.style.display = val ? 'inline-block' : 'none';
            }
          }
        } catch (_) {}
      });
    }

    // Button Toolbar Inputs
    if (toolbarBtnText) {
      toolbarBtnText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link .btn-label') || el.querySelector('.canvas-btn-link');
            if (link) link.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnLink) {
      toolbarBtnLink.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { link: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link');
            if (link) link.href = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnStylePills) {
      toolbarBtnStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !selectedElementState) return;
        const style = pill.dataset.style;
        toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/btn-style-[a-z]+/g, '').trim() + ` btn-style-${style}`;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgUrl) {
      toolbarImgUrl.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { imageUrl: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const img = el.querySelector('img');
            if (img) img.src = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgSizePills) {
      toolbarImgSizePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.size-pill');
        if (!pill || !selectedElementState) return;
        const size = pill.dataset.size;
        toolbarImgSizePills.querySelectorAll('.size-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { imageSize: size }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/img-size-[a-z]+/g, '').trim() + ` img-size-${size}`;
          }
        } catch (_) {}
        updateToolbarPosition();
      });
    }

    if (toolbarBadgeText) {
      toolbarBadgeText.addEventListener('input', (e) => {
        if (!selectedElementState) return;
        const val = e.target.value;
        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            const badgeSpan = el.querySelector('.badge-text');
            if (badgeSpan) badgeSpan.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBadgeStylePills) {
      toolbarBadgeStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !selectedElementState) return;
        const style = pill.dataset.style;
        toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(selectedElementState.sectionId, selectedElementState.elementId, { badgeStyle: style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.className = el.className.replace(/badge-style-[a-z]+/g, '').trim() + ` badge-style-${style}`;
          }
        } catch (_) {}
      });
    }

    if (toolbarDeleteBtn) {
      toolbarDeleteBtn.addEventListener('click', () => {
        if (!selectedElementState) return;
        const { sectionId, elementId } = selectedElementState;
        stackManager.removeElement(sectionId, elementId);
        hideEditToolbar();
        showToast('Element removed');
      });
    }

    // Context Menu Action Listeners
    if (canvasContextMenu) {
      canvasContextMenu.addEventListener('click', (e) => {
        const itemBtn = e.target.closest('.context-menu-item');
        if (!itemBtn || !activeCanvasContext) return;
        const action = itemBtn.dataset.action;
        let elData = { x: activeCanvasContext.xPct, y: activeCanvasContext.yPct };

        if (action === 'add-table-pricing') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'pricing',
            title: 'Pro Plan',
            price: '$29/mo',
            features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'],
            ctaText: 'Get Started',
            ctaLink: '#pricing'
          };
        } else if (action === 'add-table-comparison') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'comparison',
            headers: ['Feature', 'Free', 'Pro'],
            rows: [
              ['Storage', '5 GB', '500 GB'],
              ['Bandwidth', '10 GB/mo', 'Unlimited'],
              ['Support', 'Community', '24/7 Priority']
            ]
          };
        } else if (action === 'add-card-feature') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'feature',
            title: 'Real-time Analytics',
            description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
            badgeText: 'HOT',
            ctaText: 'Learn More →',
            link: '#features'
          };
        } else if (action === 'add-card-testimonial') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'testimonial',
            author: 'Sarah Jenkins',
            role: 'VP of Product, Apex Digital',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
            description: 'This platform transformed our landing page conversion rates within 48 hours.',
            rating: 5
          };
        } else if (action === 'add-image') {
          elData = {
            ...elData,
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
            imageSize: 'medium'
          };
        } else if (action === 'add-badge') {
          elData = {
            ...elData,
            type: 'badge',
            text: 'v2.0 LIVE',
            badgeStyle: 'pulse'
          };
        } else {
          elData = {
            ...elData,
            type: 'button',
            text: 'Click Me →',
            style: 'solid'
          };
        }

        const targetSectionId = activeCanvasContext.sectionId;
        const newEl = stackManager.addElement(targetSectionId, elData);

        hideContextMenu();
        if (newEl) {
          pendingSelectedElement = { sectionId: targetSectionId, elementId: newEl.id };
          showToast(`Added ${newEl.type} to section`);
        }
      });
    }

    // Global click and window resize listeners
    window.addEventListener('click', (e) => {
      if (canvasContextMenu && !canvasContextMenu.contains(e.target)) {
        hideContextMenu();
      }
    });

    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);

    // Preview Frame load handler: wire dragging & context menu inside iframe
    if (previewFrame) {
      previewFrame.addEventListener('load', () => {
        let doc;
        try {
          doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
        } catch (_) {
          return;
        }
        if (!doc) return;

        // Auto-select and scroll to pending element (e.g. newly created widget)
        if (pendingSelectedElement) {
          const el = doc.getElementById(pendingSelectedElement.elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            doc.querySelectorAll('.canvas-element.is-selected').forEach(e => e.classList.remove('is-selected'));
            el.classList.add('is-selected');
            openEditToolbar(pendingSelectedElement.sectionId, pendingSelectedElement.elementId);
          }
          pendingSelectedElement = null;
        } else if (pendingSelectedSection) {
          const sec = doc.getElementById(pendingSelectedSection);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sec.style.transition = 'box-shadow 0.4s ease';
            sec.style.boxShadow = '0 0 0 3px #a855f7, 0 0 24px rgba(168, 85, 247, 0.5)';
            setTimeout(() => { sec.style.boxShadow = ''; }, 2000);
          }
          pendingSelectedSection = null;
        } else if (selectedElementState) {
          const el = doc.getElementById(selectedElementState.elementId);
          if (el) {
            el.classList.add('is-selected');
            updateToolbarPosition();
          } else {
            hideEditToolbar();
          }
        }

        doc.addEventListener('scroll', updateToolbarPosition, true);

        // Right-Click Context Menu inside Iframe
        doc.addEventListener('contextmenu', (e) => {
          const sectionEl = e.target.closest('.page-section');
          if (!sectionEl) return;

          e.preventDefault();
          const secRect = sectionEl.getBoundingClientRect();
          const xPct = Math.max(2, Math.min(98, ((e.clientX - secRect.left) / secRect.width) * 100));
          const yPct = Math.max(2, Math.min(98, ((e.clientY - secRect.top) / secRect.height) * 100));

          activeCanvasContext = {
            sectionId: sectionEl.id,
            xPct: Math.round(xPct * 10) / 10,
            yPct: Math.round(yPct * 10) / 10
          };

          const frameRect = previewFrame.getBoundingClientRect();
          const menuLeft = Math.min(window.innerWidth - 220, frameRect.left + e.clientX);
          const menuTop = Math.min(window.innerHeight - 180, frameRect.top + e.clientY);

          if (canvasContextMenu) {
            canvasContextMenu.style.left = `${menuLeft}px`;
            canvasContextMenu.style.top = `${menuTop}px`;
            canvasContextMenu.style.display = 'block';
          }
        });

        // Click inside iframe
        doc.addEventListener('click', (e) => {
          hideContextMenu();
          const elementEl = e.target.closest('.canvas-element');
          if (elementEl) {
            e.preventDefault();
          } else {
            hideEditToolbar();
          }
        });

        // Draggable Elements Mousedown Handler
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          const elementEl = e.target.closest('.canvas-element');
          if (!elementEl) return;

          e.preventDefault();
          const elementId = elementEl.dataset.elementId;
          const sectionEl = elementEl.closest('.page-section');
          if (!sectionEl) return;
          const sectionId = sectionEl.id;

          doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
          elementEl.classList.add('is-selected');
          openEditToolbar(sectionId, elementId);

          let isDragging = false;
          const startX = e.clientX;
          const startY = e.clientY;
          const secRect = sectionEl.getBoundingClientRect();

          const startXPct = parseFloat(elementEl.style.left) || 50;
          const startYPct = parseFloat(elementEl.style.top) || 50;
          let currentXPct = startXPct;
          let currentYPct = startYPct;

          function onMouseMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseX = (moveEvent.view === window) ? (moveEvent.clientX - frameRect.left) : moveEvent.clientX;
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;

            const deltaX = mouseX - startX;
            const deltaY = mouseY - startY;

            if (!isDragging && Math.hypot(deltaX, deltaY) > 3) {
              isDragging = true;
            }

            if (isDragging) {
              currentXPct = Math.max(2, Math.min(98, startXPct + (deltaX / secRect.width) * 100));
              currentYPct = Math.max(2, Math.min(98, startYPct + (deltaY / secRect.height) * 100));

              elementEl.style.left = `${currentXPct}%`;
              elementEl.style.top = `${currentYPct}%`;
              updateToolbarPosition();
            }
          }

          function onMouseUp() {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (isDragging) {
              stackManager.updateElement(sectionId, elementId, {
                x: Math.round(currentXPct * 10) / 10,
                y: Math.round(currentYPct * 10) / 10
              }, true);
            }
          }

          doc.addEventListener('mousemove', onMouseMove);
          doc.addEventListener('mouseup', onMouseUp);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Section Bottom Resize Handle Drag Handler
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          const handleEl = e.target.closest('.section-resize-handle');
          if (!handleEl) return;

          e.preventDefault();
          const sectionId = handleEl.dataset.resizeSection;
          const sectionEl = doc.getElementById(sectionId);
          if (!sectionEl) return;

          const startY = e.clientY;
          const initialHeight = sectionEl.getBoundingClientRect().height;
          let newHeight = initialHeight;

          // Prepare section & children for live stretching without blank gaps
          sectionEl.style.display = 'flex';
          sectionEl.style.flexDirection = 'column';
          const contentEl = sectionEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
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

          function onResizeMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;
            const deltaY = mouseY - startY;
            newHeight = Math.max(120, Math.min(2600, Math.round(initialHeight + deltaY)));
            sectionEl.style.height = `${newHeight}px`;
            sectionEl.style.minHeight = `${newHeight}px`;
            sectionEl.style.overflow = 'hidden';

            // Show live height floating tooltip inside the iframe
            let sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (!sizeTooltip) {
              sizeTooltip = doc.createElement('div');
              sizeTooltip.id = 'sectionResizeTooltip';
              sizeTooltip.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,15,22,0.92);color:#fafafa;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;font-family:monospace;border:1px solid rgba(168,85,247,0.5);box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:99999;pointer-events:none;';
              doc.body.appendChild(sizeTooltip);
            }
            sizeTooltip.textContent = `Section Height: ${newHeight}px`;
            sizeTooltip.style.display = 'block';

            updateToolbarPosition();
          }

          function onResizeUp() {
            doc.removeEventListener('mousemove', onResizeMove);
            doc.removeEventListener('mouseup', onResizeUp);
            window.removeEventListener('mousemove', onResizeMove);
            window.removeEventListener('mouseup', onResizeUp);

            const sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (sizeTooltip) sizeTooltip.style.display = 'none';

            stackManager.updateSectionSizing(sectionId, {
              heightMode: 'custom',
              customHeight: newHeight
            });
            showToast(`Section height updated: ${newHeight}px`);
          }

          doc.addEventListener('mousemove', onResizeMove);
          doc.addEventListener('mouseup', onResizeUp);
          window.addEventListener('mousemove', onResizeMove);
          window.addEventListener('mouseup', onResizeUp);
        });
      });
    }

    // Sidebar 3-Tab Controller
    function switchSidebarTab(tabName) {
      [tabElementsBtn, tabSectionsBtn, tabStylingBtn].forEach(btn => {
        if (btn) {
          const isActive = btn.dataset.tab === tabName;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
      });
      if (paneElements) paneElements.classList.toggle('is-active', tabName === 'elements');
      if (paneSections) paneSections.classList.toggle('is-active', tabName === 'sections');
      if (paneStyling) paneStyling.classList.toggle('is-active', tabName === 'styling');
    }

    if (tabElementsBtn) tabElementsBtn.addEventListener('click', () => switchSidebarTab('elements'));
    if (tabSectionsBtn) tabSectionsBtn.addEventListener('click', () => switchSidebarTab('sections'));
    if (tabStylingBtn) tabStylingBtn.addEventListener('click', () => switchSidebarTab('styling'));

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
    // 12 Insertable In-Section Widgets with Real Rendered HTML Previews
    // -------------------------------------------------------------
    const WIDGET_CATALOG_ITEMS = [
      {
        id: 'btn-neon',
        slug: 'btn-neon',
        type: 'button',
        isWidget: true,
        title: 'Neon Glow Button',
        desc: 'Cyberpunk animated neon glow button with glowing aura',
        category: 'Buttons & UI',
        tags: ['button', 'neon', 'glow', 'cyberpunk', 'cta'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-neon"><span>Launch Terminal ⚡</span></div></div>',
        elData: { type: 'button', text: 'Launch Terminal ⚡', style: 'neon', link: '#' }
      },
      {
        id: 'btn-glass',
        slug: 'btn-glass',
        type: 'button',
        isWidget: true,
        title: 'Frosted Glass Button',
        desc: 'Backdrop blur with glass reflection and sleek border',
        category: 'Buttons & UI',
        tags: ['button', 'glass', 'frosted', 'minimal', 'blur'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-glass"><span>Glass Action 💎</span></div></div>',
        elData: { type: 'button', text: 'Explore Platform →', style: 'glass', link: '#' }
      },
      {
        id: 'btn-shine',
        slug: 'btn-shine',
        type: 'button',
        isWidget: true,
        title: 'Gradient Shine Button',
        desc: 'Animated gradient light sheen across vibrant background',
        category: 'Buttons & UI',
        tags: ['button', 'shine', 'gradient', 'animated', 'cta'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-shine"><span class="mini-shine-sweep"></span><span>Upgrade to Pro ✨</span></div></div>',
        elData: { type: 'button', text: 'Upgrade to Pro ✨', style: 'shine', link: '#' }
      },
      {
        id: 'btn-solid',
        slug: 'btn-solid',
        type: 'button',
        isWidget: true,
        title: 'Pill Accent Button',
        desc: 'High-contrast solid primary CTA with rounded pill shape',
        category: 'Buttons & UI',
        tags: ['button', 'pill', 'solid', 'primary', 'cta'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-solid"><span>Get Started 🟣</span></div></div>',
        elData: { type: 'button', text: 'Get Started', style: 'solid', link: '#' }
      },
      {
        id: 'btn-outline',
        slug: 'btn-outline',
        type: 'button',
        isWidget: true,
        title: 'Minimal Outline Button',
        desc: 'Clean subtle border with smooth hover background fill',
        category: 'Buttons & UI',
        tags: ['button', 'outline', 'minimal', 'border', 'cta'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-preview-btn btn-style-outline"><span>Documentation ⭕</span></div></div>',
        elData: { type: 'button', text: 'Documentation →', style: 'outline', link: '#' }
      },
      {
        id: 'table-pricing',
        slug: 'table-pricing',
        type: 'table',
        isWidget: true,
        title: 'Pricing Tier Card',
        desc: 'Floating card with price, feature checkmarks & CTA',
        category: 'Pricing & Tables',
        tags: ['table', 'pricing', 'card', 'tier', 'saas'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-pricing-card"><div class="mini-pricing-header"><span class="mini-plan-badge">PRO PLAN</span><div class="mini-pricing-val">$29<span class="mini-per">/mo</span></div></div><div class="mini-pricing-features"><div>✓ Unlimited Projects</div><div>✓ Priority Support</div></div></div></div>',
        elData: {
          type: 'table',
          tableType: 'pricing',
          title: 'Pro Plan',
          price: '$29/mo',
          features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'],
          ctaText: 'Get Started',
          ctaLink: '#pricing'
        }
      },
      {
        id: 'table-comparison',
        slug: 'table-comparison',
        type: 'table',
        isWidget: true,
        title: 'Comparison Matrix',
        desc: 'Clean feature comparison matrix table with checkmarks',
        category: 'Pricing & Tables',
        tags: ['table', 'comparison', 'matrix', 'features'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-matrix-box"><div class="mini-matrix-row mini-matrix-head"><span>Feature</span><span>Free</span><span>Pro</span></div><div class="mini-matrix-row"><span>Storage</span><span>5 GB</span><span class="mini-hl">500 GB</span></div><div class="mini-matrix-row"><span>Speed</span><span>1x</span><span class="mini-hl">10x</span></div></div></div>',
        elData: {
          type: 'table',
          tableType: 'comparison',
          headers: ['Feature', 'Free', 'Pro'],
          rows: [
            ['Storage', '5 GB', '500 GB'],
            ['Bandwidth', '10 GB/mo', 'Unlimited'],
            ['Support', 'Community', '24/7 Priority']
          ]
        }
      },
      {
        id: 'card-feature',
        slug: 'card-feature',
        type: 'card',
        isWidget: true,
        title: 'Feature Card',
        desc: 'Glassmorphic card with badge, title, desc & link',
        category: 'Cards & Tiles',
        tags: ['card', 'feature', 'glass', 'bento', 'badge'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-feature-card"><div class="mini-card-head"><span class="mini-feature-badge">HOT</span><span class="mini-card-title">Real-time Analytics</span></div><p class="mini-card-desc">Telemetry with sub-millisecond precision.</p></div></div>',
        elData: {
          type: 'card',
          cardType: 'feature',
          title: 'Real-time Analytics',
          description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
          badgeText: 'HOT',
          ctaText: 'Learn More →',
          link: '#features'
        }
      },
      {
        id: 'card-testimonial',
        slug: 'card-testimonial',
        type: 'card',
        isWidget: true,
        title: 'Testimonial Card',
        desc: 'Quote card with author avatar, rating stars & company',
        category: 'Cards & Tiles',
        tags: ['card', 'testimonial', 'review', 'quote', 'stars'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-testimonial-card"><div class="mini-stars">★★★★★</div><p class="mini-quote">"Boosted conversions by 48% within hours."</p><div class="mini-author">— Sarah J., VP Product</div></div></div>',
        elData: {
          type: 'card',
          cardType: 'testimonial',
          author: 'Sarah Jenkins',
          role: 'VP of Product, Apex Digital',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
          description: 'This platform transformed our landing page conversion rates within 48 hours.',
          rating: 5
        }
      },
      {
        id: 'badge-pulse',
        slug: 'badge-pulse',
        type: 'badge',
        isWidget: true,
        title: 'Pulse Glow Badge',
        desc: 'Live pulsing neon indicator dot with status text pill',
        category: 'Cards & Tiles',
        tags: ['badge', 'pulse', 'status', 'tag', 'live'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-badge-pulse"><span class="mini-pulse-dot"></span><span>v2.0 LIVE</span></div></div>',
        elData: {
          type: 'badge',
          text: 'v2.0 LIVE',
          badgeStyle: 'pulse'
        }
      },
      {
        id: 'badge-pill',
        slug: 'badge-pill',
        type: 'badge',
        isWidget: true,
        title: 'Metric Pill Tag',
        desc: 'Glassmorphic badge for stats, versions & highlights',
        category: 'Cards & Tiles',
        tags: ['badge', 'pill', 'metric', 'tag', 'glass'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-badge-pill"><span>+99.8% Faster</span></div></div>',
        elData: {
          type: 'badge',
          text: '+99.8% Faster',
          badgeStyle: 'pill'
        }
      },
      {
        id: 'image-custom',
        slug: 'image-custom',
        type: 'image',
        isWidget: true,
        title: 'Custom Floating Image',
        desc: 'Free-floating framed media with subtle rounded shadow',
        category: 'Cards & Tiles',
        tags: ['image', 'photo', 'media', 'custom', 'floating'],
        previewHtml: '<div class="mini-widget-preview-box"><div class="mini-image-card"><img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80" alt="Thumbnail" /></div></div>',
        elData: {
          type: 'image',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
          imageSize: 'medium'
        }
      }
    ];

    // Lazy Preview Observer for Sidebar Section Cards
    const elementsPreviewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const box = entry.target;
            const slug = box.getAttribute('data-slug');
            if (!slug) return;
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

      const filtered = itemsToFilter.filter(item => {
        // Category matching
        const matchesCat = item.isWidget
          ? (elementsCategory === 'all' || matchesCategory({ category: item.category }, elementsCategory))
          : matchesCategory(item, elementsCategory);

        if (!matchesCat) return false;
        if (!q) return true;

        const slug = (item.slug || '').toLowerCase();
        const title = (item.title || item.name || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const normCat = item.isWidget ? item.category.toLowerCase() : getNormalizedCategory(item).toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];

        return (
          slug.includes(q) ||
          title.includes(q) ||
          desc.includes(q) ||
          normCat.includes(q) ||
          tags.some(t => t.includes(q))
        );
      });

      if (elementsTotalCount) {
        elementsTotalCount.textContent = `${filtered.length} items`;
      }

      if (filtered.length === 0) {
        elementsCardsGrid.innerHTML = `
          <div style="padding: 36px 14px; text-align: center; color: var(--text-muted, #a1a1aa);">
            <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-main, #fafafa);">No items found</div>
            <div style="font-size: 11px; color: var(--text-dim, #71717a);">Try clearing search query or switching scope/categories</div>
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
            <div class="element-card-preview-box" data-slug="${item.slug}">
              <div class="element-card-preview-placeholder">
                <div class="spinner-ring"></div>
                <span>Live Preview</span>
              </div>
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

        if (!item.isWidget && elementsPreviewObserver) {
          const previewBox = card.querySelector('.element-card-preview-box');
          if (previewBox) {
            elementsPreviewObserver.observe(previewBox);
          }
        }

        const addBtn = card.querySelector('.element-add-btn');

        const triggerAction = () => {
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
              pendingSelectedElement = { sectionId: targetSec.id, elementId: newEl.id };
              showToast(`Added ${title} into ${targetSec.title || targetSec.id}`);
            }
          } else {
            // Add as new page section row
            const newSec = stackManager.addSection(item.slug, {
              title: title,
              category: normCat
            });
            setActiveSection(newSec.id);
            pendingSelectedSection = newSec.id;
            showToast(`Added section "${title}" to page stack`);
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

    // Starter Website Template (Default Presets)
    const STARTER_SECTIONS = [
      { slug: 'responsive-burger-menu', title: 'Morphing Burger & Staggered Overlay Menu', category: 'Headers & Nav' },
      { slug: 'oklch-ambient-glow-hero', title: 'OKLCH Ambient Aurora Hero', category: 'Heroes' },
      { slug: 'polaroid-string-carousel', title: 'Polaroid Sagging String & Breeze Physics Carousel', category: '3D & Carousels' },
      { slug: 'beam-wordmark-footer', title: 'Beam Wordmark Footer', category: 'Footers & Endings' }
    ];

    function loadStarterTemplate(silent = false) {
      stackManager.clearStack();
      STARTER_SECTIONS.forEach(item => {
        stackManager.addSection(item.slug, {
          title: item.title,
          category: item.category
        });
      });
      if (!silent) {
        showToast('Loaded starter website template');
      }
    }

    if (loadStarterBtn) {
      loadStarterBtn.addEventListener('click', () => {
        loadStarterTemplate();
      });
    }

    // 5. Component Drawer Controller
    function openDrawer() {
      if (!componentDrawer) return;
      componentDrawer.classList.add('is-open');
      componentDrawer.setAttribute('aria-hidden', 'false');
      if (drawerSearchInput) {
        drawerSearchInput.focus();
      }
    }

    function closeDrawer() {
      if (!componentDrawer) return;
      componentDrawer.classList.remove('is-open');
      componentDrawer.setAttribute('aria-hidden', 'true');
    }

    if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);
    if (emptyBrowseBtn) emptyBrowseBtn.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (componentDrawer && componentDrawer.classList.contains('is-open')) {
          closeDrawer();
        }
      }
    });

    // Drawer Filtering Logic
    function getFilteredFeatures() {
      const query = searchQuery.trim().toLowerCase();

      return registry.filter(feature => {
        const matchedCategory = matchesCategory(feature, activeCategory);
        if (!matchedCategory) return false;

        if (!query) return true;

        const title = (feature.title || feature.name || '').toLowerCase();
        const slug = (feature.slug || '').toLowerCase();
        const desc = (feature.description || '').toLowerCase();
        const tags = Array.isArray(feature.tags) ? feature.tags.map(t => String(t).toLowerCase()) : [];

        return (
          title.includes(query) ||
          slug.includes(query) ||
          desc.includes(query) ||
          tags.some(t => t.includes(query))
        );
      });
    }

    // Drawer live preview observer (lazy mounts iframes into visible cards)
    const drawerPreviewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const box = entry.target;
            const slug = box.getAttribute('data-slug');
            const feature = featuresMap.get(slug);
            if (!feature) return;

            let iframe = box.querySelector('iframe');
            if (entry.isIntersecting) {
              if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.title = feature.title || slug;
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
                iframe.setAttribute('loading', 'lazy');
                if (feature.files && feature.files.combined) {
                  iframe.srcdoc = feature.files.combined;
                } else {
                  iframe.src = `features/${slug}/index.html`;
                }
                const placeholder = box.querySelector('.drawer-card-preview-placeholder');
                iframe.addEventListener('load', () => {
                  if (placeholder) placeholder.style.display = 'none';
                });
                box.appendChild(iframe);
              }
            } else if (iframe) {
              iframe.remove();
              const placeholder = box.querySelector('.drawer-card-preview-placeholder');
              if (placeholder) placeholder.style.display = '';
            }
          });
        }, { rootMargin: '250px 0px' })
      : null;

    function renderDrawerFeatures() {
      if (!drawerFeatureGrid) return;

      if (drawerPreviewObserver) {
        drawerPreviewObserver.disconnect();
      }

      const filtered = getFilteredFeatures();
      if (drawerCountBadge) {
        drawerCountBadge.textContent = `${filtered.length} Blocks`;
      }

      if (filtered.length === 0) {
        drawerFeatureGrid.innerHTML = `
          <div style="padding: 40px 16px; text-align: center; color: var(--text-muted, #a1a1aa);">
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; color: var(--text-main, #fafafa);">No components found</div>
            <div style="font-size: 12px; color: var(--text-dim, #71717a);">Try clearing your search query or picking another category</div>
          </div>
        `;
        return;
      }

      drawerFeatureGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      filtered.forEach(feature => {
        const card = document.createElement('div');
        card.className = 'drawer-feature-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-slug', feature.slug);

        const title = feature.title || feature.name || feature.slug;
        const desc = feature.description || (feature.tags ? feature.tags.join(', ') : 'Ready to stack component');
        const category = feature.category || 'Component';
        const tags = Array.isArray(feature.tags) ? feature.tags.slice(0, 3) : [];

        card.innerHTML = `
          <div class="drawer-card-preview-box" data-slug="${feature.slug}">
            <div class="drawer-card-preview-placeholder">Live Preview</div>
          </div>
          <div class="drawer-card-body">
            <div class="drawer-card-header-row">
              <div class="drawer-card-title-group">
                <span class="drawer-card-badge">${escapeHtml(category)}</span>
                <div class="drawer-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              </div>
              <button type="button" class="drawer-add-btn" aria-label="Add ${escapeHtml(title)} to page stack">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>+ Add to Stack</span>
              </button>
            </div>
            <div class="drawer-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
            ${tags.length ? `
              <div class="drawer-card-footer-row">
                <div class="drawer-card-tags">
                  ${tags.map(t => `<span class="drawer-card-tag">#${escapeHtml(t)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;

        const previewBox = card.querySelector('.drawer-card-preview-box');
        if (previewBox && drawerPreviewObserver) {
          drawerPreviewObserver.observe(previewBox);
        }

        const addBtn = card.querySelector('.drawer-add-btn');

        const triggerAdd = () => {
          stackManager.addSection(feature.slug, {
            title: feature.title || feature.name || feature.slug,
            category: feature.category || 'Component'
          });

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

          showToast(`Added "${title}" to page stack`);
        };

        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerAdd();
          });
        }

        card.addEventListener('click', () => {
          triggerAdd();
        });

        fragment.appendChild(card);
      });

      drawerFeatureGrid.appendChild(fragment);
    }

    // Category Filter Buttons
    if (drawerCategories) {
      const catPills = drawerCategories.querySelectorAll('.drawer-cat-pill');
      catPills.forEach(pill => {
        pill.addEventListener('click', () => {
          catPills.forEach(p => p.classList.remove('is-active'));
          pill.classList.add('is-active');
          activeCategory = pill.getAttribute('data-category') || 'all';
          renderDrawerFeatures();
        });
      });
    }

    // Live Search Input Filtering
    if (drawerSearchInput) {
      drawerSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearDrawerSearchBtn) {
          clearDrawerSearchBtn.style.display = searchQuery ? 'inline-block' : 'none';
        }
        renderDrawerFeatures();
      });
    }

    if (clearDrawerSearchBtn) {
      clearDrawerSearchBtn.addEventListener('click', () => {
        if (drawerSearchInput) {
          drawerSearchInput.value = '';
          searchQuery = '';
          clearDrawerSearchBtn.style.display = 'none';
          drawerSearchInput.focus();
          renderDrawerFeatures();
        }
      });
    }

    // Drawer View Mode Toggle (Visual vs Compact)
    if (viewVisualBtn && viewCompactBtn && drawerFeatureGrid) {
      viewVisualBtn.addEventListener('click', () => {
        viewVisualBtn.classList.add('is-active');
        viewCompactBtn.classList.remove('is-active');
        drawerFeatureGrid.classList.remove('is-compact');
      });

      viewCompactBtn.addEventListener('click', () => {
        viewCompactBtn.classList.add('is-active');
        viewVisualBtn.classList.remove('is-active');
        drawerFeatureGrid.classList.add('is-compact');
      });
    }

    // 6. Viewport Controls
    function setViewportMode(mode) {
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

    // 9. Export Modal & Project ZIP Generator Controller
    const exportModal = document.getElementById('exportModal');
    const exportModalBackdrop = document.getElementById('exportModalBackdrop');
    const openExportModalBtn = document.getElementById('openExportModalBtn');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    const exportEmptyGuard = document.getElementById('exportEmptyGuard');
    const exportPanelsWrapper = document.getElementById('exportPanelsWrapper');
    const exportEmptyAddBtn = document.getElementById('exportEmptyAddBtn');

    // Export navigation tabs
    const tabZip = document.getElementById('tabZip');
    const tabCode = document.getElementById('tabCode');
    const tabSingleHtml = document.getElementById('tabSingleHtml');
    const panelZip = document.getElementById('panelZip');
    const panelCode = document.getElementById('panelCode');
    const panelSingleHtml = document.getElementById('panelSingleHtml');

    // Code viewer elements
    const exportCodeViewer = document.getElementById('exportCodeViewer');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    const downloadCurrentCodeBtn = document.getElementById('downloadCurrentCodeBtn');

    // Actions
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const downloadSingleHtmlBtn = document.getElementById('downloadSingleHtmlBtn');
    const copySingleBundleBtn = document.getElementById('copySingleBundleBtn');
    const copyBundleBtnText = document.getElementById('copyBundleBtnText');

    let activeExportTab = 'zip';
    let activeCodeFile = 'index.html';
    let currentExportBundle = null;
    let currentSingleHtml = '';

    /**
     * Helper: triggers a browser file download of a Blob or text.
     */
    function triggerDownload(content, filename, mimeType = 'application/octet-stream') {
      try {
        const blob = content instanceof Blob
          ? content
          : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        console.error('Download error:', err);
        showToast('Download failed');
      }
    }

    /**
     * Helper: Copies text to clipboard with animated visual feedback.
     */
    async function copyToClipboard(text, buttonEl, labelEl, defaultLabel, successLabel = '✓ Copied!') {
      if (!text) {
        showToast('No content to copy');
        return;
      }

      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (_) {}
      }

      if (!copied && typeof document !== 'undefined') {
        try {
          const tempArea = document.createElement('textarea');
          tempArea.value = text;
          tempArea.style.position = 'fixed';
          tempArea.style.left = '-9999px';
          document.body.appendChild(tempArea);
          tempArea.focus();
          tempArea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(tempArea);
        } catch (_) {}
      }

      if (copied) {
        if (labelEl) labelEl.textContent = successLabel;
        if (buttonEl) {
          buttonEl.classList.add('is-copied');
          buttonEl.style.borderColor = '#10b981';
          buttonEl.style.color = '#10b981';
        }
        showToast('Copied to clipboard!');
        setTimeout(() => {
          if (labelEl) labelEl.textContent = defaultLabel;
          if (buttonEl) {
            buttonEl.classList.remove('is-copied');
            buttonEl.style.borderColor = '';
            buttonEl.style.color = '';
          }
        }, 1500);
      } else {
        showToast('Could not copy to clipboard');
      }
    }

    /**
     * Generates export bundle & single file bundle from current stack and theme.
     */
    async function prepareExportData() {
      const state = stackManager.getState();
      const currentStack = state.stack;

      if (!Array.isArray(currentStack) || currentStack.length === 0) {
        currentExportBundle = null;
        currentSingleHtml = '';
        return null;
      }

      // Ensure all section files are cached
      const missingSlugs = currentStack
        .map(s => s.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
      }

      const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;

      if (window.Assembler && typeof window.Assembler.generateExportBundle === 'function') {
        currentExportBundle = window.Assembler.generateExportBundle(currentStack, themeConfig, featuresData);
      }

      if (window.Assembler && typeof window.Assembler.generateSingleFileBundle === 'function') {
        currentSingleHtml = window.Assembler.generateSingleFileBundle(currentStack, themeConfig, featuresData);
      } else if (window.Assembler && typeof window.Assembler.assemblePreviewDocument === 'function') {
        currentSingleHtml = window.Assembler.assemblePreviewDocument(currentStack, themeConfig, featuresData);
      }

      return { bundle: currentExportBundle, singleHtml: currentSingleHtml };
    }

    /**
     * Updates the code viewer content and button labels based on activeCodeFile.
     */
    function updateCodeView() {
      if (!exportCodeViewer) return;

      if (!currentExportBundle && !currentSingleHtml) {
        exportCodeViewer.value = '// Stack is empty. Add sections to generate code.';
        return;
      }

      const copyLabelMap = {
        'index.html': 'Copy HTML',
        'style.css': 'Copy CSS',
        'script.js': 'Copy JS',
        'single-html': 'Copy Bundle'
      };

      if (copyBtnText) {
        copyBtnText.textContent = copyLabelMap[activeCodeFile] || 'Copy Code';
      }

      if (downloadCurrentCodeBtn) {
        downloadCurrentCodeBtn.style.display = activeCodeFile === 'single-html' ? 'inline-flex' : 'none';
      }

      if (activeCodeFile === 'single-html') {
        exportCodeViewer.value = currentSingleHtml || '';
      } else if (currentExportBundle && currentExportBundle[activeCodeFile] !== undefined) {
        exportCodeViewer.value = currentExportBundle[activeCodeFile] || '';
      } else {
        exportCodeViewer.value = '';
      }
    }

    /**
     * Switches the active export modal tab (zip, code, single-html).
     */
    async function setActiveExportTab(tabName) {
      activeExportTab = tabName;

      const tabs = [
        { el: tabZip, panel: panelZip, name: 'zip' },
        { el: tabCode, panel: panelCode, name: 'code' },
        { el: tabSingleHtml, panel: panelSingleHtml, name: 'single-html' }
      ];

      tabs.forEach(t => {
        if (!t.el) return;
        const isActive = t.name === tabName;
        t.el.classList.toggle('is-active', isActive);
        t.el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (t.panel) {
          t.panel.style.display = isActive ? 'block' : 'none';
          t.panel.classList.toggle('is-active', isActive);
        }
      });

      if (tabName === 'code' || tabName === 'single-html') {
        if (!currentExportBundle) {
          await prepareExportData();
        }
        if (tabName === 'code') {
          updateCodeView();
        }
      }
    }

    /**
     * Switches code file subtab (index.html, style.css, script.js, single-html).
     */
    function setActiveCodeSubtab(fileKey) {
      activeCodeFile = fileKey;

      const subtabButtons = document.querySelectorAll('.code-subtabs .subtab-btn');
      subtabButtons.forEach(btn => {
        const key = btn.getAttribute('data-code-file');
        btn.classList.toggle('is-active', key === fileKey);
      });

      updateCodeView();
    }

    /**
     * Opens the Export Modal with zero-section guard check.
     */
    async function openExportModal() {
      if (!exportModal) return;

      const stack = stackManager.getStack();
      const isEmpty = !Array.isArray(stack) || stack.length === 0;

      if (isEmpty) {
        showToast('Please add at least one section before exporting.');
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'flex';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'none';
      } else {
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'none';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'block';
        await prepareExportData();
        updateCodeView();
      }

      exportModal.classList.add('is-open');
      exportModal.setAttribute('aria-hidden', 'false');
    }

    function closeExportModal() {
      if (!exportModal) return;
      exportModal.classList.remove('is-open');
      exportModal.setAttribute('aria-hidden', 'true');
    }

    // Modal Triggers
    if (openExportModalBtn) {
      openExportModalBtn.addEventListener('click', openExportModal);
    }
    if (closeExportModalBtn) {
      closeExportModalBtn.addEventListener('click', closeExportModal);
    }
    if (exportModalBackdrop) {
      exportModalBackdrop.addEventListener('click', closeExportModal);
    }
    if (exportEmptyAddBtn) {
      exportEmptyAddBtn.addEventListener('click', () => {
        closeExportModal();
        openDrawer();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (exportModal && exportModal.classList.contains('is-open')) {
          closeExportModal();
        }
      }
    });

    // Tab buttons wiring
    if (tabZip) tabZip.addEventListener('click', () => setActiveExportTab('zip'));
    if (tabCode) tabCode.addEventListener('click', () => setActiveExportTab('code'));
    if (tabSingleHtml) tabSingleHtml.addEventListener('click', () => setActiveExportTab('single-html'));

    // Code subtabs wiring
    const codeSubtabs = document.querySelectorAll('.code-subtabs .subtab-btn');
    codeSubtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const fileKey = btn.getAttribute('data-code-file');
        if (fileKey) setActiveCodeSubtab(fileKey);
      });
    });

    // Copy Code Button (on code subtabs panel)
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const text = exportCodeViewer ? exportCodeViewer.value : '';
        const labelMap = {
          'index.html': 'Copy HTML',
          'style.css': 'Copy CSS',
          'script.js': 'Copy JS',
          'single-html': 'Copy Bundle'
        };
        const defaultLabel = labelMap[activeCodeFile] || 'Copy Code';
        copyToClipboard(text, copyCodeBtn, copyBtnText, defaultLabel, '✓ Copied!');
      });
    }

    // Download Current Code (on Single-File subtab)
    if (downloadCurrentCodeBtn) {
      downloadCurrentCodeBtn.addEventListener('click', () => {
        if (!currentSingleHtml) {
          showToast('No bundle to download');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    // Copy Single File Bundle Button (on panelSingleHtml)
    if (copySingleBundleBtn) {
      copySingleBundleBtn.addEventListener('click', () => {
        copyToClipboard(currentSingleHtml, copySingleBundleBtn, copyBundleBtnText, 'Copy Bundle', '✓ Copied!');
      });
    }

    // Download Single File .html Button (on panelSingleHtml)
    if (downloadSingleHtmlBtn) {
      downloadSingleHtmlBtn.addEventListener('click', async () => {
        if (!currentSingleHtml) {
          await prepareExportData();
        }
        if (!currentSingleHtml) {
          showToast('Please add sections before downloading');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    /**
     * Download Project ZIP generator.
     * Generates a clean archive with index.html, style.css, script.js, and README.md.
     * Uses window.JSZip if available, otherwise uses native pure-JS zip creator.
     */
    async function handleDownloadZip() {
      const stack = stackManager.getStack();
      if (!Array.isArray(stack) || stack.length === 0) {
        showToast('Please add at least one section before downloading ZIP.');
        return;
      }

      const originalBtnText = downloadZipBtn ? downloadZipBtn.innerHTML : '';
      if (downloadZipBtn) {
        downloadZipBtn.disabled = true;
        downloadZipBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <span>Packaging ZIP...</span>
        `;
      }

      try {
        await prepareExportData();
        if (!currentExportBundle) {
          throw new Error('Could not generate export bundle');
        }

        const zipFilename = 'my-assembled-page.zip';

        if (typeof window.JSZip !== 'undefined') {
          // 1. Client-side JSZip
          const zip = new window.JSZip();
          zip.file('index.html', currentExportBundle['index.html']);
          zip.file('style.css', currentExportBundle['style.css']);
          zip.file('script.js', currentExportBundle['script.js']);
          zip.file('README.md', currentExportBundle['README.md']);
          const blob = await zip.generateAsync({ type: 'blob' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else if (window.Assembler && typeof window.Assembler.createZipArchive === 'function') {
          // 2. Native Pure-JS ZIP Generator
          const zipBytes = window.Assembler.createZipArchive(currentExportBundle);
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else {
          throw new Error('No zip generator available');
        }

        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = `<span>✓ Downloaded!</span>`;
          downloadZipBtn.style.background = '#10b981';
        }
        showToast('Downloaded my-assembled-page.zip');

        setTimeout(() => {
          if (downloadZipBtn) {
            downloadZipBtn.innerHTML = originalBtnText;
            downloadZipBtn.style.background = '';
            downloadZipBtn.disabled = false;
          }
        }, 1500);
      } catch (err) {
        console.error('Error generating project ZIP:', err);
        showToast('Failed to generate project ZIP');
        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = originalBtnText;
          downloadZipBtn.disabled = false;
        }
      }
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', handleDownloadZip);
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

    // Auto-seed starter website template on empty initial stack
    if (!initialState.stack || initialState.stack.length === 0) {
      loadStarterTemplate(true);
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
      matchesCategory
    };

    if (typeof window !== 'undefined') {
      window.builderPreview = controller;
      window.builderExport = controller;
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
    module.exports = { initBuilder, matchesCategory };
  }
})();
