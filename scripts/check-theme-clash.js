#!/usr/bin/env node
/**
 * Theme-clash check: renders every feature alone under a dark and a light page theme, measures how light the
 * section looks (mean luminance of a screenshot) and fails when it is the opposite of the page - a dark block
 * on a light page, or a light one on a dark page - without a deliberate reason. A component may keep its own
 * look on purpose: `nativeWhen` (own palette under that page theme), `ownPalette`, or `themeReviewed` in meta.json.
 * WebGL / shader art (category Audio & Shaders, or measured WebGL) is art-directed and exempt. Only a clear mismatch
 * counts: a dark page needs a section lighter than 0.62, a light page one darker than 0.30.
 *   npm run check-theme-clash [-- --slug a,b] [--concurrency 4] [--all]
 * --all also lists the components that are exempt, with their reason. Writes reports/theme-clash.json.
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const THEMES = [{ id: 'midnight-dark', dark: true }, { id: 'clean-minimal', dark: false }];

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let items = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget && !/preloader/i.test(x.category + x.slug));
  if (get('slug')) items = items.filter(x => get('slug').split(',').includes(x.slug));
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = [...items];
  const rows = [];
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const item = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const row = { slug: item.slug, lum: {}, clash: [], exempt: null };
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        for (const th of THEMES) {
          await page.evaluate(({ slug, theme }) => {
            const sm = window.builderPreview.stackManager;
            sm.setTheme(theme);
            sm.setStack([{ id: 'clash', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
          }, { slug: item.slug, theme: th.id });
          await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('clash'); }, null, { timeout: 20000 });
          await page.waitForTimeout(2500);
          const frame = page.frames().find(f => f !== page.mainFrame());
          const el = frame.locator('#clash');
          const buf = await el.screenshot({ timeout: 15000 });
          const lum = await page.evaluate(async (b64) => {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
            const c = document.createElement('canvas'); c.width = 48; c.height = 48;
            const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 48);
            const d = x.getImageData(0, 0, 48, 48).data;
            let s = 0; for (let i = 0; i < d.length; i += 4) s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
            return s / (d.length / 4);
          }, buf.toString('base64'));
          row.lum[th.id] = Math.round(lum * 100) / 100;
          if (th.dark ? lum > 0.62 : lum < 0.30) row.clash.push(th.id);
        }
        const why = [];
        if ((item.nativeWhen || []).length) why.push('nativeWhen ' + item.nativeWhen.join('/'));
        if (item.ownPalette) why.push('ownPalette');
        let meta = {};
        try { meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'features', item.slug, 'meta.json'), 'utf8')); } catch (_) { /* no meta */ }
        if (meta.themeReviewed) why.push('themeReviewed');
        if (/shader/i.test(item.category || '') || (meta.measured && meta.measured.webgl)) why.push('shader art');
        row.exempt = why.length ? why.join(', ') : null;
      } catch (e) {
        row.error = e.message.split('\n')[0];
      } finally {
        await ctx.close();
      }
      rows.push(row);
    }
  }));
  await browser.close();
  await srv.close();
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'theme-clash.json'), JSON.stringify(rows, null, 2));
  const bad = rows.filter(r => r.clash.length && !r.exempt);
  const errs = rows.filter(r => r.error);
  const exempt = rows.filter(r => r.clash.length && r.exempt);
  console.log(`${rows.length - bad.length - errs.length}/${rows.length} components follow the page theme or have a stated reason not to (${exempt.length} deliberate).`);
  bad.forEach(r => console.log(`  ✗ ${r.slug}: opposite of the page under ${r.clash.join(' + ')} (luminance ${JSON.stringify(r.lum)})`));
  errs.forEach(r => console.log(`  ? ${r.slug}: could not measure: ${r.error}`));
  if (argv.includes('--all')) exempt.forEach(r => console.log(`  · ${r.slug}: ${r.exempt} (${r.clash.join(' + ')})`));
  process.exit(bad.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
