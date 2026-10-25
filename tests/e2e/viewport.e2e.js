/** Viewport switcher of the builder: desktop / tablet / mobile preview widths. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  console.log('Viewport switcher');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const width = () => page.evaluate(() => Math.round(document.querySelector('iframe').getBoundingClientRect().width));
  const desktop = await width();
  await page.click('#viewportMobileBtn');
  // the frame animates for 0.3 s, so wait for it to settle
  await page.waitForFunction(() => Math.abs(document.querySelector('iframe').getBoundingClientRect().width - 375) < 4);
  assert(Math.abs((await width()) - 375) <= 4, 'mobile preview is about 375px wide, got ' + await width());
  assert.strictEqual(await page.getAttribute('#viewportMobileBtn', 'aria-pressed'), 'true');
  assert((await page.textContent('#viewportDimensionLabel')).includes('375'));
  await page.click('#viewportTabletBtn');
  await page.waitForFunction(() => Math.abs(document.querySelector('iframe').getBoundingClientRect().width - 768) < 6);
  await page.click('#viewportDesktopBtn');
  await page.waitForFunction(w => Math.abs(document.querySelector('iframe').getBoundingClientRect().width - w) < 6, desktop);
  assert.strictEqual(await page.getAttribute('#viewportDesktopBtn', 'aria-pressed'), 'true');
  // a narrow preview really applies the page's mobile layout
  await page.click('#viewportMobileBtn');
  await page.waitForTimeout(500);
  const innerWidth = await page.evaluate(() => document.querySelector('iframe').contentWindow.innerWidth);
  assert(innerWidth <= 380, 'the page inside sees a phone-sized window, got ' + innerWidth);
  console.log('  ✓ mobile 375, tablet 768, desktop restored, window size reaches the page');
  await browser.close();
  await srv.close();
  console.log('✅ Viewport flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
