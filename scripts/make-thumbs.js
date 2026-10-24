#!/usr/bin/env node
/**
 * Renders a small JPEG preview of every feature to thumbs/<slug>.jpg so the builder grid does not
 * need 200 live iframes. Existing thumbnails are kept unless --force is given.
 *   npm run thumbs [-- --slug a,b] [--force] [--wait 2500] [--concurrency 4]
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  let slugs = registry.items.map(i => i.slug);
  if (typeof args.slug === 'string') slugs = slugs.filter(s => args.slug.split(',').includes(s));
  fs.mkdirSync(OUT, { recursive: true });
  if (!args.force) slugs = slugs.filter(s => !fs.existsSync(path.join(OUT, `${s}.jpg`)));
  if (!slugs.length) { console.log('All thumbnails exist (use --force to regenerate).'); return; }

  const waitMs = Number(args.wait || 2500);
  const srv = await startServer();
  const browser = await launchBrowser();
  const queue = slugs.slice();
  let done = 0;
  await Promise.all(Array.from({ length: Number(args.concurrency || 4) }, async () => {
    // 1280x800 layout, rendered at 0.4x => 512x320 pixels
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.4 });
    while (queue.length) {
      const slug = queue.shift();
      const page = await ctx.newPage();
      try {
        await page.goto(`${srv.url}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(waitMs);
        await page.screenshot({ path: path.join(OUT, `${slug}.jpg`), type: 'jpeg', quality: 62 });
        done++;
      } catch (e) {
        console.error(`✗ ${slug}: ${e.message.split('\n')[0]}`);
      }
      await page.close();
    }
    await ctx.close();
  }));
  await browser.close();
  await srv.close();
  console.log(`Wrote ${done} thumbnails to thumbs/. Run \`npm run sync\` to register them.`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
