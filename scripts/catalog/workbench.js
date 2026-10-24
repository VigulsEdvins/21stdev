/**
 * IDE workbench of the catalogue: source tree, preview and code tabs for the active item.
 */
(function () {
  'use strict';
  const H = (typeof window !== 'undefined' && window.CatalogHelpers) || require('./helpers.js');
  const { escapeHtml, getItemName, getRelativeFolderPath, getAbsoluteFolderPath, getAgentReference, getAvailableTabs } = H;

  /** ctx: { state, getFilteredFeatures(), findItem(slug), firstItem(), ensureFiles(item), copyText(text, label), loadPreviewIntoFrame(frame, item), downloadHtmlFile(item) } */
  function createWorkbench(ctx) {
    const { state, getFilteredFeatures, findItem, firstItem, ensureFiles, copyText, loadPreviewIntoFrame, downloadHtmlFile } = ctx;
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
          btn.innerHTML = `<span>${escapeHtml(getItemName(item))}</span>`;
          btn.addEventListener('click', () => {
            state.activeSlug = item.slug;
            renderWorkbench();
          });
          wbTree.appendChild(btn);
        });
      });

      const activeItem = findItem(state.activeSlug) || firstItem();
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

      const renderTabs = () => {
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
      };
      if (activeItem.files) {
        renderTabs();
      } else {
        wbCodeTabs.innerHTML = '';
        wbCodeDisplay.textContent = 'Loading source…';
        ensureFiles(activeItem).then(() => {
          if (state.activeSlug === activeItem.slug) renderTabs();
        });
      }
    }

    document.getElementById('wbReloadBtn').addEventListener('click', () => {
      const activeItem = findItem(state.activeSlug);
      if (activeItem) loadPreviewIntoFrame(wbPreviewFrame, activeItem);
    });

    document.getElementById('wbCopyPathBtn').addEventListener('click', () => {
      const activeItem = findItem(state.activeSlug);
      if (activeItem) copyText(getAbsoluteFolderPath(activeItem), 'Copied folder path');
    });

    document.getElementById('wbCopyCodeBtn').addEventListener('click', () => {
      const activeItem = findItem(state.activeSlug);
      if (!activeItem) return;
      ensureFiles(activeItem).then(() => {
        const tabs = getAvailableTabs(activeItem);
        const activeTabObj = tabs.find((t) => t.id === state.wbActiveTab) || tabs[0];
        copyText(activeTabObj.content, `Copied ${activeTabObj.label}`);
      });
    });

    document.getElementById('wbDownloadHtmlBtn').addEventListener('click', () => {
      const activeItem = findItem(state.activeSlug);
      if (activeItem) downloadHtmlFile(activeItem);
    });

    document.getElementById('wbCopyAgentRefBtn').addEventListener('click', () => {
      const activeItem = findItem(state.activeSlug);
      if (activeItem) copyText(getAgentReference(activeItem), 'Copied Agent folder reference');
    });

    document.querySelectorAll('#wbViewportGroup .vp-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wbViewportGroup .vp-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        document.getElementById('wbIframeWrap').style.width = btn.getAttribute('data-vp');
      });
    });

    return { renderWorkbench };
  }

  const api = { createWorkbench };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CatalogWorkbench = api;
})();
