/**
 * Inspector modal of the catalogue: live preview, code tabs and copy/download actions for one item.
 */
(function () {
  'use strict';
  const H = (typeof window !== 'undefined' && window.CatalogHelpers) || require('./helpers.js');
  const { escapeHtml, getItemName, getRelativeFolderPath, getAbsoluteFolderPath, getAgentReference, getAvailableTabs } = H;

  /** ctx: { state, findItem(slug), ensureFiles(item), copyText(text, label), loadPreviewIntoFrame(frame, item), downloadHtmlFile(item) } */
  function createInspector(ctx) {
    const { state, findItem, ensureFiles, copyText, loadPreviewIntoFrame, downloadHtmlFile } = ctx;
    const inspectorModal = document.getElementById('inspectorModal');
    const inspPreviewFrame = document.getElementById('inspPreviewFrame');
    const inspCodeTabs = document.getElementById('inspCodeTabs');
    const inspCodeContent = document.getElementById('inspCodeContent');
    let inspectedItem = null;

    async function openInspector(slug) {
      const item = findItem(slug);
      if (!item) return;
      await ensureFiles(item);
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
      tagsEl.innerHTML = (item.tags || []).map((t) => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('');

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

    return { openInspector, close: () => inspectorModal.classList.add('is-hidden') };
  }

  const api = { createInspector };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CatalogInspector = api;
})();
