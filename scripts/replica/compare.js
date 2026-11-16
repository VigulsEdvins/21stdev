#!/usr/bin/env node
/**
 * Side-by-side check of a replica against its research screenshots.
 *   node scripts/replica/compare.js <slug>=<host> [<slug>=<host> ...]
 * Shoots features/<slug>/index.html at 1440x900 at y = 0, 900, 1800 ... and writes
 * reports/replica/compare-<slug>.jpg (left original, right replica) plus page height and console errors.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { startServer, launchBrowser } = require('../lib/browser');

const OUT = path.join(__dirname, '..', '..', 'reports', 'replica');

(async () => {
  const pairs = process.argv.slice(2).map(a => a.split('='));
  if (!pairs.length) { console.log('Usage: node scripts/replica/compare.js <slug>=<host> ...'); process.exit(1); }
  const srv = await startServer(); const browser = await launchBrowser();
  for (const [slug, host] of pairs) {
    const ref = path.join(OUT, host), mine = path.join(OUT, '_shots', slug);
    fs.mkdirSync(mine, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await page.goto(`${srv.url}/features/${slug}/index.html`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 450) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(100); } // fire reveals
    const tiles = [];
    for (let i = 0; i < 9 && (i * 900 < H || fs.existsSync(path.join(ref, `v${i}.png`))); i++) {
      await page.evaluate(v => scrollTo(0, v), i * 900); await page.waitForTimeout(900);
      const m = path.join(mine, `m${i}.png`); await page.screenshot({ path: m });
      const r = path.join(ref, `v${i}.png`);
      tiles.push(fs.existsSync(r) ? r : 'xc:white', m);
    }
    const sheet = path.join(OUT, `compare-${slug}.jpg`);
    execFileSync('montage', [...tiles, '-tile', '2x', '-geometry', '600x375+3+3', '-background', '#888', sheet]);
    const refH = fs.existsSync(path.join(ref, 'summary.md')) ? (fs.readFileSync(path.join(ref, 'summary.md'), 'utf8').match(/height (\d+)px/) || [])[1] : '?';
    console.log(`${slug}: height ${H} (original ${refH}) · errors ${errs.length ? errs.slice(0, 3).join(' | ') : 'none'} -> ${path.relative(process.cwd(), sheet)}`);
    await page.close();
  }
  await browser.close(); await srv.close(); process.exit(0);
})();
