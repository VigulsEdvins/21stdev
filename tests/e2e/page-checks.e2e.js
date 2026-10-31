/** Export modal shows page checks for the current page and never blocks the download. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Export page checks');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportChecks .export-checks-head');
  const head = await page.textContent('#exportChecks .export-checks-head');
  assert(/Page check/.test(head), head);
  const items = await page.$$eval('#exportChecks .export-check', els => els.map(e => e.textContent));
  assert(items.some(t => /title|description/i.test(t)), 'default page title/description are flagged: ' + items.join(' | '));
  assert(await page.isEnabled('#downloadZipBtn'), 'export is never blocked');
  console.log(`  ✓ ${items.length} checks listed, export still available`);
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Export page checks passed!');
})().catch(e => { console.error(e); process.exit(1); });
