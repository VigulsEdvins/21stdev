#!/usr/bin/env node
/**
 * Visual regression guard. Each feature is rendered alone in the builder (dark theme, 1280x800) and reduced to a
 * small colour fingerprint: a 16x10 grid of average colours. `tests/visual/baseline.json` keeps one fingerprint
 * per feature (about 1.5 KB each, so the repo does not fill up with screenshots). A run fails when a feature
 * moves further from its baseline than its own noise allowance, which catches blank, broken or restyled output
 * while letting animated components wobble.
 *   npm run check-visual                  compare with the baseline
 *   npm run check-visual -- --update      (re)write the baseline, for all or --slug a,b
 *   --concurrency 4
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT, 'tests', 'visual', 'baseline.json');
const COLS = 16, ROWS = 10;
const BASE_ALLOWANCE = 18; // mean absolute difference per channel (0-255) every feature may drift by
const THEME = 'midnight-dark';

/** Runs in the builder page: draws the screenshot into a small canvas and returns the grid of colours. */
async function fingerprint(page, png) {
  return page.evaluate(async ({ b64, cols, rows }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = cols; c.height = rows;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(img, 0, 0, cols, rows);
    const d = g.getImageData(0, 0, cols, rows).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
    return out;
  }, { b64: png.toString('base64'), cols: COLS, rows: ROWS });
}

const distance = (a, b) => a.reduce((n, v, i) => n + Math.abs(v - b[i]), 0) / a.length;

async function capture(browser, baseUrl, slug) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(baseUrl + '/builder.html');
    await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
    await page.evaluate(({ slug, theme }) => {
      const sm = window.builderPreview.stackManager;
      sm.setTheme(theme);
      sm.setStack([{ id: 'v', slug, sizing: { heightMode: 'custom', customHeight: 800, paddingY: 'none' } }]);
    }, { slug, theme: THEME });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('v'); }, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const png = await (await page.$('iframe')).screenshot({ type: 'png' });
    return await fingerprint(page, png);
  } finally {
    await ctx.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  const update = argv.includes('--update');
  let slugs = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget).map(x => x.slug);
  if (get('slug')) slugs = slugs.filter(s => get('slug').split(',').includes(s));
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { cols: COLS, rows: ROWS, theme: THEME, items: {} };
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = [...slugs];
  const results = {};
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const slug = jobs.shift();
      try {
        const first = await capture(browser, srv.url, slug);
        if (update) {
          // a second capture tells how much this feature moves by itself (animation, randomness)
          const second = await capture(browser, srv.url, slug);
          results[slug] = { fp: first, noise: Math.round(distance(first, second) * 10) / 10 };
        } else {
          results[slug] = { fp: first };
        }
      } catch (e) {
        results[slug] = { error: e.message.split('\n')[0] };
      }
    }
  }));
  await browser.close();
  await srv.close();

  if (update) {
    Object.entries(results).forEach(([slug, r]) => { if (r.fp) baseline.items[slug] = { fp: r.fp.map(v => Math.round(v)), noise: r.noise }; });
    baseline.cols = COLS; baseline.rows = ROWS; baseline.theme = THEME;
    fs.writeFileSync(BASELINE, JSON.stringify(baseline) + '\n');
    console.log(`Baseline written for ${Object.keys(results).length} features (${(fs.statSync(BASELINE).size / 1000).toFixed(0)} KB).`);
    return;
  }
  const changed = [];
  const missing = [];
  Object.entries(results).forEach(([slug, r]) => {
    const base = baseline.items[slug];
    if (r.error) { changed.push({ slug, d: -1, note: r.error }); return; }
    if (!base) { missing.push(slug); return; }
    const d = distance(r.fp, base.fp);
    if (d > BASE_ALLOWANCE + 2 * base.noise) changed.push({ slug, d: Math.round(d * 10) / 10, note: `allowed ${Math.round((BASE_ALLOWANCE + 2 * base.noise) * 10) / 10}` });
  });
  console.log(`${slugs.length - changed.length - missing.length}/${slugs.length} features look like their baseline.`);
  if (missing.length) console.log(`  no baseline yet for: ${missing.join(', ')} (run with --update)`);
  changed.sort((a, b) => b.d - a.d).forEach(c => console.log(`  ✗ ${c.slug}: ${c.d < 0 ? c.note : `moved ${c.d} (${c.note})`}`));
  process.exit(changed.length || missing.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
