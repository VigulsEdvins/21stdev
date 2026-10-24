#!/usr/bin/env node
/**
 * Makes features independent of other websites: downloads the images and Google Fonts they hot-link, stores
 * them in assets/library/ (named <name>-<content hash>.<ext>, identical files kept once) and rewrites the
 * references to /assets/library/<file>, which the exporter already bundles into the ZIP.
 *   node scripts/localize-remote.js [--dry] [--slug a,b] [--hosts images.unsplash.com,cdn.21st.dev,...]
 * Handles: images from the listed hosts, and fonts.googleapis.com CSS (the woff2 files are downloaded and a
 * local stylesheet with relative font URLs is written next to them). URLs with ${...} (built at run time),
 * video and live embeds (Unicorn Studio, jsDelivr scripts) are left alone and reported.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'assets', 'library');
const TEXT_FILES = ['index.html', 'style.css', 'script.js', 'component.tsx', 'demo.tsx'];
const DEFAULT_HOSTS = ['images.unsplash.com', 'cdn.21st.dev', 'pub-940ccf6255b54fa799a9b01050e6c227.r2.dev'];
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/avif': '.avif' };
const CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const URL_RE = /https:\/\/[A-Za-z0-9._~:\/?#@!$&*+,;=%\-]+/g;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const HOSTS = (get('hosts') ? get('hosts').split(',') : DEFAULT_HOSTS);
const DRY = flag('dry');

const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
const slugify = (s) => s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'file';

async function download(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: (res.headers.get('content-type') || '').split(';')[0].trim() };
}

function store(name, bytes) {
  if (!DRY) { fs.mkdirSync(LIB, { recursive: true }); fs.writeFileSync(path.join(LIB, name), bytes); }
  return name;
}

async function localizeImage(url) {
  const { bytes, type } = await download(url);
  const ext = IMAGE_TYPES[type];
  if (!ext) throw new Error(`not an image (${type}) ${url}`);
  const u = new URL(url);
  const base = slugify(path.basename(u.pathname, path.extname(u.pathname)) || u.host);
  return { name: store(`${base}-${sha(bytes)}${ext}`, bytes), size: bytes.length };
}

async function localizeFontCss(url) {
  const { bytes } = await download(url, { 'User-Agent': CHROME_UA });
  let css = bytes.toString('utf8');
  let size = 0;
  const files = new Map();
  for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
    if (files.has(m[1])) continue;
    const f = await download(m[1]);
    const ext = path.extname(new URL(m[1]).pathname) || '.woff2';
    files.set(m[1], store(`font-${sha(f.bytes)}${ext}`, f.bytes));
    size += f.bytes.length;
  }
  for (const [remote, local] of files) css = css.split(remote).join(local);
  const out = Buffer.from(css);
  const family = (url.match(/family=([^:&]+)/) || [, 'fonts'])[1];
  return { name: store(`fonts-${slugify(family)}-${sha(out)}.css`, out), size: size + out.length };
}

async function main() {
  let slugs = fs.readdirSync(path.join(ROOT, 'features')).filter(s => fs.existsSync(path.join(ROOT, 'features', s, 'meta.json')));
  if (get('slug')) slugs = slugs.filter(s => get('slug').split(',').includes(s));
  const cache = new Map(); // remote url -> { local, size } | { error }
  const left = {};
  let changedFiles = 0;
  let bytes = 0;

  const resolve = async (url) => {
    if (cache.has(url)) return cache.get(url);
    const host = new URL(url).host;
    let entry;
    try {
      if (host === 'fonts.googleapis.com') { const r = await localizeFontCss(url); entry = { local: `/assets/library/${r.name}`, size: r.size }; }
      else if (HOSTS.includes(host)) { const r = await localizeImage(url); entry = { local: `/assets/library/${r.name}`, size: r.size }; }
      else entry = { skip: true };
    } catch (e) { entry = { error: e.message }; }
    cache.set(url, entry);
    return entry;
  };

  for (const slug of slugs) {
    const dir = path.join(ROOT, 'features', slug);
    for (const file of TEXT_FILES.map(f => path.join(dir, f)).filter(f => fs.existsSync(f))) {
      const text = fs.readFileSync(file, 'utf8');
      // URLs that stop at "${" or are only a host/prefix are completed at run time: leave them
      const urls = [...new Set([...text.matchAll(URL_RE)]
        .filter(m => text[m.index + m[0].length] !== '{' && !m[0].endsWith('$'))
        .map(m => m[0].replace(/[)'",;.]+$/, ''))
        .filter(u => { const last = new URL(u).pathname.split('/').pop(); return last.length >= 12 || /\.[a-z0-9]{2,5}$/i.test(last) || (new URL(u).host === 'fonts.googleapis.com' && new URL(u).pathname.length > 1); }))];
      const map = new Map();
      for (const url of urls) {
        if (url.includes('${')) continue;
        const host = new URL(url).host;
        if (host !== 'fonts.googleapis.com' && !HOSTS.includes(host)) continue;
        const r = await resolve(url);
        if (r.local) map.set(url, r.local);
        else if (r.error) (left[slug] = left[slug] || []).push(r.error);
      }
      if (!map.size) continue;
      // longest first so a URL that is a prefix of another is not replaced inside it
      let out = text;
      for (const [url, local] of [...map].sort((a, b) => b[0].length - a[0].length)) out = out.split(url).join(local);
      if (out !== text) { changedFiles++; if (!DRY) fs.writeFileSync(file, out); }
    }
  }
  for (const r of cache.values()) if (r.size) bytes += r.size;
  console.log(`${DRY ? '[dry run] ' : ''}${[...cache.values()].filter(r => r.local).length} remote files localized (${(bytes / 1e6).toFixed(1)} MB), ${changedFiles} feature files rewritten.`);
  for (const [slug, errs] of Object.entries(left)) console.log(`  ✗ ${slug}: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
