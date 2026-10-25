/**
 * Export modal controller: ZIP, copyable source and single-file HTML, including asset bundling.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createExportController(ctx) {
    const { stackManager, featureCache, featuresData, fetchFeatureFiles, openDrawer, nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, exportAssets = {}, weightMap = {} } = ctx;

    // 9. Export Modal & Project ZIP Generator Controller
    const exportModal = document.getElementById('exportModal');
    const exportModalBackdrop = document.getElementById('exportModalBackdrop');
    const openExportModalBtn = document.getElementById('openExportModalBtn');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    const exportEmptyGuard = document.getElementById('exportEmptyGuard');
    const exportPanelsWrapper = document.getElementById('exportPanelsWrapper');
    const exportEmptyAddBtn = document.getElementById('exportEmptyAddBtn');

    // Export navigation tabs
    const tabZip = document.getElementById('tabZip');
    const tabCode = document.getElementById('tabCode');
    const tabSingleHtml = document.getElementById('tabSingleHtml');
    const panelZip = document.getElementById('panelZip');
    const panelCode = document.getElementById('panelCode');
    const panelSingleHtml = document.getElementById('panelSingleHtml');

    // Code viewer elements
    const exportCodeViewer = document.getElementById('exportCodeViewer');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    const downloadCurrentCodeBtn = document.getElementById('downloadCurrentCodeBtn');

    // Actions
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const downloadSingleHtmlBtn = document.getElementById('downloadSingleHtmlBtn');
    const copySingleBundleBtn = document.getElementById('copySingleBundleBtn');
    const copyBundleBtnText = document.getElementById('copyBundleBtnText');

    let activeExportTab = 'zip';
    let activeCodeFile = 'index.html';
    let currentExportBundle = null;
    let currentExportAssets = {};
    let currentSingleHtml = '';

    /**
     * Helper: triggers a browser file download of a Blob or text.
     */
    function triggerDownload(content, filename, mimeType = 'application/octet-stream') {
      try {
        const blob = content instanceof Blob
          ? content
          : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        console.error('Download error:', err);
        showToast('Download failed');
      }
    }

    /**
     * Helper: Copies text to clipboard with animated visual feedback.
     */
    async function copyToClipboard(text, buttonEl, labelEl, defaultLabel, successLabel = '✓ Copied!') {
      if (!text) {
        showToast('No content to copy');
        return;
      }

      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (_) {}
      }

      if (!copied && typeof document !== 'undefined') {
        try {
          const tempArea = document.createElement('textarea');
          tempArea.value = text;
          tempArea.style.position = 'fixed';
          tempArea.style.left = '-9999px';
          document.body.appendChild(tempArea);
          tempArea.focus();
          tempArea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(tempArea);
        } catch (_) {}
      }

      if (copied) {
        if (labelEl) labelEl.textContent = successLabel;
        if (buttonEl) {
          buttonEl.classList.add('is-copied');
          buttonEl.style.borderColor = '#10b981';
          buttonEl.style.color = '#10b981';
        }
        showToast('Copied to clipboard!');
        setTimeout(() => {
          if (labelEl) labelEl.textContent = defaultLabel;
          if (buttonEl) {
            buttonEl.classList.remove('is-copied');
            buttonEl.style.borderColor = '';
            buttonEl.style.color = '';
          }
        }, 1500);
      } else {
        showToast('Could not copy to clipboard');
      }
    }

    /**
     * Generates export bundle & single file bundle from current stack and theme.
     */
    async function prepareExportData(exportOptions = {}) {
      const state = stackManager.getState();
      const currentStack = state.stack;

      if (!Array.isArray(currentStack) || currentStack.length === 0) {
        currentExportBundle = null;
        currentExportAssets = {};
        currentSingleHtml = '';
        return null;
      }

      // Ensure all section files are cached
      const missingSlugs = currentStack
        .map(s => s.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
      }

      const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;

      if (window.Assembler && typeof window.Assembler.generateExportBundle === 'function') {
        currentExportBundle = window.Assembler.generateExportBundle(currentStack, themeConfig, featuresData, { page: state.page, nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, review: !!exportOptions.review, csp: !!(document.getElementById('exportCspToggle') || {}).checked });
      }

      if (window.Assembler && typeof window.Assembler.generateSingleFileBundle === 'function') {
        currentSingleHtml = window.Assembler.generateSingleFileBundle(currentStack, themeConfig, featuresData, { page: state.page, nativeMap });
      } else if (window.Assembler && typeof window.Assembler.assemblePreviewDocument === 'function') {
        currentSingleHtml = window.Assembler.assemblePreviewDocument(currentStack, themeConfig, featuresData);
      }

      await bundleLocalAssets();

      return { bundle: currentExportBundle, singleHtml: currentSingleHtml, assets: currentExportAssets };
    }

    const ExportAssetsApi = window.ExportAssets || require('./export-assets.js');
    const assetBundler = ExportAssetsApi.createAssetBundler({
      assembler: window.Assembler,
      fetchFn: (url) => fetch(url)
    });

    /**
     * Root-relative assets (e.g. /assets/library/a.jpg) only resolve on the dev server.
     * Copies them into the ZIP under assets/ and inlines them as data URIs in the single-file HTML.
     * Assets that cannot be fetched are left untouched and reported in a toast.
     */
    async function bundleLocalAssets() {
      currentExportAssets = {};
      if (!window.Assembler || !window.Assembler.findLocalAssetUrls) return;
      const extraAssets = Array.from(new Set(stackManager.getStack().flatMap(s => exportAssets[s.slug] || [])));
      const result = await assetBundler.bundle({ files: currentExportBundle, singleHtml: currentSingleHtml, extraAssets });
      currentExportAssets = result.assets;
      if (currentExportBundle && window.FontHost && window.FontHost.cssUrl(stackManager.getState().page)) {
        const fonts = await window.FontHost.hostFonts({ files: currentExportBundle, page: stackManager.getState().page, fetchFn: (u) => fetch(u) });
        if (fonts.hosted) {
          Object.assign(currentExportAssets, fonts.assets);
          currentExportBundle['README.md'] = currentExportBundle['README.md'].replace(/Fonts load from Google Fonts via the `<link>` tag there and are applied/, 'Fonts are self-hosted in `assets/fonts/` (declared at the end of `style.css`) and are applied');
        } else {
          showToast('Page fonts could not be downloaded; the ZIP still loads them from Google Fonts', 4000);
        }
      }
      if (currentExportBundle && typeof currentExportBundle['README.md'] === 'string' && ExportAssetsApi.renderWeightReport) {
        const sections = stackManager.getStack().map(s => ({ slug: s.slug, title: (featuresData[s.slug] && featuresData[s.slug].title) || s.slug }));
        currentExportBundle['README.md'] += '\n' + ExportAssetsApi.renderWeightReport({ files: currentExportBundle, assets: result.assets, sections, weightMap });
      }
      if (currentExportBundle && typeof currentExportBundle['README.md'] === 'string' && ExportAssetsApi.renderExternalHostsReport) {
        currentExportBundle['README.md'] += '\n' + ExportAssetsApi.renderExternalHostsReport(currentExportBundle);
      }
      currentSingleHtml = result.singleHtml;
      if (result.missing.length) {
        console.warn('Export: assets not found and left as-is:', result.missing);
        showToast(`${result.missing.length} asset(s) could not be bundled (see console)`, 4000);
      }
    }

    /**
     * Updates the code viewer content and button labels based on activeCodeFile.
     */
    function updateCodeView() {
      if (!exportCodeViewer) return;

      if (!currentExportBundle && !currentSingleHtml) {
        exportCodeViewer.value = '// Stack is empty. Add sections to generate code.';
        return;
      }

      const copyLabelMap = {
        'index.html': 'Copy HTML',
        'style.css': 'Copy CSS',
        'script.js': 'Copy JS',
        'single-html': 'Copy Bundle'
      };

      if (copyBtnText) {
        copyBtnText.textContent = copyLabelMap[activeCodeFile] || 'Copy Code';
      }

      if (downloadCurrentCodeBtn) {
        downloadCurrentCodeBtn.style.display = activeCodeFile === 'single-html' ? 'inline-flex' : 'none';
      }

      if (activeCodeFile === 'single-html') {
        exportCodeViewer.value = currentSingleHtml || '';
      } else if (currentExportBundle && currentExportBundle[activeCodeFile] !== undefined) {
        exportCodeViewer.value = currentExportBundle[activeCodeFile] || '';
      } else {
        exportCodeViewer.value = '';
      }
    }

    /**
     * Switches the active export modal tab (zip, code, single-html).
     */
    async function setActiveExportTab(tabName) {
      activeExportTab = tabName;

      const tabs = [
        { el: tabZip, panel: panelZip, name: 'zip' },
        { el: tabCode, panel: panelCode, name: 'code' },
        { el: tabSingleHtml, panel: panelSingleHtml, name: 'single-html' }
      ];

      tabs.forEach(t => {
        if (!t.el) return;
        const isActive = t.name === tabName;
        t.el.classList.toggle('is-active', isActive);
        t.el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (t.panel) {
          t.panel.style.display = isActive ? 'block' : 'none';
          t.panel.classList.toggle('is-active', isActive);
        }
      });

      if (tabName === 'code' || tabName === 'single-html') {
        if (!currentExportBundle) {
          await prepareExportData();
        }
        if (tabName === 'code') {
          updateCodeView();
        }
      }
    }

    /**
     * Switches code file subtab (index.html, style.css, script.js, single-html).
     */
    function setActiveCodeSubtab(fileKey) {
      activeCodeFile = fileKey;

      const subtabButtons = document.querySelectorAll('.code-subtabs .subtab-btn');
      subtabButtons.forEach(btn => {
        const key = btn.getAttribute('data-code-file');
        btn.classList.toggle('is-active', key === fileKey);
      });

      updateCodeView();
    }

    /** Opens the Export Modal with zero-section guard check. */
    async function openExportModal() {
      if (!exportModal) return;

      const stack = stackManager.getStack();
      const isEmpty = !Array.isArray(stack) || stack.length === 0;

      if (isEmpty) {
        showToast('Please add at least one section before exporting.');
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'flex';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'none';
      } else {
        if (exportEmptyGuard) exportEmptyGuard.style.display = 'none';
        if (exportPanelsWrapper) exportPanelsWrapper.style.display = 'block';
        await prepareExportData();
        updateCodeView();
        renderPageChecks();
      }

      exportModal.classList.add('is-open');
      exportModal.setAttribute('aria-hidden', 'false');
    }

    const cspToggle = document.getElementById('exportCspToggle');
    if (cspToggle) cspToggle.addEventListener('change', async () => { await prepareExportData(); updateCodeView(); renderPageChecks(); });

    function closeExportModal() {
      if (!exportModal) return;
      exportModal.classList.remove('is-open');
      exportModal.setAttribute('aria-hidden', 'true');
    }

    // Modal Triggers
    if (openExportModalBtn) {
      openExportModalBtn.addEventListener('click', openExportModal);
    }
    if (closeExportModalBtn) {
      closeExportModalBtn.addEventListener('click', closeExportModal);
    }
    if (exportModalBackdrop) {
      exportModalBackdrop.addEventListener('click', closeExportModal);
    }
    if (exportEmptyAddBtn) {
      exportEmptyAddBtn.addEventListener('click', () => {
        closeExportModal();
        openDrawer();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (exportModal && exportModal.classList.contains('is-open')) {
          closeExportModal();
        }
      }
    });

    // Tab buttons wiring
    if (tabZip) tabZip.addEventListener('click', () => setActiveExportTab('zip'));
    if (tabCode) tabCode.addEventListener('click', () => setActiveExportTab('code'));
    if (tabSingleHtml) tabSingleHtml.addEventListener('click', () => setActiveExportTab('single-html'));

    // Code subtabs wiring
    const codeSubtabs = document.querySelectorAll('.code-subtabs .subtab-btn');
    codeSubtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const fileKey = btn.getAttribute('data-code-file');
        if (fileKey) setActiveCodeSubtab(fileKey);
      });
    });

    // Copy Code Button (on code subtabs panel)
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const text = exportCodeViewer ? exportCodeViewer.value : '';
        const labelMap = {
          'index.html': 'Copy HTML',
          'style.css': 'Copy CSS',
          'script.js': 'Copy JS',
          'single-html': 'Copy Bundle'
        };
        const defaultLabel = labelMap[activeCodeFile] || 'Copy Code';
        copyToClipboard(text, copyCodeBtn, copyBtnText, defaultLabel, '✓ Copied!');
      });
    }

    // Download Current Code (on Single-File subtab)
    if (downloadCurrentCodeBtn) {
      downloadCurrentCodeBtn.addEventListener('click', () => {
        if (!currentSingleHtml) {
          showToast('No bundle to download');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    // Copy Single File Bundle Button (on panelSingleHtml)
    if (copySingleBundleBtn) {
      copySingleBundleBtn.addEventListener('click', () => {
        copyToClipboard(currentSingleHtml, copySingleBundleBtn, copyBundleBtnText, 'Copy Bundle', '✓ Copied!');
      });
    }

    // Download Single File .html Button (on panelSingleHtml)
    if (downloadSingleHtmlBtn) {
      downloadSingleHtmlBtn.addEventListener('click', async () => {
        if (!currentSingleHtml) {
          await prepareExportData();
        }
        if (!currentSingleHtml) {
          showToast('Please add sections before downloading');
          return;
        }
        triggerDownload(currentSingleHtml, 'assembled-page.html', 'text/html;charset=utf-8');
        showToast('Downloaded assembled-page.html');
      });
    }

    /**
     * Multi-page sites: one HTML page (with its own CSS and JS) per page, shared assets and fonts once, and a sitemap that lists
     * every page. The home page keeps the standard names (index.html, style.css, script.js); the others use their slug.
     * Returns { files: {name: text}, assets: {name: bytes} }.
     */
    async function buildMultiPageFiles(exportOptions = {}) {
      const state = stackManager.getState();
      const pages = state.pages;
      const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
      const fileOf = (p) => (p.slug === 'index' ? 'index.html' : `${p.slug}.html`);
      const pageLinks = Object.fromEntries(pages.map(p => [p.id, fileOf(p)]));
      const pageFiles = pages.map(fileOf);
      const out = { files: {}, assets: {} };
      for (const p of pages) {
        const home = p.slug === 'index';
        const missing = p.stack.map(s => s.slug).filter(slug => slug && !featureCache.has(slug));
        if (missing.length) await Promise.all(missing.map(slug => fetchFeatureFiles(slug)));
        const settings = { ...state.page, title: home ? state.page.title : `${p.title} | ${state.page.title}`, description: p.description || state.page.description };
        const bundle = window.Assembler.generateExportBundle(p.stack, themeConfig, featuresData, { page: settings, nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, review: !!exportOptions.review, csp: !!(document.getElementById('exportCspToggle') || {}).checked, pageLinks, pageFiles });
        const extraAssets = Array.from(new Set(p.stack.flatMap(s => exportAssets[s.slug] || [])));
        const bundled = await assetBundler.bundle({ files: bundle, singleHtml: '', extraAssets });
        Object.assign(out.assets, bundled.assets);
        if (window.FontHost && window.FontHost.cssUrl(settings)) {
          const fonts = await window.FontHost.hostFonts({ files: bundle, page: settings, fetchFn: (u) => fetch(u) });
          if (fonts.hosted) Object.assign(out.assets, fonts.assets);
        }
        if (home) {
          ['index.html', 'style.css', 'script.js', 'README.md', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md'].forEach(n => { if (bundle[n] !== undefined) out.files[n] = bundle[n]; });
          out.files['README.md'] += `\n## Pages\n\n${pages.map(p2 => `- **${p2.title}**: \`${fileOf(p2)}\``).join('\n')}\n\nEach page has its own stylesheet and script (\`<page>.css\`, \`<page>.js\`); shared images and fonts are in \`assets/\`.\n`;
        } else {
          out.files[`${p.slug}.html`] = bundle['index.html'].replace('href="style.css"', `href="${p.slug}.css"`).replace('src="script.js"', `src="${p.slug}.js"`);
          out.files[`${p.slug}.css`] = bundle['style.css'];
          out.files[`${p.slug}.js`] = bundle['script.js'];
        }
      }
      return out;
    }

    /**
     * Download Project ZIP generator.
     * Generates a clean archive with index.html, style.css, script.js, and README.md.
     * Uses window.JSZip if available, otherwise uses native pure-JS zip creator.
     */
    async function handleDownloadZip(exportOptions = {}) {
      const stack = stackManager.getStack();
      if (!Array.isArray(stack) || stack.length === 0) {
        showToast('Please add at least one section before downloading ZIP.');
        return;
      }

      const originalBtnText = downloadZipBtn ? downloadZipBtn.innerHTML : '';
      if (downloadZipBtn) {
        downloadZipBtn.disabled = true;
        downloadZipBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <span>Packaging ZIP...</span>
        `;
      }

      try {
        await prepareExportData(exportOptions);
        if (!currentExportBundle) {
          throw new Error('Could not generate export bundle');
        }

        const zipFilename = exportOptions.review ? 'my-review-copy.zip' : 'my-assembled-page.zip';
        if (exportOptions.review) {
          currentExportBundle['README.md'] += '\n## Review copy\n\nThis copy has a Review button (bottom left). Open `index.html`, press **Comment mode**, click anything on the page and write what should change. Press **Review** to see the list and **Download comments** to send the file back. Comments stay in the browser until downloaded. Remove the review code before the final launch by exporting a normal copy.\n';
        }

        const multi = stackManager.getState().pages.length > 1;
        if (multi) {
          const site = await buildMultiPageFiles(exportOptions);
          if (exportOptions.review) site.files['README.md'] += '\n## Review copy\n\nOpen `index.html`, press **Comment mode**, click anything and write what should change; **Download comments** sends the file back. Remove the review code before launch by exporting a normal copy.\n';
          if (typeof window.JSZip !== 'undefined') {
            const zip = new window.JSZip();
            Object.entries(site.files).forEach(([name, text]) => zip.file(name, text));
            Object.entries(site.assets).forEach(([name, bytes]) => zip.file(name, bytes));
            triggerDownload(await zip.generateAsync({ type: 'blob' }), zipFilename, 'application/zip');
          } else {
            triggerDownload(new Blob([window.Assembler.createZipArchive(Object.assign({}, site.files, site.assets))], { type: 'application/zip' }), zipFilename, 'application/zip');
          }
        } else if (typeof window.JSZip !== 'undefined') {
          // 1. Client-side JSZip
          const zip = new window.JSZip();
          zip.file('index.html', currentExportBundle['index.html']);
          zip.file('style.css', currentExportBundle['style.css']);
          zip.file('script.js', currentExportBundle['script.js']);
          zip.file('README.md', currentExportBundle['README.md']);
          ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md'].forEach(n => { if (currentExportBundle[n]) zip.file(n, currentExportBundle[n]); });
          Object.entries(currentExportAssets).forEach(([name, bytes]) => zip.file(name, bytes));
          const blob = await zip.generateAsync({ type: 'blob' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else if (window.Assembler && typeof window.Assembler.createZipArchive === 'function') {
          // 2. Native Pure-JS ZIP Generator
          const zipBytes = window.Assembler.createZipArchive(Object.assign({}, currentExportBundle, currentExportAssets));
          const blob = new Blob([zipBytes], { type: 'application/zip' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else {
          throw new Error('No zip generator available');
        }

        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = `<span>✓ Downloaded!</span>`;
          downloadZipBtn.style.background = '#10b981';
        }
        showToast('Downloaded my-assembled-page.zip');

        setTimeout(() => {
          if (downloadZipBtn) {
            downloadZipBtn.innerHTML = originalBtnText;
            downloadZipBtn.style.background = '';
            downloadZipBtn.disabled = false;
          }
        }, 1500);
      } catch (err) {
        console.error('Error generating project ZIP:', err);
        showToast('Failed to generate project ZIP');
        if (downloadZipBtn) {
          downloadZipBtn.innerHTML = originalBtnText;
          downloadZipBtn.disabled = false;
        }
      }
    }

    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', () => handleDownloadZip());
    }
    const downloadReviewBtn = document.getElementById('downloadReviewBtn');
    if (downloadReviewBtn) downloadReviewBtn.addEventListener('click', () => handleDownloadZip({ review: true }));

    const notes = (window.BuilderExportNotes || require('./export-notes.js')).createExportNotes(ctx, { closeExportModal, getBundle: () => currentExportBundle });
    const { renderPageChecks, renderReviewComments } = notes;
    (window.BuilderExportReact || require('./export-react-download.js')).createReactDownload(ctx, { triggerDownload });

    return {
      prepareExportData,
      setActiveExportTab,
      setActiveCodeSubtab,
      openExportModal,
      closeExportModal,
      handleDownloadZip,
      renderReviewComments
    };
  }

  const api = { createExportController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderExport = api;
})();
