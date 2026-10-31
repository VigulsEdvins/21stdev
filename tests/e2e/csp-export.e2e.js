/** A ZIP exported with the strict CSP option opens from a plain web server with no policy violations. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const JSZip = require('jszip');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  console.log('Strict CSP export');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportChecks .export-checks-head');
  await page.check('#exportCspToggle');
  await page.waitForTimeout(500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-export-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(/Content-Security-Policy/.test(html), 'policy tag present');
  const policy = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  console.log('  policy:', policy.replace(/&#39;/g, "'").slice(0, 150) + '…');

  const site = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => site.listen(0, '127.0.0.1', r));
  const exported = await ctx.newPage();
  const violations = [];
  const errors = [];
  exported.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
  exported.on('pageerror', e => errors.push(e.message));
  await exported.goto(`http://127.0.0.1:${site.address().port}/`);
  await exported.waitForTimeout(2500);
  assert((await exported.$$('.page-section')).length >= 3, 'the exported page rendered its sections');
  assert.deepStrictEqual(violations, [], 'no CSP violations: ' + violations.join(' | '));
  console.log('  ✓ exported page runs under the policy');
  site.close();
  await browser.close();
  await srv.close();
  console.log('✅ CSP export flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
