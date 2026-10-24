/** Hide-on and per-breakpoint padding in the section sizing drawer change the preview at phone width. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Responsive section controls');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabSectionsBtn');
  await page.waitForSelector('#pageStackList .stack-item-card');
  const ids = await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.id));
  const target = ids[2];
  await page.click(`.stack-item-card[data-section-id="${target}"] .btn-sizing`);
  await page.click(`.stack-item-card[data-section-id="${target}"] .hide-on-pills [data-bp="mobile"]`);
  assert.deepStrictEqual(await page.evaluate(i => window.builderPreview.stackManager.getStack().find(s => s.id === i).hideOn, target), ['mobile']);
  await page.click('[data-viewport="mobile"]');
  await page.waitForTimeout(1200);
  const shown = (i) => page.evaluate(id => { const d = document.querySelector('iframe').contentDocument; const el = d.getElementById(id); return el ? getComputedStyle(el).display : 'missing'; }, i);
  await page.waitForFunction(i => { const d = document.querySelector('iframe').contentDocument; const el = d && d.getElementById(i); return el && getComputedStyle(el).display === 'none'; }, target, { timeout: 15000 });
  console.log('  ✓ hidden on phone width');
  await page.click('[data-viewport="desktop"]');
  await page.waitForFunction(i => { const d = document.querySelector('iframe').contentDocument; const el = d && d.getElementById(i); return el && getComputedStyle(el).display !== 'none'; }, target, { timeout: 15000 });
  console.log('  ✓ visible again on desktop');
  // phone padding
  await page.click(`.stack-item-card[data-section-id="${target}"] .hide-on-pills [data-bp="mobile"]`);
  await page.click(`.stack-item-card[data-section-id="${target}"] .bp-pad-pills[data-key="paddingYMobile"] [data-pad="large"]`);
  await page.click('[data-viewport="mobile"]');
  await page.waitForFunction(i => { const d = document.querySelector('iframe').contentDocument; const el = d && d.getElementById(i); return el && getComputedStyle(el).paddingTop === '120px'; }, target, { timeout: 15000 });
  console.log('  ✓ phone padding applies');
  await page.click('[data-viewport="desktop"]');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Responsive controls flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
