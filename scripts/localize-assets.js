#!/usr/bin/env node
/**
 * Makes features self-contained: copies root-relative assets that live outside the vault
 * (e.g. /vivmgmt/assets/images/a.jpg served from the parent directory) into
 * assets/library/ (named <name>-<content hash>.<ext>, so identical files are stored once) and
 * rewrites references to /assets/library/<file>.
 *   node scripts/localize-assets.js [--dry] [--slug a,b]
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { findLocalAssetUrls, rewriteLocalAssetUrls } = require('./assembler.js');

const ROOT = path.resolve(__dirname, '..');
const PARENT = path.resolve(ROOT, '..');
const TEXT_FILES = ['index.html', 'style.css', 'script.js', 'component.tsx', 'demo.tsx'];

function resolveExternal(url) {
  const rel = decodeURIComponent(url).replace(/^\//, '');
  const candidates = [
    path.join(PARENT, rel),
    // mom / cvmaker serve /images and /fonts out of public/ or dist/
    ...['mom', 'cvmaker'].flatMap(site => [path.join(PARENT, site, 'public', rel), path.join(PARENT, site, 'dist', rel)])
  ];
  return candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

function localizeFeature(slug, { dry = false } = {}) {
  const dir = path.join(ROOT, 'features', slug);
  const assetsDir = path.join(ROOT, 'assets', 'library');
  const report = { slug, copied: 0, missing: [], bytes: 0 };
  const files = TEXT_FILES.map(f => path.join(dir, f)).filter(f => fs.existsSync(f));
  const urlMap = {};

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const url of findLocalAssetUrls(text)) {
      if (urlMap[url] || url.startsWith('/features/') || url.startsWith('/assets/')) continue;
      // Already inside the vault (e.g. /styles.css) -> leave as is
      if (fs.existsSync(path.join(ROOT, url.replace(/^\//, ''))) && fs.statSync(path.join(ROOT, url.replace(/^\//, ''))).isFile()) continue;
      const src = resolveExternal(url);
      if (!src) { report.missing.push(url); continue; }
      const bytes = fs.readFileSync(src);
      const ext = path.extname(src);
      const hash = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 8);
      const name = `${path.basename(src, ext).replace(/[^A-Za-z0-9._-]+/g, '-')}-${hash}${ext.toLowerCase()}`;
      urlMap[url] = `/assets/library/${name}`;
      report.copied++;
      report.bytes += fs.statSync(src).size;
      if (!dry) {
        fs.mkdirSync(assetsDir, { recursive: true });
        fs.writeFileSync(path.join(assetsDir, name), bytes);
      }
    }
  }
  if (!dry && report.copied) {
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      const out = rewriteLocalAssetUrls(text, urlMap);
      if (out !== text) fs.writeFileSync(file, out);
    }
  }
  return report;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const si = argv.indexOf('--slug');
  const only = si >= 0 ? argv[si + 1].split(',') : null;
  const slugs = fs.readdirSync(path.join(ROOT, 'features')).filter(s => !only || only.includes(s));
  let total = 0;
  for (const slug of slugs) {
    const r = localizeFeature(slug, { dry });
    if (r.copied || r.missing.length) {
      total += r.bytes;
      console.log(`${slug}: ${r.copied} files (${(r.bytes / 1048576).toFixed(1)} MB)` + (r.missing.length ? `, missing: ${r.missing.slice(0, 3).join(', ')}${r.missing.length > 3 ? '…' : ''}` : ''));
    }
  }
  console.log(`${dry ? '[dry] ' : ''}Total ${(total / 1048576).toFixed(1)} MB`);
}

module.exports = { localizeFeature };
