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
    const registry = Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY : [];

    registry.forEach(feature => {
      featuresMap.set(feature.slug, feature);
      if (feature.files) {
        featuresData[feature.slug] = {
          html: feature.files.html || '',
          css: feature.files.css || '',
          js: feature.files.js || ''
        };
      }
    });

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

    // 4. Update Live Preview Iframe
    function updatePreview() {
      if (!previewFrame) return;

      if (window.Assembler && typeof window.Assembler.assemblePreviewDocument === 'function') {
        const state = stackManager.getState();
        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const htmlDoc = window.Assembler.assemblePreviewDocument(state.stack, themeConfig, featuresData);
        previewFrame.srcdoc = htmlDoc;
      }
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

      const buttons = [
        { el: viewportDesktopBtn, mode: 'desktop', label: 'Desktop (100%)' },
        { el: viewportTabletBtn, mode: 'tablet', label: 'Tablet (768px)' },
        { el: viewportMobileBtn, mode: 'mobile', label: 'Mobile (375px)' }
      ];

      buttons.forEach(b => {
        if (b.el) {
          if (b.mode === mode) {
            b.el.classList.add('is-active');
            if (viewportDimensionLabel) viewportDimensionLabel.textContent = b.label;
          } else {
            b.el.classList.remove('is-active');
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
        const theme = e.target.value;
        if (theme === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          const customColors = {
            bg: bgColorInput ? bgColorInput.value : '#0b0f19',
            text: textColorInput ? textColorInput.value : '#f3f4f6',
            accent: accentColorInput ? accentColorInput.value : '#6366f1'
          };
          stackManager.setCustomColors(customColors);
          stackManager.setTheme('custom');
        } else {
          stackManager.setTheme(theme);
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

    function updateCustomColorsFromInputs() {
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };
      stackManager.setCustomColors(colors);
      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }
      stackManager.setTheme('custom');
    }

    if (bgColorInput) bgColorInput.addEventListener('input', updateCustomColorsFromInputs);
    if (textColorInput) textColorInput.addEventListener('input', updateCustomColorsFromInputs);
    if (accentColorInput) accentColorInput.addEventListener('input', updateCustomColorsFromInputs);

    // Initial renders
    renderStackList();
    renderDrawerFeatures();
    updatePreview();
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
