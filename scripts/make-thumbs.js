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

/**
 * Thumbnail of a full website: a screenshot of the real site (what its live URL serves) inside a browser window with a
 * "Full website" label, so the card reads as a whole site and not as a single section.
 */
async function composeSiteThumb(judge, png, host) {
  const b64 = await judge.evaluate(async ({ data, host }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + data; });
    const W = 512, H = 320, BAR = 24;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#101015'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b1b23'; g.fillRect(0, 0, W, BAR);
    [['#ff5f57', 11], ['#febc2e', 24], ['#28c840', 37]].forEach(([col, x]) => { g.fillStyle = col; g.beginPath(); g.arc(x, BAR / 2, 4, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#0d0d12';
    const ux = 62, uw = W - ux - 18;
    g.beginPath(); g.roundRect(ux, 5, uw, BAR - 10, 7); g.fill();
    g.fillStyle = '#8b8b99'; g.font = '600 10px system-ui, sans-serif'; g.textBaseline = 'middle';
    g.fillText(host, ux + 10, BAR / 2 + 0.5);
    g.drawImage(img, 0, BAR, W, H - BAR);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, BAR, W, 1);
    // label
    const label = 'FULL WEBSITE';
    g.font = '800 11px system-ui, sans-serif';
    const tw = g.measureText(label).width + 22;
    g.fillStyle = '#7c3aed'; g.beginPath(); g.roundRect(12, H - 34, tw, 22, 11); g.fill();
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.fillText(label, 23, H - 22.5);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin);
  }, { data: png.toString('base64'), host });
  return Buffer.from(b64, 'base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  const siteUrls = Object.fromEntries(registry.items.filter(i => i.liveSiteUrl && i.category === 'Full Websites').map(i => [i.slug, i.liveSiteUrl]));
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
        let shot;
        if (siteUrls[slug]) {
          // a full website: the real site's front page, in a browser window
          await page.setViewportSize({ width: 1280, height: 740 });
          await page.goto(`${srv.url}${siteUrls[slug]}`, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(Math.max(waitMs, 4000));
          shot = await composeSiteThumb(judge, await page.screenshot({ type: 'png' }), (siteUrls[slug].split('/')[1] || slug) + '.com');
        } else {
          await page.goto(`${srv.url}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
          await page.waitForTimeout(waitMs);
          shot = await toWebp(judge, await page.screenshot({ type: 'png' }));
        }
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
