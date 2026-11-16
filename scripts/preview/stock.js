#!/usr/bin/env node
/**
 * Thematic stock photos with a free licence, for previews when the client has too few photos of its own.
 *   node scripts/preview/stock.js "<query>" [--n 8] [--out dir] [--min 1400]
 * Source, best first: Unsplash (UNSPLASH_ACCESS_KEY), Pexels (PEXELS_API_KEY), each from the environment or scripts/preview/stock-keys.json
 * ({"unsplash": "...", "pexels": "..."}, git-ignored; both services give free keys). Without a key: Wikimedia Commons (free licences only), whose
 * pictures are documentary and rarely good enough for a client page: the tool says so.
 * Downloads the candidates to --out (1600 px wide) and writes credits.json (title, author, licence, page URL). Candidates must still be looked at:
 * keep only images with no identifiable person, no logos, no text. Attribution (CC BY / BY-SA) is the owner's to honour before a real launch.
 */
const fs = require('fs');
const path = require('path');

const UA = 'edvlabs-previews/1.0 (design preview tool)';
const OK_LICENCE = /^(cc0|public domain|pd|cc[- ]by(?:[- ]sa)?[- ][\d.]+)/i;
const strip = s => String(s || '').replace(/<[^>]+>/g, '').trim();

async function commons(q, n, min) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: q + ' filetype:bitmap', gsrlimit: '40', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600' });
  const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
  const out = [];
  for (const p of Object.values((j.query && j.query.pages) || {})) {
    const i = (p.imageinfo || [])[0]; if (!i || !/jpeg|png/.test(i.mime) || i.width < min) continue;
    const m = i.extmetadata || {}, lic = strip(m.LicenseShortName && m.LicenseShortName.value);
    if (!OK_LICENCE.test(lic)) continue;
    if (/\b(portrait|selfie|born|politician|actor|singer)\b/i.test(strip(m.ImageDescription && m.ImageDescription.value) + ' ' + p.title)) continue;
    out.push({ url: i.thumburl || i.url, title: p.title.replace(/^File:/, ''), author: strip(m.Artist && m.Artist.value), licence: lic, page: i.descriptionurl, w: i.width, h: i.height });
  }
  return out.slice(0, n);
}

async function unsplash(q, n, key) {
  const j = await (await fetch('https://api.unsplash.com/search/photos?' + new URLSearchParams({ query: q, per_page: String(n), orientation: 'landscape' }), { headers: { Authorization: 'Client-ID ' + key, 'User-Agent': UA } })).json();
  return (j.results || []).map(r => ({ url: r.urls.raw + (r.urls.raw.includes('?') ? '&' : '?') + 'w=1800&q=80&fm=jpg&fit=max', title: r.alt_description || q, author: r.user && r.user.name, licence: 'Unsplash licence', page: r.links.html, download: r.links.download_location, w: r.width, h: r.height }));
}

async function pexels(q, n, key) {
  const j = await (await fetch('https://api.pexels.com/v1/search?' + new URLSearchParams({ query: q, per_page: String(n), orientation: 'landscape' }), { headers: { Authorization: key, 'User-Agent': UA } })).json();
  return (j.photos || []).map(r => ({ url: r.src.large2x || r.src.large, title: r.alt || q, author: r.photographer, licence: 'Pexels licence', page: r.url, w: r.width, h: r.height }));
}

function keys() {
  let f = {}; try { f = JSON.parse(fs.readFileSync(path.join(__dirname, 'stock-keys.json'), 'utf8')); } catch { /* no file */ }
  return { unsplash: process.env.UNSPLASH_ACCESS_KEY || f.unsplash, pexels: process.env.PEXELS_API_KEY || f.pexels };
}

async function stock(q, { n = 8, out, min = 1400 } = {}) {
  const k = keys(), found = k.unsplash ? await unsplash(q, n, k.unsplash) : k.pexels ? await pexels(q, n, k.pexels) : await commons(q, n, min), saved = [];
  if (!k.unsplash && !k.pexels) console.error('note: no Unsplash/Pexels key, using Wikimedia Commons: expect documentary photos (see scripts/preview/stock.js)');
  fs.mkdirSync(out, { recursive: true });
  for (const [k, f] of found.entries()) {
    try {
      const r = await fetch(f.url, { headers: { 'User-Agent': UA } }); if (!r.ok) continue;
      const file = path.join(out, 'stock-' + q.replace(/\W+/g, '-').slice(0, 24) + '-' + (k + 1) + (/\.png/i.test(f.url) ? '.png' : '.jpg'));
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); saved.push({ file, ...f });
    } catch { /* skip an unreachable image */ }
  }
  const cf = path.join(out, 'credits.json'), old = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : [];
  fs.writeFileSync(cf, JSON.stringify([...old, ...saved.map(s => ({ file: path.basename(s.file), title: s.title, author: s.author, licence: s.licence, page: s.page, download: s.download }))], null, 1));
  return saved;
}

if (require.main === module) {
  const a = process.argv.slice(2), get = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  stock(a[0] || '', { n: +(get('n') || 8), out: get('out'), min: +(get('min') || 1400) }).then(s => console.log(s.map(x => path.basename(x.file) + ' ' + x.w + 'x' + x.h + ' ' + x.licence + ' | ' + x.title.slice(0, 60)).join('\n') || 'nothing found')).catch(e => { console.error('error: ' + e.message); process.exit(1); });
}
/** Unsplash asks API users to report a download when a photo is actually used: call this for the files kept in a preview. */
async function track(files, dir) {
  const k = keys().unsplash, cr = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8'));
  for (const f of files) { const c = cr.find(x => x.file === path.basename(f)); if (k && c && c.download) await fetch(c.download, { headers: { Authorization: 'Client-ID ' + k } }).catch(() => {}); }
}

module.exports = { stock, track };
