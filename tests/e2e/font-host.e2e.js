/** ZIP export self-hosts the page fonts (network stubbed in the browser). */
const assert = require('assert');
const JSZip = require('jszip');
const fs = require('fs');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: "@font-face { font-family: 'Inter'; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/a.woff2) format('woff2'); }" }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from([0, 1, 2, 3]) }));
  console.log('Self-hosted page fonts');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabStylingBtn');
  await page.fill('#pageFontBodyInput', 'Inter');
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportChecks .export-checks-head');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const names = Object.keys(zip.files);
  assert(names.some(n => /^assets\/fonts\/font-.*\.woff2$/.test(n)), 'font file in the ZIP: ' + names.join(','));
  const html = await zip.file('index.html').async('string');
  const css = await zip.file('style.css').async('string');
  assert(!/fonts\.googleapis|fonts\.gstatic/.test(html + css), 'no Google font address left');
  assert(/@font-face/.test(css) && css.includes('assets/fonts/font-'));
  console.log('  ✓ fonts shipped in the ZIP and referenced locally');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Font hosting e2e passed!');
})().catch(e => { console.error(e); process.exit(1); });
