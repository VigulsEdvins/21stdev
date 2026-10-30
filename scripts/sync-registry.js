#!/usr/bin/env node
/**
 * edvlabs Feature & Design Registry Sync Utility
 * Scans features/<slug>/ directories and generates:
 *  - registry.json (Machine-readable index for AI agents & tooling)
 *  - registry.js   (window.FEATURE_REGISTRY with embedded source files for zero-CORS UI & instant copy)
 */

const fs = require('fs');
const path = require('path');
const { CATEGORIES, validateMeta } = require('./schema');

const { combineFeatureHtml, FILE_MAP } = require('./feature-files');

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
    meta.slug = meta.slug || slug;
    const problems = validateMeta(meta);
    if (problems.length) {
      console.warn(`⚠ features/${slug}/meta.json: ${problems.join('; ')}`);
    }
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

    // Full-site templates ship extra files from a sibling project. Copy them into features/<slug>/site/
    // when the source exists, so the vault stays self-contained and the catalogue can load them lazily.
    const siteDir = path.join(dirPath, 'site');
    if (meta.type === 'template' && sourceRepoPath && fs.existsSync(sourceRepoPath)) {
      const tryRead = (...fnames) => {
        for (const fname of fnames) {
          const p = path.join(sourceRepoPath, fname);
          if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.readFileSync(p, 'utf8');
        }
        return null;
      };
      const sources = {
        'index.html': tryRead('index.html'),
        'work.html': tryRead('work.html'),
        'style.css': tryRead('styles.css', 'src/style.css', 'src/index.css'),
        'script.js': tryRead('app.js', 'src/main.js', 'src/App.jsx'),
        'data.js': tryRead('site-data.js', 'src/default_grid.json', 'src/data/defaultData.js'),
        'admin.html': tryRead('admin.html', 'admin8225.html', 'dist/admin8225.html')
      };
      Object.entries(sources).forEach(([name, content]) => {
        if (content === null) return;
        fs.mkdirSync(siteDir, { recursive: true });
        fs.writeFileSync(path.join(siteDir, name), content, 'utf8');
      });
    }
    const extraTemplateFiles = {};
    if (meta.type === 'template' && fs.existsSync(siteDir)) {
      Object.entries(FILE_MAP).filter(([k]) => k.startsWith('site') || k === 'adminHtml').forEach(([key, rel]) => {
        const p = path.join(dirPath, rel);
        if (fs.existsSync(p)) extraTemplateFiles[key] = fs.readFileSync(p, 'utf8');
      });
    }

    const displayName = meta.name || meta.title || slug;
    const item = {
      slug: meta.slug || slug,
      name: displayName,
      title: displayName,
      category: meta.category || 'Components',
      legacyCategory: meta.legacyCategory || null,
      status: meta.status || 'stable',
      mood: Array.isArray(meta.mood) ? meta.mood : [],
      industry: Array.isArray(meta.industry) ? meta.industry : [],
      weight: meta.weight || 'light',
      access: meta.access === 'free' ? 'free' : 'account', // the builder's signed-out visitors may use only the free ones (scripts/builder/access.js)
      needsAssets: !!meta.needsAssets,
      origin: meta.origin || null,
      updatedAt: meta.updatedAt || null,
      customizable: Array.isArray(meta.customizable) ? meta.customizable : [],
      nativeWhen: Array.isArray(meta.nativeWhen) ? meta.nativeWhen : [],
      ownPalette: meta.ownPalette === true,
      luma: meta.measured && typeof meta.measured.luma === 'number' ? meta.measured.luma : null,
      lazy: meta.lazy === true,
      stickyDefault: meta.stickyDefault === true, // a header that starts out staying at the top
      autoMenu: meta.autoMenu === true, // a header that can list the page's sections by itself
      reserveHeight: Number(meta.reserveHeight) > 0 ? Number(meta.reserveHeight) : 0,
      minScale: Number(meta.minScale) >= 0.3 && Number(meta.minScale) <= 1 ? Number(meta.minScale) : 0,
      exportAssets: Array.isArray(meta.exportAssets) ? meta.exportAssets : [],
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
      thumb: ['webp', 'jpg'].map(ext => `thumbs/${slug}.${ext}`).find(rel => fs.existsSync(path.join(rootDir, rel))) || null,
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
    categories: CATEGORIES.filter((c) => items.some((i) => i.category === c)),
    sources: [...new Set(items.map((i) => i.source))],
    items: items.map((item) => ({
      slug: item.slug,
      title: item.title,
      category: item.category,
      legacyCategory: item.legacyCategory,
      status: item.status,
      mood: item.mood,
      industry: item.industry,
      weight: item.weight,
      access: item.access,
      needsAssets: item.needsAssets,
      origin: item.origin,
      updatedAt: item.updatedAt,
      customizable: item.customizable,
      nativeWhen: item.nativeWhen,
      ownPalette: item.ownPalette,
      exportAssets: item.exportAssets,
      source: item.source,
      type: item.type,
      description: item.description,
      tags: item.tags,
      dependencies: item.dependencies,
      folderPath: item.folderPath,
      relativePath: item.relativePath,
      previewUrl: item.previewUrl,
      thumb: item.thumb,
      liveSiteUrl: item.liveSiteUrl,
      adminUrl: item.adminUrl,
      sourceRepoPath: item.sourceRepoPath,
      availableFiles: Object.keys(item.files)
    }))
  };

  // The timestamp only moves when the catalogue does, so running tests or sync twice leaves no diff in git
  const registryFile = path.join(rootDir, 'registry.json');
  try {
    const previous = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    const same = (o) => JSON.stringify({ ...o, generatedAt: '' });
    if (previous.generatedAt && same(previous) === same(jsonCatalog)) jsonCatalog.generatedAt = previous.generatedAt;
  } catch (_) { /* no earlier registry */ }
  fs.writeFileSync(registryFile, JSON.stringify(jsonCatalog, null, 2), 'utf8');

  // registry.js carries metadata only; source files are fetched on demand (scripts/feature-files.js)
  // The field lists (`customizable`, a third of the size) and long licence notes are left out; the Content tab reads
  // features/<slug>/meta.json when a section with named fields is opened. registry.json keeps everything.
  const slimItems = items.map(({ files, customizable, origin, ...rest }) => ({
    ...rest,
    customizableCount: customizable.length,
    origin: origin ? { source: origin.source, license: origin.license } : null,
    availableFiles: Object.keys(files).filter((k) => k !== 'combined')
  }));
  const jsBundle = `// Auto-generated by scripts/sync-registry.js — Do not edit manually\nwindow.FEATURE_REGISTRY = ${JSON.stringify(slimItems)};\n`;
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
