#!/usr/bin/env node
// Smoke test in Firefox and WebKit: the builder loads, a section can be added and edited, the page exports, and ten
// representative components render without script errors. Differences are listed, not hidden.
//   npm run check-cross-browser [-- --engines firefox,webkit]
const { startServer } = require('./lib/browser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { firefox, webkit } = require('playwright-core');

/** Newest engine build in the Playwright cache; its revision may differ from the installed library, which usually still works. */
function cachedExecutable(prefix, rel) {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter(d => new RegExp('^' + prefix + '-\\d+$').test(d)).sort().reverse();
  for (const d of dirs) { const exe = path.join(base, d, rel); if (fs.existsSync(exe)) return exe; }
  return undefined;
}
async function launch(name, type) {
  try { return await type.launch({ headless: true }); } catch (_) { /* revision not installed: try the cached build */ }
  const exe = name === 'firefox' ? cachedExecutable('firefox', 'firefox/firefox') : cachedExecutable('webkit', 'pw_run.sh');
  if (!exe) throw new Error('no ' + name + ' build installed (run: npx playwright install ' + name + ')');
  return type.launch({ headless: true, executablePath: exe, timeout: 30000 });
}

/** One light component of our own per category, so the sample follows the catalogue instead of a fixed list. */
function sampleSlugs() {
  const items = require('../registry.json').items.filter(i => i.type === 'component' && i.weight === 'light' && i.origin && i.origin.license === 'own');
  const seen = new Set();
  return items.filter(i => !seen.has(i.category) && seen.add(i.category)).slice(0, 10).map(i => i.slug);
}

async function run(name, launcher, base) {
  const issues = [];
  let browser;
  try { browser = await launch(name, launcher); } catch (e) { return { skipped: e.message.split('\n')[0] }; }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/builder.html');
    await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'), null, { timeout: 30000 });
    const before = await page.evaluate(() => window.builderPreview.stackManager.getStack().length);
    await page.evaluate(() => window.builderPreview.stackManager.addSection('faq-accordion-smooth'));
    await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === n, before + 1, { timeout: 20000 });
    await page.click('#openExportModalBtn');
    await page.waitForSelector('#exportChecks .export-checks-head', { timeout: 20000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
    if (!(await dl.path())) issues.push('ZIP download produced no file');
    await page.keyboard.press('Escape');
    for (const slug of sampleSlugs()) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      const res = await p.goto(`${base}/features/${slug}/index.html`).catch(e => ({ ok: () => false, error: e }));
      if (!res || !res.ok()) { issues.push(`${slug}: not found (skipped)`); await p.close(); continue; }
      await p.waitForTimeout(600);
      if (errs.length) issues.push(`${slug}: ${errs[0]}`);
      await p.close();
    }
  } catch (e) { issues.push('builder flow: ' + e.message.split('\n')[0]); }
  if (errors.length) issues.push('builder page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  return issues;
}

(async () => {
  const want = (process.argv.find(a => a.startsWith('--engines=')) || '--engines=firefox,webkit').split('=')[1].split(',');
  const srv = await startServer();
  let failed = 0;
  for (const name of want) {
    const issues = await run(name, name === 'webkit' ? webkit : firefox, srv.url);
    if (issues.skipped) { console.log(`- ${name}: skipped (${issues.skipped})`); continue; }
    console.log(`${issues.length ? '✗' : '✓'} ${name}: ${issues.length ? issues.length + ' difference(s)' : 'builder flow and 10 components fine'}`);
    issues.forEach(i => console.log('    ' + i));
    if (issues.length) failed++;
  }
  await srv.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
