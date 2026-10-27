/**
 * ZIP download: packages the page (or every page of a multi-page site) with its assets, the optional content editor
 * and the review overlay. Extracted from export-panel.js; the export controller passes in what it shares.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createZipExport(ctx, { assetBundler, iconFiles, prepareExportData, triggerDownload, getBundle, getAssets }) {
    const { stackManager, featureCache, featuresData, fetchFeatureFiles, nativeMap, ownPalette, reserveMap, lazyMap, licenseMap, exportAssets = {} } = ctx;
    const downloadZipBtn = document.getElementById('downloadZipBtn');

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
        const settings = { ...state.page, title: home ? state.page.title : `${p.title} | ${state.page.title}`, description: p.description || state.page.description, lang: p.lang || state.page.lang };
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
        if (!getBundle()) {
          throw new Error('Could not generate export bundle');
        }

        const zipFilename = exportOptions.review ? 'my-review-copy.zip' : 'my-assembled-page.zip';
        if (exportOptions.review) {
          getBundle()['README.md'] += '\n## Review copy\n\nThis copy has a Review button (bottom left). Open `index.html`, press **Comment mode**, click anything on the page and write what should change. Press **Review** to see the list and **Download comments** to send the file back. Comments stay in the browser until downloaded. Remove the review code before the final launch by exporting a normal copy.\n';
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
          await addCms([{ file: 'index.html', title: 'Home', stack: st.stack, settings: st.page, script: 'script.js' }], { 'index.html': getBundle()['index.html'] }, ['index.html'], getBundle());
        }
        if (multi) {
          const site = await buildMultiPageFiles(exportOptions);
          if (cmsOn) {
            const st = stackManager.getState();
            const fileOf = (p) => (p.slug === 'index' ? 'index.html' : `${p.slug}.html`);
            const pageLinks = Object.fromEntries(st.pages.map(p => [p.id, fileOf(p)]));
            await addCms(
              st.pages.map(p => ({ file: fileOf(p), title: p.title, stack: p.stack, settings: { ...st.page, lang: p.lang || st.page.lang, title: p.slug === 'index' ? st.page.title : `${p.title} | ${st.page.title}` }, script: p.slug === 'index' ? 'script.js' : `${p.slug}.js` })),
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
          zip.file('index.html', getBundle()['index.html']);
          zip.file('style.css', getBundle()['style.css']);
          zip.file('script.js', getBundle()['script.js']);
          zip.file('README.md', getBundle()['README.md']);
          ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md', ...Object.keys(cmsFiles)].forEach(n => { if (getBundle()[n]) zip.file(n, getBundle()[n]); });
          Object.entries(getAssets()).forEach(([name, bytes]) => zip.file(name, bytes));
          const blob = await zip.generateAsync({ type: 'blob' });
          triggerDownload(blob, zipFilename, 'application/zip');
        } else if (window.Assembler && typeof window.Assembler.createZipArchive === 'function') {
          // 2. Native Pure-JS ZIP Generator
          const zipBytes = window.Assembler.createZipArchive(Object.assign({}, getBundle(), getAssets()));
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
    return { handleDownloadZip, buildCms, buildMultiPageFiles };
  }

  const api = { createZipExport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderExportZip = api;
})();
