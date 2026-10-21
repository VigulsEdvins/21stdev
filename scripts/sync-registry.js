#!/usr/bin/env node
/**
 * Local 21st.dev Feature & Design Registry Sync Utility
 * Scans features/<slug>/ directories and generates:
 *  - registry.json (Machine-readable index for AI agents & tooling)
 *  - registry.js   (window.FEATURE_REGISTRY with embedded source files for zero-CORS UI & instant copy)
 */

const fs = require('fs');
const path = require('path');

/**
 * Safely combines standalone HTML, CSS, and JS into a single self-contained HTML string.
 * Uses function replacers so special $ patterns ($&, $', $1) in JS or CSS are never corrupted.
 * @param {string} html
 * @param {string} css
 * @param {string} js
 * @returns {string}
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

/**
 * Reads all features/<slug>/ folders, validates meta.json and code files, and writes registry.json + registry.js.
 * @param {string} [rootDir]
 * @returns {{ count: number, items: Array<object> }}
 */
function syncRegistry(rootDir = path.resolve(__dirname, '..')) {
  const featuresDir = path.join(rootDir, 'features');
  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
  }

  const entries = fs.readdirSync(featuresDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  const items = [];

  for (const slug of entries) {
    const dirPath = path.join(featuresDir, slug);
    const metaPath = path.join(dirPath, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const htmlPath = path.join(dirPath, 'index.html');
    const cssPath = path.join(dirPath, 'style.css');
    const jsPath = path.join(dirPath, 'script.js');
    const tsxPath = path.join(dirPath, 'component.tsx');

    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';
    const tsx = fs.existsSync(tsxPath) ? fs.readFileSync(tsxPath, 'utf8') : null;

    const combined = combineFeatureHtml(html, css, js);

    const sourceRepoPath = meta.sourceRepoPath || meta.sourceFolder || null;
    const extraTemplateFiles = {};
    if ((meta.type === 'template') && sourceRepoPath && fs.existsSync(sourceRepoPath)) {
      const tryRead = (fname) => {
        const p = path.join(sourceRepoPath, fname);
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
      };
      const siteHtml = tryRead('index.html');
      const siteCss = tryRead('styles.css');
      const siteJs = tryRead('app.js');
      const siteDataJs = tryRead('site-data.js');
      const adminHtml = tryRead('admin.html');
      if (siteHtml) extraTemplateFiles.siteHtml = siteHtml;
      if (siteCss) extraTemplateFiles.siteCss = siteCss;
      if (siteJs) extraTemplateFiles.siteJs = siteJs;
      if (siteDataJs) extraTemplateFiles.siteDataJs = siteDataJs;
      if (adminHtml) extraTemplateFiles.adminHtml = adminHtml;
    }

    const displayName = meta.name || meta.title || slug;
    const item = {
      slug: meta.slug || slug,
      name: displayName,
      title: displayName,
      category: meta.category || 'Components',
      source: meta.source || 'custom',
      type: meta.type || 'component', // 'component' | 'template'
      description: meta.description || '',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      tech: Array.isArray(meta.tech) ? meta.tech : (Array.isArray(meta.dependencies) ? meta.dependencies : ['Vanilla HTML/CSS/JS']),
      dependencies: Array.isArray(meta.dependencies) ? meta.dependencies : ['Vanilla HTML/CSS/JS'],
      order: typeof meta.order === 'number' ? meta.order : 999,
      folderPath: `/home/edvins/features-for-web/web-for-options/features/${slug}`,
      relativePath: `features/${slug}`,
      previewUrl: meta.previewUrl || `features/${slug}/index.html`,
      liveSiteUrl: meta.liveSiteUrl || null,
      adminUrl: meta.adminUrl || null,
      sourceRepoPath,
      sourceFolder: meta.sourceFolder || meta.sourceRepoPath || null,
      files: {
        combined,
        html,
        css,
        js,
        ...(tsx ? { tsx } : {}),
        ...extraTemplateFiles
      }
    };

    items.push(item);
  }

  items.sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

  // Write lightweight machine-readable registry.json (without duplicating giant inline strings if agent prefers reading files, plus file manifest)
  const jsonCatalog = {
    generatedAt: new Date().toISOString(),
    vaultRoot: '/home/edvins/features-for-web/web-for-options',
    totalFeatures: items.length,
    categories: [...new Set(items.map((i) => i.category))],
    sources: [...new Set(items.map((i) => i.source))],
    items: items.map((item) => ({
      slug: item.slug,
      title: item.title,
      category: item.category,
      source: item.source,
      type: item.type,
      description: item.description,
      tags: item.tags,
      dependencies: item.dependencies,
      folderPath: item.folderPath,
      relativePath: item.relativePath,
      previewUrl: item.previewUrl,
      liveSiteUrl: item.liveSiteUrl,
      adminUrl: item.adminUrl,
      sourceRepoPath: item.sourceRepoPath,
      availableFiles: Object.keys(item.files)
    }))
  };

  fs.writeFileSync(
    path.join(rootDir, 'registry.json'),
    JSON.stringify(jsonCatalog, null, 2),
    'utf8'
  );

  const jsBundle = `// Auto-generated by scripts/sync-registry.js — Do not edit manually\nwindow.FEATURE_REGISTRY = ${JSON.stringify(items, null, 2)};\n`;
  fs.writeFileSync(path.join(rootDir, 'registry.js'), jsBundle, 'utf8');

  return { count: items.length, items };
}

if (require.main === module) {
  const res = syncRegistry();
  console.log(`Synced ${res.count} features into registry.json and registry.js`);
}

module.exports = {
  combineFeatureHtml,
  syncRegistry
};
