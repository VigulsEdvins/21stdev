#!/usr/bin/env node
/**
 * Replaces keyword guesses with measurements: opens every feature in headless Chromium and records
 *  - average page luminance (-> `dark` / `light` mood),
 *  - whether it asks for a WebGL context (-> weight `heavy`) or draws on a 2D canvas / runs a busy
 *    animation loop (-> `medium`), otherwise `light`.
 * Features marked `"reviewed": true` in meta.json are left alone, so hand edits are never overwritten.
 *   npm run refine-meta [-- --slug a,b] [--dry]
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

const PROBE = () => {
  window.__probe = { webgl: false, canvas2d: false, raf: 0 };
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/webgl/i.test(type)) window.__probe.webgl = true;
    if (type === '2d') window.__probe.canvas2d = true;
    return origGet.call(this, type, ...rest);
  };
  const origRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) { window.__probe.raf++; return origRaf.call(window, cb); };
};

async function measure(browser, baseUrl, slug) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  try {
    await page.goto(`${baseUrl}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);
    // Read the probe before our own canvas work below, which would otherwise count as the page's canvas use
    const probe = await page.evaluate(() => ({ ...window.__probe }));
    const shot = await page.screenshot({ type: 'jpeg', quality: 50 });
    const luma = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 64; c.height = 40;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, 64, 40);
      const d = x.getImageData(0, 0, 64, 40).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      return sum / (d.length / 4);
    }, shot.toString('base64'));
    return { luma, ...probe };
  } catch (e) {
    return null;
  } finally {
    await ctx.close();
  }
}

function applyMeasurement(meta, m) {
  const moods = new Set(meta.mood || []);
  moods.delete('dark'); moods.delete('light');
  if (m.luma < 0.28) moods.add('dark');
  else if (m.luma > 0.62) moods.add('light');
  if (!moods.size) moods.add('minimal');
  const weight = m.webgl ? 'heavy' : (m.canvas2d || m.raf > 120) ? 'medium' : 'light';
  return { ...meta, mood: [...moods], weight, measured: { luma: Math.round(m.luma * 100) / 100, webgl: m.webgl, canvas2d: m.canvas2d } };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  let slugs = registry.items.map(i => i.slug);
  if (typeof args.slug === 'string') slugs = slugs.filter(s => args.slug.split(',').includes(s));
  const srv = await startServer();
  const browser = await launchBrowser();
  const queue = slugs.slice();
  const changes = { mood: 0, weight: 0, skipped: 0, failed: 0 };
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      const file = path.join(ROOT, 'features', slug, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (meta.reviewed) { changes.skipped++; continue; }
      const m = await measure(browser, srv.url, slug);
      if (!m) { changes.failed++; continue; }
      const next = applyMeasurement(meta, m);
      if (JSON.stringify(next.mood) !== JSON.stringify(meta.mood)) changes.mood++;
      if (next.weight !== meta.weight) changes.weight++;
      if (!args.dry) fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
      process.stdout.write('.');
    }
  }));
  await browser.close();
  await srv.close();
  console.log(`\n${args.dry ? '[dry] ' : ''}mood changed on ${changes.mood}, weight on ${changes.weight}; skipped ${changes.skipped} reviewed, ${changes.failed} failed. Run \`npm run sync\` next.`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { applyMeasurement };
