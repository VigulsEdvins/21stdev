/**
 * React project download: sections with a React source become components of a Vite project. Sources and assets are
 * fetched from the vault; sections without a React source are listed in the project's README.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createReactDownload(ctx, { triggerDownload }) {
    const { stackManager, featuresData, exportAssets = {}, ownPalette = {} } = ctx;
    const downloadReactBtn = document.getElementById('downloadReactBtn');

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
          const base = `features/${slug}/`; // relative to the builder page: it is served from /builder/ on the site
          const [component, demo, css] = await Promise.all([text(base + 'component.tsx'), text(base + 'demo.tsx'), text(base + 'style.css')]);
          // no React source: the plain page and script are wrapped instead
          const plain = component && demo ? {} : { index: await text(base + 'index.html'), js: await text(base + 'script.js'), ownPalette: !!ownPalette[slug] };
          sources[slug] = { title: (featuresData[slug] && featuresData[slug].title) || slug, component, demo, css, ...plain };
        }));
        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const out = (window.ReactExport || require('./react-export.js')).generateReactProject({ stack: state.stack, theme: themeConfig, page: state.page, sources });
        if (!out.included.length) {
          showToast('None of these sections could be put in a React project.', 5000);
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
        if (window.loadJsZip) await window.loadJsZip();
        if (typeof window.JSZip !== 'undefined') {
          const zip = new window.JSZip();
          Object.entries(entries).forEach(([name, data]) => zip.file(name, data));
          blob = await zip.generateAsync({ type: 'blob' });
        } else {
          blob = new Blob([window.Assembler.createZipArchive(entries)], { type: 'application/zip' });
        }
        triggerDownload(blob, 'my-react-project.zip', 'application/zip');
        showToast(out.skipped.length ? `Downloaded. ${out.skipped.length} section(s) could not be carried over (see README.md).` : 'Downloaded my-react-project.zip', 4500);
      } catch (err) {
        console.error('Error generating React project:', err);
        showToast('Failed to generate the React project');
      } finally {
        if (downloadReactBtn) downloadReactBtn.disabled = false;
        if (label) label.textContent = original;
      }
    }
    if (downloadReactBtn) downloadReactBtn.addEventListener('click', handleDownloadReact);
    return { handleDownloadReact };
  }

  const api = { createReactDownload };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderExportReact = api;
})();
