/** The bottom sheet for adding blocks on a phone (plan E6.12): a button opens it, adding closes it, Escape / Done / the backdrop / a swipe close it,
 *  the focus goes in and comes back, and on a wide screen nothing changes: the list stays under your page. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  const seed = () => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) { /* storage blocked */ } };
  const open = async (opts) => { const ctx = await browser.newContext(opts); await ctx.addInitScript(seed); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#blockPicker'); await page.waitForTimeout(600); return { ctx, page, errors }; };
  console.log('Add-a-block sheet');

  let { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const isOpen = () => page.evaluate(() => document.getElementById('bpSheet').classList.contains('is-open'));
  const names = () => page.$$eval('#bpYourPage .bp-item', (e) => e.map((x) => x.getAttribute('data-slug')));
  assert(await page.isVisible('#bpOpenSheet'), 'the button is there on a phone');
  assert(!(await page.isVisible('#bpKinds')), 'the long list is out of the way until asked for');
  assert.strictEqual(await page.getAttribute('#bpOpenSheet', 'aria-expanded'), 'false');
  await page.click('#bpOpenSheet'); await page.waitForTimeout(350);
  assert(await isOpen() && await page.isVisible('#bpKinds') && await page.isVisible('#bpBackdrop'), 'sheet and backdrop are open');
  assert.strictEqual(await page.getAttribute('#bpSheet', 'role'), 'dialog'); assert.strictEqual(await page.getAttribute('#bpOpenSheet', 'aria-expanded'), 'true');
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'bpCloseSheet', 'focus moves into the sheet');
  assert(!(await page.isVisible('#guidedFlip')), 'the floating button steps aside');
  const sb = await page.locator('#bpSheet').boundingBox(); assert(sb.y + sb.height <= 844 + 2 && sb.y > 120, 'the sheet sits at the bottom and leaves the top of the page visible (' + Math.round(sb.y) + ')');
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert.strictEqual(sw[0], sw[1], 'no sideways scroll');
  console.log('  ✓ a button opens the twelve kinds as a sheet from the bottom');

  // adding closes it and the block arrives
  const before = (await names()).length;
  await page.click('#bpKinds [data-kind="map"] .bp-add'); await page.waitForTimeout(350);
  assert(!(await isOpen()), 'adding closes the sheet'); assert.strictEqual((await names()).length, before + 1);
  assert((await names()).includes('find-us-hours'), 'the map block arrived');
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'bpOpenSheet', 'focus comes back to the button');
  assert(/added to your page/.test(await page.textContent('#bpLive')), 'announced');
  console.log('  ✓ adding closes the sheet, the block arrives, focus comes back');

  // every other way out
  for (const how of ['Escape', 'Done', 'backdrop']) {
    await page.click('#bpOpenSheet'); await page.waitForTimeout(300); assert(await isOpen(), how + ': open');
    if (how === 'Escape') await page.keyboard.press('Escape');
    else if (how === 'Done') await page.click('#bpCloseSheet');
    else await page.mouse.click(195, 60); // the backdrop above the sheet
    await page.waitForTimeout(300); assert(!(await isOpen()), how + ' closes it');
  }
  console.log('  ✓ Escape, Done and the backdrop close it');

  // swipe the handle down
  await page.click('#bpOpenSheet'); await page.waitForTimeout(300);
  const g = await page.locator('.bp-grabber').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down(); await page.mouse.move(g.x + g.width / 2, g.y + 150, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  assert(!(await isOpen()), 'a swipe down closes it');
  // a short pull springs back
  await page.click('#bpOpenSheet'); await page.waitForTimeout(300);
  const g2 = await page.locator('.bp-grabber').boundingBox();
  await page.mouse.move(g2.x + g2.width / 2, g2.y + 5); await page.mouse.down(); await page.mouse.move(g2.x + g2.width / 2, g2.y + 30, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(300);
  assert(await isOpen(), 'a short pull leaves it open'); await page.keyboard.press('Escape');
  console.log('  ✓ swiping the handle down closes it; a short pull does not');

  // Tab stays inside
  await page.click('#bpOpenSheet'); await page.waitForTimeout(300);
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.getElementById('bpSheet').contains(document.activeElement)), 'focus does not leave the open sheet');
  await page.keyboard.press('Escape');
  console.log('  ✓ the keyboard focus stays inside while it is open');
  assert.deepStrictEqual(errors, [], errors.join(' | ')); await ctx.close();

  // a wide screen: unchanged
  ({ ctx, page, errors } = await open({ viewport: { width: 1360, height: 900 } }));
  assert(!(await page.isVisible('#bpOpenSheet')) && await page.isVisible('#bpKinds') && await page.isVisible('#bpCloseSheet') === false, 'wide screen: the list stays under your page, no sheet button');
  await page.click('#bpKinds [data-kind="faq"] .bp-add'); await page.waitForTimeout(200);
  assert((await page.$$eval('#bpYourPage .bp-item', (e) => e.map((x) => x.getAttribute('data-slug')))).length > 0);
  console.log('  ✓ on a wide screen nothing changed');
  // resizing from phone to wide closes an open sheet
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Add-a-block sheet passed!');
})().catch((e) => { console.error(e); process.exit(1); });
