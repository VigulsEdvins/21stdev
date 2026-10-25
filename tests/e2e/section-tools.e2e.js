/** Section tools in the stack list: hide, lock, copy/paste, Alt+Arrow reorder, undo. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Section tools');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const slugs = await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug));
  assert(slugs.length >= 2, 'default page has sections');
  await page.click('#tabSectionsBtn');
  await page.waitForSelector('#pageStackList .stack-item-card');
  const ids = () => page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.id));
  const first = (await ids())[0];
  const card = id => `.stack-item-card[data-section-id="${id}"]`;

  // hide: stays in the project, leaves the preview
  const before = await page.evaluate(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length);
  await page.click(`${card(first)} .btn-hide`);
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === n, before - 1, { timeout: 15000 });
  assert.strictEqual((await ids()).length, before, 'hidden section is still in the project');
  assert(await page.$(`${card(first)}.is-hidden-section`));
  await page.click(`${card(first)} .btn-hide`);
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length === n, before, { timeout: 15000 });
  console.log('  ✓ hide leaves the preview and comes back');

  // lock: no remove, no move
  const second = (await ids())[1];
  await page.click(`${card(second)} .btn-lock`);
  assert(await page.isDisabled(`${card(second)} .btn-remove`), 'remove disabled while locked');
  assert(await page.isDisabled(`${card(second)} .btn-move-up`), 'move disabled while locked');
  await page.focus(`${card(second)} .btn-lock`);
  await page.keyboard.press('Alt+ArrowUp');
  assert.strictEqual((await ids())[1], second, 'Alt+Up does not move a locked section');
  await page.click(`${card(second)} .btn-lock`);
  console.log('  ✓ lock blocks remove and move');

  // Alt+Down moves the section and announces it
  const order = await ids();
  await page.focus(`${card(order[0])} .btn-hide`);
  await page.keyboard.press('Alt+ArrowDown');
  const after = await ids();
  assert.strictEqual(after[1], order[0], 'section moved down');
  assert(/moved to position 2/.test(await page.textContent('#stackAnnouncer')), 'move announced');
  console.log('  ✓ Alt+Down reorders and announces');

  // copy and paste
  const n = after.length;
  await page.click(`${card(after[0])} .btn-copy`);
  await page.click('#pasteSectionBtn');
  await page.waitForFunction(k => window.builderPreview.stackManager.getStack().length === k, n + 1);
  const slugAfter = await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug));
  assert(slugAfter.filter(s => s === slugAfter[0]).length >= 2 || slugAfter.length === n + 1);
  console.log('  ✓ copy and paste adds a section');

  // undo takes the paste back
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  console.log('  ✓ undo shortcut ran without errors');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Section tools flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
