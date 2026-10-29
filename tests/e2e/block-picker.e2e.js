/** The guided block picker: add by plain name, reorder with buttons, another look, remove; the classic catalogue returns in Advanced. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url || '')) errors.push(m.text()); });
  const vis = (sel) => page.locator(sel).first().isVisible();
  const order = () => page.$$eval('#bpYourPage .bp-name', (e) => e.map((x) => x.textContent));
  console.log('Block picker');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#blockPicker', { state: 'attached' });
  // start from an empty page so the test does not depend on the starter
  await page.evaluate(() => window.builderManager.clearStack());
  assert(await vis('#blockPicker') && !(await vis('#elementsCatalogScroll')), 'picker shown, raw catalogue hidden in guided mode');
  assert(await vis('#bpEmpty'), 'empty message');
  const kinds = await page.$$eval('#bpKinds .bp-kind b', (e) => e.map((x) => x.textContent));
  assert.strictEqual(kinds.length, 12);
  assert(kinds.includes('About you') && kinds.includes('Questions and answers'), 'plain names');
  assert.strictEqual(await page.isDisabled('[data-kind="map"] .bp-add'), false, 'every kind has a component now, the map too');
  console.log('  ✓ twelve plain names, empty page, every kind can be added');

  await page.click('[data-kind="banner"] .bp-add');
  await page.click('[data-kind="faq"] .bp-add');
  await page.click('[data-kind="contact"] .bp-add');
  assert.deepStrictEqual(await order(), ['Opening banner', 'Questions and answers', 'Contact form']);
  assert.strictEqual(await page.isDisabled('[data-kind="faq"] .bp-add'), true, 'added kind cannot be added twice');
  assert.strictEqual(await page.textContent('[data-kind="faq"] .bp-add'), 'Added');
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().stack.length), 3, 'stack manager has them');
  console.log('  ✓ adding by name puts the blocks in the real stack');

  await page.click('button[aria-label="Move Contact form up"]');
  assert.deepStrictEqual(await order(), ['Opening banner', 'Contact form', 'Questions and answers']);
  assert.strictEqual(await page.isDisabled('button[aria-label="Move Opening banner up"]'), true, 'first block cannot go up');
  assert.strictEqual(await page.isDisabled('button[aria-label="Move Questions and answers down"]'), true, 'last block cannot go down');
  // keyboard: focus the button and press Enter
  await page.focus('button[aria-label="Move Questions and answers up"]');
  await page.keyboard.press('Enter');
  assert.deepStrictEqual(await order(), ['Opening banner', 'Questions and answers', 'Contact form']);
  assert((await page.textContent('#bpLive')).includes('moved up'), 'change is announced');
  console.log('  ✓ moving works with buttons and the keyboard, edges disabled, change announced');

  const before = await page.evaluate(() => window.builderManager.getState().stack[0].slug);
  await page.click('button[aria-label="Show another look for Opening banner"]');
  const after = await page.evaluate(() => window.builderManager.getState().stack[0].slug);
  assert.notStrictEqual(before, after, 'another look swaps the component');
  assert.deepStrictEqual(await order(), ['Opening banner', 'Questions and answers', 'Contact form'], 'name and place stay');
  assert.strictEqual(await page.locator('button[aria-label^="Show another look for Newsletter"]').count(), 0);
  await page.click('button[aria-label="Remove Contact form"]');
  assert.deepStrictEqual(await order(), ['Opening banner', 'Questions and answers']);
  assert.strictEqual(await page.isDisabled('[data-kind="contact"] .bp-add'), false, 'a removed kind can be added again');
  console.log('  ✓ another look keeps the place; remove frees the name');

  await page.click('#guidedAdvancedSwitch');
  assert(!(await vis('#blockPicker')) && await vis('#elementsCatalogScroll'), 'Advanced brings the full catalogue back');
  assert.deepStrictEqual(errors, [], 'no errors: ' + errors.join(' | '));
  console.log('  ✓ Advanced shows the classic catalogue; no console errors');
  await browser.close(); await srv.close();
  console.log('✅ Block picker passed!');
})().catch((e) => { console.error(e); process.exit(1); });
