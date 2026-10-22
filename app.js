(function () {
  const STORAGE_KEY = '21st_local_custom_features_v1';
  const WORKSPACE_ROOT = '/home/edvins/features-for-web/web-for-options';

  const rawReg = window.FEATURE_REGISTRY;
  const baseRegistry = Array.isArray(rawReg)
    ? rawReg
    : (rawReg && Array.isArray(rawReg.items) ? rawReg.items : []);

  function loadCustomFeatures() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustomFeatures(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function combineRuntimeHtml(html, css, js) {
    const cleanCss = (css || '').trim();
    const cleanJs = (js || '').trim();
    let out = html || '';
    if (/<link[^>]+href=["']style\.css["'][^>]*>/i.test(out)) {
      out = out.replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, () => `<style>\n${cleanCss}\n</style>`);
    } else {
      out = `<style>\n${cleanCss}\n</style>\n` + out;
    }
    if (/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i.test(out)) {
      out = out.replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i, () => `<script>\n${cleanJs}\n</script>`);
    } else {
      out = out + `\n<script>\n${cleanJs}\n</script>`;
    }
    return out;
  }

  let customFeatures = loadCustomFeatures();
  let allFeatures = [...baseRegistry, ...customFeatures];

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

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    showToast(label || 'Copied to clipboard');
  }

  function getItemName(item) {
    return item.name || item.title || item.slug;
  }

  function getRelativeFolderPath(item) {
    return item.relativePath || `features/${item.slug}`;
  }

  function getAbsoluteFolderPath(item) {
    if (item.sourceFolder) return item.sourceFolder;
    if (item.folderPath && item.folderPath.startsWith('/')) return item.folderPath;
    return `${WORKSPACE_ROOT}/${getRelativeFolderPath(item)}`;
  }

  function getAgentReference(item) {
    const absPath = getAbsoluteFolderPath(item);
    return `Take the "${getItemName(item)}" feature from ${absPath} (index.html, style.css, script.js) and integrate it.`;
  }

  function downloadHtmlFile(item) {
    const blob = new Blob([item.files.combined], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${item.slug}.html`);
  }

  function updateHeaderCounts() {
    allFeatures = [...baseRegistry, ...customFeatures];
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
      btn.innerHTML = `<span class="pill-label">${src === 'all' ? 'All Sources' : src}</span><span class="pill-count">${count}</span>`;
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
      btn.innerHTML = `<span class="pill-label">${cat === 'all' ? 'All Categories' : cat}</span><span class="pill-count">${count}</span>`;
      btn.addEventListener('click', () => {
        state.category = cat;
        if (cat === 'Full Templates' && state.collectionType === 'component') {
          state.collectionType = 'all';
          syncCollectionTabsUI();
        } else if (cat !== 'all' && cat !== 'Full Templates' && state.collectionType === 'template') {
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
      chip.innerHTML = `${state.collectionType === 'template' ? 'Templates' : 'Components'} <button class="active-chip-clear" title="Remove">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.collectionType = 'all'; syncCollectionTabsUI(); renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.source !== 'all') {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `${state.source} <button class="active-chip-clear" title="Remove">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.source = 'all'; renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.category !== 'all') {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `${state.category} <button class="active-chip-clear" title="Remove">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => { state.category = 'all'; renderAll(); });
      tagsEl.appendChild(chip);
    }
    if (state.search.trim()) {
      const chip = document.createElement('span');
      chip.className = 'active-chip';
      chip.innerHTML = `"${state.search}" <button class="active-chip-clear" title="Remove">&times;</button>`;
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
    } else {
      frame.removeAttribute('src');
      frame.srcdoc = item.files.combined;
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
          iframe.srcdoc = item.files.combined;
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
        <button type="button" class="action-btn primary" id="emptyResetBtn">Show All 26 Features &amp; Templates</button>
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
      const hasTsx = Boolean(item.files && item.files.tsx);

      const previewBox = document.createElement('div');
      previewBox.className = 'card-preview-box';
      previewBox.setAttribute('data-slug', item.slug);

      previewBox.innerHTML = `
        <div class="preview-Overlay-bar">
          <div class="badge-group">
            <span class="source-badge">${item.source}</span>
            <span class="cat-badge">${item.category}</span>
            ${hasTsx ? '<span class="tsx-badge">React TSX + Vanilla</span>' : ''}
          </div>
          <div class="preview-quick-btns">
            <button class="mini-icon-btn" data-action="reload" title="Reload Live Preview">&#8635;</button>
            <button class="mini-icon-btn" data-action="inspect" title="Open Full Code &amp; Preview Inspector">&nearr;</button>
          </div>
        </div>
      `;

      const info = document.createElement('div');
      info.className = 'card-info';
      const folderDisplay = getRelativeFolderPath(item);
      const itemName = getItemName(item);

      let extraTemplateBtns = '';
      if (item.liveSiteUrl) {
        extraTemplateBtns += `<a class="action-btn accent" href="${item.liveSiteUrl}" target="_blank" rel="noopener">Live Site &nearr;</a>`;
      }
      if (item.adminUrl) {
        extraTemplateBtns += `<a class="action-btn accent" href="${item.adminUrl}" target="_blank" rel="noopener">Admin CMS &nearr;</a>`;
      }

      info.innerHTML = `
        <div>
          <div class="card-title-row">
            <h2 class="card-title">${itemName}</h2>
            <code class="card-slug">${folderDisplay}</code>
          </div>
          <p class="card-desc">${item.description}</p>
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
          const codeToCopy = (item.type === 'template' && item.files.siteHtml) ? item.files.siteHtml : item.files.combined;
          copyText(codeToCopy, `Copied code for ${itemName}`);
        } else if (action === 'copy-path') {
          copyText(getAbsoluteFolderPath(item), `Copied path: ${getAbsoluteFolderPath(item)}`);
        } else if (action === 'inspect') {
          openInspector(item.slug);
        } else if (action === 'reload') {
          const frame = previewBox.querySelector('iframe');
          if (frame) frame.srcdoc = item.files.combined;
        }
      });

      catalogGrid.appendChild(card);
      previewObserver.observe(previewBox);
    });
  }

  // File Tab Helper
  function getAvailableTabs(item) {
    const tabs = [];
    if (item.type === 'template' && item.files && item.files.siteHtml) {
      tabs.push({ id: 'siteHtml', label: 'Full Site index.html', content: item.files.siteHtml });
      if (item.files.siteWorkHtml) tabs.push({ id: 'siteWorkHtml', label: 'Work work.html', content: item.files.siteWorkHtml });
      if (item.files.siteCss) tabs.push({ id: 'siteCss', label: 'Full Site styles.css', content: item.files.siteCss });
      if (item.files.siteJs) tabs.push({ id: 'siteJs', label: 'Full Site app.js / main.js', content: item.files.siteJs });
      if (item.files.siteDataJs) tabs.push({ id: 'siteDataJs', label: 'CMS / Config Data', content: item.files.siteDataJs });
      if (item.files.adminHtml) tabs.push({ id: 'adminHtml', label: 'CMS admin.html', content: item.files.adminHtml });
      tabs.push({ id: 'combined', label: 'Card Showcase HTML', content: item.files.combined });
    } else {
      tabs.push(
        { id: 'combined', label: 'Combined (1-File)', content: item.files.combined },
        { id: 'html', label: 'index.html', content: item.files.html },
        { id: 'css', label: 'style.css', content: item.files.css },
        { id: 'js', label: 'script.js', content: item.files.js }
      );
    }
    if (item.files && item.files.tsx) {
      tabs.push({ id: 'tsx', label: 'component.tsx', content: item.files.tsx });
    }
    tabs.push({
      id: 'meta',
      label: 'meta.json',
      content: JSON.stringify({
        name: getItemName(item),
        slug: item.slug,
        category: item.category,
        source: item.source,
        type: item.type,
        description: item.description,
        tags: item.tags,
        tech: item.tech,
        folderPath: getAbsoluteFolderPath(item)
      }, null, 2)
    });
    return tabs;
  }

  // Inspector Modal
  const inspectorModal = document.getElementById('inspectorModal');
  const inspPreviewFrame = document.getElementById('inspPreviewFrame');
  const inspCodeTabs = document.getElementById('inspCodeTabs');
  const inspCodeContent = document.getElementById('inspCodeContent');
  let inspectedItem = null;

  function openInspector(slug) {
    const item = allFeatures.find((f) => f.slug === slug);
    if (!item) return;
    inspectedItem = item;
    const tabs = getAvailableTabs(item);
    state.inspActiveTab = tabs[0] ? tabs[0].id : 'combined';

    document.getElementById('inspSourceBadge').textContent = item.source;
    document.getElementById('inspTitle').textContent = getItemName(item);
    document.getElementById('inspFolderPath').textContent = getAbsoluteFolderPath(item);
    document.getElementById('inspDescription').textContent = item.description;
    document.getElementById('inspStandaloneLink').href = item.liveSiteUrl || `${getRelativeFolderPath(item)}/index.html`;

    const tplBtns = document.getElementById('inspTemplateBtns');
    tplBtns.innerHTML = '';
    if (item.liveSiteUrl) {
      tplBtns.innerHTML += `<a class="subtle-btn" href="${item.liveSiteUrl}" target="_blank" rel="noopener">Full Site &nearr;</a> `;
    }
    if (item.adminUrl) {
      tplBtns.innerHTML += `<a class="subtle-btn" href="${item.adminUrl}" target="_blank" rel="noopener">Admin CMS &nearr;</a>`;
    }

    const tagsEl = document.getElementById('inspTags');
    tagsEl.innerHTML = (item.tags || []).map((t) => `<span class="tag-chip">#${t}</span>`).join('');

    loadPreviewIntoFrame(inspPreviewFrame, item);
    renderInspectorCodeTabs();
    inspectorModal.classList.remove('is-hidden');
  }

  function renderInspectorCodeTabs() {
    if (!inspectedItem) return;
    const tabs = getAvailableTabs(inspectedItem);
    inspCodeTabs.innerHTML = '';
    tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-tab' + (state.inspActiveTab === tab.id ? ' is-active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        state.inspActiveTab = tab.id;
        renderInspectorCodeTabs();
      });
      inspCodeTabs.appendChild(btn);
    });
    const activeObj = tabs.find((t) => t.id === state.inspActiveTab) || tabs[0];
    inspCodeContent.textContent = activeObj.content;
  }

  document.getElementById('closeInspectorBtn').addEventListener('click', () => {
    inspectorModal.classList.add('is-hidden');
    inspPreviewFrame.removeAttribute('src');
    inspPreviewFrame.srcdoc = '';
  });

  document.getElementById('inspCopyPathBtn').addEventListener('click', () => {
    if (inspectedItem) copyText(getAbsoluteFolderPath(inspectedItem), 'Copied folder path');
  });

  document.getElementById('inspCopyAgentBtn').addEventListener('click', () => {
    if (inspectedItem) copyText(getAgentReference(inspectedItem), 'Copied Agent implementation reference');
  });

  document.getElementById('inspCopyCombinedBtn').addEventListener('click', () => {
    if (inspectedItem) {
      const code = (inspectedItem.type === 'template' && inspectedItem.files.siteHtml)
        ? inspectedItem.files.siteHtml
        : inspectedItem.files.combined;
      copyText(code, 'Copied HTML bundle');
    }
  });

  document.getElementById('inspCopyActiveTabBtn').addEventListener('click', () => {
    if (!inspectedItem) return;
    const tabs = getAvailableTabs(inspectedItem);
    const activeObj = tabs.find((t) => t.id === state.inspActiveTab) || tabs[0];
    copyText(activeObj.content, `Copied ${activeObj.label}`);
  });

  document.getElementById('inspDownloadBtn').addEventListener('click', () => {
    if (inspectedItem) downloadHtmlFile(inspectedItem);
  });

  document.getElementById('inspReloadFrameBtn').addEventListener('click', () => {
    if (inspectedItem) loadPreviewIntoFrame(inspPreviewFrame, inspectedItem);
  });

  document.querySelectorAll('#inspViewportGroup .vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#inspViewportGroup .vp-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById('inspIframeHolder').style.width = btn.getAttribute('data-vp');
    });
  });

  // IDE Workbench Mode
  const wbTree = document.getElementById('wbTree');
  const wbPreviewFrame = document.getElementById('wbPreviewFrame');
  const wbCodeTabs = document.getElementById('wbCodeTabs');
  const wbCodeDisplay = document.getElementById('wbCodeDisplay');

  function renderWorkbench() {
    const filtered = getFilteredFeatures();
    if (!filtered.some((f) => f.slug === state.activeSlug) && filtered[0]) {
      state.activeSlug = filtered[0].slug;
    }

    wbTree.innerHTML = '';
    const bySource = {};
    filtered.forEach((item) => {
      if (!bySource[item.source]) bySource[item.source] = [];
      bySource[item.source].push(item);
    });

    Object.keys(bySource).forEach((src) => {
      const header = document.createElement('div');
      header.className = 'tree-group-label';
      header.textContent = `${src} (${bySource[src].length})`;
      wbTree.appendChild(header);

      bySource[src].forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tree-item' + (item.slug === state.activeSlug ? ' is-active' : '');
        btn.innerHTML = `<span>${getItemName(item)}</span>`;
        btn.addEventListener('click', () => {
          state.activeSlug = item.slug;
          renderWorkbench();
        });
        wbTree.appendChild(btn);
      });
    });

    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug) || allFeatures[0];
    if (!activeItem) return;

    document.getElementById('wbActiveSource').textContent = activeItem.source;
    document.getElementById('wbActiveName').textContent = getItemName(activeItem);
    document.getElementById('wbActivePath').textContent = getAbsoluteFolderPath(activeItem);
    document.getElementById('wbActiveDesc').textContent = activeItem.description;
    document.getElementById('wbOpenStandaloneBtn').href = activeItem.liveSiteUrl || `${getRelativeFolderPath(activeItem)}/index.html`;

    const tplLinks = document.getElementById('wbTemplateLinks');
    tplLinks.innerHTML = '';
    if (activeItem.liveSiteUrl) {
      tplLinks.innerHTML += `<a class="subtle-btn" href="${activeItem.liveSiteUrl}" target="_blank" rel="noopener">Launch Live Site &nearr;</a> `;
    }
    if (activeItem.adminUrl) {
      tplLinks.innerHTML += `<a class="subtle-btn" href="${activeItem.adminUrl}" target="_blank" rel="noopener">Open Admin CMS &nearr;</a>`;
    }

    if (wbPreviewFrame.getAttribute('data-loaded-slug') !== activeItem.slug) {
      loadPreviewIntoFrame(wbPreviewFrame, activeItem);
      wbPreviewFrame.setAttribute('data-loaded-slug', activeItem.slug);
    }

    const tabs = getAvailableTabs(activeItem);
    if (!tabs.some((t) => t.id === state.wbActiveTab) && tabs[0]) {
      state.wbActiveTab = tabs[0].id;
    }
    wbCodeTabs.innerHTML = '';
    tabs.forEach((tab) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'code-tab' + (state.wbActiveTab === tab.id ? ' is-active' : '');
      b.textContent = tab.label;
      b.addEventListener('click', () => {
        state.wbActiveTab = tab.id;
        renderWorkbench();
      });
      wbCodeTabs.appendChild(b);
    });

    const activeTabObj = tabs.find((t) => t.id === state.wbActiveTab) || tabs[0];
    wbCodeDisplay.textContent = activeTabObj.content;
  }

  document.getElementById('wbReloadBtn').addEventListener('click', () => {
    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug);
    if (activeItem) loadPreviewIntoFrame(wbPreviewFrame, activeItem);
  });

  document.getElementById('wbCopyPathBtn').addEventListener('click', () => {
    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug);
    if (activeItem) copyText(getAbsoluteFolderPath(activeItem), 'Copied folder path');
  });

  document.getElementById('wbCopyCodeBtn').addEventListener('click', () => {
    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug);
    if (!activeItem) return;
    const tabs = getAvailableTabs(activeItem);
    const activeTabObj = tabs.find((t) => t.id === state.wbActiveTab) || tabs[0];
    copyText(activeTabObj.content, `Copied ${activeTabObj.label}`);
  });

  document.getElementById('wbDownloadHtmlBtn').addEventListener('click', () => {
    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug);
    if (activeItem) downloadHtmlFile(activeItem);
  });

  document.getElementById('wbCopyAgentRefBtn').addEventListener('click', () => {
    const activeItem = allFeatures.find((f) => f.slug === state.activeSlug);
    if (activeItem) copyText(getAgentReference(activeItem), 'Copied Agent folder reference');
  });

  document.querySelectorAll('#wbViewportGroup .vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wbViewportGroup .vp-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById('wbIframeWrap').style.width = btn.getAttribute('data-vp');
    });
  });

  // Top Bar Controls
  document.querySelectorAll('#collectionTabs .col-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#collectionTabs .col-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.collectionType = tab.getAttribute('data-type');
      if (state.collectionType === 'template') {
        state.category = 'all';
        state.source = 'all';
      } else if (state.collectionType === 'component' && state.category === 'Full Templates') {
        state.category = 'all';
      }
      renderAll();
    });
  });

  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderAll();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || (e.metaKey && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape') {
      inspectorModal.classList.add('is-hidden');
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

  // Mobile sidebar toggle
  const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  if (mobileSidebarToggle) {
    mobileSidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('catalogSidebar');
      if (sidebar) sidebar.classList.toggle('is-open');
    });
  }

  // Workbench sidebar search filter
  const wbSearchInput = document.getElementById('wbSearchInput');
  if (wbSearchInput) {
    wbSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#wbTree .tree-item').forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // Add Feature Studio Modal
  const addFeatureModal = document.getElementById('addFeatureModal');
  const newFeatureName = document.getElementById('newFeatureName');
  const newFeatureSlug = document.getElementById('newFeatureSlug');

  newFeatureName.addEventListener('input', () => {
    newFeatureSlug.value = newFeatureName.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  });

  document.getElementById('openAddModalBtn').addEventListener('click', () => {
    addFeatureModal.classList.remove('is-hidden');
  });

  document.getElementById('closeAddModalBtn').addEventListener('click', () => {
    addFeatureModal.classList.add('is-hidden');
  });

  function buildCustomFeatureFromForm() {
    const name = newFeatureName.value.trim() || 'Custom Feature';
    const slug = (newFeatureSlug.value.trim() || 'custom-feature').toLowerCase();
    const category = document.getElementById('newFeatureCategory').value;
    const source = document.getElementById('newFeatureSource').value.trim() || 'custom';
    const type = document.getElementById('newFeatureType').value;
    const description = document.getElementById('newFeatureDesc').value.trim();
    const tags = document.getElementById('newFeatureTags').value.split(',').map((s) => s.trim()).filter(Boolean);
    const html = document.getElementById('newFeatureHtml').value;
    const css = document.getElementById('newFeatureCss').value;
    const js = document.getElementById('newFeatureJs').value;
    const combined = combineRuntimeHtml(html, css, js);

    return {
      name,
      slug,
      category,
      source,
      type,
      description,
      tags,
      tech: ['Custom HTML/CSS/JS'],
      dependencies: [],
      order: 100 + customFeatures.length,
      folderPath: `features/${slug}`,
      files: { html, css, js, tsx: null, combined }
    };
  }

  document.getElementById('addFeatureForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = buildCustomFeatureFromForm();
    customFeatures = customFeatures.filter((f) => f.slug !== item.slug).concat(item);
    saveCustomFeatures(customFeatures);
    updateHeaderCounts();
    state.activeSlug = item.slug;
    addFeatureModal.classList.add('is-hidden');
    renderAll();
    showToast(`Added "${item.name}" to Vault`);
  });

  document.getElementById('exportCustomBundleBtn').addEventListener('click', () => {
    const item = buildCustomFeatureFromForm();
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.slug}-vault-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${item.slug}-vault-bundle.json`);
  });

  document.getElementById('clearCustomFeaturesBtn').addEventListener('click', () => {
    customFeatures = [];
    saveCustomFeatures([]);
    updateHeaderCounts();
    renderAll();
    showToast('Cleared custom localStorage features');
  });

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
