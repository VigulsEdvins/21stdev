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

  // Category matching rule: maps registry categories/tags to drawer categories
  function matchesCategory(feature, targetCategory) {
    if (!targetCategory || targetCategory === 'all') return true;
    const cat = (feature.category || '').toLowerCase();
    const slug = (feature.slug || '').toLowerCase();
    const title = (feature.title || feature.name || '').toLowerCase();
    const tags = Array.isArray(feature.tags) ? feature.tags.map(t => String(t).toLowerCase()) : [];

    if (targetCategory === 'Headers & Nav') {
      return (
        cat.includes('nav') ||
        cat.includes('header') ||
        slug.includes('nav') ||
        slug.includes('header') ||
        title.includes('nav') ||
        title.includes('header') ||
        tags.some(t => ['header', 'nav', 'navbar', 'navigation', 'menu'].includes(t))
      );
    }

    if (targetCategory === 'Heroes') {
      return (
        slug.includes('hero') ||
        title.includes('hero') ||
        cat.includes('hero') ||
        tags.some(t => ['hero', 'landing', 'banner', 'intro'].includes(t)) ||
        (cat === 'full templates' && (slug.includes('landing') || title.includes('landing')))
      );
    }

    if (targetCategory === '3D & Carousels') {
      return (
        cat.includes('3d') ||
        cat.includes('carousel') ||
        slug.includes('3d') ||
        slug.includes('carousel') ||
        tags.some(t => ['3d', 'carousel', 'slider', 'threejs', 'canvas', 'webgl'].includes(t))
      );
    }

    if (targetCategory === 'Scroll & Parallax') {
      return (
        cat.includes('scroll') ||
        cat.includes('parallax') ||
        tags.some(t => ['scroll', 'parallax', 'sticky', 'gsap', 'scrolltrigger'].includes(t))
      );
    }

    if (targetCategory === 'Galleries & Grids') {
      return (
        cat.includes('galleries') ||
        cat.includes('grids') ||
        cat.includes('cards & tiles') ||
        tags.some(t => ['gallery', 'grid', 'card', 'cards', 'portfolio', 'masonry'].includes(t))
      );
    }

    if (targetCategory === 'Buttons & UI') {
      return (
        cat.includes('button') ||
        cat.includes('form') ||
        cat.includes('modal') ||
        cat.includes('cursor') ||
        cat.includes('interaction') ||
        cat.includes('ui') ||
        tags.some(t => ['button', 'buttons', 'ui', 'input', 'modal', 'form', 'toggle', 'switch', 'cursor'].includes(t))
      );
    }

    return cat.includes(targetCategory.toLowerCase());
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

        const card = document.createElement('div');
        card.className = 'stack-item-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-section-id', item.id);
        card.setAttribute('draggable', 'true');

        card.innerHTML = `
          <div class="stack-item-main">
            <span class="stack-item-order">${index + 1}</span>
            <div class="stack-item-info">
              <div class="stack-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              <div class="stack-item-category">${escapeHtml(category)}</div>
            </div>
          </div>
          <div class="stack-item-tools">
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
        `;

        // Wire Action Buttons
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

        pageStackList.appendChild(card);
      });
    }

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
          if (theme.bg) doc.documentElement.style.setProperty('--preview-bg', theme.bg);
          if (theme.text) doc.documentElement.style.setProperty('--preview-text', theme.text);
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

    function renderDrawerFeatures() {
      if (!drawerFeatureGrid) return;

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

        card.innerHTML = `
          <div class="drawer-card-info">
            <div class="drawer-card-title">${escapeHtml(title)}</div>
            <div class="drawer-card-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</div>
          </div>
          <button type="button" class="drawer-add-btn" aria-label="Add ${escapeHtml(title)} to page stack">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Add to Stack</span>
          </button>
        `;

        const addBtn = card.querySelector('.drawer-add-btn');
        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stackManager.addSection(feature.slug, {
              title: feature.title || feature.name || feature.slug,
              category: feature.category || 'Component'
            });

            // Button feedback
            const originalText = addBtn.innerHTML;
            addBtn.innerHTML = `<span>✓ Added!</span>`;
            addBtn.style.background = '#10b981';
            addBtn.style.borderColor = '#10b981';
            addBtn.style.color = '#ffffff';

            setTimeout(() => {
              addBtn.innerHTML = originalText;
              addBtn.style.background = '';
              addBtn.style.borderColor = '';
              addBtn.style.color = '';
            }, 900);

            showToast(`Added "${title}" to page stack`);
          });
        }

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

    renderStackList();
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
      handleDownloadZip
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
