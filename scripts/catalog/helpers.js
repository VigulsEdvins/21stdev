/**
 * Pure helpers of the catalogue page (index.html): text escaping, naming, file paths, the code tabs an item shows.
 * Browser: window.CatalogHelpers. Node: require().
 */
(function () {
  'use strict';
  const WORKSPACE_ROOT = '/home/edvins/features-for-web/web-for-options';

  function combineRuntimeHtml(html, css, js) {
    const cleanCss = (css || '').trim();
    const cleanJs = (js || '').trim();
    let out = html || '';
    if (/<link[^>]+href=["']style\.css["'][^>]*>/i.test(out)) {
      out = out.replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, () => `<style>\n${cleanCss}\n</style>`);
    } else {
      out = `<style>\n${cleanCss}\n</style>\n` + out;
    }
    if (/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i.test(out)) {
      out = out.replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i, () => `<script>\n${cleanJs}\n</script>`);
    } else {
      out = out + `\n<script>\n${cleanJs}\n</script>`;
    }
    return out;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, delay = 150) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function getItemName(item) {
    return item.name || item.title || item.slug;
  }

  function getRelativeFolderPath(item) {
    return item.relativePath || `features/${item.slug}`;
  }

  function getAbsoluteFolderPath(item) {
    if (item.sourceFolder) return item.sourceFolder;
    if (item.folderPath && item.folderPath.startsWith('/')) return item.folderPath;
    return `${WORKSPACE_ROOT}/${getRelativeFolderPath(item)}`;
  }

  function getAgentReference(item) {
    const absPath = getAbsoluteFolderPath(item);
    return `Take the "${getItemName(item)}" feature from ${absPath} (index.html, style.css, script.js) and integrate it.`;
  }

  function getAvailableTabs(item) {
    const tabs = [];
    if (item.type === 'template' && item.files && item.files.siteHtml) {
      tabs.push({ id: 'siteHtml', label: 'Full Site index.html', content: item.files.siteHtml });
      if (item.files.siteWorkHtml) tabs.push({ id: 'siteWorkHtml', label: 'Work work.html', content: item.files.siteWorkHtml });
      if (item.files.siteCss) tabs.push({ id: 'siteCss', label: 'Full Site styles.css', content: item.files.siteCss });
      if (item.files.siteJs) tabs.push({ id: 'siteJs', label: 'Full Site app.js / main.js', content: item.files.siteJs });
      if (item.files.siteDataJs) tabs.push({ id: 'siteDataJs', label: 'CMS / Config Data', content: item.files.siteDataJs });
      if (item.files.adminHtml) tabs.push({ id: 'adminHtml', label: 'CMS admin.html', content: item.files.adminHtml });
      tabs.push({ id: 'combined', label: 'Card Showcase HTML', content: item.files.combined });
    } else {
      tabs.push(
        { id: 'combined', label: 'Combined (1-File)', content: item.files.combined },
        { id: 'html', label: 'index.html', content: item.files.html },
        { id: 'css', label: 'style.css', content: item.files.css },
        { id: 'js', label: 'script.js', content: item.files.js }
      );
    }
    if (item.files && item.files.tsx) {
      tabs.push({ id: 'tsx', label: 'component.tsx', content: item.files.tsx });
    }
    tabs.push({
      id: 'meta',
      label: 'meta.json',
      content: JSON.stringify({
        name: getItemName(item),
        slug: item.slug,
        category: item.category,
        source: item.source,
        type: item.type,
        description: item.description,
        tags: item.tags,
        tech: item.tech,
        folderPath: getAbsoluteFolderPath(item)
      }, null, 2)
    });
    return tabs;
  }

  const api = { combineRuntimeHtml, escapeHtml, debounce, getItemName, getRelativeFolderPath, getAbsoluteFolderPath, getAgentReference, getAvailableTabs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CatalogHelpers = api;
})();
