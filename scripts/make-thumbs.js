#!/usr/bin/env node
/**
 * Renders a small WebP preview of every feature to thumbs/<slug>.webp so the builder grid does not
 * need 200 live iframes. Existing thumbnails are kept unless --force is given.
 * Renders are pinned (fixed viewport, reduced motion, fixed wait and quality) and, with --force, a new render
 * that looks the same as the committed thumbnail is dropped, so regenerating does not churn the git history.
 *   npm run thumbs [-- --slug a,b] [--force] [--rewrite-all] [--wait 2500] [--concurrency 4]
 * Run `npm run sync` afterwards so registry items pick up their `thumb` path.
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'thumbs');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

/** PNG screenshot -> WebP bytes (the browser's own encoder, so no image library is needed). */
async function toWebp(page, png) {
  const b64 = await page.evaluate(async (data) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + data; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.8));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin);
  }, png.toString('base64'));
  return Buffer.from(b64, 'base64');
}

/** Mean colour difference (0-255) of two WebP images, compared on a 32x20 grid. */
async function imageDistance(page, a, b) {
  return page.evaluate(async ([x, y]) => {
    const grid = async (b64) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/webp;base64,' + b64; });
      const c = document.createElement('canvas'); c.width = 32; c.height = 20;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, 32, 20);
      return g.getImageData(0, 0, 32, 20).data;
    };
    const [p, q] = [await grid(x), await grid(y)];
    let n = 0, s = 0;
    for (let i = 0; i < p.length; i += 4) { s += Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]); n += 3; }
    return s / n;
  }, [a.toString('base64'), b.toString('base64')]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  let slugs = registry.items.map(i => i.slug);
  if (typeof args.slug === 'string') slugs = slugs.filter(s => args.slug.split(',').includes(s));
  fs.mkdirSync(OUT, { recursive: true });
  if (!args.force) slugs = slugs.filter(s => !fs.existsSync(path.join(OUT, `${s}.webp`)));
  if (!slugs.length) { console.log('All thumbnails exist (use --force to regenerate).'); return; }

  const waitMs = Number(args.wait || 2500);
  const srv = await startServer();
  const browser = await launchBrowser();
  const queue = slugs.slice();
  let done = 0;
  let unchanged = 0;
  await Promise.all(Array.from({ length: Number(args.concurrency || 4) }, async () => {
    // 1280x800 layout, rendered at 0.4x => 512x320 pixels
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.4, reducedMotion: 'reduce' });
    const judge = await ctx.newPage();
    while (queue.length) {
      const slug = queue.shift();
      const page = await ctx.newPage();
      try {
        await page.goto(`${srv.url}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(waitMs);
        const shot = await toWebp(judge, await page.screenshot({ type: 'png' }));
        const file = path.join(OUT, `${slug}.webp`);
        if (args.force && !args['rewrite-all'] && fs.existsSync(file) && (await imageDistance(judge, shot, fs.readFileSync(file))) < 4) { unchanged++; }
        else { fs.writeFileSync(file, shot); done++; }
      } catch (e) {
        console.error(`✗ ${slug}: ${e.message.split('\n')[0]}`);
      }
      await page.close();
    }
    await judge.close();
    await ctx.close();
  }));
  await browser.close();
  await srv.close();
  console.log(`Wrote ${done} thumbnails to thumbs/${unchanged ? ` (${unchanged} looked the same and were kept)` : ''}. Run \`npm run sync\` to register them.`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
