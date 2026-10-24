#!/usr/bin/env node
/**
 * Opens every feature in headless Chromium and records console errors, page errors, failed or
 * missing local requests, broken images, load time and external hosts.
 *   npm run check-features [-- --slug a,b] [--promote] [--wait 2000] [--concurrency 4]
 * Writes reports/features.json. With --promote, features with no errors move from draft to stable.
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

async function checkOne(browser, baseUrl, slug, waitMs) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  const externalHosts = new Set();
  const origin = new URL(baseUrl).origin;

  page.on('pageerror', e => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on('response', r => {
    const u = new URL(r.url());
    if (u.origin !== origin) { externalHosts.add(u.host); return; }
    if (r.status() >= 400) errors.push(`missing: ${u.pathname} (${r.status()})`);
  });
  page.on('requestfailed', r => {
    const u = new URL(r.url());
    if (u.origin !== origin) { externalHosts.add(u.host); warnings.push(`external request failed: ${u.host}${u.pathname}`.slice(0, 160)); }
  });

  const started = Date.now();
  try {
    await page.goto(`${baseUrl}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
  } catch (e) {
    errors.push(`navigation: ${e.message.split('\n')[0]}`);
  }
  const loadMs = Date.now() - started;
  await page.waitForTimeout(waitMs);

  let brokenImages = [];
  try {
    brokenImages = await page.evaluate(() => [...document.images]
      .filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc)
      .map(i => i.currentSrc.slice(0, 120)));
  } catch (_) { /* page may have navigated */ }
  const localBroken = brokenImages.filter(s => s.startsWith(origin));
  localBroken.forEach(s => errors.push(`broken image: ${s.replace(origin, '')}`));
  brokenImages.filter(s => !s.startsWith(origin)).forEach(s => warnings.push(`external image not loaded: ${s}`));

  await context.close();
  return { slug, ok: errors.length === 0, loadMs, errors: [...new Set(errors)], warnings: [...new Set(warnings)], externalHosts: [...externalHosts].sort() };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  let slugs = registry.items.map(i => i.slug);
  if (typeof args.slug === 'string') {
    const wanted = args.slug.split(',');
    slugs = slugs.filter(s => wanted.includes(s));
    if (!slugs.length) { console.error('No matching slugs'); process.exit(1); }
  }
  const waitMs = Number(args.wait || 2000);
  const concurrency = Number(args.concurrency || 4);

  const srv = await startServer();
  const browser = await launchBrowser();
  const results = [];
  const queue = slugs.slice();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      const r = await checkOne(browser, srv.url, slug, waitMs);
      results.push(r);
      process.stdout.write(r.ok ? '.' : 'x');
    }
  }));
  await browser.close();
  await srv.close();
  results.sort((a, b) => a.slug.localeCompare(b.slug));

  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'features.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const bad = results.filter(r => !r.ok);
  console.log(`\n\n${results.length - bad.length}/${results.length} features loaded without errors. Report: reports/features.json`);
  bad.forEach(r => console.log(` ✗ ${r.slug}\n     ${r.errors.slice(0, 3).join('\n     ')}`));

  if (args.promote) {
    let promoted = 0;
    for (const r of results.filter(x => x.ok)) {
      const metaPath = path.join(ROOT, 'features', r.slug, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.status === 'draft') {
        meta.status = 'stable';
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
        promoted++;
      }
    }
    console.log(`Promoted ${promoted} features from draft to stable. Run \`npm run sync\` to refresh the registry.`);
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { checkOne };
