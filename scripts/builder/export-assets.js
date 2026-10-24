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
    async function bundle({ files, singleHtml }) {
      const assets = {};
      const urls = new Set();
      if (files) TEXT_FILES.forEach(k => assembler.findLocalAssetUrls(files[k]).forEach(u => urls.add(u)));
      assembler.findLocalAssetUrls(singleHtml).forEach(u => urls.add(u));
      if (urls.size === 0) return { files, singleHtml, assets, missing: [] };

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
      return { files, singleHtml: assembler.rewriteLocalAssetUrls(singleHtml, inlineMap), assets, missing };
    }

    return { bundle, fetchLocalAsset };
  }

  const api = { createAssetBundler, bytesToDataUri, ASSET_MIME_TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ExportAssets = api;
})();
