(function () {
  const H = window.CatalogHelpers;
  const { escapeHtml, debounce, getItemName, getRelativeFolderPath, getAbsoluteFolderPath } = H;

  const rawReg = window.FEATURE_REGISTRY;
  const baseRegistry = Array.isArray(rawReg)
    ? rawReg
    : (rawReg && Array.isArray(rawReg.items) ? rawReg.items : []);

  // Custom features live in localStorage (see scripts/catalog/studio.js)
  let allFeatures = [...baseRegistry, ...window.CatalogStudio.loadCustomFeatures()];

  // State
  const state = {
    mode: 'catalog', // 'catalog' | 'workbench'
    collectionType: 'all', // 'all' | 'component' | 'template'
    source: 'all',
    category: 'all',
    search: '',
    pauseOffscreen: true,
    activeSlug: allFeatures[0] ? allFeatures[0].slug : null,
    inspActiveTab: 'combined',
    wbActiveTab: 'combined'
  };

  // DOM Elements
  const catalogView = document.getElementById('catalogView');
  const workbenchView = document.getElementById('workbenchView');
  const catalogGrid = document.getElementById('catalogGrid');
  const sourceFilterBar = document.getElementById('sourceFilterBar');
  const categoryFilterBar = document.getElementById('categoryFilterBar');
  const searchInput = document.getElementById('searchInput');
  const resultsSummary = document.getElementById('resultsSummary');
  const toastContainer = document.getElementById('toastContainer');

  function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (_) {}
    ta.remove();
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
    showToast(label || 'Copied to clipboard');
  }

  /** Source files are fetched on demand; registry.js only carries metadata. */
  function ensureFiles(item) {
    return window.FeatureFiles.load(item);
  }

  async function downloadHtmlFile(item) {
    const files = await ensureFiles(item);
    const content = files.combined || '';
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Downloaded ${item.slug}.html`);
  }

  function updateHeaderCounts() {
    allFeatures = [...baseRegistry, ...studio.getCustomFeatures()];
    const compCount = allFeatures.filter((i) => i.type !== 'template').length;
    const tplCount = allFeatures.filter((i) => i.type === 'template').length;
    document.getElementById('totalCountBadge').textContent = `${allFeatures.length} BLOCKS`;
    document.getElementById('countAll').textContent = String(allFeatures.length);
    document.getElementById('countComponents').textContent = String(compCount);
    document.getElementById('countTemplates').textContent = String(tplCount);
    document.getElementById('wbTreeCount').textContent = String(allFeatures.length);
  }

  function getFilteredFeatures() {
    return allFeatures.filter((item) => {
      if (state.collectionType === 'component' && item.type === 'template') return false;
      if (state.collectionType === 'template' && item.type !== 'template') return false;
      if (state.source !== 'all' && item.source !== state.source) return false;
      if (state.category !== 'all' && item.category !== state.category) return false;
      if (state.search.trim()) {
        const q = state.search.toLowerCase();
        const hay = [
          getItemName(item),
          item.slug,
          item.category,
          item.source,
          item.description,
          ...(item.tags || []),
          ...(item.tech || [])
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function syncCollectionTabsUI() {
    document.querySelectorAll('#collectionTabs .col-tab').forEach((t) => {
      t.classList.toggle('is-active', t.getAttribute('data-type') === state.collectionType);
    });
  }

  function renderFilterBars() {
    const sources = ['all', ...Array.from(new Set(allFeatures.map((i) => i.source)))];
    sourceFilterBar.innerHTML = '';
    sources.forEach((src) => {
      const count = src === 'all' ? allFeatures.length : allFeatures.filter((i) => i.source === src).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill' + (state.source === src ? ' is-active' : '');
      btn.innerHTML = `<span class="pill-label">${escapeHtml(src === 'all' ? 'All Sources' : src)}</span><span class="pill-count">${count}</span>`;
      btn.addEventListener('click', () => {
        state.source = src;
        if (src !== 'all') {
          const hasMatchingInCollection = allFeatures.some((i) => {
            if (i.source !== src) return false;
            if (state.collectionType === 'template') return i.type === 'template';
            if (state.collectionType === 'component') return i.type !== 'template';
            return true;
          });
          if (!hasMatchingInCollection) {
            state.collectionType = 'all';
            syncCollectionTabsUI();
          }
        }
        renderAll();
      });
      sourceFilterBar.appendChild(btn);
    });

    const categories = ['all', ...Array.from(new Set(allFeatures.map((i) => i.category)))];
    categoryFilterBar.innerHTML = '';
    categories.forEach((cat) => {
      const count = cat === 'all' ? allFeatures.length : allFeatures.filter((i) => i.category === cat).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill' + (state.category === cat ? ' is-active' : '');
      btn.innerHTML = `<span class="pill-label">${escapeHtml(cat === 'all' ? 'All Categories' : cat)}</span><span class="pill-count">${count}</span>`;
      btn.addEventListener('click', () => {
        state.category = cat;
        if (cat === 'Full Websites' && state.collectionType === 'component') {
          state.collectionType = 'all';
          syncCollectionTabsUI();
        } else if (cat !== 'all' && cat !== 'Full Websites' && state.collectionType === 'template') {
          state.collectionType = 'all';
          syncCollectionTabsUI();
        }
        renderAll();
      });
      categoryFilterBar.appendChild(btn);
    });

    renderActiveFilterTags();
  }

  function renderActiveFilterTags() {
    const tagsEl = document.getElementById('toolbarActiveTags');
    if (!tagsEl) return;
    tagsEl.innerHTML = '';
    const hasFilters = state.source !== 'all' || state.category !== 'all' || state.collectionType !== 'all' || state.search.trim();
    if (!hasFilters) return;

    if (state.collectionType !== 'all') {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `${state.collectionType === 'template' ? 'Templates' : 'Components'} <button class="active-chip-clear" type="button" title="Remove" aria-label="Remove collection type filter">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.collectionType = 'all'; syncCollectionTabsUI(); renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.source !== 'all') {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `${escapeHtml(state.source)} <button class="active-chip-clear" type="button" title="Remove" aria-label="Remove source filter">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.source = 'all'; renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.category !== 'all') {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `${escapeHtml(state.category)} <button class="active-chip-clear" type="button" title="Remove" aria-label="Remove category filter">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.category = 'all'; renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.search.trim()) {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `"${escapeHtml(state.search)}" <button class="active-chip-clear" type="button" title="Remove" aria-label="Remove search filter">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.search = ''; searchInput.value = ''; renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (tagsEl.children.length > 1) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-all-chip';
      clearBtn.textContent = 'Clear all';
      clearBtn.addEventListener('click', () => { document.getElementById('resetFiltersBtn').click(); });
      tagsEl.appendChild(clearBtn);
    }
  }

  function loadPreviewIntoFrame(frame, item) {
    if (!frame || !item) return;
    if (item.type === 'template' && item.liveSiteUrl) {
      frame.removeAttribute('srcdoc');
      frame.src = item.liveSiteUrl;
    } else if (item.files && item.files.combined) {
      frame.removeAttribute('src');
      frame.srcdoc = item.files.combined;
    } else {
      frame.removeAttribute('srcdoc');
      frame.src = item.previewUrl || `features/${item.slug}/index.html`;
    }
  }

  // Lazy-mount IntersectionObserver for Catalog Iframes
  const previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const box = entry.target;
      const slug = box.getAttribute('data-slug');
      const item = allFeatures.find((f) => f.slug === slug);
      if (!item) return;

      let iframe = box.querySelector('iframe');
      if (entry.isIntersecting) {
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.title = getItemName(item);
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
          if (item.files && item.files.combined) iframe.srcdoc = item.files.combined;
          else iframe.src = item.previewUrl || `features/${item.slug}/index.html`;
          box.appendChild(iframe);
        }
      } else if (state.pauseOffscreen && iframe) {
        iframe.remove();
      }
    });
  }, { rootMargin: '180px 0px' });

  function renderCatalog() {
    previewObserver.disconnect();
    const filtered = getFilteredFeatures();
    resultsSummary.textContent = `Showing ${filtered.length} of ${allFeatures.length} features & designs`;
    catalogGrid.innerHTML = '';

    if (filtered.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.14); border-radius: 14px;';
      emptyEl.innerHTML = `
        <p style="font-size: 15px; color: #ececf1; margin: 0 0 8px; font-weight: 600;">No features match the active filter combination</p>
        <p style="font-size: 13px; color: #8e8ea0; margin: 0 0 16px;">Try resetting your active category, source, or search filter.</p>
        <button type="button" class="action-btn primary" id="emptyResetBtn">Show All ${allFeatures.length} Features &amp; Templates</button>
      `;
      catalogGrid.appendChild(emptyEl);
      const resetBtn = emptyEl.querySelector('#emptyResetBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          document.getElementById('resetFiltersBtn').click();
        });
      }
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'vault-card' + (item.type === 'template' ? ' is-template' : '');
      const hasTsx = (item.availableFiles || []).includes('tsx') || Boolean(item.files && item.files.tsx);

      const previewBox = document.createElement('div');
      previewBox.className = 'card-preview-box';
      previewBox.setAttribute('data-slug', item.slug);

      previewBox.innerHTML = `
        <div class="preview-Overlay-bar">
          <div class="badge-group">
            <span class="source-badge">${escapeHtml(item.source)}</span>
            <span class="cat-badge">${escapeHtml(item.category)}</span>
            ${hasTsx ? '<span class="tsx-badge">React TSX + Vanilla</span>' : ''}
          </div>
          <div class="preview-quick-btns">
            <button class="mini-icon-btn" data-action="reload" title="Reload Live Preview" aria-label="Reload live preview" type="button">&#8635;</button>
            <button class="mini-icon-btn" data-action="inspect" title="Open Full Code &amp; Preview Inspector" aria-label="Open inspector" type="button">&nearr;</button>
          </div>
        </div>
      `;

      const info = document.createElement('div');
      info.className = 'card-info';
      const folderDisplay = getRelativeFolderPath(item);
      const itemName = getItemName(item);

      let extraTemplateBtns = '';
      if (item.liveSiteUrl) {
        extraTemplateBtns += `<a class="action-btn accent" href="${escapeHtml(item.liveSiteUrl)}" target="_blank" rel="noopener">Live Site &nearr;</a>`;
      }
      if (item.adminUrl) {
        extraTemplateBtns += `<a class="action-btn accent" href="${escapeHtml(item.adminUrl)}" target="_blank" rel="noopener">Admin CMS &nearr;</a>`;
      }

      info.innerHTML = `
        <div>
          <div class="card-title-row">
            <h2 class="card-title">${escapeHtml(itemName)}</h2>
            <code class="card-slug">${escapeHtml(folderDisplay)}</code>
          </div>
          <p class="card-desc">${escapeHtml(item.description)}</p>
        </div>
        <div class="card-footer-actions">
          <button class="action-btn primary" data-action="copy-code" type="button">${item.type === 'template' ? 'Copy Site HTML' : 'Copy 1-File Code'}</button>
          <button class="action-btn" data-action="copy-path" type="button">Copy Folder Path</button>
          <button class="action-btn" data-action="inspect" type="button">${item.type === 'template' ? 'Live Full Preview & Code' : 'Inspect Files'}</button>
          ${extraTemplateBtns}
        </div>
      `;

      card.appendChild(previewBox);
      card.appendChild(info);

      card.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'copy-code') {
          ensureFiles(item).then((files) => {
            const codeToCopy = (item.type === 'template' && files.siteHtml) ? files.siteHtml : files.combined;
            copyText(codeToCopy, `Copied code for ${itemName}`);
          });
        } else if (action === 'copy-path') {
          copyText(getAbsoluteFolderPath(item), `Copied path: ${getAbsoluteFolderPath(item)}`);
        } else if (action === 'inspect') {
          openInspector(item.slug);
        } else if (action === 'reload') {
          const frame = previewBox.querySelector('iframe');
          if (frame) loadPreviewIntoFrame(frame, item);
        }
      });

      catalogGrid.appendChild(card);
      previewObserver.observe(previewBox);
    });
  }


  // Inspector modal, IDE workbench and the Add Feature Studio are separate modules (scripts/catalog/)
  const shared = {
    state,
    findItem: (slug) => allFeatures.find((f) => f.slug === slug),
    ensureFiles, copyText, loadPreviewIntoFrame, downloadHtmlFile
  };
  const inspector = window.CatalogInspector.createInspector(shared);
  const workbench = window.CatalogWorkbench.createWorkbench({
    ...shared, getFilteredFeatures, firstItem: () => allFeatures[0]
  });
  const studio = window.CatalogStudio.createStudio({ state, showToast, updateHeaderCounts, renderAll });
  const openInspector = inspector.openInspector;
  const renderWorkbench = workbench.renderWorkbench;

  // Top Bar Controls
  document.querySelectorAll('#collectionTabs .col-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#collectionTabs .col-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.collectionType = tab.getAttribute('data-type');
      if (state.collectionType === 'template') {
        state.category = 'all';
        state.source = 'all';
      } else if (state.collectionType === 'component' && state.category === 'Full Websites') {
        state.category = 'all';
      }
      renderAll();
    });
  });

  const onSearchInput = debounce((val) => {
    state.search = val;
    renderAll();
  }, 150);

  searchInput.addEventListener('input', (e) => {
    onSearchInput(e.target.value);
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || (e.metaKey && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape') {
      inspector.close();
      document.getElementById('addFeatureModal').classList.add('is-hidden');
    }
  });

  const modeCatalogBtn = document.getElementById('modeCatalogBtn');
  const modeWorkbenchBtn = document.getElementById('modeWorkbenchBtn');

  function setWorkspaceMode(mode) {
    state.mode = mode;
    modeCatalogBtn.classList.toggle('is-active', mode === 'catalog');
    modeWorkbenchBtn.classList.toggle('is-active', mode === 'workbench');
    catalogView.classList.toggle('is-hidden', mode !== 'catalog');
    workbenchView.classList.toggle('is-hidden', mode !== 'workbench');
    renderAll();
  }

  modeCatalogBtn.addEventListener('click', () => setWorkspaceMode('catalog'));
  modeWorkbenchBtn.addEventListener('click', () => setWorkspaceMode('workbench'));

  document.getElementById('pauseAllPreviewsBtn').addEventListener('click', (e) => {
    state.pauseOffscreen = !state.pauseOffscreen;
    const badge = document.getElementById('pauseStateBadge');
    if (badge) {
      badge.textContent = state.pauseOffscreen ? 'ON' : 'OFF';
      badge.classList.toggle('is-off', !state.pauseOffscreen);
    } else if (e && e.target) {
      e.target.textContent = `Pause Offscreen Previews: ${state.pauseOffscreen ? 'ON' : 'OFF'}`;
    }
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    state.collectionType = 'all';
    state.source = 'all';
    state.category = 'all';
    state.search = '';
    searchInput.value = '';
    const wbSearch = document.getElementById('wbSearchInput');
    if (wbSearch) wbSearch.value = '';
    document.querySelectorAll('#collectionTabs .col-tab').forEach((t) => {
      t.classList.toggle('is-active', t.getAttribute('data-type') === 'all');
    });
    renderAll();
  });

  // Workbench sidebar search filter
  const wbSearchInput = document.getElementById('wbSearchInput');
  if (wbSearchInput) {
    wbSearchInput.addEventListener('input', debounce((e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#wbTree .tree-item').forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
      });
    }, 100));
  }

  function renderAll() {
    updateHeaderCounts();
    renderFilterBars();
    if (state.mode === 'catalog') {
      renderCatalog();
    } else {
      renderWorkbench();
    }
  }

  // Handle URL query parameter ?mode=workbench
  if (typeof window !== 'undefined' && window.location && new URLSearchParams(window.location.search).get('mode') === 'workbench') {
    setWorkspaceMode('workbench');
  } else {
    renderAll();
  }
})();
