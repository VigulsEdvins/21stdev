/** The Sections tab warns when more than three heavy sections are on the page, and hidden ones do not count. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Heavy section warning');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabSectionsBtn');
  const heavy = await page.evaluate(() => window.FEATURE_REGISTRY.filter(f => f.weight === 'heavy' && f.type === 'component').slice(0, 4).map(f => f.slug));
  await page.evaluate(h => window.builderPreview.stackManager.setStack(h.map((s, i) => ({ id: 'h' + i, slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }))), heavy);
  await page.waitForSelector('#stackHeavyNote:not([hidden])');
  assert(/4 heavy sections/.test(await page.textContent('#stackHeavyNote')));
  await page.evaluate(() => window.builderPreview.stackManager.setSectionFlag('h0', 'hidden', true));
  await page.waitForSelector('#stackHeavyNote', { state: 'hidden' });
  console.log('  ✓ warning appears at 4 heavy sections and clears when one is hidden');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Heavy note flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
