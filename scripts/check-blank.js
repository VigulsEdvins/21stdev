#!/usr/bin/env node
/**
 * Adds every feature alone to a page in the real builder and fails if the section renders nothing (no text,
 * canvas, svg, image, video or iframe). check-features loads index.html on its own, so it cannot see a feature
 * whose script.js/style.css are broken or stubbed; the builder and exports use those files.
 *   npm run check-blank [-- --slug a,b] [--concurrency 4]
 * KNOWN_EMPTY lists features that stay empty in headless Chromium (no GPU, or they wait for interaction);
 * confirm any new entry in a real browser first. It is empty now: the four that used to be listed had stale bundles.
 */
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const KNOWN_EMPTY = new Set([]);

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let slugs = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget).map(x => x.slug);
  if (get('slug')) slugs = slugs.filter(s => get('slug').split(',').includes(s));
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = [...slugs];
  const blank = [];
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const slug = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'blank-check', slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
        // Some features start with an empty frame (loading screens, reveals), so look for up to 8 seconds
        const probe = async () => { try { return await page.frames().find(f => f !== page.mainFrame()).evaluate(() => {
          const root = document.getElementById('blank-check');
          if (!root) return 'missing';
          const shown = root.querySelectorAll('canvas,svg,img,video,iframe').length + root.innerText.trim().length;
          return shown ? 'ok' : 'blank';
        }); } catch (_) { return 'blank'; } };
        let state = 'blank';
        for (let i = 0; i < 16 && state !== 'ok'; i++) { await page.waitForTimeout(500); state = await probe(); }
        if (state !== 'ok') blank.push({ slug, state });
      } catch (e) {
        blank.push({ slug, state: 'error: ' + e.message.split('\n')[0] });
      } finally {
        await ctx.close();
      }
    }
  }));
  await browser.close();
  await srv.close();
  const unexpected = blank.filter(b => !KNOWN_EMPTY.has(b.slug));
  const gone = [...KNOWN_EMPTY].filter(s => slugs.includes(s) && !blank.some(b => b.slug === s));
  console.log(`${slugs.length - blank.length}/${slugs.length} features render something in the builder (${blank.length - unexpected.length} known-empty).`);
  gone.forEach(s => console.log(`  note: ${s} now renders; remove it from KNOWN_EMPTY`));
  unexpected.forEach(b => console.log(`  ✗ ${b.slug}: ${b.state}`));
  process.exit(unexpected.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
