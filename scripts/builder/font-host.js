/**
 * Self-hosts the Google Fonts chosen in Page Settings for the ZIP export: downloads the font files, writes a local
 * @font-face block into style.css and removes the Google link tags from index.html, so the exported site makes no
 * request to fonts.googleapis.com / fonts.gstatic.com. The single-file page keeps the remote link (inlining every
 * subset would add megabytes).
 *   FontHost.hostFonts({ files, page, fetchFn }) -> { assets, hosted, families }
 */
(function () {
  'use strict';

  const clean = (name) => String(name || '').replace(/['"\\<>;{}]/g, '').trim();

  function families(page = {}) {
    const out = [];
    [clean(page.fontDisplay), clean(page.fontBody)].forEach(n => { if (n && !out.includes(n)) out.push(n); });
    return out;
  }

  /** Same address renderPageHead writes into index.html. */
  function cssUrl(page) {
    const list = families(page);
    if (!list.length) return '';
    const query = list.map(n => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&');
    return `https://fonts.googleapis.com/css2?${query}&display=swap`;
  }

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /** The font files a Google Fonts stylesheet points at, once each. */
  function fontUrls(css) {
    const urls = new Set();
    String(css).replace(/url\(\s*(['"]?)(https:\/\/fonts\.gstatic\.com\/[^'")\s]+)\1\s*\)/g, (m, q, u) => { urls.add(u); return m; });
    return Array.from(urls);
  }

  function stripGoogleTags(html) {
    return String(html)
      .replace(/\s*<link[^>]+href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/g, '')
      .replace(/\s*<link[^>]+href="https:\/\/fonts\.gstatic\.com[^"]*"[^>]*>/g, '');
  }

  async function hostFonts({ files, page, fetchFn }) {
    const url = cssUrl(page);
    if (!url || !files || typeof files['style.css'] !== 'string') return { assets: {}, hosted: false, families: [] };
    let css;
    try {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      css = await res.text();
    } catch (err) {
      return { assets: {}, hosted: false, families: families(page), error: String(err && err.message || err) };
    }
    const urls = fontUrls(css);
    const assets = {};
    const map = {};
    try {
      await Promise.all(urls.map(async u => {
        const res = await fetchFn(u);
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + u);
        const ext = (u.split('?')[0].split('.').pop() || 'woff2').toLowerCase().replace(/[^a-z0-9]/g, '') || 'woff2';
        const name = `assets/fonts/font-${hash(u)}.${ext}`;
        assets[name] = new Uint8Array(await res.arrayBuffer());
        map[u] = name;
      }));
    } catch (err) {
      return { assets: {}, hosted: false, families: families(page), error: String(err && err.message || err) };
    }
    let local = css;
    Object.entries(map).forEach(([u, name]) => { local = local.split(u).join(name); });
    files['style.css'] += `\n\n/* Self-hosted page fonts (${families(page).join(', ')}) */\n${local.trim()}\n`;
    if (typeof files['index.html'] === 'string') files['index.html'] = stripGoogleTags(files['index.html']);
    return { assets, hosted: true, families: families(page) };
  }

  const api = { hostFonts, cssUrl, fontUrls, stripGoogleTags, families };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FontHost = api;
})();
