/** Guided step 2: own-words status, walking block by block, and click-in-preview picks the block. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url || '')) errors.push(m.text()); });
  console.log('Guided words step');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#wordsStatus', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  for (const k of ['banner', 'services', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-words');
  const status = () => page.textContent('#wordsStatus');
  assert(/None of your 3 blocks/.test(await status()), await status());
  assert(await page.isVisible('#wordsNext') && !(await page.isVisible('.admin-open-card')), 'walk buttons shown, admin card hidden');
  await page.selectOption('#contentSectionSelect', { index: 0 });
  assert.strictEqual(await page.isDisabled('#wordsPrev'), true, 'no block before the first');
  console.log('  ✓ status starts at none; admin panel card is hidden');

  // write into the first text field of the first block
  await page.waitForSelector('#contentFields .content-field input, #contentFields .content-field textarea', { timeout: 20000 });
  await page.fill('#contentFields .content-field input[type=text], #contentFields .content-field textarea', 'Hello from my own words');
  await page.waitForFunction(() => /1 of 3 blocks have your words/.test(document.getElementById('wordsStatus').textContent), null, { timeout: 5000 });
  console.log('  ✓ editing one field makes the status say 1 of 3');

  const first = await page.inputValue('#contentSectionSelect');
  await page.click('#wordsNext');
  const second = await page.inputValue('#contentSectionSelect');
  assert.notStrictEqual(first, second, 'Next block moves to the next block');
  await page.click('#wordsPrev');
  assert.strictEqual(await page.inputValue('#contentSectionSelect'), first);
  console.log('  ✓ Next block and Previous block walk the page');

  const ids = await page.evaluate(() => window.builderManager.getStack().map(s => s.id));
  const frame = page.frames().find(f => f !== page.mainFrame());
  await frame.waitForSelector('#' + ids[2]);
  await frame.evaluate((id) => document.getElementById(id).click(), ids[2]);
  await page.waitForFunction((id) => document.getElementById('contentSectionSelect').value === id, ids[2], { timeout: 5000 });
  console.log('  ✓ clicking a block in the preview picks it in the editor');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Guided words step passed!');
})().catch((e) => { console.error(e); process.exit(1); });
