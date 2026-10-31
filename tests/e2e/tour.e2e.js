/** First-run tour: shows with ?tour=1, walks three steps, closes for good, and is silent for automation otherwise. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('First-run tour');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  assert.strictEqual(await page.$('.tour-card'), null, 'no tour for automated browsers by default');
  await page.goto(srv.url + '/builder.html?tour=1');
  await page.waitForSelector('.tour-card');
  assert(/Step 1 of 3/.test(await page.textContent('.tour-card')));
  assert(await page.$('#tabElementsBtn.tour-highlight'), 'step 1 highlights the Elements tab');
  await page.click('.tour-next');
  assert(await page.$('#tabContentBtn.tour-highlight'));
  await page.click('.tour-next');
  assert(await page.$('#guidedCheckoutBtn.tour-highlight'));
  assert.strictEqual((await page.textContent('.tour-next')).trim(), 'Got it');
  await page.click('.tour-next');
  assert.strictEqual(await page.$('.tour-card'), null, 'closed');
  assert.strictEqual(await page.$('.tour-highlight'), null, 'highlight removed');
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('web_builder_tour_done_v1')), '1', 'remembered');
  // focus is never trapped: the page is still usable while the tour is open
  await page.goto(srv.url + '/builder.html?tour=1');
  await page.waitForSelector('.tour-card');
  await page.click('#tabSectionsBtn');
  assert(await page.isVisible('#pageStackList'), 'the page works under an open tour');
  await page.click('.tour-skip');
  assert.strictEqual(await page.$('.tour-card'), null);
  console.log('  ✓ three steps, skip, remembered, never blocks the page');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Tour flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
