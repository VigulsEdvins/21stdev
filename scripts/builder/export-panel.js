/**
 * Export modal controller: ZIP, copyable source and single-file HTML, including asset bundling.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

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
    const downloadSingleHtmlBtn = document.getElementById('downloadSingleHtmlBtn');
    const copySingleBundleBtn = document.getElementById('copySingleBundleBtn');
    const copyBundleBtnText = document.getElementById('copyBundleBtnText');

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

    /** Page settings of the open page: in a multi-page site its own language, if it has one, wins. */
    function openPageSettings(state) {
      const open = (state.pages || []).find(p => p.id === state.activePageId);
      return open && open.lang ? { ...state.page, lang: open.lang } : state.page;
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
        currentExportBundle = window.Assembler.generateExportBundle(currentStack, themeConfig, featuresData, { page: openPageSettings(state), nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, review: !!exportOptions.review, csp: !!(document.getElementById('exportCspToggle') || {}).checked });
      }

      if (state.pages.length > 1 && window.BuilderSinglePages && window.Assembler && typeof window.Assembler.generateSingleFileBundle === 'function') {
        // every page in one file, with a small router (the ZIP has one file per page)
        const missingAll = state.pages.flatMap(p => p.stack.map(s => s.slug)).filter(slug => slug && !featureCache.has(slug));
        if (missingAll.length) await Promise.all(Array.from(new Set(missingAll)).map(slug => fetchFeatureFiles(slug)));
        const keys = window.BuilderSinglePages.pageKeys(state.pages);
        const links = Object.fromEntries(Object.entries(keys).map(([id, key]) => [id, '#' + key]));
        const home = state.pages[0];
        const combined = state.pages.flatMap(p => p.stack);
        const html = window.Assembler.generateSingleFileBundle(combined, themeConfig, featuresData, { page: { ...state.page, lang: home.lang || state.page.lang }, nativeMap, pageLinks: links, reservedAnchors: Object.values(keys) });
        currentSingleHtml = window.BuilderSinglePages.addRouter(html, state.pages.map((p, i) => ({ key: keys[p.id], title: i === 0 ? state.page.title : `${p.title} | ${state.page.title}`, ids: p.stack.filter(s => !s.hidden).map(s => s.id) })));
      } else if (window.Assembler && typeof window.Assembler.generateSingleFileBundle === 'function') {
        currentSingleHtml = window.Assembler.generateSingleFileBundle(currentStack, themeConfig, featuresData, { page: openPageSettings(state), nativeMap });
      } else if (window.Assembler && typeof window.Assembler.assemblePreviewDocument === 'function') {
        currentSingleHtml = window.Assembler.assemblePreviewDocument(currentStack, themeConfig, featuresData);
      }

      await bundleLocalAssets();

      // the single-file page carries its Google Fonts (Latin subsets) instead of linking to them
      if (currentSingleHtml && window.FontHost && window.FontHost.cssUrl(state.page)) {
        const fonts = await window.FontHost.inlineFonts({ html: currentSingleHtml, page: state.page, fetchFn: (u) => fetch(u) });
        if (fonts.inlined) currentSingleHtml = fonts.html;
      }

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
     * The admin panel: the Content tab's "Open admin panel" button. Shows the editor over the builder; every change goes
     * to the section's content edits (the same ones the Content tab writes), so the preview and the export follow.
     */
    const adminOverlay = document.getElementById('adminOverlay');
    const adminFrame = document.getElementById('adminFrame');
    function closeAdmin() {
      if (!adminOverlay || adminOverlay.hidden) return;
      adminOverlay.hidden = true;
      adminOverlay.classList.add('is-closed'); // replaceState does not update :target, so the "opening" screen must be switched off by class
      const old = adminFrame.src;
      adminFrame.src = 'about:blank'; // stops the editor's scripts
      if (old && old.startsWith('blob:')) URL.revokeObjectURL(old);
      delete window.__cmsBridge;
      document.body.style.overflow = '';
      setAdminHash(false);
    }
    // The panel has no page of its own, so its address carries #adminOverlay (the overlay's id, so CSS can show it at once): a reload (or a shared link) opens it again
    function setAdminHash(on) {
      try {
        if ((location.hash === '#adminOverlay') === on) return;
        history.replaceState(null, '', location.pathname + location.search + (on ? '#adminOverlay' : ''));
      } catch (_) { /* the address stays as it is */ }
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
        const themeNow = st.theme === 'custom' ? st.customColors : st.theme;
        window.__cmsBridge = {
          setOverride: (sectionId, fieldId, value, def) => stackManager.setSectionOverride(sectionId, fieldId, value, def),
          setForm: (method, target) => stackManager.setPage({ formMethod: method, formTarget: target }),
          // where a menu or button link can go: this page's sections by anchor name, and the other pages ("page:<id>", turned into a file or "#key" on export)
          targets: () => {
            const cur = stackManager.getState();
            const names = window.Assembler.anchorNames(cur.stack, featuresData);
            const titleOf = (sec) => sec.title || (featuresData[sec.slug] && (featuresData[sec.slug].title || featuresData[sec.slug].name)) || sec.slug;
            return {
              sections: cur.stack.filter(sec => names[sec.id]).map(sec => ({ value: '#' + names[sec.id], label: titleOf(sec) + '  (#' + names[sec.id] + ')' })),
              pages: (cur.pages || []).filter(p => p.id !== cur.activePageId).map(p => ({ value: 'page:' + p.id, label: p.title || 'Page' }))
            };
          },
          anchorOf: (sectionId) => window.Assembler.anchorNames(stackManager.getState().stack, featuresData)[sectionId] || '',
          setAnchor: (sectionId, name) => stackManager.setSectionAnchor(sectionId, name),
          // the automatic menu: a header that can list the sections reports its mode and items; the other sections their place in it
          menuInfo: (sectionId) => {
            const cur = stackManager.getState();
            const sec = cur.stack.find(s => s.id === sectionId);
            if (!sec) return null;
            const names = window.Assembler.anchorNames(cur.stack, featuresData);
            const reg = (window.FEATURE_REGISTRY || []).find(f => f.slug === sec.slug);
            if (reg && reg.autoMenu) return { kind: 'header', mode: sec.menuMode === 'auto' ? 'auto' : 'manual', items: window.Assembler.menuItems(cur.stack, names, featuresData).map(i => i.label) };
            if (!cur.stack.some(s => s.menuMode === 'auto')) return null;
            const plain = cur.stack.map(s => ({ ...s, inMenu: undefined, menuLabel: undefined }));
            const base = window.Assembler.menuItems(plain, names, featuresData).find(i => i.id === sectionId);
            return base ? { kind: 'section', inMenu: sec.inMenu !== false, label: sec.menuLabel || '', defaultLabel: base.label } : null;
          },
          setMenu: (sectionId, patch) => stackManager.setSectionMenu(sectionId, patch),
          // the editor's preview page, made again from the page as it is now (a header setting changed the markup, not a text)
          frameDoc: () => {
            const cur = stackManager.getState();
            const doc = window.Assembler.generateSingleFileBundle(cur.stack.map(s => ({ ...s, overrides: {} })), themeNow, featuresData, { page: cur.page, nativeMap, keepUnlinkedNav: true, langHost: true });
            return window.BuilderCms.frameDoc(pageIn.file, doc, cms.files);
          },
          // a header can be kept at the top while the page scrolls (not the bottom tab bar)
          stickyInfo: (sectionId) => {
            const sec = stackManager.getState().stack.find(s => s.id === sectionId);
            const reg = sec && (window.FEATURE_REGISTRY || []).find(f => f.slug === sec.slug);
            return reg && reg.category === 'Headers & Nav' && reg.slug !== 'bottom-tab-bar' ? { on: sec.sticky === true } : null;
          },
          setSticky: (sectionId, on) => stackManager.setSectionSticky(sectionId, on === true),
          // languages of the project: the editor lists them, opens the other language's page, and adds a language (a linked copy of every page)
          languages: () => {
            const L = window.BuilderLanguages, p = window.builderPreview;
            if (!L || !p || !p.serializeState) return null;
            const s = p.serializeState(), here = L.activeLanguage(s), site = L.siteLanguage(s), have = L.languagesOf(s);
            return {
              langs: have.map(code => ({ code, name: L.nameOf(code), english: L.englishOf(code), here: code === here, site: code === site })),
              free: L.LANGUAGES.filter(l => !have.includes(l[0])).map(l => ({ code: l[0], label: L.label(l[0]) })),
              pages: (s.pages && s.pages.length) || 1
            };
          },
          switchLanguage: (code) => {
            const L = window.BuilderLanguages, p = window.builderPreview;
            const target = L && p && L.pageFor(p.serializeState(), code);
            if (!target) return false;
            stackManager.switchPage(target.id);
            openAdmin(); // the panel starts again on that language's page
            return true;
          },
          addLanguage: (code) => {
            const L = window.BuilderLanguages, p = window.builderPreview;
            if (!L || !p || !p.applyState) return 'Languages are not available here.';
            const why = L.whyNotAdd(p.serializeState(), code);
            if (why) return why;
            p.applyState(Object.assign(p.serializeState(), L.addLanguage(p.serializeState(), code))); // one history step: one Undo takes it back
            openAdmin();
            return '';
          },
          // the visitor's light/dark button: on unless the page setting says off; null when no header on the page has it
          modeInfo: () => {
            const cur = stackManager.getState();
            const has = cur.stack.some(sec => !sec.hidden && (window.FEATURE_REGISTRY || []).some(f => f.slug === sec.slug && f.langSlot));
            return has ? { has: true, on: cur.page.modeButton !== 'off' } : null;
          },
          setModeButton: (on) => stackManager.setPage({ modeButton: on ? '' : 'off' }),
          removeLanguage: (code) => {
            const L = window.BuilderLanguages, p = window.builderPreview;
            if (!L || !p || !p.applyState) return 'Languages are not available here.';
            try { p.applyState(Object.assign(p.serializeState(), L.removeLanguage(p.serializeState(), code))); } catch (e) { return e.message; } // one history step: one Undo brings it back
            openAdmin();
            return '';
          },
          close: closeAdmin
        };
        // the editor page needs inline scripts and styles: it goes into the frame page that has its own policy (frame-doc.js), not a blob: URL, which would take the builder page's strict one
        if (window.FrameDoc) await window.FrameDoc.write(adminFrame, html);
        else adminFrame.src = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        adminOverlay.classList.remove('is-closed');
        adminOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
        setAdminHash(true);
      } catch (err) {
        console.error('Admin panel could not be opened:', err);
        showToast('The admin panel could not be opened.', 4000);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    }
    const openAdminBtn = document.getElementById('openAdminBtn');
    if (openAdminBtn) openAdminBtn.addEventListener('click', openAdmin);
    // after a reload at #admin: wait for the saved page to load, then reopen the panel
    if (location.hash === '#adminOverlay') {
      let tries = 0;
      const reopen = setInterval(() => {
        if (stackManager.getState().stack.some(s => !s.hidden)) { clearInterval(reopen); openAdmin(); }
        else if (++tries > 40) { clearInterval(reopen); adminOverlay.classList.add('is-closed'); setAdminHash(false); }
      }, 250);
    }
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && adminOverlay && !adminOverlay.hidden) closeAdmin(); });


    const zipExport = (window.BuilderExportZip || require('./export-zip.js')).createZipExport(ctx, {
      assetBundler, iconFiles, prepareExportData, triggerDownload,
      getBundle: () => currentExportBundle,
      getAssets: () => currentExportAssets
    });
    const { handleDownloadZip, buildCms } = zipExport;

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
