/**
 * Active-sections list: draggable cards with move, duplicate, replace, delete and preloader replay.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createStackList(ctx) {
    const {
      LANDING_PAGE_SINGLETONS, featuresMap, getSingletonType, pageStackList, previewFrame, setActiveSection,
      stackManager, updateActiveSectionUI, updatePreview, requestPreloaderReplay
    } = ctx;

    // List elements
    const stackEmptyPlaceholder = document.getElementById('stackEmptyPlaceholder');
    const stackCountBadge = document.getElementById('stackCountBadge');
    const tabSectionsCount = document.getElementById('tabSectionsCount');

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
            requestPreloaderReplay();
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

    return { renderStackList };
  }

  const api = { createStackList };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderStackList = api;
})();
