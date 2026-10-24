#!/usr/bin/env node
/**
 * Responsive pass: shows every feature alone in the builder's mobile (375 px) and tablet (768 px) preview and
 * reports sideways overflow, i.e. content wider than the window, which shows up as a horizontal scrollbar
 * or a cut-off layout on a phone.
 *   npm run check-responsive [-- --slug a,b] [--widths mobile,tablet] [--concurrency 4]
 * Features listed in KNOWN_OVERFLOW are reported but do not fail the run.
 */
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const MODES = { mobile: { button: '#viewportMobileBtn', width: 375 }, tablet: { button: '#viewportTabletBtn', width: 768 } };
// feature -> reason, for overflow that is by design (a horizontal gallery that is meant to be dragged sideways, ...)
const KNOWN_OVERFLOW = {};

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let slugs = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget).map(x => x.slug);
  if (get('slug')) slugs = slugs.filter(s => get('slug').split(',').includes(s));
  const modes = (get('widths') || 'mobile,tablet').split(',').filter(m => MODES[m]);
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = slugs.flatMap(slug => modes.map(mode => ({ slug, mode })));
  const total = jobs.length;
  const found = [];
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const { slug, mode } = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        await page.click(MODES[mode].button);
        await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'r', slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
        await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('r'); }, null, { timeout: 20000 });
        await page.waitForTimeout(2500);
        const frame = page.frames().find(f => f !== page.mainFrame());
        const r = await frame.evaluate(() => {
          const doc = document.scrollingElement;
          const w = window.innerWidth;
          const over = doc.scrollWidth - w;
          let widest = '';
          if (over > 1) {
            let max = 0;
            document.querySelectorAll('#r *').forEach(el => {
              const b = el.getBoundingClientRect();
              if (b.right - w > max && b.width > 0 && getComputedStyle(el).position !== 'fixed') { max = b.right - w; widest = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''); }
            });
          }
          return { w, over, widest };
        });
        if (r.over > 1) found.push({ slug, mode, over: r.over, widest: r.widest });
      } catch (e) {
        found.push({ slug, mode, over: -1, widest: 'could not render: ' + e.message.split('\n')[0] });
      } finally {
        await ctx.close();
      }
    }
  }));
  await browser.close();
  await srv.close();
  const failing = found.filter(f => !KNOWN_OVERFLOW[f.slug]);
  console.log(`${total - found.length}/${total} checks fit the window without sideways overflow (${found.length - failing.length} known).`);
  failing.sort((a, b) => b.over - a.over).forEach(f => console.log(`  ✗ ${f.slug} [${f.mode}]: ${f.over} px too wide${f.widest ? ' (' + f.widest + ')' : ''}`));
  process.exit(failing.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
