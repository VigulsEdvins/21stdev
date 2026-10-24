/**
 * Feature source files: the shared HTML combiner and an on-demand loader.
 * registry.js only carries metadata; the catalogue fetches a feature's files when it needs them
 * (inspector, copy, download) instead of embedding ~90 MB of source in one script.
 * Works in the browser (window.FeatureFiles) and in Node (require).
 */
(function () {
  'use strict';

  /** Registry file key -> path inside features/<slug>/ */
  const FILE_MAP = {
    html: 'index.html',
    css: 'style.css',
    js: 'script.js',
    tsx: 'component.tsx',
    siteHtml: 'site/index.html',
    siteWorkHtml: 'site/work.html',
    siteCss: 'site/style.css',
    siteJs: 'site/script.js',
    siteDataJs: 'site/data.js',
    adminHtml: 'site/admin.html'
  };

  /**
   * Safely combines standalone HTML, CSS, and JS into a single self-contained HTML string.
   * Uses function replacers so special $ patterns ($&, $', $1) in JS or CSS are never corrupted.
   */
  function combineFeatureHtml(html, css, js) {
    let result = String(html || '');
    const cleanCss = String(css || '');
    const cleanJs = String(js || '');

    const styleLinkRegex = /<link\b[^>]*href=["'](?:\.\/)?style\.css["'][^>]*>/i;
    if (styleLinkRegex.test(result)) {
      result = result.replace(styleLinkRegex, () => `<style>\n${cleanCss}\n</style>`);
    } else if (cleanCss.trim()) {
      result = result.replace(/<\/head>/i, () => `<style>\n${cleanCss}\n</style>\n</head>`);
    }

    const scriptTagRegex = /<script\b[^>]*src=["'](?:\.\/)?script\.js["'][^>]*>\s*<\/script>/i;
    if (scriptTagRegex.test(result)) {
      result = result.replace(scriptTagRegex, () => `<script>\n${cleanJs}\n</script>`);
    } else if (cleanJs.trim()) {
      result = result.replace(/<\/body>/i, () => `<script>\n${cleanJs}\n</script>\n</body>`);
    }
    return result;
  }

  const inflight = new Map();

  /**
   * Resolves an item's files, fetching them once. Items that already carry `files` (custom features
   * added in the catalogue) are returned as they are.
   * @param {{slug: string, files?: object, availableFiles?: string[]}} item
   * @param {Function} [fetchFn]
   */
  async function load(item, fetchFn) {
    if (item.files && item.files.combined !== undefined) return item.files;
    if (inflight.has(item.slug)) return inflight.get(item.slug);
    const doFetch = fetchFn || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const wanted = (item.availableFiles || ['html', 'css', 'js']).filter(k => FILE_MAP[k]);
    const promise = (async () => {
      const files = {};
      await Promise.all(wanted.map(async (key) => {
        try {
          const res = await doFetch(`features/${item.slug}/${FILE_MAP[key]}`);
          files[key] = res.ok ? await res.text() : '';
        } catch (_) {
          files[key] = '';
        }
      }));
      files.combined = combineFeatureHtml(files.html, files.css, files.js);
      item.files = files;
      return files;
    })();
    inflight.set(item.slug, promise);
    try { return await promise; } finally { inflight.delete(item.slug); }
  }

  const api = { FILE_MAP, combineFeatureHtml, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.FeatureFiles = api;
})();
