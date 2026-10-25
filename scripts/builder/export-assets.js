/**
 * Bundles root-relative assets (images, video, fonts) into an export.
 * ZIP gets the files under assets/ and rewritten paths; the single-file HTML gets data URIs.
 * Pure apart from the injected fetch function, so it can be unit-tested.
 *   ExportAssets.createAssetBundler({ assembler, fetchFn }).bundle({ files, singleHtml })
 */
(function () {
  'use strict';

  const ASSET_MIME_TYPES = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', woff: 'font/woff', woff2: 'font/woff2',
    ttf: 'font/ttf', otf: 'font/otf', css: 'text/css'
  };
  const TEXT_FILES = ['index.html', 'style.css', 'script.js'];

  function bytesToDataUri(bytes, mime) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return `data:${mime};base64,${b64}`;
  }

  /**
   * @param {{ assembler: {findLocalAssetUrls: Function, rewriteLocalAssetUrls: Function}, fetchFn: Function }} deps
   */
  function createAssetBundler({ assembler, fetchFn }) {
    const cache = new Map();

    async function fetchLocalAsset(url) {
      if (cache.has(url)) return cache.get(url);
      let result = null;
      try {
        const res = await fetchFn(url);
        if (res.ok) {
          const ext = url.split('.').pop().toLowerCase();
          result = { bytes: new Uint8Array(await res.arrayBuffer()), mime: ASSET_MIME_TYPES[ext] || 'application/octet-stream' };
        }
      } catch (err) {
        console.warn('Could not fetch asset for export:', url, err);
      }
      cache.set(url, result);
      return result;
    }

    /**
     * @param {{ files: Record<string,string>|null, singleHtml: string }} input  `files` is the ZIP text bundle (mutated)
     * @returns {Promise<{ files, singleHtml, assets: Record<string, Uint8Array>, missing: string[] }>}
     */
    async function bundle({ files, singleHtml, extraAssets = [] }) {
      const assets = {};
      const urls = new Set();
      if (files) TEXT_FILES.forEach(k => assembler.findLocalAssetUrls(files[k]).forEach(u => urls.add(u)));
      assembler.findLocalAssetUrls(singleHtml).forEach(u => urls.add(u));
      if (urls.size === 0 && !extraAssets.length) return { files, singleHtml, assets, missing: [] };

      const list = Array.from(urls);
      const fetched = await Promise.all(list.map(fetchLocalAsset));
      const zipMap = {};
      const inlineMap = {};
      const missing = [];
      const zipPathOf = (url) => {
        let decoded = url;
        try { decoded = decodeURIComponent(url); } catch (_) { /* keep raw */ }
        return decoded.startsWith('/assets/') ? decoded.slice(1) : 'assets' + decoded;
      };
      // A stylesheet pulls in its own fonts/images through relative url(...): ship those too, and for the
      // single-file page turn them into data URIs, since a relative path inside a data: URI resolves to nothing.
      const cssInline = {};
      await Promise.all(list.map(async (url, i) => {
        const asset = fetched[i];
        if (!asset || asset.mime !== 'text/css') return;
        const dir = url.slice(0, url.lastIndexOf('/') + 1);
        const css = new TextDecoder().decode(asset.bytes);
        const refs = new Set();
        css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => { if (!/^(data:|https?:|\/|#)/.test(ref)) refs.add(ref); return m; });
        const inner = await Promise.all(Array.from(refs).map(async ref => ({ ref, asset: await fetchLocalAsset(dir + ref) })));
        let inlined = css;
        inner.forEach(({ ref, asset: a }) => {
          if (!a) { missing.push(dir + ref); return; }
          assets[zipPathOf(dir + ref)] = a.bytes;
          inlined = inlined.split(ref).join(bytesToDataUri(a.bytes, a.mime));
        });
        cssInline[url] = bytesToDataUri(new TextEncoder().encode(inlined), 'text/css');
      }));
      list.forEach((url, i) => {
        const asset = fetched[i];
        if (!asset) { missing.push(url); return; }
        let decoded = url;
        try { decoded = decodeURIComponent(url); } catch (_) { /* keep raw */ }
        // /assets/library/x.png keeps its own path; anything else (e.g. /vivmgmt/a.jpg) goes under assets/
        const zipPath = decoded.startsWith('/assets/') ? decoded.slice(1) : 'assets' + decoded;
        assets[zipPath] = asset.bytes;
        zipMap[url] = zipPath;
        inlineMap[url] = cssInline[url] || bytesToDataUri(asset.bytes, asset.mime);
      });

      if (files) {
        TEXT_FILES.forEach(k => {
          if (typeof files[k] === 'string') files[k] = assembler.rewriteLocalAssetUrls(files[k], zipMap);
        });
      }

      // Files a component loads through paths it builds at run time ("/features/x/img/" + name + ".webp") are
      // declared in meta.json. They go into the ZIP, and the folder part of those paths in the code is made
      // relative so it resolves wherever the site is hosted. (The single-file page cannot carry them.)
      const dirs = new Map();
      const extraFetched = await Promise.all(extraAssets.map(fetchLocalAsset));
      extraAssets.forEach((url, i) => {
        if (!extraFetched[i]) { missing.push(url); return; }
        assets[zipPathOf(url)] = extraFetched[i].bytes;
        const dir = url.slice(0, url.lastIndexOf('/') + 1);
        dirs.set(dir, zipPathOf(dir));
      });
      if (files && dirs.size) {
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        TEXT_FILES.forEach(k => {
          if (typeof files[k] !== 'string') return;
          dirs.forEach((zipDir, dir) => {
            // only inside a string, and only when the rest of that string is a file name or a ${...} hole
            const re = new RegExp('(["\'`])' + esc(dir) + '(?=[A-Za-z0-9_.\\-]*(?:["\'`]|\\$\\{))', 'g');
            files[k] = files[k].replace(re, (m, q) => q + zipDir);
          });
        });
      }
      return { files, singleHtml: assembler.rewriteLocalAssetUrls(singleHtml, inlineMap), assets, missing };
    }

    return { bundle, fetchLocalAsset };
  }

  /**
   * Markdown "Page weight" section for the export README: what the visitor downloads and which sections are heavy.
   * @param {{ files: Record<string,string>, assets: Record<string, Uint8Array>, sections: {slug:string,title?:string}[], weightMap: Record<string,string> }} input
   */
  function renderWeightReport({ files, assets, sections, weightMap = {} }) {
    const size = (s) => (typeof s === 'string' ? new TextEncoder().encode(s).length : 0);
    const kb = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB');
    const code = ['index.html', 'style.css', 'script.js'].reduce((n, k) => n + size(files[k]), 0);
    const list = Object.entries(assets || {}).map(([name, bytes]) => ({ name, n: bytes.length })).sort((a, b) => b.n - a.n);
    const assetTotal = list.reduce((n, a) => n + a.n, 0);
    const heavy = sections.filter(s => weightMap[s.slug] === 'heavy');
    const lines = ['## Page weight', '', `- Code (HTML, CSS, JS): ${kb(code)}`, `- Images, video and fonts: ${kb(assetTotal)} in ${list.length} file${list.length === 1 ? '' : 's'}`, `- Total download: about ${kb(code + assetTotal)} before compression`];
    if (list.length) lines.push('', 'Largest files:', '', ...list.slice(0, 5).map(a => `- \`${a.name}\` (${kb(a.n)})`));
    if (heavy.length) lines.push('', `Heavy sections (WebGL or long-running animation; consider fewer of these on one page, and test on a phone): ${heavy.map(s => s.title || s.slug).join(', ')}.`);
    if (assetTotal + code > 8e6) lines.push('', '**This page is over 8 MB. Compress the largest files above before launch.**');
    return lines.join('\n') + '\n';
  }

  /**
   * Markdown "Third-party requests" section: which other websites the exported page loads things from, so the owner
   * can decide whether a cookie/consent notice or a privacy-policy line is needed. XML namespaces and links the visitor
   * has to click (anchors) are ignored.
   */
  function renderExternalHostsReport(files) {
    const ignore = /^(www\.w3\.org|schema\.org|www\.sitemaps\.org|purl\.org|localhost)$/;
    const hosts = new Set();
    ['index.html', 'style.css', 'script.js'].forEach(k => {
      const text = String(files[k] || '').replace(/<a\b[^>]*>/gi, '');
      text.replace(/(?:https?:)?\/\/([a-z0-9.-]+\.[a-z]{2,})(?=[\/'"`)\s?#:])/gi, (m, h) => { if (/^(https?:)?\/\//i.test(m) && !ignore.test(h.toLowerCase())) hosts.add(h.toLowerCase()); return m; });
    });
    const list = Array.from(hosts).sort();
    if (!list.length) return '## Third-party requests\n\nThis page loads nothing from other websites.\n';
    return ['## Third-party requests', '', 'These websites may be contacted when a visitor opens the page (this can matter for privacy notices):', '', ...list.map(h => `- ${h}`), ''].join('\n');
  }

  const api = { createAssetBundler, bytesToDataUri, renderWeightReport, renderExternalHostsReport, ASSET_MIME_TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ExportAssets = api;
})();
