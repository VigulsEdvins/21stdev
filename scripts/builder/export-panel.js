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
    /** PNG versions of an emoji favicon (apple-touch icon and manifest icons); {} for an image address or none. */
    async function iconFiles(page) {
      const fp = window.FaviconPng;
      if (!fp) return {};
      try { return await fp.renderEmojiIcons(fp.emojiOf(page)); } catch (_) { return {}; }
    }

    async function bundleLocalAssets() {
      currentExportAssets = {};
      if (!window.Assembler || !window.Assembler.findLocalAssetUrls) return;
      const extraAssets = Array.from(new Set(stackManager.getStack().flatMap(s => exportAssets[s.slug] || [])));
      const result = await assetBundler.bundle({ files: currentExportBundle, singleHtml: currentSingleHtml, extraAssets });
      currentExportAssets = result.assets;
      Object.assign(currentExportAssets, await iconFiles(stackManager.getState().page));
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
        if (home) Object.assign(out.assets, await iconFiles(settings));
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

    const cmsMeta = {}; // slug -> named fields from meta.json
    async function cmsExplicitFor(slug) {
      if (!(slug in cmsMeta)) {
        try {
          const res = await fetch(`features/${encodeURIComponent(slug)}/meta.json`);
          const meta = res.ok ? await res.json() : {};
          cmsMeta[slug] = Array.isArray(meta.customizable) && meta.customizable.length ? meta.customizable : undefined;
        } catch (_) { cmsMeta[slug] = undefined; }
      }
      return cmsMeta[slug];
    }

    /**
     * The content editor for a ZIP: admin.html, admin.css, admin.js, cms.js and cms-content.js, plus the pages with the
     * two CMS scripts added. `pagesIn` is [{ file, title, stack, settings, script }]; returns { files, pages } where
     * `pages` maps a page file to its new HTML.
     */
    async function buildCms(pagesIn, html, pageLinks, { inPlace = false } = {}) {
      const cms = window.BuilderCms;
      const state = stackManager.getState();
      const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
      const pages = [];
      const docs = {};
      for (const p of pagesIn) {
        const missing = p.stack.map(s => s.slug).filter(slug => slug && !featureCache.has(slug));
        if (missing.length) await Promise.all(missing.map(slug => fetchFeatureFiles(slug)));
        // editing in place starts from the original content, so "reset" has something to go back to
        const baseStack = inPlace ? p.stack.map(s => ({ ...s, overrides: {} })) : p.stack;
        const doc = window.Assembler.generateSingleFileBundle(baseStack, themeConfig, featuresData, { page: p.settings, nativeMap, pageLinks });
        docs[p.file] = doc;
        const sections = p.stack.filter(s => !s.hidden).map((s, i) => ({
          id: s.id || `sec-${i + 1}`,
          slug: s.slug,
          title: s.title || (featuresData[s.slug] && (featuresData[s.slug].title || featuresData[s.slug].name)) || s.slug
        }));
        pages.push({
          file: p.file,
          title: p.title,
          sections: await cms.discoverSections({ html: doc, sections, discoverFields: window.BuilderExtras.discoverFields, explicitFor: cmsExplicitFor })
        });
      }
      const files = await cms.runtimeFiles((url) => fetch(url));
      const published = {};
      if (inPlace) {
        pagesIn.forEach((p, i) => p.stack.forEach(sec => {
          const known = (pages[i].sections.find(x => x.id === sec.id) || { fields: [] }).fields;
          Object.entries(sec.overrides || {}).forEach(([fieldId, o]) => {
            if (!o || o.value === undefined || !known.some(f => f.id === fieldId)) return;
            ((published[p.file] = published[p.file] || {})[sec.id] = published[p.file][sec.id] || {})[fieldId] = String(o.value);
          });
        }));
      }
      files['cms-content.js'] = cms.buildContent({ site: stackManager.getState().page.title || 'Website', pages, published });
      const patched = {};
      if (html) pagesIn.forEach(p => { patched[p.file] = cms.injectTags(html[p.file], p.script); });
      return { files, docs, pages: patched, fields: pages.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.fields.length, 0), 0) };
    }

    /**
     * The admin panel: the Content tab's "Open admin panel" button. Shows the editor over the builder; every change goes
     * to the section's content edits (the same ones the Content tab writes), so the preview and the export follow.
     */
    const adminOverlay = document.getElementById('adminOverlay');
    const adminFrame = document.getElementById('adminFrame');
    function closeAdmin() {
      if (!adminOverlay || adminOverlay.hidden) return;
      adminOverlay.hidden = true;
      const old = adminFrame.src;
      adminFrame.removeAttribute('src');
      if (old && old.startsWith('blob:')) URL.revokeObjectURL(old);
      delete window.__cmsBridge;
      document.body.style.overflow = '';
    }
    async function openAdmin() {
      const btn = document.getElementById('openAdminBtn');
      const st = stackManager.getState();
      if (!window.BuilderCms || !adminOverlay) return;
      if (!st.stack.some(s => !s.hidden)) { showToast('Add a section first, then open the admin panel.'); return; }
      const label = btn && btn.textContent;
      if (btn) { btn.disabled = true; btn.textContent = 'Opening…'; }
      try {
        const pageIn = { file: 'index.html', title: (st.pages.find(p => p.id === st.activePageId) || {}).title || 'Home', stack: st.stack, settings: st.page, script: '' };
        const cms = await buildCms([pageIn], null, undefined, { inPlace: true });
        const html = window.BuilderCms.buildPreviewPage({ files: cms.files, docs: cms.docs });
        window.__cmsBridge = {
          setOverride: (sectionId, fieldId, value, def) => stackManager.setSectionOverride(sectionId, fieldId, value, def),
          close: closeAdmin
        };
        adminFrame.src = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        adminOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
      } catch (err) {
        console.error('Admin panel could not be opened:', err);
        showToast('The admin panel could not be opened.', 4000);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    }
    const openAdminBtn = document.getElementById('openAdminBtn');
    if (openAdminBtn) openAdminBtn.addEventListener('click', openAdmin);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && adminOverlay && !adminOverlay.hidden) closeAdmin(); });

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

        const cmsToggle = document.getElementById('exportCmsToggle');
        const cmsOn = !!window.BuilderCms && (!cmsToggle || cmsToggle.checked);
        const multi = stackManager.getState().pages.length > 1;
        let cmsFiles = {};
        const addCms = async (pagesIn, htmlByFile, readmeFiles, intoFiles, pageLinks) => {
          try {
            const cms = await buildCms(pagesIn, htmlByFile, pageLinks);
            Object.assign(intoFiles, cms.pages, cms.files);
            intoFiles['README.md'] += window.BuilderCms.readmeSection(readmeFiles);
            cmsFiles = cms.files;
          } catch (err) {
            console.error('Content editor could not be added:', err);
            showToast('The content editor could not be added; the ZIP has the page only.', 5000);
          }
        };
        if (!multi && cmsOn) {
          const st = stackManager.getState();
          await addCms([{ file: 'index.html', title: 'Home', stack: st.stack, settings: st.page, script: 'script.js' }], { 'index.html': currentExportBundle['index.html'] }, ['index.html'], currentExportBundle);
        }
        if (multi) {
          const site = await buildMultiPageFiles(exportOptions);
          if (cmsOn) {
            const st = stackManager.getState();
            const fileOf = (p) => (p.slug === 'index' ? 'index.html' : `${p.slug}.html`);
            const pageLinks = Object.fromEntries(st.pages.map(p => [p.id, fileOf(p)]));
            await addCms(
              st.pages.map(p => ({ file: fileOf(p), title: p.title, stack: p.stack, settings: { ...st.page, title: p.slug === 'index' ? st.page.title : `${p.title} | ${st.page.title}` }, script: p.slug === 'index' ? 'script.js' : `${p.slug}.js` })),
              Object.fromEntries(st.pages.map(p => [fileOf(p), site.files[fileOf(p)]])),
              st.pages.map(fileOf), site.files, pageLinks);
          }
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
          ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md', ...Object.keys(cmsFiles)].forEach(n => { if (currentExportBundle[n]) zip.file(n, currentExportBundle[n]); });
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
