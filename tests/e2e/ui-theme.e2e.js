/** The builder's own light/dark switch: default dark, toggles, remembered, and the preview keeps its real colours. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Builder light/dark UI');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'dark', 'dark by default');
  await page.click('#uiThemeBtn');
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'light');
  assert.strictEqual(await page.getAttribute('#uiThemeBtn', 'aria-pressed'), 'true');
  const filters = await page.evaluate(() => ({ body: getComputedStyle(document.body).filter, frame: getComputedStyle(document.querySelector('iframe')).filter }));
  assert(/invert/.test(filters.body) && /invert/.test(filters.frame), 'shell inverted, preview turned back: ' + JSON.stringify(filters));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'light', 'remembered across a reload');
  await page.click('#uiThemeBtn');
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'dark');
  console.log('  ✓ toggles, remembered, preview untouched');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ UI theme flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
