#!/usr/bin/env node
/**
 * Exports every starter project from the real builder, serves the unpacked ZIP and runs Lighthouse on it
 * (mobile preset, software rendering). Writes reports/lighthouse.json and fails below the thresholds.
 *   npm run check-lighthouse [-- --industry restaurant] [--no-fail]
 * Uses CHROMIUM_PATH, then the Chromium Playwright installed, then /usr/bin/google-chrome.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
// First run of the six starters: a11y 87-96, SEO 91-92, best practices 96, performance 27-100. Set just under what they reach after the exporter fixes.
const THRESHOLDS = { accessibility: 0.9, seo: 0.95, 'best-practices': 0.95, performance: 0.5 };
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

function chromePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux64', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return '/usr/bin/google-chrome';
}

function serveFolder(dir) {
  const s = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${s.address().port}/`, close: () => new Promise(c => s.close(c)) })));
}

async function exportStarter(page, srvUrl, industry, first) {
  if (first) {
    await page.goto(srvUrl + '/builder.html');
    await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  }
  await page.click('#projectsBtn');
  await page.selectOption('#projStarterSelect', industry);
  page.once('dialog', d => d.accept('Lighthouse ' + industry));
  await page.click('#projStarterBtn');
  await page.waitForFunction(n => document.getElementById('projectNameLabel').textContent === n, 'Lighthouse ' + industry);
  await page.click('#closeProjectsModalBtn');
  await page.waitForTimeout(800);
  // what a real owner does before publishing: give the page a description
  await page.click('#tabStylingBtn');
  await page.fill('#pageDescInput', `A ${industry} website built with the page builder.`);
  await page.waitForTimeout(300);
  await page.click('#openExportModalBtn');
  await page.waitForSelector('#exportModal.is-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-' + industry + '-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  return dir;
}

(async () => {
  const argv = process.argv.slice(2);
  const only = argv.includes('--industry') ? argv[argv.indexOf('--industry') + 1] : null;
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#projectsBtn');
  await page.waitForSelector('#projStarterSelect');
  let industries = await page.$$eval('#projStarterSelect option', os => os.map(o => o.value).filter(Boolean));
  await page.click('#closeProjectsModalBtn');
  if (only) industries = industries.filter(i => i === only);

  const dirs = {};
  for (const industry of industries) dirs[industry] = await exportStarter(page, srv.url, industry, false);
  await browser.close();
  await srv.close();

  const { default: lighthouse } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher').catch(() => null);
  const results = {};
  let failed = 0;
  for (const industry of industries) {
    const site = await serveFolder(dirs[industry]);
    let chrome;
    try {
      const flags = ['--headless=new', '--no-sandbox', '--disable-gpu'];
      chrome = await chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: flags });
      const run = await lighthouse(site.url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(THRESHOLDS) });
      const cats = run.lhr.categories;
      const scores = Object.fromEntries(Object.keys(THRESHOLDS).map(k => [k, cats[k].score]));
      const low = Object.keys(THRESHOLDS).filter(k => scores[k] < THRESHOLDS[k]);
      const failing = Object.values(run.lhr.audits).filter(a => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === 'binary');
      // what each failing audit points at, for triage (selector or message, first five)
      const details = {};
      failing.forEach(a => {
        details[a.id] = ((a.details && a.details.items) || []).slice(0, 5).map(i => (i.node && (i.node.selector + ' | ' + (i.node.snippet || '').slice(0, 90))) || i.description || i.sourceLocation && i.sourceLocation.url || i.url || JSON.stringify(i).slice(0, 120));
      });
      const a = run.lhr.audits;
      const metrics = { lcpMs: Math.round(a['largest-contentful-paint'].numericValue), tbtMs: Math.round(a['total-blocking-time'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3), transferKB: Math.round(a['total-byte-weight'].numericValue / 1024) };
      // the elements behind a slow page: what is the largest paint, what moves
      const culprits = {
        lcpElement: ((((a['largest-contentful-paint-element'] || {}).details || {}).items || [])[0] || {}).items?.[0]?.node?.selector || null,
        layoutShifts: ((((a['layout-shift-elements'] || {}).details || {}).items) || []).slice(0, 5).map(i => `${i.node && i.node.selector} (${Number(i.score || 0).toFixed(3)})`)
      };
      results[industry] = { scores, metrics, culprits, failingAudits: failing.map(x => x.id), details };
      if (low.length) failed++;
      console.log(`${low.length ? '✗' : '✓'} ${industry}: ` + Object.entries(scores).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(', ') + (low.length ? `  (below: ${low.join(', ')})` : '') + `  [LCP ${results[industry].metrics.lcpMs} ms, TBT ${results[industry].metrics.tbtMs} ms, ${results[industry].metrics.transferKB} KB]`);
    } catch (e) {
      failed++;
      results[industry] = { error: String(e.message || e) };
      console.log(`✗ ${industry}: ${String(e.message || e).split('\n')[0]}`);
    } finally {
      if (chrome) await chrome.kill();
      await site.close();
      if (argv.includes('--keep')) console.log('  kept: ' + dirs[industry]); else fs.rmSync(dirs[industry], { recursive: true, force: true });
    }
  }
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'lighthouse.json'), JSON.stringify({ thresholds: THRESHOLDS, results }, null, 2));
  if (failed && !argv.includes('--no-fail')) { console.error(`${failed} starter(s) below the thresholds`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
