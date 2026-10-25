/** Adding a full website asks first: it replaces the whole page. A landing page or ordinary section never asks. Cancel keeps the page, Yes replaces it, Undo brings it back. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Full website confirm');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const slugs = () => page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug));
  const before = await slugs();
  assert(before.length >= 5, 'the page starts with several sections');
  await page.evaluate(() => window.builderPreview.stackManager.setTheme('clean-minimal'));

  const findTemplateCard = async () => {
    await page.click('#tabElementsBtn');
    await page.fill('#elementsSearchInput', 'edvlabs Roster');
    const card = page.locator('.element-feature-card', { hasText: 'edvlabs Roster' }).first();
    await card.waitFor({ timeout: 10000 });
    return card;
  };

  // 1. Cancel keeps everything
  let card = await findTemplateCard();
  await card.locator('.element-add-btn').click();
  await page.waitForSelector('.confirm-dialog');
  const text = await page.textContent('.confirm-dialog');
  assert(/replaces the page/i.test(text) && new RegExp('All ' + before.length + ' sections').test(text), 'the dialog says the page is replaced and how many sections go: ' + text);
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'confirmCancelBtn', 'the safe button has focus');
  await page.click('#confirmCancelBtn');
  await page.waitForSelector('.confirm-dialog', { state: 'detached' });
  assert.deepStrictEqual(await slugs(), before, 'cancel leaves the page as it was');
  console.log('  ✓ cancel keeps the page');

  // 2. Escape also keeps it
  card = await findTemplateCard();
  await card.locator('.element-add-btn').click();
  await page.waitForSelector('.confirm-dialog');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.confirm-dialog', { state: 'detached' });
  assert.deepStrictEqual(await slugs(), before, 'Escape leaves the page as it was');
  console.log('  ✓ Escape keeps the page');

  // 3. Yes replaces every section with the template, in one step
  card = await findTemplateCard();
  await card.locator('.element-add-btn').click();
  await page.waitForSelector('.confirm-dialog');
  await page.click('#confirmOkBtn');
  await page.waitForSelector('.confirm-dialog', { state: 'detached' });
  await page.waitForFunction(() => window.builderPreview.stackManager.getStack().length === 1, null, { timeout: 15000 });
  assert.deepStrictEqual(await slugs(), ['template-roster'], 'the page is now just the website');
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getState().theme), 'clean-minimal', 'the theme stays');
  console.log('  ✓ yes: the whole page becomes the template, the theme stays');

  // 4. Undo is one step and brings the old page back
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Control+z');
  await page.waitForFunction(n => window.builderPreview.stackManager.getStack().length === n, before.length, { timeout: 10000 });
  assert.deepStrictEqual(await slugs(), before, 'one undo restores the old page');
  console.log('  ✓ one undo brings the old page back');

  // 5. On an empty page there is nothing to discard, so no question
  await page.evaluate(() => window.builderPreview.stackManager.setStack([]));
  card = await findTemplateCard();
  await card.locator('.element-add-btn').click();
  await page.waitForFunction(() => window.builderPreview.stackManager.getStack().length === 1, null, { timeout: 10000 });
  assert.strictEqual(await page.locator('.confirm-dialog').count(), 0, 'no dialog on an empty page');
  console.log('  ✓ an empty page just gets the template');

  // 6. A landing page (a whole page in one section) is just a section: no question
  await page.fill('#elementsSearchInput', 'Quiet Portfolio Template');
  const landing = page.locator('.element-feature-card', { hasText: 'Quiet Portfolio' }).first();
  await landing.waitFor({ timeout: 10000 });
  assert(/landing page/i.test(await landing.textContent()), 'the card says it is a landing page');
  await landing.locator('.element-add-btn').click();
  await page.waitForFunction(() => window.builderPreview.stackManager.getStack().length === 2, null, { timeout: 10000 });
  assert.strictEqual(await page.locator('.confirm-dialog').count(), 0, 'no dialog for a landing page');
  console.log('  ✓ a landing page is added like any section');

  // 7. An ordinary component never asks
  await page.fill('#elementsSearchInput', 'Client Logo Marquee');
  const plain = page.locator('.element-feature-card', { hasText: 'Partner Logo Marquee' }).first();
  await plain.waitFor({ timeout: 10000 });
  await plain.locator('.element-add-btn').click();
  await page.waitForFunction(() => window.builderPreview.stackManager.getStack().length === 3, null, { timeout: 10000 });
  assert.strictEqual(await page.locator('.confirm-dialog').count(), 0, 'no dialog for a normal component');
  console.log('  ✓ normal components are added without a question');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Full website confirm flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
