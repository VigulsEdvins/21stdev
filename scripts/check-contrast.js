#!/usr/bin/env node
/**
 * Finds text that is hard or impossible to read when a component sits in the builder: every component is added to
 * an empty page in each theme, and each visible text element's colour is compared with the colour painted behind it.
 *   npm run check-contrast [-- --slug a,b] [--themes midnight-dark,clean-minimal] [--concurrency 3] [--min 2.2]
 * Elements are skipped when their background cannot be read reliably (images, gradients with transparency, canvases).
 * Prints the components with the worst offenders; it is advisory (exit code 0) because some low contrast is deliberate.
 */
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };

(async () => {
  let items = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget && !x.liveSiteUrl);
  if (get('slug')) items = items.filter(x => get('slug').split(',').includes(x.slug));
  const themes = (get('themes') || 'midnight-dark,clean-minimal').split(',');
  const min = Number(get('min') || 2.2);
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = items.map(x => x.slug);
  const rows = [];
  await Promise.all(Array.from({ length: Number(get('concurrency') || 3) }, async () => {
    while (jobs.length) {
      const slug = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const watchdog = setTimeout(() => { ctx.close().catch(() => {}); }, 120000);
      const page = await ctx.newPage();
      const row = { slug, bad: {} };
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        for (const theme of themes) {
          await page.evaluate(({ slug, theme }) => {
            const sm = window.builderPreview.stackManager;
            sm.setTheme(theme);
            sm.setStack([{ id: 'c', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
          }, { slug, theme });
          await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('c'); }, null, { timeout: 20000 });
          await page.waitForTimeout(2200);
          const frame = page.frames().find(f => f !== page.mainFrame());
          row.bad[theme] = await frame.evaluate(() => {
            const sec = document.getElementById('c');
            const lum = (r, g, b) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
            const parse = (s) => {
              const m = (s || '').match(/-?[\d.]+(?:e-?\d+)?/g);
              if (!m) return null;
              const v = m.map(Number);
              // modern colour spaces (color-mix results) report 0-1 channels
              if (/^color\(/.test(s)) { v[0] *= 255; v[1] *= 255; v[2] *= 255; }
              return v;
            };
            const out = [];
            let checked = 0;
            const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
            const seen = new Set();
            while (walker.nextNode()) {
              const n = walker.currentNode;
              if (!n.textContent.trim()) continue;
              const el = n.parentElement;
              if (!el || seen.has(el)) continue;
              seen.add(el);
              const cs = getComputedStyle(el);
              if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.3) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width < 4 || rect.height < 4) continue;
              const fg = parse(cs.color);
              if (!fg) continue;
              // find the first opaque background behind the element; give up on images/gradients
              let bg = null, e = el, unreliable = false, alpha = fg.length > 3 ? fg[3] : 1;
              while (e && e !== document.documentElement.parentElement) {
                const s = getComputedStyle(e);
                if (s.backgroundImage && s.backgroundImage !== 'none') { unreliable = true; break; }
                const c = parse(s.backgroundColor);
                if (c && (c.length < 4 || c[3] > 0.95)) { bg = c; break; }
                e = e.parentElement;
              }
              if (unreliable || !bg) continue;
              checked++;
              const L1 = lum(fg[0], fg[1], fg[2]), L2 = lum(bg[0], bg[1], bg[2]);
              const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
              if (ratio < 2.2 && alpha > 0.5) out.push({ t: n.textContent.trim().slice(0, 24), r: Math.round(ratio * 10) / 10 });
            }
            return { checked, low: out.slice(0, 5), n: out.length };
          });
        }
      } catch (e) {
        row.error = e.message.split('\n')[0];
      } finally {
        clearTimeout(watchdog);
        await ctx.close().catch(() => {});
      }
      rows.push(row);
    }
  }));
  await browser.close();
  await srv.close();
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  const flagged = rows.filter(r => Object.values(r.bad).some(b => b && b.n >= 2));
  flagged.forEach(r => console.log(`✗ ${r.slug}: ` + Object.entries(r.bad).filter(([, b]) => b && b.n).map(([t, b]) => `${t} ${b.n} low (${b.low.map(x => `"${x.t}" ${x.r}`).join(', ')})`).join(' | ')));
  rows.filter(r => r.error).forEach(r => console.log(`? ${r.slug}: ${r.error}`));
  console.log(`${rows.length - flagged.length}/${rows.length} components have readable text (threshold ${min}:1; ${flagged.length} flagged).`);
})();
