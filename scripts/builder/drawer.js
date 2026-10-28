/**
 * Component drawer: the "browse all components" side panel with search, category pills and cards.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');
  const { matchesCategory } = (typeof window !== 'undefined' && window.BuilderCategories) || require('./categories.js');

  function createDrawerController(ctx) {
    const {
      LANDING_PAGE_SINGLETONS, addOrReplaceLandingSection, addWithTemplateGuard, catalogSearch, elementsFilters, featuresMap,
      findExistingSingleton, getSingletonType, registry, setActiveSection
    } = ctx;

    // Drawer elements and state
    const openDrawerBtn = document.getElementById('openDrawerBtn');
    const emptyBrowseBtn = document.getElementById('emptyBrowseBtn');
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
    let activeCategory = 'all';
    let searchQuery = '';

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
      const byCategory = registry.filter(feature =>
        matchesCategory(feature, activeCategory) && catalogSearch.matchesFilters(feature, { showDrafts: elementsFilters.showDrafts }));
      return catalogSearch.searchItems(byCategory, searchQuery);
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

        const singletonType = getSingletonType(feature.slug, title, category);
        const singletonDef = singletonType ? LANDING_PAGE_SINGLETONS[singletonType] : null;
        const existingSingleton = singletonType ? findExistingSingleton(singletonType) : null;
        const isCurrentItem = existingSingleton && existingSingleton.slug === feature.slug;
        const singletonLabel = singletonDef ? singletonDef.name : null;
        const isOptional = singletonDef && singletonDef.necessity === 'optional';
        const addBtnText = isCurrentItem ? 'In Page' : (existingSingleton ? `Replace ${singletonLabel}` : '+ Add to Stack');
        const badgeNeed = singletonDef ? (isOptional ? ' · Optional' : ' · Essential') : '';

        card.innerHTML = `
          <div class="drawer-card-preview-box" data-slug="${escapeHtml(feature.slug)}">
            <div class="drawer-card-preview-placeholder">Live Preview</div>
          </div>
          <div class="drawer-card-body">
            <div class="drawer-card-header-row">
              <div class="drawer-card-title-group">
                <span class="drawer-card-badge">${escapeHtml(category)}${badgeNeed}</span>
                <div class="drawer-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              </div>
              <button type="button" class="drawer-add-btn" aria-label="Add ${escapeHtml(title)} to page stack">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>${addBtnText}</span>
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

        const triggerAdd = async () => {
          const res = await addWithTemplateGuard(feature.slug, {
            title: feature.title || feature.name || feature.slug,
            category: feature.category || 'Component'
          });
          if (!res) return; // a full website that the person chose not to use

          if (res && res.section) {
            setActiveSection(res.section.id);
          }

          if (addBtn) {
            if (!addBtn.dataset.originalHtml) {
              addBtn.dataset.originalHtml = addBtn.innerHTML;
            }
            if (addBtn._restoreTimer) {
              clearTimeout(addBtn._restoreTimer);
            }
            addBtn.innerHTML = res && res.replaced ? `<span>✓ Replaced!</span>` : `<span>✓ Added!</span>`;
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

    return { openDrawer, renderDrawerFeatures };
  }

  const api = { createDrawerController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderDrawer = api;
})();
