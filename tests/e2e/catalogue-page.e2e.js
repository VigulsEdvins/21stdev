/**
 * The catalogue page (index.html): grid, search, inspector, workbench and the Add Feature Studio, driven
 * through the real page.
 */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = n => console.log('  ✓ ' + n);
  console.log('Catalogue page');
  await page.goto(srv.url + '/index.html');
  await page.waitForSelector('.vault-card');
  const total = await page.locator('.vault-card').count();
  assert(total > 20, 'the grid shows cards');
  step(`${total} cards in the grid`);

  await page.fill('#searchInput', 'waitlist');
  await page.waitForFunction(() => document.querySelectorAll('.vault-card').length < 5);
  assert(await page.locator('.vault-card', { hasText: 'waitlist' }).count() >= 1, 'search finds the waitlist hero');
  step('search filters the grid');

  await page.locator('.vault-card').first().locator('button[data-action="inspect"]').last().click();
  await page.waitForFunction(() => !document.getElementById('inspectorModal').classList.contains('is-hidden'));
  await page.waitForFunction(() => document.getElementById('inspCodeContent').textContent.length > 50);
  assert((await page.locator('#inspCodeTabs .code-tab').count()) >= 3, 'code tabs are listed');
  await page.click('#inspCodeTabs .code-tab >> nth=1');
  assert((await page.textContent('#inspCodeContent')).length > 10);
  await page.click('#closeInspectorBtn');
  assert(await page.evaluate(() => document.getElementById('inspectorModal').classList.contains('is-hidden')));
  step('inspector opens, switches tabs and closes');

  await page.click('#resetFiltersBtn');
  await page.click('#modeWorkbenchBtn');
  await page.waitForSelector('#wbTree .tree-item');
  const items = await page.locator('#wbTree .tree-item').count();
  assert(items > 20);
  await page.locator('#wbTree .tree-item').nth(3).click();
  await page.waitForFunction(() => document.getElementById('wbCodeDisplay').textContent.length > 50, null, { timeout: 10000 });
  step(`workbench lists ${items} items and shows code`);

  await page.click('#openAddModalBtn');
  await page.fill('#newFeatureName', 'Test Banner');
  await page.fill('#newFeatureDesc', 'A test banner added through the studio form.');
  await page.fill('#newFeatureHtml', '<h1>Hello</h1>');
  await page.fill('#newFeatureCss', 'h1{color:red}');
  await page.fill('#newFeatureJs', 'console.log(1)');
  await page.click('#addFeatureForm button[type=submit]');
  await page.waitForFunction(() => document.getElementById('addFeatureModal').classList.contains('is-hidden'));
  assert(await page.evaluate(() => (JSON.parse(localStorage.getItem('edvlabs_custom_features_v1') || '[]')).some(f => f.slug === 'test-banner')), 'custom feature stored');
  await page.reload();
  await page.waitForSelector('#wbTree, .vault-card');
  assert((await page.textContent('#totalCountBadge')).includes(String(total + 1)), 'count badge includes the custom feature');
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem('edvlabs_custom_features_v1') || '[]').length === 1));
  await page.click('#openAddModalBtn');
  await page.click('#clearCustomFeaturesBtn');
  assert.strictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('edvlabs_custom_features_v1') || '[]').length), 0, 'clear removes it');
  step('custom feature added and kept across a reload');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Catalogue page flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
