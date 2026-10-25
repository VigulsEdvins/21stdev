/** A section added to a loaded preview is inserted without reloading it; removing one still reloads. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview);
  const count = () => page.evaluate(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length);
  const settle = () => page.waitForTimeout(1500);
  console.log('Add section in place');

  const slugs = await page.evaluate(() => window.FEATURE_REGISTRY.filter(i => !i.isWidget && i.weight === 'light' && i.type !== 'template' && !/preloader/i.test(i.category + i.slug)).slice(0, 3).map(i => i.slug));
  await page.evaluate(s => { const sm = window.builderPreview.stackManager; sm.setStack([]); sm.addSection({ slug: s, title: s }); }, slugs[0]);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === 1);
  await settle();
  await page.evaluate(() => { document.querySelector('iframe').contentWindow.__marker = 'alive'; });

  await page.evaluate(s => window.builderPreview.stackManager.addSection({ slug: s, title: s }), slugs[1]);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === 2);
  assert.strictEqual(await page.evaluate(() => document.querySelector('iframe').contentWindow.__marker), 'alive', 'the preview was not reloaded');
  console.log('  ✓ second section added, first one untouched');

  const order = await page.evaluate(() => [...document.querySelector('iframe').contentDocument.querySelectorAll('.page-section')].map(e => e.dataset.sectionSlug));
  assert.deepStrictEqual(order, [slugs[0], slugs[1]]);
  const styled = await page.evaluate(s => { const d = document.querySelector('iframe').contentDocument; return [...d.querySelectorAll('style')].some(st => st.textContent.includes('Section: ' + s)); }, slugs[1]);
  assert(styled, 'the new section brought its styles');
  console.log('  ✓ order and styles correct');

  await settle();
  await page.evaluate(s => { const sm = window.builderPreview.stackManager; sm.addSection({ slug: s, title: s }); }, slugs[2]);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === 3);
  assert.strictEqual(await page.evaluate(() => document.querySelector('iframe').contentWindow.__marker), 'alive');

  // removing a section reloads the preview (its scripts and timers must stop)
  await settle();
  await page.evaluate(() => { const sm = window.builderPreview.stackManager; sm.removeSection(sm.getStack()[2].id); });
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === 2);
  await page.waitForFunction(() => document.querySelector('iframe').contentWindow.__marker === undefined, null, { timeout: 5000 });
  console.log('  ✓ removing a section reloads the preview');
  assert.strictEqual(await count(), 2);
  assert.deepStrictEqual(errors, []);
  await browser.close(); await srv.close();
  console.log('✅ Add section in place flow passed!');
})().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
