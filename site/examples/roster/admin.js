/**
 * edvlabs Roster — Admin Panel Controller (`admin.js`)
 *
 * Capabilities:
 * - Edit, reorder, add, and delete 5-Column Artist Gallery columns, their 4 stacked 3:4 cards, and idle-cycling media
 * - Edit Hero Tagline, SVG settings, and Scroll-Scrubbed Garamond Narrow Strapline
 * - Edit, reorder, add, and delete News Masonry Grid stories (images, videos, aspect ratios, placeholder colors)
 * - Edit Desktop & Mobile Navigation links
 * - Edit Full-Screen Parallax Footer straplines, Artist Cursor Hover Reveals (preview media + background color tint), Explore/Connect links & Copyright
 * - Undo / Redo history stack (up to 50 snapshots) with Ctrl+Z / Ctrl+Y keyboard shortcuts
 * - Visual Media Library Picker (images & MP4 videos) + Device Image Upload (compressed Data URLs) + Custom URLs
 * - Real-time synchronization with live preview iframe (Desktop, Tablet 768px, Mobile 375px)
 * - Export JSON, Validated Import JSON & Reset to Factory Defaults
 */

(function () {
  'use strict';

  const MAX_HISTORY = 50;
  let siteData = window.EDVStore.loadDraft();
  let currentTab = 'gallery';
  let activeMediaCallback = null;
  let currentMediaCat = 'All';
  let mediaSearchQuery = '';
  let toastTimeout = null;
  let debounceSaveTimer = null;

  const historyStack = [window.EDVStore.deepClone(siteData)];
  let historyIndex = 0;

  const escapeHtml = (str) => window.EDVStore.escapeHtml(str);
  const sanitizeUrl = (url, fallback, allowData) => window.EDVStore.sanitizeUrl(url, fallback, allowData);
  const sanitizeHexColor = (c, fb) => window.EDVStore.sanitizeHexColor(c, fb);

  document.addEventListener('DOMContentLoaded', () => {
    initSidebarTabs();
    initTopbarActions();
    initViewportToolbar();
    initMediaModal();
    updateCounts();
    updateHistoryButtons();
    updatePublishStatusUI();
    renderCurrentTab();

    // Sync initial draft state into preview iframe once loaded
    const iframe = document.getElementById('live-preview-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        syncPreviewIframe(siteData);
      });
    }

    window.addEventListener('edv:uploads-synced', () => {
      if (currentTab === 'media-backup') {
        const pane = document.getElementById('admin-editor-pane');
        if (pane) renderMediaBackupTab(pane);
      }
    });
  });

  /* ==========================================================================
     1. Draft State Persistence, Undo/Redo History & Explicit Publish
     ========================================================================== */
  function pushHistorySnapshot(snapshot) {
    const serialized = JSON.stringify(snapshot);
    if (historyIndex >= 0 && JSON.stringify(historyStack[historyIndex]) === serialized) {
      return;
    }
    historyStack.splice(historyIndex + 1);
    historyStack.push(window.EDVStore.deepClone(snapshot));
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex = historyStack.length - 1;
    }
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = historyIndex >= historyStack.length - 1;
  }

  function updatePublishStatusUI() {
    const isUnpublished = window.EDVStore.hasUnpublishedChanges(siteData);
    const pill = document.getElementById('sync-status-pill');
    const btnPublish = document.getElementById('btn-save-all');

    if (pill) {
      pill.textContent = isUnpublished ? 'Unpublished changes' : 'Published';
      pill.classList.toggle('is-dirty', isUnpublished);
    }
    if (btnPublish) {
      btnPublish.textContent = isUnpublished ? 'Publish Changes' : 'Published';
      btnPublish.disabled = !isUnpublished;
    }
  }

  function syncPreviewIframe(data) {
    const iframe = document.getElementById('live-preview-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.dispatchEvent(new CustomEvent('edv:data-updated', { detail: data }));
      } catch (_) {}
    }
  }

  function navigateHistory(direction) {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    const nextIdx = historyIndex + direction;
    if (nextIdx < 0 || nextIdx >= historyStack.length) return;
    historyIndex = nextIdx;
    siteData = window.EDVStore.deepClone(historyStack[historyIndex]);
    saveDraftOnly(siteData);
    updateHistoryButtons();
    renderCurrentTab();
    showToast(direction < 0 ? 'Undid last draft change' : 'Redid draft change');
  }

  const performUndo = () => navigateHistory(-1);
  const performRedo = () => navigateHistory(1);

  function saveDraftOnly(data) {
    const normalized = window.EDVStore.saveDraft(data);
    siteData = normalized;
    updateCounts();
    updatePublishStatusUI();
    syncPreviewIframe(normalized);
  }

  function publishChanges() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    pushHistorySnapshot(siteData);
    const normalized = window.EDVStore.publish(siteData);
    siteData = normalized;
    updateCounts();
    updatePublishStatusUI();
    syncPreviewIframe(normalized);
    showToast('Published! Changes are now live on the website.');
  }

  function commitChanges(toastMessage) {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    saveDraftOnly(siteData);
    pushHistorySnapshot(siteData);
    if (toastMessage) {
      showToast(`${toastMessage} (Draft — click Publish Changes to save to live site)`);
    }
  }

  function scheduleCommitChanges() {
    const pill = document.getElementById('sync-status-pill');
    if (pill) {
      pill.textContent = 'Unpublished changes';
      pill.classList.add('is-dirty');
    }
    const btnPublish = document.getElementById('btn-save-all');
    if (btnPublish) {
      btnPublish.textContent = 'Publish Changes';
      btnPublish.disabled = false;
    }
    if (debounceSaveTimer) clearTimeout(debounceSaveTimer);
    debounceSaveTimer = setTimeout(() => {
      debounceSaveTimer = null;
      saveDraftOnly(siteData);
      pushHistorySnapshot(siteData);
    }, 240);
  }

  function showToast(msg) {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  function updateCounts() {
    const setCnt = (id, n) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(n);
    };
    setCnt('count-gallery', (siteData.galleryColumns || []).length);
    setCnt('count-news', ((siteData.newsSection || {}).items || []).length);
    setCnt('count-footer-artists', ((siteData.footerSection || {}).artists || []).length);
  }

  function getGalleryColumnBadge(index) {
    if (index === 0) return 'Active Col #1 • Desktop & Mobile';
    if (index === 1) return 'Active Col #2 • Desktop & Mobile';
    if (index >= 2 && index <= 4) return `Active Col #${index + 1} • Desktop Only`;
    return `Standby #${index + 1} • Move to Top 5`;
  }

  /* ==========================================================================
     2. Sidebar Navigation & Topbar Controls
     ========================================================================== */
  function initSidebarTabs() {
    const titles = {
      gallery: 'Artist Gallery Columns (5-Column Parallax & Mobile 2-Column)',
      'hero-strapline': 'Hero Logo, Tagline & Scroll-Scrubbed Strapline',
      news: 'News Masonry Grid',
      navigation: 'Desktop Navbar & Mobile Burger Menu',
      footer: 'Full-Screen Parallax Footer & Cursor Hover Reveals',
      'media-backup': 'Media Library & Backup',
    };

    document.querySelectorAll('.admin-nav__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab') || 'gallery';
        document.querySelectorAll('.admin-nav__item').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });
        const titleEl = document.getElementById('current-section-title');
        if (titleEl) titleEl.textContent = titles[currentTab] || 'CMS Editor';
        renderCurrentTab();
      });
    });
  }

  function initTopbarActions() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnSave = document.getElementById('btn-save-all');
    const btnExport = document.getElementById('btn-export-json');
    const btnTogglePreview = document.getElementById('btn-toggle-preview');
    const workspace = document.getElementById('admin-workspace');

    if (btnUndo) btnUndo.addEventListener('click', performUndo);
    if (btnRedo) btnRedo.addEventListener('click', performRedo);
    if (btnSave) btnSave.addEventListener('click', publishChanges);
    if (btnExport) btnExport.addEventListener('click', exportSiteJson);

    if (btnTogglePreview && workspace) {
      btnTogglePreview.addEventListener('click', () => {
        if (window.innerWidth <= 1180) {
          const forced = workspace.classList.toggle('force-preview-mobile');
          btnTogglePreview.setAttribute('aria-pressed', String(forced));
        } else {
          const hidden = workspace.classList.toggle('preview-hidden');
          btnTogglePreview.setAttribute('aria-pressed', String(!hidden));
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (!isCmdOrCtrl) return;

      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        publishChanges();
        return;
      }

      const activeTag = (document.activeElement && document.activeElement.tagName) || '';
      const isTextFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      if (!isTextFocused && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if (!isTextFocused && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        performRedo();
      }
    });
  }

  function initViewportToolbar() {
    const stage = document.getElementById('admin-preview-stage');
    const btnRefresh = document.getElementById('btn-refresh-preview');
    const iframe = document.getElementById('live-preview-iframe');

    document.querySelectorAll('.viewport-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-viewport') || 'desktop';
        document.querySelectorAll('.viewport-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
        if (stage) stage.setAttribute('data-mode', mode);
      });
    });

    if (btnRefresh && iframe) {
      btnRefresh.addEventListener('click', () => {
        iframe.contentWindow.location.reload();
        showToast('Preview reloaded');
      });
    }
  }

  /* ==========================================================================
     3. Tab Render Dispatcher
     ========================================================================== */
  function renderCurrentTab() {
    const pane = document.getElementById('admin-editor-pane');
    if (!pane) return;

    switch (currentTab) {
      case 'gallery':
        renderGalleryTab(pane);
        break;
      case 'hero-strapline':
        renderHeroStraplineTab(pane);
        break;
      case 'news':
        renderNewsTab(pane);
        break;
      case 'navigation':
        renderNavigationTab(pane);
        break;
      case 'footer':
        renderFooterTab(pane);
        break;
      case 'media-backup':
        renderMediaBackupTab(pane);
        break;
      default:
        renderGalleryTab(pane);
    }
  }

  /* ==========================================================================
     TAB 1: 5-Column Artist Gallery (Columns, 4 Visible Cards & Cycle Cards)
     ========================================================================== */
  function renderGalleryTab(pane) {
    const cols = siteData.galleryColumns || [];

    pane.innerHTML = `
      <div class="editor-banner">
        <div>
          <strong>5-Column Parallax Gallery (Desktop) &amp; 2-Column Gallery (Mobile)</strong>
          <p>Columns #1–#5 appear on Desktop (Columns #1–#2 on Mobile &lt; 992px). Each column displays 4 stacked 3:4 cards and cycles additional media into Card #1 when idle.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-gallery-col">+ Add Artist Column</button>
      </div>

      <div id="gallery-cols-list" style="display:flex;flex-direction:column;gap:1.25rem;">
        ${cols
          .map((col, colIdx) => {
            const badgeText = getGalleryColumnBadge(colIdx);
            const isActiveCol = colIdx < 5;
            const visibleCards = col.media || [];
            const cycleCards = col.cycleMedia || [];

            return `
            <div class="editor-card" data-col-index="${colIdx}">
              <div class="editor-card__header">
                <div style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;">
                  <span class="item-card__badge ${isActiveCol ? 'item-card__badge--active' : ''}" style="position:static;">
                    ${escapeHtml(badgeText)}
                  </span>
                  <h2 class="editor-card__title">${escapeHtml(col.name || 'Artist')}</h2>
                </div>
                <div style="display:flex;gap:0.35rem;align-items:center;">
                  <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="col-up" data-idx="${colIdx}" ${colIdx === 0 ? 'disabled' : ''} title="Move column up">&#x2191; Move Up</button>
                  <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="col-down" data-idx="${colIdx}" ${colIdx === cols.length - 1 ? 'disabled' : ''} title="Move column down">&#x2193; Move Down</button>
                  <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="col-delete" data-idx="${colIdx}" title="Delete artist column">Delete</button>
                </div>
              </div>

              <div class="field-row-2">
                <div class="field-group">
                  <label class="field-label">Artist Name (Displayed below column)</label>
                  <input type="text" class="admin-input" data-col-field="name" data-idx="${colIdx}" value="${escapeHtml(col.name)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">Artist Link / Anchor</label>
                  <input type="text" class="admin-input" data-col-field="href" data-idx="${colIdx}" value="${escapeHtml(col.href)}" />
                </div>
              </div>

              <div class="submedia-section-title">Visible Stacked 3:4 Cards (4 Cards per Column)</div>
              <div class="submedia-grid">
                ${visibleCards
                  .map((m, mIdx) => {
                    const isVid = m.type === 'video' || String(m.src || '').endsWith('.mp4');
                    const safeSrc = escapeHtml(sanitizeUrl(m.src, '', true));
                    const safePoster = escapeHtml(sanitizeUrl(m.poster, '', true));
                    const safeColor = escapeHtml(sanitizeHexColor(m.color, '#d4c5b9'));
                    return `
                    <div class="submedia-card">
                      <div class="submedia-card__thumb" style="background-color:${safeColor}">
                        ${
                          isVid
                            ? `<video src="${safeSrc}"${safePoster ? ` poster="${safePoster}"` : ''} autoplay muted loop playsinline></video>`
                            : `<img src="${safeSrc}" alt="Card ${mIdx + 1}" loading="lazy" />`
                        }
                        <span class="submedia-card__slot">${mIdx === 0 ? 'Card #1 (Cycles)' : `Card #${mIdx + 1}`}</span>
                      </div>
                      <div class="submedia-card__controls">
                        <button type="button" class="admin-btn admin-btn--primary admin-btn--sm admin-btn--full" data-action="pick-col-media" data-col-idx="${colIdx}" data-m-idx="${mIdx}">
                          Change Media
                        </button>
                        <div class="color-picker-row">
                          <input type="color" class="color-swatch-input" data-action="col-media-color" data-col-idx="${colIdx}" data-m-idx="${mIdx}" value="${safeColor}" title="Dominant placeholder color" />
                          <input type="text" class="admin-input" style="padding:0.35rem 0.5rem;font-size:12px;" data-action="col-media-color-text" data-col-idx="${colIdx}" data-m-idx="${mIdx}" value="${safeColor}" />
                        </div>
                      </div>
                    </div>`;
                  })
                  .join('')}
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.35rem;">
                <span class="submedia-section-title" style="margin-top:0;">Idle Cycling Media for Card #1 (${cycleCards.length} items)</span>
                <button type="button" class="admin-btn admin-btn--outline admin-btn--sm" data-action="add-cycle-media" data-col-idx="${colIdx}">+ Add Cycle Media</button>
              </div>
              <div class="submedia-grid">
                ${cycleCards
                  .map((c, cIdx) => {
                    const isVid = c.type === 'video' || String(c.src || '').endsWith('.mp4');
                    const safeSrc = escapeHtml(sanitizeUrl(c.src, '', true));
                    const safePoster = escapeHtml(sanitizeUrl(c.poster, '', true));
                    const safeColor = escapeHtml(sanitizeHexColor(c.color, '#d4c5b9'));
                    return `
                    <div class="submedia-card">
                      <div class="submedia-card__thumb" style="background-color:${safeColor}">
                        ${
                          isVid
                            ? `<video src="${safeSrc}"${safePoster ? ` poster="${safePoster}"` : ''} autoplay muted loop playsinline></video>`
                            : `<img src="${safeSrc}" alt="Cycle ${cIdx + 1}" loading="lazy" />`
                        }
                        <span class="submedia-card__slot">Cycle #${cIdx + 1}</span>
                      </div>
                      <div class="submedia-card__controls">
                        <div style="display:flex;gap:0.3rem;">
                          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" style="flex:1;" data-action="pick-cycle-media" data-col-idx="${colIdx}" data-c-idx="${cIdx}">
                            Change
                          </button>
                          <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="del-cycle-media" data-col-idx="${colIdx}" data-c-idx="${cIdx}" title="Remove cycle media">&times;</button>
                        </div>
                        <div class="color-picker-row">
                          <input type="color" class="color-swatch-input" data-action="cycle-media-color" data-col-idx="${colIdx}" data-c-idx="${cIdx}" value="${safeColor}" />
                          <input type="text" class="admin-input" style="padding:0.35rem 0.5rem;font-size:12px;" data-action="cycle-media-color-text" data-col-idx="${colIdx}" data-c-idx="${cIdx}" value="${safeColor}" />
                        </div>
                      </div>
                    </div>`;
                  })
                  .join('')}
              </div>
            </div>`;
          })
          .join('')}
      </div>
    `;

    const addColBtn = pane.querySelector('#btn-add-gallery-col');
    if (addColBtn) {
      addColBtn.addEventListener('click', () => {
        siteData.galleryColumns.unshift({
          id: `col-${Date.now()}`,
          name: 'New Artist',
          href: '#artists',
          media: [
            { id: `m1-${Date.now()}`, type: 'img', src: './assets/images/art-01.svg', poster: '', color: '#BFBDC5', width: 912, height: 1140 },
            { id: `m2-${Date.now()}`, type: 'img', src: './assets/images/art-02.svg', poster: '', color: '#A8C5D2', width: 1500, height: 2048 },
            { id: `m3-${Date.now()}`, type: 'img', src: './assets/images/art-03.svg', poster: '', color: '#CEBCAE', width: 2000, height: 2500 },
            { id: `m4-${Date.now()}`, type: 'img', src: './assets/images/art-04.svg', poster: '', color: '#DCB7C8', width: 1000, height: 1500 },
          ],
          cycleMedia: [
            { id: `c1-${Date.now()}`, type: 'img', src: './assets/images/art-05.svg', poster: '', color: '#D3C4AD' },
          ],
        });
        commitChanges('Added new artist column at Position #1');
        renderGalleryTab(pane);
      });
    }

    // Text inputs for artist name & href
    pane.querySelectorAll('[data-col-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const field = inp.dataset.colField;
        if (siteData.galleryColumns[idx] && field) {
          siteData.galleryColumns[idx][field] = inp.value;
          scheduleCommitChanges();
        }
      });
    });

    // Color inputs for visible media & cycle media
    pane.querySelectorAll('[data-action="col-media-color"], [data-action="col-media-color-text"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const colIdx = Number(inp.dataset.colIdx);
        const mIdx = Number(inp.dataset.mIdx);
        const col = siteData.galleryColumns[colIdx];
        if (col && col.media && col.media[mIdx]) {
          col.media[mIdx].color = inp.value;
          scheduleCommitChanges();
          const card = inp.closest('.submedia-card');
          if (card) {
            const thumb = card.querySelector('.submedia-card__thumb');
            if (thumb && /^#[0-9a-fA-F]{3,8}$/.test(inp.value.trim())) {
              thumb.style.backgroundColor = inp.value.trim();
            }
            card.querySelectorAll('input').forEach((other) => {
              if (other !== inp && /^#[0-9a-fA-F]{6}$/.test(inp.value.trim())) {
                other.value = inp.value.trim();
              }
            });
          }
        }
      });
    });

    pane.querySelectorAll('[data-action="cycle-media-color"], [data-action="cycle-media-color-text"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const colIdx = Number(inp.dataset.colIdx);
        const cIdx = Number(inp.dataset.cIdx);
        const col = siteData.galleryColumns[colIdx];
        if (col && col.cycleMedia && col.cycleMedia[cIdx]) {
          col.cycleMedia[cIdx].color = inp.value;
          scheduleCommitChanges();
          const card = inp.closest('.submedia-card');
          if (card) {
            const thumb = card.querySelector('.submedia-card__thumb');
            if (thumb && /^#[0-9a-fA-F]{3,8}$/.test(inp.value.trim())) {
              thumb.style.backgroundColor = inp.value.trim();
            }
            card.querySelectorAll('input').forEach((other) => {
              if (other !== inp && /^#[0-9a-fA-F]{6}$/.test(inp.value.trim())) {
                other.value = inp.value.trim();
              }
            });
          }
        }
      });
    });

    // Action buttons
    pane.querySelectorAll('[data-action]').forEach((btn) => {
      const action = btn.dataset.action;
      if (action.includes('color')) return;

      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const colIdx = Number(btn.dataset.colIdx);
        const mIdx = Number(btn.dataset.mIdx);
        const cIdx = Number(btn.dataset.cIdx);

        if (action === 'col-up' && idx > 0) {
          const temp = siteData.galleryColumns[idx - 1];
          siteData.galleryColumns[idx - 1] = siteData.galleryColumns[idx];
          siteData.galleryColumns[idx] = temp;
          commitChanges('Moved column up');
          renderGalleryTab(pane);
        } else if (action === 'col-down' && idx < siteData.galleryColumns.length - 1) {
          const temp = siteData.galleryColumns[idx + 1];
          siteData.galleryColumns[idx + 1] = siteData.galleryColumns[idx];
          siteData.galleryColumns[idx] = temp;
          commitChanges('Moved column down');
          renderGalleryTab(pane);
        } else if (action === 'col-delete') {
          if (siteData.galleryColumns.length <= 2) {
            showToast('At least 2 columns are required for the gallery');
            return;
          }
          siteData.galleryColumns.splice(idx, 1);
          commitChanges('Removed artist column');
          renderGalleryTab(pane);
        } else if (action === 'pick-col-media') {
          openMediaPicker((selectedItem) => {
            const target = siteData.galleryColumns[colIdx]?.media?.[mIdx];
            if (!target) return;
            const isVid = selectedItem.type === 'video' || String(selectedItem.src || '').endsWith('.mp4');
            target.type = isVid ? 'video' : 'img';
            target.src = selectedItem.src;
            target.poster = selectedItem.poster || '';
            commitChanges(`Updated ${siteData.galleryColumns[colIdx].name} Card #${mIdx + 1}`);
            renderGalleryTab(pane);
          });
        } else if (action === 'pick-cycle-media') {
          openMediaPicker((selectedItem) => {
            const target = siteData.galleryColumns[colIdx]?.cycleMedia?.[cIdx];
            if (!target) return;
            const isVid = selectedItem.type === 'video' || String(selectedItem.src || '').endsWith('.mp4');
            target.type = isVid ? 'video' : 'img';
            target.src = selectedItem.src;
            target.poster = selectedItem.poster || '';
            commitChanges(`Updated ${siteData.galleryColumns[colIdx].name} Cycle #${cIdx + 1}`);
            renderGalleryTab(pane);
          });
        } else if (action === 'add-cycle-media') {
          openMediaPicker((selectedItem) => {
            const col = siteData.galleryColumns[colIdx];
            if (!col) return;
            const isVid = selectedItem.type === 'video' || String(selectedItem.src || '').endsWith('.mp4');
            col.cycleMedia.push({
              id: `c-${Date.now()}`,
              type: isVid ? 'video' : 'img',
              src: selectedItem.src,
              poster: selectedItem.poster || '',
              color: '#d4c5b9',
            });
            commitChanges(`Added cycle media to ${col.name}`);
            renderGalleryTab(pane);
          });
        } else if (action === 'del-cycle-media') {
          const col = siteData.galleryColumns[colIdx];
          if (col && Array.isArray(col.cycleMedia)) {
            col.cycleMedia.splice(cIdx, 1);
            commitChanges('Removed cycle media item');
            renderGalleryTab(pane);
          }
        }
      });
    });
  }

  /* ==========================================================================
     TAB 2: Hero & Editorial Strapline
     ========================================================================== */
  function renderHeroStraplineTab(pane) {
    const hero = siteData.hero || {};
    const strap = siteData.straplineSection || {};

    pane.innerHTML = `
      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Hero Header &amp; Gallery Behavior</h2>
        </div>

        <div class="field-group">
          <label class="field-label" for="hero-tagline-input">Hero Tagline (Next to "edvlabs" Logo on Desktop, Above on Mobile)</label>
          <input type="text" id="hero-tagline-input" class="admin-input" value="${escapeHtml(hero.tagline)}" />
        </div>

        <div class="field-group">
          <label class="field-label" for="hero-sr-input">Screen-Reader &amp; SEO H1 Title</label>
          <input type="text" id="hero-sr-input" class="admin-input" value="${escapeHtml(hero.srTitle)}" />
        </div>

        <label style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;margin-top:0.25rem;">
          <input type="checkbox" id="hero-shuffle-checkbox" ${hero.shuffleColumns ? 'checked' : ''} style="width:16px;height:16px;" />
          <span>Shuffle artist columns randomly on page reload (uncheck to lock exact Column #1–#5 order)</span>
        </label>
      </div>

      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Editorial Scroll-Scrubbed Strapline</h2>
        </div>

        <div class="field-group">
          <label class="field-label" for="strapline-text-input">Strapline Statement (Garamond Narrow)</label>
          <textarea id="strapline-text-input" class="admin-textarea" rows="3">${escapeHtml(strap.text)}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="strapline-upright-input">Upright (Non-Italic) Words (comma-separated)</label>
          <input type="text" id="strapline-upright-input" class="admin-input" value="${escapeHtml(strap.uprightWords)}" />
          <small style="color:var(--admin-text-muted);font-size:12px;">
            On edvlabs.com, all words in the strapline are italicized except small connector words like <code>is, an, and</code>.
          </small>
        </div>
      </div>
    `;

    const taglineInp = pane.querySelector('#hero-tagline-input');
    const srInp = pane.querySelector('#hero-sr-input');
    const shuffleChk = pane.querySelector('#hero-shuffle-checkbox');
    const strapTextInp = pane.querySelector('#strapline-text-input');
    const strapUprightInp = pane.querySelector('#strapline-upright-input');

    if (taglineInp) {
      taglineInp.addEventListener('input', () => {
        siteData.hero.tagline = taglineInp.value;
        scheduleCommitChanges();
      });
    }
    if (srInp) {
      srInp.addEventListener('input', () => {
        siteData.hero.srTitle = srInp.value;
        scheduleCommitChanges();
      });
    }
    if (shuffleChk) {
      shuffleChk.addEventListener('change', () => {
        siteData.hero.shuffleColumns = shuffleChk.checked;
        commitChanges('Updated gallery column shuffle preference');
      });
    }
    if (strapTextInp) {
      strapTextInp.addEventListener('input', () => {
        siteData.straplineSection.text = strapTextInp.value;
        scheduleCommitChanges();
      });
    }
    if (strapUprightInp) {
      strapUprightInp.addEventListener('input', () => {
        siteData.straplineSection.uprightWords = strapUprightInp.value;
        scheduleCommitChanges();
      });
    }
  }

  /* ==========================================================================
     TAB 3: News Masonry Grid
     ========================================================================== */
  function renderNewsTab(pane) {
    const news = siteData.newsSection || {};
    const items = news.items || [];

    pane.innerHTML = `
      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">News Section Header &amp; CTA</h2>
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label class="field-label">Section Heading</label>
            <input type="text" id="news-heading-inp" class="admin-input" value="${escapeHtml(news.heading)}" />
          </div>
          <div class="field-group">
            <label class="field-label">"All News" Button Text</label>
            <input type="text" id="news-btn-text-inp" class="admin-input" value="${escapeHtml(news.allButtonText)}" />
          </div>
        </div>
      </div>

      <div class="editor-banner">
        <div>
          <strong>News Masonry Cards (3-Column Desktop Masonry / 1-Column Mobile Stack)</strong>
          <p>Each story uses its exact width/height aspect ratio and dominant placeholder color while fading in on scroll.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-news">+ Add News Story</button>
      </div>

      <div class="editor-grid">
        ${items
          .map((item, idx) => {
            const isVid = item.type === 'video' || String(item.src || '').endsWith('.mp4');
            const safeSrc = escapeHtml(sanitizeUrl(item.src, '', true));
            const safePoster = escapeHtml(sanitizeUrl(item.poster, '', true));
            const safeColor = escapeHtml(sanitizeHexColor(item.color, '#d4c5b9'));
            return `
            <div class="item-card" data-news-idx="${idx}">
              <div class="item-card__media" style="background-color:${safeColor}">
                ${
                  isVid
                    ? `<video src="${safeSrc}"${safePoster ? ` poster="${safePoster}"` : ''} autoplay muted loop playsinline></video>`
                    : `<img src="${safeSrc}" alt="${escapeHtml(item.title)}" loading="lazy" />`
                }
                <span class="item-card__badge">#${idx + 1} • ${isVid ? 'Video' : 'Image'} (${item.width}×${item.height})</span>
                <div class="item-card__media-actions">
                  <button type="button" class="admin-btn admin-btn--primary admin-btn--sm" data-action="news-pick-media" data-idx="${idx}">Change Media</button>
                </div>
              </div>
              <div class="item-card__body">
                <div class="field-group">
                  <label class="field-label">Story Title</label>
                  <input type="text" class="admin-input" data-news-field="title" data-idx="${idx}" value="${escapeHtml(item.title)}" />
                </div>
                <div class="field-row-2">
                  <div class="field-group">
                    <label class="field-label">Aspect Width</label>
                    <input type="number" class="admin-input" data-news-field="width" data-idx="${idx}" value="${Number(item.width) || 1500}" min="100" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Aspect Height</label>
                    <input type="number" class="admin-input" data-news-field="height" data-idx="${idx}" value="${Number(item.height) || 2000}" min="100" />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Placeholder Color</label>
                  <div class="color-picker-row">
                    <input type="color" class="color-swatch-input" data-news-field="color-picker" data-idx="${idx}" value="${safeColor}" />
                    <input type="text" class="admin-input" data-news-field="color" data-idx="${idx}" value="${safeColor}" />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Story Link</label>
                  <input type="text" class="admin-input" data-news-field="href" data-idx="${idx}" value="${escapeHtml(item.href)}" />
                </div>

                <div class="item-card__footer">
                  <div style="display:flex;gap:0.3rem;">
                    <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="news-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>&#x2191;</button>
                    <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="news-down" data-idx="${idx}" ${idx === items.length - 1 ? 'disabled' : ''}>&#x2193;</button>
                  </div>
                  <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="news-del" data-idx="${idx}">Delete</button>
                </div>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    `;

    const headInp = pane.querySelector('#news-heading-inp');
    const btnTxtInp = pane.querySelector('#news-btn-text-inp');
    const addBtn = pane.querySelector('#btn-add-news');

    if (headInp) {
      headInp.addEventListener('input', () => {
        siteData.newsSection.heading = headInp.value;
        scheduleCommitChanges();
      });
    }
    if (btnTxtInp) {
      btnTxtInp.addEventListener('input', () => {
        siteData.newsSection.allButtonText = btnTxtInp.value;
        scheduleCommitChanges();
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        siteData.newsSection.items.unshift({
          id: `news-${Date.now()}`,
          title: 'NEW ARTIST COLLABORATION',
          href: '#news',
          type: 'img',
          src: './assets/images/art-02.svg',
          poster: '',
          color: '#a8c5d2',
          width: 1500,
          height: 2048,
        });
        commitChanges('Added new news story');
        renderNewsTab(pane);
      });
    }

    pane.querySelectorAll('[data-news-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const field = inp.dataset.newsField;
        const item = siteData.newsSection.items[idx];
        if (!item) return;

        if (field === 'width' || field === 'height') {
          item[field] = Math.max(100, Number(inp.value) || 1000);
        } else if (field === 'color-picker') {
          item.color = inp.value;
          const textInput = inp.parentElement.querySelector('[data-news-field="color"]');
          if (textInput) textInput.value = inp.value;
        } else if (field === 'color') {
          item.color = inp.value;
          const pickerInput = inp.parentElement.querySelector('[data-news-field="color-picker"]');
          if (pickerInput && /^#[0-9a-fA-F]{6}$/.test(inp.value.trim())) {
            pickerInput.value = inp.value.trim();
          }
        } else {
          item[field] = inp.value;
        }
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const idx = Number(btn.dataset.idx);
        const list = siteData.newsSection.items;

        if (action === 'news-up' && idx > 0) {
          [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
          commitChanges('Moved news story up');
          renderNewsTab(pane);
        } else if (action === 'news-down' && idx < list.length - 1) {
          [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
          commitChanges('Moved news story down');
          renderNewsTab(pane);
        } else if (action === 'news-del') {
          list.splice(idx, 1);
          commitChanges('Deleted news story');
          renderNewsTab(pane);
        } else if (action === 'news-pick-media') {
          openMediaPicker((selected) => {
            const target = list[idx];
            if (!target) return;
            const isVid = selected.type === 'video' || String(selected.src || '').endsWith('.mp4');
            target.type = isVid ? 'video' : 'img';
            target.src = selected.src;
            target.poster = selected.poster || '';
            commitChanges(`Updated media for ${target.title}`);
            renderNewsTab(pane);
          });
        }
      });
    });
  }

  /* ==========================================================================
     TAB 4: Navbar & Mobile Menu
     ========================================================================== */
  function renderNavigationTab(pane) {
    const nav = siteData.navbar || {};
    const centerLinks = nav.centerLinks || [];
    const mobileLinks = nav.mobileLinks || [];

    pane.innerHTML = `
      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Left &amp; Right Primary Links (Horizontal on Desktop, Vertical on Mobile)</h2>
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label class="field-label">Left Link Label (+ Icon)</label>
            <input type="text" id="nav-left-label-inp" class="admin-input" value="${escapeHtml(nav.leftLabel)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Left Link URL / Anchor</label>
            <input type="text" id="nav-left-href-inp" class="admin-input" value="${escapeHtml(nav.leftHref)}" />
          </div>
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label class="field-label">Right Link Label (+ Icon)</label>
            <input type="text" id="nav-right-label-inp" class="admin-input" value="${escapeHtml(nav.rightLabel)}" />
          </div>
          <div class="field-group">
            <label class="field-label">Right Link URL / Anchor</label>
            <input type="text" id="nav-right-href-inp" class="admin-input" value="${escapeHtml(nav.rightHref)}" />
          </div>
        </div>
      </div>

      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Desktop Center Links (News / About / All)</h2>
          <button type="button" class="admin-btn admin-btn--outline admin-btn--sm" id="btn-add-center-link">+ Add Link</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6rem;">
          ${centerLinks
            .map(
              (link, idx) => `
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="admin-input" data-center-field="label" data-idx="${idx}" value="${escapeHtml(link.label)}" placeholder="Label" />
                <input type="text" class="admin-input" data-center-field="href" data-idx="${idx}" value="${escapeHtml(link.href)}" placeholder="#anchor or URL" />
                <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="del-center-link" data-idx="${idx}">&times;</button>
              </div>`
            )
            .join('')}
        </div>
      </div>

      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Mobile Burger Dropdown Menu Links (&lt; 992px)</h2>
          <button type="button" class="admin-btn admin-btn--outline admin-btn--sm" id="btn-add-mobile-link">+ Add Mobile Link</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6rem;">
          ${mobileLinks
            .map(
              (link, idx) => `
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="admin-input" data-mobile-field="label" data-idx="${idx}" value="${escapeHtml(link.label)}" placeholder="Label" />
                <input type="text" class="admin-input" data-mobile-field="href" data-idx="${idx}" value="${escapeHtml(link.href)}" placeholder="#anchor or mailto:" />
                <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="del-mobile-link" data-idx="${idx}">&times;</button>
              </div>`
            )
            .join('')}
        </div>
      </div>
    `;

    const bindSimple = (id, key) => {
      const el = pane.querySelector(id);
      if (el) {
        el.addEventListener('input', () => {
          siteData.navbar[key] = el.value;
          scheduleCommitChanges();
        });
      }
    };
    bindSimple('#nav-left-label-inp', 'leftLabel');
    bindSimple('#nav-left-href-inp', 'leftHref');
    bindSimple('#nav-right-label-inp', 'rightLabel');
    bindSimple('#nav-right-href-inp', 'rightHref');

    pane.querySelectorAll('[data-center-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const f = inp.dataset.centerField;
        if (siteData.navbar.centerLinks[idx]) {
          siteData.navbar.centerLinks[idx][f] = inp.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('[data-mobile-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const f = inp.dataset.mobileField;
        if (siteData.navbar.mobileLinks[idx]) {
          siteData.navbar.mobileLinks[idx][f] = inp.value;
          scheduleCommitChanges();
        }
      });
    });

    const addCenterBtn = pane.querySelector('#btn-add-center-link');
    if (addCenterBtn) {
      addCenterBtn.addEventListener('click', () => {
        siteData.navbar.centerLinks.push({ id: `nav-${Date.now()}`, label: 'New', href: '#top' });
        commitChanges('Added desktop center link');
        renderNavigationTab(pane);
      });
    }

    const addMobBtn = pane.querySelector('#btn-add-mobile-link');
    if (addMobBtn) {
      addMobBtn.addEventListener('click', () => {
        siteData.navbar.mobileLinks.push({ id: `mob-${Date.now()}`, label: 'New Link', href: '#top' });
        commitChanges('Added mobile menu link');
        renderNavigationTab(pane);
      });
    }

    pane.querySelectorAll('[data-action="del-center-link"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        siteData.navbar.centerLinks.splice(Number(btn.dataset.idx), 1);
        commitChanges('Removed desktop center link');
        renderNavigationTab(pane);
      });
    });

    pane.querySelectorAll('[data-action="del-mobile-link"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        siteData.navbar.mobileLinks.splice(Number(btn.dataset.idx), 1);
        commitChanges('Removed mobile menu link');
        renderNavigationTab(pane);
      });
    });
  }

  /* ==========================================================================
     TAB 5: Full-Screen Parallax Footer & Artist Hover Reveals
     ========================================================================== */
  function renderFooterTab(pane) {
    const foot = siteData.footerSection || {};
    const straplines = foot.straplines || [];
    const artists = foot.artists || [];
    const exploreLinks = foot.exploreLinks || [];
    const connectLinks = foot.connectLinks || [];

    pane.innerHTML = `
      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Footer Editorial Straplines &amp; Copyright</h2>
        </div>
        <div class="field-group">
          <label class="field-label">Footer Strapline Lines (Wrap words in *asterisks* for italic Garamond Narrow)</label>
          ${straplines
            .map(
              (line, idx) => `
              <input type="text" class="admin-input" data-foot-strap="${idx}" value="${escapeHtml(line)}" style="margin-bottom:0.35rem;" />`
            )
            .join('')}
        </div>
        <div class="field-group">
          <label class="field-label">Copyright Notice</label>
          <input type="text" id="footer-copy-inp" class="admin-input" value="${escapeHtml(foot.copyright)}" />
        </div>
      </div>

      <div class="editor-banner">
        <div>
          <strong>Footer Artists Roster &amp; Cursor Hover Reveals</strong>
          <p>Hovering an artist link in the footer spawns a cursor-following preview card and tints the entire footer background to their signature color.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-footer-artist">+ Add Footer Artist</button>
      </div>

      <div class="editor-grid">
        ${artists
          .map((a, idx) => {
            const isVid = a.type === 'video' || Boolean(a.video);
            const safeImg = escapeHtml(sanitizeUrl(a.image, '', true));
            const safeVid = escapeHtml(sanitizeUrl(a.video, '', true));
            const safeColor = escapeHtml(sanitizeHexColor(a.color, '#D3B6AA'));
            return `
            <div class="item-card">
              <div class="item-card__media" style="background-color:${safeColor}">
                ${
                  isVid && safeVid
                    ? `<video src="${safeVid}" poster="${safeImg}" autoplay muted loop playsinline></video>`
                    : `<img src="${safeImg}" alt="${escapeHtml(a.name)}" loading="lazy" />`
                }
                <span class="item-card__badge">#${idx + 1} • ${escapeHtml(a.name)}</span>
                <div class="item-card__media-actions">
                  <button type="button" class="admin-btn admin-btn--primary admin-btn--sm" data-action="foot-pick-media" data-idx="${idx}">Change Hover Media</button>
                </div>
              </div>
              <div class="item-card__body">
                <div class="field-group">
                  <label class="field-label">Artist Name</label>
                  <input type="text" class="admin-input" data-foot-artist-field="name" data-idx="${idx}" value="${escapeHtml(a.name)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">Footer Background Tint Color on Hover</label>
                  <div class="color-picker-row">
                    <input type="color" class="color-swatch-input" data-foot-artist-field="color-picker" data-idx="${idx}" value="${safeColor}" />
                    <input type="text" class="admin-input" data-foot-artist-field="color" data-idx="${idx}" value="${safeColor}" />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Link / Anchor</label>
                  <input type="text" class="admin-input" data-foot-artist-field="href" data-idx="${idx}" value="${escapeHtml(a.href)}" />
                </div>
                <div class="item-card__footer">
                  <div style="display:flex;gap:0.3rem;">
                    <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="foot-artist-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>&#x2191;</button>
                    <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-action="foot-artist-down" data-idx="${idx}" ${idx === artists.length - 1 ? 'disabled' : ''}>&#x2193;</button>
                  </div>
                  <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-action="foot-artist-del" data-idx="${idx}">Delete</button>
                </div>
              </div>
            </div>`;
          })
          .join('')}
      </div>

      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Explore &amp; Connect Columns</h2>
        </div>
        <div class="field-row-2">
          <div>
            <label class="field-label" style="display:block;margin-bottom:0.5rem;">Explore Links</label>
            ${exploreLinks
              .map(
                (l, idx) => `
                <div style="display:flex;gap:0.4rem;margin-bottom:0.45rem;">
                  <input type="text" class="admin-input" data-explore-field="label" data-idx="${idx}" value="${escapeHtml(l.label)}" />
                  <input type="text" class="admin-input" data-explore-field="href" data-idx="${idx}" value="${escapeHtml(l.href)}" />
                </div>`
              )
              .join('')}
          </div>
          <div>
            <label class="field-label" style="display:block;margin-bottom:0.5rem;">Connect Links</label>
            ${connectLinks
              .map(
                (l, idx) => `
                <div style="display:flex;gap:0.4rem;margin-bottom:0.45rem;">
                  <input type="text" class="admin-input" data-connect-field="label" data-idx="${idx}" value="${escapeHtml(l.label)}" />
                  <input type="text" class="admin-input" data-connect-field="href" data-idx="${idx}" value="${escapeHtml(l.href)}" />
                </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    pane.querySelectorAll('[data-foot-strap]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.footStrap);
        siteData.footerSection.straplines[idx] = inp.value;
        scheduleCommitChanges();
      });
    });

    const copyInp = pane.querySelector('#footer-copy-inp');
    if (copyInp) {
      copyInp.addEventListener('input', () => {
        siteData.footerSection.copyright = copyInp.value;
        scheduleCommitChanges();
      });
    }

    const addArtistBtn = pane.querySelector('#btn-add-footer-artist');
    if (addArtistBtn) {
      addArtistBtn.addEventListener('click', () => {
        siteData.footerSection.artists.push({
          id: `fa-${Date.now()}`,
          name: 'New Artist',
          href: '#artists',
          color: '#D3B6AA',
          type: 'img',
          image: './assets/images/art-06.svg',
          video: '',
        });
        commitChanges('Added footer artist');
        renderFooterTab(pane);
      });
    }

    pane.querySelectorAll('[data-foot-artist-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const f = inp.dataset.footArtistField;
        const target = siteData.footerSection.artists[idx];
        if (!target) return;

        if (f === 'color-picker') {
          target.color = inp.value;
          const txt = inp.parentElement.querySelector('[data-foot-artist-field="color"]');
          if (txt) txt.value = inp.value;
        } else if (f === 'color') {
          target.color = inp.value;
          const pck = inp.parentElement.querySelector('[data-foot-artist-field="color-picker"]');
          if (pck && /^#[0-9a-fA-F]{6}$/.test(inp.value.trim())) pck.value = inp.value.trim();
        } else {
          target[f] = inp.value;
        }
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('[data-explore-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const f = inp.dataset.exploreField;
        if (siteData.footerSection.exploreLinks[idx]) {
          siteData.footerSection.exploreLinks[idx][f] = inp.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('[data-connect-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const f = inp.dataset.connectField;
        if (siteData.footerSection.connectLinks[idx]) {
          siteData.footerSection.connectLinks[idx][f] = inp.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const idx = Number(btn.dataset.idx);
        const list = siteData.footerSection.artists;

        if (action === 'foot-artist-up' && idx > 0) {
          [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
          commitChanges('Moved footer artist up');
          renderFooterTab(pane);
        } else if (action === 'foot-artist-down' && idx < list.length - 1) {
          [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
          commitChanges('Moved footer artist down');
          renderFooterTab(pane);
        } else if (action === 'foot-artist-del') {
          list.splice(idx, 1);
          commitChanges('Removed footer artist');
          renderFooterTab(pane);
        } else if (action === 'foot-pick-media') {
          openMediaPicker((selected) => {
            const target = list[idx];
            if (!target) return;
            const isVid = selected.type === 'video' || String(selected.src || '').endsWith('.mp4');
            if (isVid) {
              target.type = 'video';
              target.video = selected.src;
              target.image = selected.poster || target.image;
            } else {
              target.type = 'img';
              target.image = selected.src;
              target.video = '';
            }
            commitChanges(`Updated hover reveal media for ${target.name}`);
            renderFooterTab(pane);
          });
        }
      });
    });
  }

  /* ==========================================================================
     TAB 6: Media Library, Upload & JSON Backup / Factory Reset
     ========================================================================== */
  function renderMediaBackupTab(pane) {
    const customUploads = window.EDVStore.getCustomUploads();

    pane.innerHTML = `
      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Configuration Backup, Import &amp; Factory Reset</h2>
        </div>
        <p style="color:var(--admin-text-muted);font-size:0.85rem;">
          Export your customized edvlabs Roster site data as a portable JSON file, import an existing JSON configuration, or restore all text and media to the original edvlabs.com defaults.
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button type="button" class="admin-btn admin-btn--primary" id="btn-backup-export">Export Site JSON</button>
          <label class="admin-btn admin-btn--outline" style="cursor:pointer;">
            <span>Import Site JSON</span>
            <input type="file" id="input-backup-import" accept="application/json,.json" hidden />
          </label>
          <button type="button" class="admin-btn admin-btn--danger-ghost" id="btn-factory-reset">Reset to Factory Defaults</button>
        </div>
      </div>

      <div class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Uploaded Custom Images (${customUploads.length})</h2>
          <label class="admin-btn admin-btn--primary admin-btn--sm" style="cursor:pointer;">
            <span>+ Upload Image from Device</span>
            <input type="file" id="tab-upload-input" accept="image/*" hidden />
          </label>
        </div>
        ${
          customUploads.length === 0
            ? `<p style="color:var(--admin-text-muted);font-size:0.85rem;">No custom images uploaded yet. Upload an image above to use it in any Gallery Column, News card, or Footer hover reveal.</p>`
            : `<div class="editor-grid">
                ${customUploads
                  .map(
                    (u) => `
                    <div class="item-card">
                      <div class="item-card__media">
                        <img src="${escapeHtml(u.src)}" alt="${escapeHtml(u.label)}" />
                      </div>
                      <div class="item-card__body">
                        <strong>${escapeHtml(u.label)}</strong>
                        <div class="item-card__footer">
                          <span style="font-size:11px;color:var(--admin-text-muted);">Uploaded Data URL</span>
                          <button type="button" class="admin-btn admin-btn--danger-ghost admin-btn--sm" data-del-upload="${escapeHtml(u.id)}">Delete</button>
                        </div>
                      </div>
                    </div>`
                  )
                  .join('')}
              </div>`
        }
      </div>
    `;

    const btnExp = pane.querySelector('#btn-backup-export');
    const inpImp = pane.querySelector('#input-backup-import');
    const btnReset = pane.querySelector('#btn-factory-reset');
    const tabUpload = pane.querySelector('#tab-upload-input');

    if (btnExp) btnExp.addEventListener('click', exportSiteJson);

    if (inpImp) {
      inpImp.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result || '{}'));
            siteData = window.EDVStore.normalizeSiteData(parsed);
            commitChanges('Imported JSON configuration');
            renderCurrentTab();
          } catch (_) {
            showToast('Invalid JSON file');
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        siteData = window.EDVStore.getDefaultData();
        window.EDVStore.publish(siteData);
        pushHistorySnapshot(siteData);
        updateCounts();
        updatePublishStatusUI();
        syncPreviewIframe(siteData);
        renderCurrentTab();
        showToast('Restored all content & images to original edvlabs.com defaults');
      });
    }

    if (tabUpload) {
      tabUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAndStoreImage(file, (entry) => {
          if (entry) {
            showToast(`Uploaded "${entry.label}" to Media Library`);
            renderMediaBackupTab(pane);
          } else {
            showToast('Failed to save image. Please verify file format and browser storage.');
          }
        });
      });
    }

    pane.querySelectorAll('[data-del-upload]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.EDVStore.deleteCustomUpload(btn.dataset.delUpload);
        showToast('Deleted uploaded image');
        renderMediaBackupTab(pane);
      });
    });
  }

  function exportSiteJson() {
    const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edvlabs-site-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded edvlabs-site-data.json');
  }

  /* ==========================================================================
     4. Visual Media Library Picker & Device Image Compressor
     ========================================================================== */
  function initMediaModal() {
    const modal = document.getElementById('media-modal');
    const closeBtn = document.getElementById('media-modal-close');
    const searchInput = document.getElementById('media-search-input');
    const uploadInput = document.getElementById('media-upload-input');
    const customUrlInput = document.getElementById('media-custom-url-input');
    const btnUseUrl = document.getElementById('btn-use-custom-url');

    const closeModal = () => {
      if (modal) modal.hidden = true;
      activeMediaCallback = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    document.querySelectorAll('#media-category-tabs .media-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentMediaCat = btn.getAttribute('data-cat') || 'All';
        document.querySelectorAll('#media-category-tabs .media-filter-btn').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        renderMediaPickerGrid();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        mediaSearchQuery = searchInput.value.trim().toLowerCase();
        renderMediaPickerGrid();
      });
    }

    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAndStoreImage(file, (entry) => {
          if (entry) {
            if (activeMediaCallback) {
              activeMediaCallback(entry);
              closeModal();
            } else {
              renderMediaPickerGrid();
            }
          } else {
            showToast('Failed to save image. Please verify file format and browser storage.');
          }
        });
        uploadInput.value = '';
      });
    }

    if (btnUseUrl && customUrlInput) {
      btnUseUrl.addEventListener('click', () => {
        const raw = customUrlInput.value.trim();
        if (!raw) return;
        const safe = sanitizeUrl(raw, '', true);
        if (!safe) {
          showToast('Please enter a valid relative path or https:// URL');
          return;
        }
        const isVid = safe.endsWith('.mp4');
        if (activeMediaCallback) {
          activeMediaCallback({
            src: safe,
            label: 'Custom URL',
            type: isVid ? 'video' : 'img',
            poster: '',
          });
          customUrlInput.value = '';
          closeModal();
        }
      });
    }
  }

  function openMediaPicker(callback) {
    activeMediaCallback = callback;
    const modal = document.getElementById('media-modal');
    if (modal) {
      modal.hidden = false;
      renderMediaPickerGrid();
    }
  }

  function renderMediaPickerGrid() {
    const grid = document.getElementById('media-picker-grid');
    if (!grid) return;

    const allItems = window.EDVStore.getMediaLibrary();
    const filtered = allItems.filter((item) => {
      const catMatch = currentMediaCat === 'All' || item.category === currentMediaCat;
      const qMatch =
        !mediaSearchQuery ||
        item.label.toLowerCase().includes(mediaSearchQuery) ||
        item.src.toLowerCase().includes(mediaSearchQuery);
      return catMatch && qMatch;
    });

    grid.innerHTML = filtered
      .map((item, idx) => {
        const isVid = item.type === 'video' || String(item.src || '').endsWith('.mp4');
        const safeSrc = escapeHtml(item.src);
        const safePoster = escapeHtml(item.poster || '');
        return `
        <button type="button" class="media-tile" data-pick-idx="${idx}">
          ${
            isVid
              ? `<video class="media-tile__thumb" src="${safeSrc}"${safePoster ? ` poster="${safePoster}"` : ''} muted loop playsinline preload="metadata"></video>`
              : `<img class="media-tile__thumb" src="${safeSrc}" alt="${escapeHtml(item.label)}" loading="lazy" />`
          }
          <div class="media-tile__meta">
            <div class="media-tile__label">${escapeHtml(item.label)}</div>
            <div class="media-tile__cat">${escapeHtml(item.category)} ${isVid ? '• MP4 Video' : ''}</div>
          </div>
        </button>`;
      })
      .join('');

    grid.querySelectorAll('.media-tile').forEach((tile) => {
      const vid = tile.querySelector('video');
      if (vid) {
        tile.addEventListener('mouseenter', () => vid.play().catch(() => {}));
        tile.addEventListener('mouseleave', () => vid.pause());
      }
      tile.addEventListener('click', () => {
        const item = filtered[Number(tile.dataset.pickIdx)];
        if (item && activeMediaCallback) {
          activeMediaCallback(item);
          const modal = document.getElementById('media-modal');
          if (modal) modal.hidden = true;
          activeMediaCallback = null;
        }
      });
    });
  }

  function compressAndStoreImage(file, onDone) {
    const reader = new FileReader();
    reader.onerror = () => {
      if (onDone) onDone(null);
    };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        if (onDone) onDone(null);
      };
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
        const cleanName = file.name.replace(/\.[^.]+$/, '');
        const res = window.EDVStore.addUploadedMedia(cleanName, dataUrl);
        if (res && typeof res.then === 'function') {
          res.then((entry) => {
            if (onDone) onDone(entry);
          }).catch(() => {
            if (onDone) onDone(null);
          });
        } else {
          if (onDone) onDone(res);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }
})();
