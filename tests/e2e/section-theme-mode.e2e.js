/** Per-section colours switch: Default / Match page / Keep original, from the section's settings drawer. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Section colours switch');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => {
    const sm = window.builderPreview.stackManager;
    sm.setTheme('clean-minimal');
    sm.setStack([{ id: 'tm-1', slug: 'beam-wordmark-footer', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
  });
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.querySelector('#tm-1 .bw-foot'); }, null, { timeout: 20000 });
  const bg = () => page.evaluate(() => { const m = getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('#tm-1 .bw-foot')).backgroundColor.match(/\d+/g).map(Number); return m[0] * 0.299 + m[1] * 0.587 + m[2] * 0.114; });
  await page.waitForTimeout(800);
  assert(await bg() > 200, 'by default the footer follows the light page');

  await page.click('#tabSectionsBtn');
  await page.waitForSelector('.stack-item-card[data-section-id="tm-1"]');
  await page.click('.stack-item-card[data-section-id="tm-1"] .btn-sizing');
  await page.click('.stack-item-card[data-section-id="tm-1"] .theme-mode-pills [data-theme-mode="keep"]');
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; const s = d && d.getElementById('tm-1'); return s && s.getAttribute('data-native-for') === 'light'; }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  assert(await bg() < 80, 'Keep original: the footer stays in its dark palette on the light page');
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].themeMode), 'keep');

  await page.click('.stack-item-card[data-section-id="tm-1"] .theme-mode-pills [data-theme-mode="match"]');
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; const s = d && d.getElementById('tm-1'); return s && !s.hasAttribute('data-native-for'); }, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  assert(await bg() > 200, 'Match page: back to the light page colours');
  console.log('  ✓ Default follows the page, Keep original keeps the dark palette, Match page follows again');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Section colours flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
