/**
 * Elements sidebar: the searchable, filterable catalogue of components and widgets with favourites, recents and "find similar".
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');
  const { getNormalizedCategory, matchesCategory } = (typeof window !== 'undefined' && window.BuilderCategories) || require('./categories.js');
  const WIDGET_CATALOG_ITEMS = (typeof window !== 'undefined' && window.WidgetCatalog) || require('./widget-catalog.js');

  function createElementsCatalog(ctx) {
    const {
      addOrReplaceLandingSection, addWithTemplateGuard, canvas, catalogLib, catalogSearch, elementsFilters, getActiveSection,
      previewFrame, registry, setActiveSection, stackManager, updateActiveSectionUI
    } = ctx;

    // Sidebar elements and state
    const elementsSearchInput = document.getElementById('elementsSearchInput');
    const clearElementsSearchBtn = document.getElementById('clearElementsSearchBtn');
    const elementsCategoryPills = document.getElementById('elementsCategoryPills');
    const elementsCardsGrid = document.getElementById('elementsCardsGrid');
    const elementsTotalCount = document.getElementById('elementsTotalCount');
    const elementsViewVisualBtn = document.getElementById('elementsViewVisualBtn');
    const elementsViewCompactBtn = document.getElementById('elementsViewCompactBtn');
    const elementsScopeToggle = document.querySelector('.elements-scope-toggle');
    const similarChip = document.getElementById('similarChip');
    const similarChipText = document.getElementById('similarChipText');
    let elementsCategory = 'all';
    let elementsSearch = '';
    let elementsScope = 'all'; // 'all' | 'widgets' | 'sections'
    let elementsQuick = null; // null | 'favourites' | 'recents'
    let elementsSimilarTo = null; // slug of the component results should resemble
    let elementsVisualMode = true; // true = visual with live previews

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

    // Section previews follow the project's theme. The committed thumbnails were shot in the default dark theme, so they
    // only stand in for it; under any other theme each visible card mounts a live preview that gets the theme applied.
    function currentTheme() {
      const st = stackManager.getState();
      return (window.Assembler && window.Assembler.resolveTheme)
        ? window.Assembler.resolveTheme(st.theme === 'custom' ? (st.customColors || {}) : (st.theme || 'midnight-dark'))
        : null;
    }
    function thumbsMatchTheme() {
      const st = stackManager.getState();
      return !st.theme || st.theme === 'midnight-dark';
    }
    function themeKey() {
      const th = currentTheme();
      return th ? [th.bg, th.text, th.accent, th.cardBg, th.border].join('|') : '';
    }
    function applyThemeToPreview(iframe) {
      const th = currentTheme();
      if (!th || !window.Assembler || !window.Assembler.applyThemeToDocument) return;
      try { window.Assembler.applyThemeToDocument(iframe.contentDocument, th); } catch (_) {}
    }

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
                  applyThemeToPreview(iframe);
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

        // a widget sits inside a section; a section is one row; a landing page is a whole page in one row;
        // a full website is a complete site (own pages and CMS) that replaces the page
        const isWebsite = !item.isWidget && normCat === 'Full Websites';
        const isLanding = !item.isWidget && normCat === 'Landing Pages';
        const scopeBadgeHtml = item.isWidget
          ? '<span class="element-scope-badge scope-widget">Widget</span>'
          : isWebsite ? '<span class="element-scope-badge scope-website">Full website</span>'
            : isLanding ? '<span class="element-scope-badge scope-landing">Landing page</span>'
              : '<span class="element-scope-badge scope-section">Section</span>';

        const btnLabel = item.isWidget ? '+ Add to Section' : isWebsite ? '+ Add Full Website' : isLanding ? '+ Add Landing Page' : '+ Add Section';

        // Preview box HTML: rendered widget preview for widgets, live iframe box for sections
        const useThumb = item.thumb && thumbsMatchTheme();
        const themeBg = (currentTheme() || {}).bg;
        const previewBoxHtml = item.isWidget
          ? `<div class="element-widget-preview">${item.previewHtml || ''}</div>`
          : `
            <div class="element-card-preview-box" data-slug="${escapeHtml(item.slug)}"${useThumb ? ` data-thumb="${escapeHtml(item.thumb)}"` : ''}${themeBg ? ` style="background:${escapeHtml(themeBg)}"` : ''}>
              ${useThumb
                ? `<img class="element-card-thumb" src="${escapeHtml(item.thumb)}" alt="" width="512" height="320" loading="lazy" decoding="async" /><span class="element-card-live-hint">Hover for live preview</span>`
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
                ${(!item.isWidget && item.origin && item.origin.license === 'unverified') ? '<span class="element-license-badge" title="The source licence of this component has not been verified. Check it before using it for a paying client.">Licence?</span>' : ''}
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
                iframe.addEventListener('load', () => applyThemeToPreview(iframe));
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

        const triggerAction = async () => {
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
            const res = await addWithTemplateGuard(item.slug, {
              title: title,
              category: normCat
            });
            if (!res) return; // a full website that the person chose not to use
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

    // A theme change restyles the cards: re-render (keeping the scroll position) so thumbnails and live previews swap.
    let lastThemeKey = themeKey();
    let lastThumbMode = thumbsMatchTheme();
    stackManager.subscribe(() => {
      const key = themeKey();
      const thumbMode = thumbsMatchTheme();
      if (key === lastThemeKey && thumbMode === lastThumbMode) return;
      lastThemeKey = key;
      lastThumbMode = thumbMode;
      const scroller = document.getElementById('elementsCatalogScroll');
      const top = scroller ? scroller.scrollTop : 0;
      renderElementsCatalog();
      if (scroller) scroller.scrollTop = top;
    });

    return { renderElementsCatalog };
  }

  const api = { createElementsCatalog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderElements = api;
})();
