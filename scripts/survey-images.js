#!/usr/bin/env node
/**
 * Lists sections whose pictures the Content tab cannot edit: elements painted with a CSS background image and
 * <img> tags nobody can reach, found by rendering each feature in the real builder.
 *   node scripts/survey-images.js [--slug a,b] [--concurrency 4]
 */
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let items = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget);
  if (get('slug')) items = items.filter(x => get('slug').split(',').includes(x.slug));
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = [...items];
  const out = [];
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const item = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'survey', slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), item.slug);
        await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('survey'); }, null, { timeout: 20000 });
        await page.waitForTimeout(1500);
        const frame = page.frames().find(f => f !== page.mainFrame());
        const r = await frame.evaluate(() => {
          const root = document.getElementById('survey');
          const cust = (window.parent.BuilderExtras || window.BuilderExtras);
          const fields = cust ? cust.discoverFields(root, null, { limit: 40 }).filter(f => f.type === 'image') : [];
          
          const loose = [];
          root.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 40 || rect.height < 40) return;
            const bg = getComputedStyle(el).backgroundImage;
            if (!/url\(/.test(bg) || /gradient/.test(bg) && !/url\(/.test(bg)) return;
            loose.push({ el: (el.className && String(el.className).split(' ')[0]) || el.tagName.toLowerCase(), bg: bg.slice(0, 60) });
          });
          const svgPics = Array.from(root.querySelectorAll('svg')).filter(s => { const r = s.getBoundingClientRect(); return r.width > 120 && r.height > 80 && !s.closest('button'); }).length;
          const canvases = root.querySelectorAll('canvas').length;
          return { imgFields: fields.length, bgs: loose.slice(0, 6), bgCount: loose.length, svgPics, canvases };
        });
        out.push({ slug: item.slug, ...r });
      } catch (e) { out.push({ slug: item.slug, error: String(e.message).slice(0, 80) }); }
      await ctx.close();
    }
  }));
  await browser.close(); srv.close && srv.close();
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  require('fs').writeFileSync(get('out') || 'survey.json', JSON.stringify(out, null, 1));
  console.log(out.filter(o => o.error || o.bgCount || o.svgPics).map(o => JSON.stringify(o)).join('\n'));
  process.exit(0);
}
main();
