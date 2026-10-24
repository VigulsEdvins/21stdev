/**
 * Export modal controller: ZIP, copyable source and single-file HTML, including asset bundling.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createExportController(ctx) {
    const { stackManager, featureCache, featuresData, fetchFeatureFiles, openDrawer, nativeMap, ownPalette, licenseMap, exportAssets = {}, weightMap = {} } = ctx;

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
    const downloadReactBtn = document.getElementById('downloadReactBtn');
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
        currentExportBundle = window.Assembler.generateExportBundle(currentStack, themeConfig, featuresData, { page: state.page, nativeMap, ownPalette, licenseMap, review: !!exportOptions.review });
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
      if (currentExportBundle && typeof currentExportBundle['README.md'] === 'string' && ExportAssetsApi.renderWeightReport) {
        const sections = stackManager.getStack().map(s => ({ slug: s.slug, title: (featuresData[s.slug] && featuresData[s.slug].title) || s.slug }));
        currentExportBundle['README.md'] += '\n' + ExportAssetsApi.renderWeightReport({ files: currentExportBundle, assets: result.assets, sections, weightMap });
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

    /**
     * Opens the Export Modal with zero-section guard check.
     */
    /** Lists page problems (alt text, headings, links, labels) above the export tabs; never blocks an export. */
    function renderPageChecks() {
      const box = document.getElementById('exportChecks');
      if (!box) return;
      box.textContent = '';
      const checks = window.PageChecks;
      const html = currentExportBundle && currentExportBundle['index.html'];
      if (!checks || !html) return;
      const issues = checks.checkPage(html, stackManager.getState().page);
      const head = document.createElement('div');
      head.className = 'export-checks-head';
      head.textContent = issues.length ? `Page check: ${issues.length} thing${issues.length === 1 ? '' : 's'} to look at (you can still export)` : 'Page check: nothing to fix';
      box.appendChild(head);
      if (!issues.length) return;
      const list = document.createElement('ul');
      list.className = 'export-checks-list';
      issues.slice(0, 40).forEach(issue => {
        const li = document.createElement('li');
        li.className = 'export-check is-' + issue.severity;
        const label = document.createElement('span');
        label.textContent = `${issue.severity}: ${issue.message}${issue.slug ? ' (' + issue.slug + ')' : ''}`;
        li.appendChild(label);
        if (issue.sectionId) {
          const go = document.createElement('button');
          go.type = 'button';
          go.className = 'builder-btn-subtle';
          go.textContent = 'Show section';
          go.addEventListener('click', () => {
            closeExportModal();
            if (typeof ctx.setActiveSection === 'function') ctx.setActiveSection(issue.sectionId);
            const frame = document.querySelector('iframe');
            const el = frame && frame.contentDocument && frame.contentDocument.getElementById(issue.sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          li.appendChild(go);
        }
        list.appendChild(li);
      });
      box.appendChild(list);
    }

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

        if (typeof window.JSZip !== 'undefined') {
          // 1. Client-side JSZip
          const zip = new window.JSZip();
          zip.file('index.html', currentExportBundle['index.html']);
          zip.file('style.css', currentExportBundle['style.css']);
          zip.file('script.js', currentExportBundle['script.js']);
          zip.file('README.md', currentExportBundle['README.md']);
          ['robots.txt', 'sitemap.xml'].forEach(n => { if (currentExportBundle[n]) zip.file(n, currentExportBundle[n]); });
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

    // Reviewer comments come back as a JSON file: list them and jump to the section each one is about.
    const reviewFileInput = document.getElementById('reviewFileInput');
    const reviewList = document.getElementById('reviewCommentList');
    function renderReviewComments(data) {
      if (!reviewList) return;
      reviewList.innerHTML = '';
      const comments = Array.isArray(data.comments) ? data.comments : [];
      if (!comments.length) { reviewList.textContent = 'That file has no comments.'; return; }
      const stack = stackManager.getStack();
      comments.forEach((c, i) => {
        const li = document.createElement('li');
        const where = (c.section && c.section.slug) || 'page';
        const sec = stack.find(s => s.id === (c.section && c.section.id)) || stack.find(s => s.slug === where);
        const text = document.createElement('span');
        text.textContent = `${i + 1}. ${c.comment}${c.author ? ' (' + c.author + ')' : ''} `;
        const small = document.createElement('small');
        small.textContent = `on ${(sec && (sec.title || sec.slug)) || where}${c.text ? ': "' + c.text + '"' : ''}`;
        li.append(text, small);
        if (sec) {
          const go = document.createElement('button');
          go.type = 'button';
          go.className = 'builder-btn-subtle';
          go.textContent = 'Show section';
          go.addEventListener('click', () => {
            closeExportModal();
            if (typeof ctx.setActiveSection === 'function') ctx.setActiveSection(sec.id);
            const frame = document.querySelector('iframe');
            const el = frame && frame.contentDocument && frame.contentDocument.getElementById(sec.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          li.appendChild(go);
        }
        reviewList.appendChild(li);
      });
    }
    if (reviewFileInput) {
      reviewFileInput.addEventListener('change', async () => {
        const file = reviewFileInput.files[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!data || data.format !== 'web-builder-review') throw new Error('not a review file');
          renderReviewComments(data);
        } catch (err) {
          if (reviewList) reviewList.textContent = 'That file is not a review comments file from this builder.';
        }
        reviewFileInput.value = '';
      });
    }

    /**
     * React project: sections with a React source become components of a Vite project. Sources and assets are
     * fetched from the vault; sections without a React source are listed in the project's README.
     */
    async function handleDownloadReact() {
      const state = stackManager.getState();
      if (!Array.isArray(state.stack) || state.stack.length === 0) {
        showToast('Please add at least one section before downloading.');
        return;
      }
      const label = document.getElementById('downloadReactBtnText');
      const original = label ? label.textContent : '';
      if (downloadReactBtn) downloadReactBtn.disabled = true;
      if (label) label.textContent = 'Packaging project...';
      try {
        const text = async (url) => { const r = await fetch(url); return r.ok ? r.text() : ''; };
        const slugs = Array.from(new Set(state.stack.map(s => s.slug).filter(Boolean)));
        const sources = {};
        await Promise.all(slugs.map(async (slug) => {
          const base = `/features/${slug}/`;
          const [component, demo, css] = await Promise.all([text(base + 'component.tsx'), text(base + 'demo.tsx'), text(base + 'style.css')]);
          sources[slug] = { title: (featuresData[slug] && featuresData[slug].title) || slug, component, demo, css };
        }));
        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const out = (window.ReactExport || require('./react-export.js')).generateReactProject({ stack: state.stack, theme: themeConfig, page: state.page, sources });
        if (!out.included.length) {
          showToast('None of these sections has a React source, so there is nothing to put in a React project.', 5000);
          return;
        }
        const extra = Array.from(new Set(out.included.flatMap(slug => exportAssets[slug] || [])));
        const urls = Array.from(new Set([...out.assetUrls, ...extra]));
        const fetched = await Promise.all(urls.map(async (u) => {
          try { const r = await fetch(u); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; } catch (_) { return null; }
        }));
        const entries = Object.assign({}, out.files);
        urls.forEach((u, i) => { if (fetched[i]) entries['public' + decodeURIComponent(u)] = fetched[i]; });
        let blob;
        if (typeof window.JSZip !== 'undefined') {
          const zip = new window.JSZip();
          Object.entries(entries).forEach(([name, data]) => zip.file(name, data));
          blob = await zip.generateAsync({ type: 'blob' });
        } else {
          blob = new Blob([window.Assembler.createZipArchive(entries)], { type: 'application/zip' });
        }
        triggerDownload(blob, 'my-react-project.zip', 'application/zip');
        showToast(out.skipped.length ? `Downloaded. ${out.skipped.length} section(s) without a React source were left out (see README.md).` : 'Downloaded my-react-project.zip', 4500);
      } catch (err) {
        console.error('Error generating React project:', err);
        showToast('Failed to generate the React project');
      } finally {
        if (downloadReactBtn) downloadReactBtn.disabled = false;
        if (label) label.textContent = original;
      }
    }
    if (downloadReactBtn) downloadReactBtn.addEventListener('click', handleDownloadReact);

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
