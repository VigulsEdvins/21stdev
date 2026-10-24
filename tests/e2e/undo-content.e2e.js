/** Undo / redo across Content-tab edits, page settings and theme changes, through the real UI. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Undo/redo across content, page settings and theme');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'a', slug: 'ink-orbit-hero', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForTimeout(2000);
  const text = () => page.evaluate(() => document.querySelector('iframe').contentDocument.body.innerText);

  // content edit
  await page.click('#tabContentBtn');
  await page.waitForSelector('#contentFields .content-field');
  const headline = page.locator('#contentFields .content-field', { hasText: 'Headline' }).locator('input, textarea').first();
  const original = await headline.inputValue();
  await headline.fill('A brand new headline');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.innerText.toLowerCase().includes('a brand new headline'), null, { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.click('#undoBtn');
  await page.waitForFunction(() => !document.querySelector('iframe').contentDocument.body.innerText.toLowerCase().includes('a brand new headline'), null, { timeout: 8000 });
  assert(!(await text()).toLowerCase().includes('a brand new headline'), 'undo reverts the content edit');
  await page.click('#redoBtn');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.innerText.toLowerCase().includes('a brand new headline'), null, { timeout: 8000 });
  console.log(`  ✓ content edit undone and redone (was "${original.slice(0, 20)}")`);

  // page settings
  await page.click('#tabStylingBtn');
  await page.fill('#pageTitleInput', 'Zephyr Dental');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.title === 'Zephyr Dental', null, { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.click('#undoBtn');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.title !== 'Zephyr Dental', null, { timeout: 8000 });
  assert.notStrictEqual(await page.inputValue('#pageTitleInput'), 'Zephyr Dental', 'the title field follows the undo');
  await page.click('#redoBtn');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.title === 'Zephyr Dental', null, { timeout: 8000 });
  console.log('  ✓ page title undone and redone, field follows');

  // theme
  const before = await page.evaluate(() => window.builderPreview.stackManager.getState().theme);
  await page.selectOption('#themePresetSelect', 'warm-editorial');
  await page.waitForTimeout(600);
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getState().theme), 'warm-editorial');
  await page.click('#undoBtn');
  await page.waitForFunction(b => window.builderPreview.stackManager.getState().theme === b, before);
  assert.strictEqual(await page.inputValue('#themePresetSelect'), before, 'the theme select follows the undo');
  console.log('  ✓ theme undone, select follows');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Undo/redo flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
