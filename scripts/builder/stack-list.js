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
      stackManager, updateActiveSectionUI, updatePreview, requestPreloaderReplay, getActiveSection
    } = ctx;
    const SECTION_CLIPBOARD_FORMAT = 'web-builder-section';
    let sectionClipboard = null;
    const openDrawers = new Set(); // sections whose sizing panel is open: a state change re-renders the list and must not close it
    const stackAnnouncer = document.getElementById('stackAnnouncer');
    function announce(text) { if (stackAnnouncer) stackAnnouncer.textContent = text; }

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

      // Many WebGL / long-animation sections on one page are slow on phones and older laptops
      const heavyNote = document.getElementById('stackHeavyNote');
      if (heavyNote) {
        const heavy = stack.filter(s => !s.hidden && ((featuresMap.get(s.slug) || {}).weight === 'heavy')).length;
        heavyNote.hidden = heavy <= 3;
        if (heavy > 3) heavyNote.textContent = `${heavy} heavy sections (WebGL or long animations). The page may feel slow on phones; consider fewer, or hide some.`;
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
        card.className = 'stack-item-card' + (item.locked ? ' is-locked' : '') + (item.hidden ? ' is-hidden-section' : '');
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-section-id', item.id);
        card.setAttribute('draggable', item.locked ? 'false' : 'true');

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
                <button type="button" class="stack-tool-btn btn-sizing ${openDrawers.has(item.id) ? 'is-active' : ''}" title="Adjust Sizing" aria-label="Adjust section sizing">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 3L3 21"></path>
                    <path d="M14 3h7v7"></path>
                    <path d="M10 21H3v-7"></path>
                  </svg>
                </button>
              `}
              <button type="button" class="stack-tool-btn btn-hide ${item.hidden ? 'is-active' : ''}" title="${item.hidden ? 'Show in preview and export' : 'Hide from preview and export'}" aria-label="${item.hidden ? 'Show section' : 'Hide section'}" aria-pressed="${item.hidden ? 'true' : 'false'}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                  ${item.hidden ? '<line x1="3" y1="3" x2="21" y2="21"></line>' : ''}
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-lock ${item.locked ? 'is-active' : ''}" title="${item.locked ? 'Unlock section' : 'Lock section (no moving, editing or removing)'}" aria-label="${item.locked ? 'Unlock section' : 'Lock section'}" aria-pressed="${item.locked ? 'true' : 'false'}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                  <path d="${item.locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'}"></path>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-copy" title="Copy section (paste it into any project)" aria-label="Copy section">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="8" y="8" width="13" height="13" rx="2"></rect>
                  <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-move-up" title="Move Up (Alt+Up)" aria-label="Move section up" ${index === 0 || item.locked ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button type="button" class="stack-tool-btn btn-move-down" title="Move Down (Alt+Down)" aria-label="Move section down" ${index === stack.length - 1 || item.locked ? 'disabled' : ''}>
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
              <button type="button" class="stack-tool-btn btn-remove" title="Remove Section" aria-label="Remove section" ${item.locked ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="stack-item-sizing-drawer" style="display: ${openDrawers.has(item.id) ? 'flex' : 'none'};">
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
              <input type="range" class="custom-height-slider" min="200" max="1400" step="20" value="${Number(sizing.customHeight) || 600}" />
              <span class="custom-height-val">${Number(sizing.customHeight) || 600}px</span>
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
            ${[['Tablet', 'paddingYTablet', 'tablet'], ['Phone', 'paddingYMobile', 'mobile']].map(([label, key, bp]) => `
            <div class="sizing-row">
              <span class="sizing-label">${label} padding:</span>
              <div class="sizing-pills bp-pad-pills" data-key="${key}">
                <button type="button" class="sizing-pill ${!sizing[key] ? 'is-active' : ''}" data-pad="" aria-label="${label} padding: same as desktop">Same</button>
                ${[['none', '0'], ['compact', '32'], ['medium', '64'], ['large', '120']].map(([v, px]) => `<button type="button" class="sizing-pill ${sizing[key] === v ? 'is-active' : ''}" data-pad="${v}" aria-label="${label} padding ${px} pixels">${px}</button>`).join('')}
              </div>
            </div>`).join('')}
            <div class="sizing-row">
              <span class="sizing-label" title="How this section treats the page theme">Colours:</span>
              <div class="sizing-pills theme-mode-pills">
                <button type="button" class="sizing-pill ${!item.themeMode ? 'is-active' : ''}" data-theme-mode="" title="What this component does by default">Default</button>
                <button type="button" class="sizing-pill ${item.themeMode === 'match' ? 'is-active' : ''}" data-theme-mode="match" title="Follow the page theme's colours">Match page</button>
                <button type="button" class="sizing-pill ${item.themeMode === 'keep' ? 'is-active' : ''}" data-theme-mode="keep" title="Keep the colours it was designed in, whatever the page theme">Keep original</button>
              </div>
            </div>
            <div class="sizing-row">
              <span class="sizing-label">Hide on:</span>
              <div class="sizing-pills hide-on-pills">
                ${[['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Phone']].map(([bp, label]) => `<button type="button" class="sizing-pill ${(item.hideOn || []).includes(bp) ? 'is-active' : ''}" data-bp="${bp}" aria-pressed="${(item.hideOn || []).includes(bp) ? 'true' : 'false'}">${label}</button>`).join('')}
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
            if (isHidden) openDrawers.add(item.id); else openDrawers.delete(item.id);
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
                const natural = window.SectionFit.measureNatural(secEl);
                const r = window.SectionFit.apply(secEl, Number(val), natural, window.SectionFit.minScaleFor(secEl.dataset.sectionSlug));
                valLabel.textContent = `${r.height}px`;
                if (r.height !== Number(val)) slider.value = r.height;
              }
            } catch (_) {}
          });
          slider.addEventListener('change', (e) => {
            let fitScale = 1;
            try {
              const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
              const secEl = doc.getElementById(item.id);
              if (secEl) fitScale = window.SectionFit.fit(Number(e.target.value), window.SectionFit.measureNatural(secEl), window.SectionFit.minScaleFor(secEl.dataset.sectionSlug)).scale;
            } catch (_) {}
            stackManager.updateSectionSizing(item.id, { heightMode: 'custom', customHeight: Number(e.target.value), fitScale });
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

        // Padding per breakpoint and "hide on" toggles
        card.querySelectorAll('.bp-pad-pills').forEach(group => {
          group.querySelectorAll('.sizing-pill').forEach(pill => pill.addEventListener('click', (e) => {
            e.stopPropagation();
            group.querySelectorAll('.sizing-pill').forEach(p => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            stackManager.updateSectionSizing(item.id, { [group.dataset.key]: pill.dataset.pad });
          }));
        });
        const themeModePills = card.querySelectorAll('.theme-mode-pills .sizing-pill');
        themeModePills.forEach(pill => pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const mode = pill.dataset.themeMode;
          themeModePills.forEach(p => p.classList.toggle('is-active', p === pill));
          // the polarity the component was designed in: from its measured brightness, else from its nativeWhen lock
          const entry = (window.FEATURE_REGISTRY || []).find(f => f.slug === item.slug) || {};
          const designed = typeof entry.luma === 'number' ? (entry.luma < 0.5 ? 'dark' : 'light') : ((entry.nativeWhen || []).includes('light') ? 'dark' : (entry.nativeWhen || []).includes('dark') ? 'light' : 'dark');
          stackManager.setSectionThemeMode(item.id, mode, designed);
        }));

        const hidePills = card.querySelectorAll('.hide-on-pills .sizing-pill');
        hidePills.forEach(pill => pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const on = pill.getAttribute('aria-pressed') !== 'true';
          pill.setAttribute('aria-pressed', String(on));
          pill.classList.toggle('is-active', on);
          const list = Array.from(hidePills).filter(p => p.getAttribute('aria-pressed') === 'true').map(p => p.dataset.bp);
          stackManager.setSectionHideOn(item.id, list);
        }));

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

        const hideBtn = card.querySelector('.btn-hide');
        if (hideBtn) hideBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          stackManager.setSectionFlag(item.id, 'hidden', !item.hidden);
          showToast(item.hidden ? `Showing "${title}"` : `Hid "${title}" from preview and export`);
        });
        const lockBtn = card.querySelector('.btn-lock');
        if (lockBtn) lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          stackManager.setSectionFlag(item.id, 'locked', !item.locked);
          showToast(item.locked ? `Unlocked "${title}"` : `Locked "${title}"`);
        });
        const copyBtn = card.querySelector('.btn-copy');
        if (copyBtn) copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copySection(item, title); });

        // Alt+Up / Alt+Down moves the section from the keyboard
        card.addEventListener('keydown', (e) => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault();
          if (item.locked) { announce(`${title} is locked`); return; }
          const delta = e.key === 'ArrowUp' ? -1 : 1;
          const to = index + delta;
          if (to < 0 || to >= stack.length) return;
          stackManager.moveSection(item.id, delta);
          announce(`${title} moved to position ${to + 1} of ${stack.length}`);
          const again = pageStackList.querySelector(`[data-section-id="${item.id}"] .btn-move-${delta < 0 ? 'up' : 'down'}`) || pageStackList.querySelector(`[data-section-id="${item.id}"] button`);
          if (again) again.focus();
        });

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

    // Copy / paste a section between projects: JSON on the clipboard, plus an in-page copy for browsers that block clipboard access
    function copySection(item, title) {
      const { id, ...rest } = item;
      delete rest.locked;
      sectionClipboard = { format: SECTION_CLIPBOARD_FORMAT, version: 1, section: JSON.parse(JSON.stringify(rest)) };
      const text = JSON.stringify(sectionClipboard);
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (_) { /* in-page copy still works */ }
      showToast(`Copied "${title}"`);
    }

    /** Checks pasted text and returns a section object, or null. Only known components with plain data are accepted. */
    function parseSectionClipboard(text) {
      let data;
      try { data = JSON.parse(text); } catch (_) { return null; }
      if (!data || data.format !== SECTION_CLIPBOARD_FORMAT || !data.section || typeof data.section.slug !== 'string') return null;
      if (!featuresMap.has(data.section.slug)) return null;
      const section = JSON.parse(JSON.stringify(data.section));
      delete section.id; delete section.locked; delete section.html; delete section.css; delete section.js;
      return section;
    }

    async function pasteSection() {
      let section = sectionClipboard ? parseSectionClipboard(JSON.stringify(sectionClipboard)) : null;
      if (!section) {
        try { section = parseSectionClipboard(await navigator.clipboard.readText()); } catch (_) { section = null; }
      }
      if (!section) { showToast('Nothing to paste. Copy a section first.'); return; }
      const stack = stackManager.getStack();
      const active = typeof getActiveSection === 'function' ? getActiveSection() : null;
      const at = active ? stack.findIndex(s => s.id === active.id || s.id === active) + 1 : stack.length;
      const added = stackManager.insertSection(at > 0 ? at : stack.length, section);
      if (added) { setActiveSection(added.id); showToast('Pasted section'); }
    }
    const pasteBtn = document.getElementById('pasteSectionBtn');
    if (pasteBtn) pasteBtn.addEventListener('click', pasteSection);

    // Listen for section clicks inside live preview frame
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SECTION_CLICKED' && event.data.sectionId) {
        setActiveSection(event.data.sectionId);
      }
    });

    return { renderStackList, parseSectionClipboard };
  }

  const api = { createStackList };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderStackList = api;
})();
