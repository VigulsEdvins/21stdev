#!/usr/bin/env node
/**
 * Facts about one CRM client for a personalised preview (read only).
 *   node scripts/preview/client-facts.js "<company part>" [--site https://...] [--out dir]
 * Reads the client from the CRM's data/crm.json (CRM_DATA overrides the path), then opens the client's own public page in headless
 * Chromium: title, description, theme colour, accent (largest non-grey background area), logo and a few photos (saved to --out).
 * With a zl.lv link also the listing (description, services, gallery) and for a Facebook/Instagram link what the public page shows without login.
 * Prints one JSON object. Never writes to the CRM. Material is only for that client's own tokenised, noindex preview.
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('../lib/browser');

const CRM = process.env.CRM_DATA || '/home/edvins/system-for-clients/data/crm.json';
const UAH = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130' };
const plainText = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&ndash;|&mdash;/g, '–').replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&#0?39;/g, "'").split('\n').map(x => x.trim()).filter(Boolean);
const SIZES = ['1440x610', '1200x800', '1024x683', '1000x667', '800x600', '768x512'];

/** The client's zl.lv listing: description, services, keywords, and its own gallery (largest size that exists). Saves pictures to out. */
async function zlFacts(url, out) {
  const base = url.replace(/\/(atteli|karte)\/?$/, '').replace(/\/$/, '');
  const main = await (await fetch(base + '/', { headers: UAH })).text();
  const lines = plainText((main.match(/<div class="rich-text">([\s\S]*?)<\/div>\s*<\/div>/) || [, ''])[1]);
  const sec = (a, b) => { const i = lines.findIndex(l => a.test(l)); if (i < 0) return []; const j = lines.findIndex((l, k) => k > i && b.test(l)); return lines.slice(i + 1, j < 0 ? undefined : j); };
  const all = plainText(main);
  const keywords = (all[all.findIndex(l => /^Atslēgvārdi$/.test(l)) + 1] || '') && all.slice(all.findIndex(l => /^Atslēgvārdi$/.test(l)) + 1, all.findIndex(l => /^Atslēgvārdi$/.test(l)) + 12).filter(l => l.length < 40 && l !== '.'); // keywords end where the legal block starts
  if (keywords) { const e = keywords.findIndex(l => /^(Vairāk|Juridisk|Teicams|Reģistrācijas|Banka)/.test(l)); if (e >= 0) keywords.length = e; }
  const f = { description: lines.filter(l => !/^(Apraksts|Pakalpojumi:?)$/.test(l)).slice(0, 6).join(' ').slice(0, 900), services: sec(/^Pakalpojumi:?$/, /^(Kāpēc|Kontakti|Atsauksmes)/).slice(0, 12), keywords, hours: (all.find(l => /^(Darba laiks|Atvērts)/i.test(l)) || ''), images: [], saved: [] };
  const gal = await (await fetch(base + '/atteli', { headers: UAH })).text();
  const thumbs = [...new Set([...gal.matchAll(/https:\/\/img\.zl\.lv\/infopage\/photos\/+([^"'\s)]+?)_(\d+x\d+)\.(jpe?g|png|webp)/gi)].filter(m => !/_(gmb|balticexp)|medic_/.test(m[1])).map(m => m[1] + '|' + m[3]))];
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const [i, t] of thumbs.slice(0, 8).entries()) {
    const [stem, ext] = t.split('|');
    for (const sz of SIZES) {
      const u = `https://img.zl.lv/infopage/photos/${stem}_${sz}.${ext}`, r = await fetch(u, { headers: UAH });
      if (!r.ok) continue;
      f.images.push(u);
      if (out) { const file = path.join(out, 'zl-' + (i + 1) + '.' + ext.toLowerCase().replace('jpeg', 'jpg')); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); f.saved.push(file); }
      break;
    }
  }
  return f;
}

/** What a public Facebook/Instagram page shows without logging in. A login wall is reported and left alone, never bypassed. */
async function socialFacts(browser, url, out) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); await page.waitForTimeout(2500);
    const f = await page.evaluate(() => {
      const meta = n => (document.querySelector('meta[property="' + n + '"],meta[name="' + n + '"]') || {}).content || '';
      return { title: meta('og:title') || document.title, description: meta('og:description'), ogImage: meta('og:image'), walled: /log in|prisijung|pierakst|войти/i.test(document.body.innerText.slice(0, 600)) && document.body.innerText.length < 1500,
        images: [...document.images].filter(i => i.naturalWidth >= 400 && /scontent|cdninstagram/.test(i.src)).map(i => i.currentSrc || i.src).slice(0, 8) };
    });
    f.saved = [];
    if (out) for (const [i, u] of [...new Set([f.ogImage, ...f.images].filter(Boolean))].slice(0, 6).entries()) { try { const r = await page.request.get(u); if (r.ok()) { const file = path.join(out, 'social-' + (i + 1) + '.jpg'); fs.writeFileSync(file, await r.body()); f.saved.push(file); } } catch { /* expired signed URL */ } }
    return f;
  } catch (e) { return { error: e.message }; } finally { await page.close(); }
}

const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function findClient(q) {
  const list = JSON.parse(fs.readFileSync(CRM, 'utf8')).clients || [];
  const hits = list.filter(c => (c.companyName || '').toLowerCase().includes(q.toLowerCase()));
  if (hits.length !== 1) throw new Error(hits.length ? 'several clients match: ' + hits.map(c => c.companyName).join(' | ') : 'no client matches "' + q + '"');
  const c = hits[0];
  return { id: c.id, company: c.companyName, contact: c.contactName, email: c.email, phone: c.phone, address: c.address, industry: c.checklist && c.checklist.industry,
    offeredFeatures: c.checklist && c.checklist.offeredFeatures, links: c.links, stage: c.stage, notes: c.notes, designPreviews: c.designPreviews };
}

async function siteFacts(url, out) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    const f = await page.evaluate(() => {
      const meta = n => (document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]') || {}).content || '';
      const grey = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 28;
      const area = {};
      for (const el of document.querySelectorAll('body *')) {
        const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g); if (!m || (m[3] !== undefined && +m[3] < 0.9)) continue;
        const c = m.slice(0, 3).map(Number); if (grey(c)) continue;
        const r = el.getBoundingClientRect(); area[c.join(',')] = (area[c.join(',')] || 0) + r.width * r.height;
      }
      const top = Object.entries(area).sort((a, b) => b[1] - a[1])[0];
      const abs = u => { try { return new URL(u, location.href).href; } catch (_) { return ''; } };
      const logo = [...document.querySelectorAll('img')].find(i => /logo/i.test(i.src + i.alt + i.className)) || null;
      const photos = [...document.querySelectorAll('main img, section img, img')].filter(i => i.naturalWidth >= 600 && !/logo|icon|sprite/i.test(i.src)).map(i => abs(i.currentSrc || i.src)).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 6);
      return { title: document.title, description: meta('description'), themeColor: meta('theme-color'), accent: top ? top[0].split(',').map(Number) : null,
        logo: logo ? abs(logo.currentSrc || logo.src) : '', ogImage: abs(meta('og:image')), photos,
        phones: [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href').slice(4)))].slice(0, 3),
        emails: [...new Set([...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute('href').slice(7).split('?')[0]))].slice(0, 3) };
    });
    f.accent = f.accent ? hex(f.accent) : '';
    if (out) {
      fs.mkdirSync(out, { recursive: true });
      const save = async (u, name) => { try { const r = await page.request.get(u); if (!r.ok()) return ''; const ext = (u.split('?')[0].match(/\.(png|jpe?g|webp|svg)$/i) || [, 'jpg'])[1].toLowerCase(); const p = path.join(out, name + '.' + ext); fs.writeFileSync(p, await r.body()); return p; } catch (_) { return ''; } };
      f.savedLogo = f.logo ? await save(f.logo, 'logo') : '';
      f.savedPhotos = []; for (const [i, u] of f.photos.slice(0, 4).entries()) { const p = await save(u, 'photo' + (i + 1)); if (p) f.savedPhotos.push(p); }
    }
    return f;
  } finally { await browser.close(); }
}

if (require.main === module) {
  const a = process.argv.slice(2), get = k => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  (async () => {
    try {
      const client = findClient(a[0] || '');
      const site = get('site') || (client.links && client.links.website), L = client.links || {}, out = get('out');
      let web = null; if (site) { try { web = await siteFacts(site, out); web.url = site; } catch (e) { web = { url: site, error: e.message }; } }
      let zl = null; if (/zl\.lv\/.*uznemums/.test(L.other || '')) { try { zl = await zlFacts(L.other, out); } catch (e) { zl = { error: e.message }; } }
      const social = {};
      for (const k of ['facebook', 'instagram']) if (L[k]) { const b = await launchBrowser(); try { social[k] = await socialFacts(b, L[k].replace(/#.*$/, ''), out && path.join(out, 'social-' + k)); } finally { await b.close(); } if (out && social[k].ogImage) fs.mkdirSync(path.join(out, 'social-' + k), { recursive: true }); }
      console.log(JSON.stringify({ client, site: web, zl, social }, null, 2));
    } catch (e) { console.error('error: ' + e.message); process.exit(1); }
  })();
}
module.exports = { findClient };
