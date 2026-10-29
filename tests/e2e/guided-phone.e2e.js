/** Help text per step, Start over with one Undo, and the guided builder on a phone (no sideways scroll, panel and preview take turns). */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const seed = () => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} };
  const open = async (opts) => {
    const ctx = await browser.newContext(opts); await ctx.addInitScript(seed);
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$|fonts\.g/.test(m.location().url || '')) errors.push(m.text()); });
    await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#blockPicker', { state: 'attached' }); await page.waitForTimeout(500);
    return { ctx, page, errors };
  };
  console.log('Help, start over and phone');

  let { ctx, page, errors } = await open({ viewport: { width: 1440, height: 1000 } });
  assert(!(await page.isVisible('#guidedHelp')), 'help starts closed');
  await page.click('#guidedHelpBtn');
  assert.strictEqual(await page.getAttribute('#guidedHelpBtn', 'aria-expanded'), 'true');
  const t1 = await page.textContent('#guidedHelp'); assert(/A block is one part/.test(t1));
  await page.click('#guidedNext');
  const t2 = await page.textContent('#guidedHelp'); assert(/sample text/.test(t2) && t1 !== t2, 'help changes with the step');
  for (const s of ['blocks', 'words', 'look', 'check', 'get']) { await page.click('#guidedStep-' + s); assert((await page.textContent('#guidedHelp')).length > 40, s + ' has help'); }
  console.log('  ✓ every step has its own help text, opened with a button');

  await page.click('#guidedStep-blocks');
  const n = await page.evaluate(() => window.builderManager.getStack().length);
  assert(n > 0);
  await page.click('#bpStartOver');
  assert(await page.isVisible('#bpSure') && !(await page.isVisible('#bpStartOver')), 'asks first');
  await page.click('#bpOverNo');
  assert.strictEqual(await page.evaluate(() => window.builderManager.getStack().length), n, 'keep leaves the page alone');
  await page.click('#bpStartOver'); await page.click('#bpOverYes');
  assert.strictEqual(await page.evaluate(() => window.builderManager.getStack().length), 0);
  await page.click('#undoBtn'); await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(() => window.builderManager.getStack().length), n, 'one Undo brings the page back');
  console.log('  ✓ Start over asks first and one Undo undoes it');
  assert.deepStrictEqual(errors, [], errors.join(' | ')); await ctx.close();

  ({ ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.strictEqual(w[0], w[1], 'no sideways scroll on a phone (' + w + ')');
  assert(await page.isVisible('#blockPicker') && !(await page.isVisible('.builder-viewport')), 'panel first, preview hidden');
  assert(await page.isVisible('#guidedAsk') && await page.isVisible('#guidedFlip'), 'help link and the flip button are there');
  assert.strictEqual(await page.getAttribute('#guidedStep-look', 'aria-label'), 'Step 3: Look', 'step buttons keep a name when the labels are hidden');
  await page.click('#bpOpenSheet'); await page.waitForSelector('#bpSheet.is-open');
  const box = await page.locator('.bp-btn.bp-add:not(:disabled)').first().boundingBox();
  assert(box.height >= 40 && box.width >= 40, 'touch targets are big enough');
  await page.click('#bpCloseSheet'); await page.waitForSelector('#bpSheet:not(.is-open)', { state: 'attached' });
  await page.click('#guidedFlip');
  assert(await page.isVisible('.builder-viewport') && !(await page.isVisible('#blockPicker')), 'preview shown');
  assert.strictEqual(await page.textContent('#guidedFlip'), 'Back to editing');
  await page.click('#guidedFlip');
  assert(await page.isVisible('#blockPicker'), 'back to the panel');
  for (const s of ['words', 'look', 'check', 'get']) { await page.click('#guidedStep-' + s); const w2 = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert.strictEqual(w2[0], w2[1], 'no sideways scroll on step ' + s); }
  console.log('  ✓ phone: no sideways scroll on any step, panel and preview take turns, touch targets 40px+');
  // building on a phone (plan E6.12, decided 2026-10-29): the preview is the real page at full height, the whole path can be finished by thumb
  await page.click('#guidedFlip');
  const fr = await page.locator('#previewFrame').boundingBox(), vp = page.viewportSize();
  assert(fr.height > vp.height * 0.6 && fr.width >= vp.width - 2, 'the preview fills the screen on a phone (' + Math.round(fr.width) + 'x' + Math.round(fr.height) + ')');
  assert(!(await page.isVisible('.viewport-browser-bar')), 'no fake browser window on a phone');
  await page.click('#guidedFlip');
  await page.click('#guidedStep-get');
  const addr = page.locator('#getAddress'); await addr.scrollIntoViewIfNeeded();
  const ab = await addr.boundingBox(); assert(ab.height >= 40 && ab.width > 250, 'the web address box is a usable size');
  await addr.fill('yourname.com'); await addr.blur();
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().page.canonical), 'https://yourname.com/', 'the address is saved from a phone');
  const go = page.locator('#getDownload'); await go.scrollIntoViewIfNeeded();
  const gb = await go.boundingBox(), fb = await page.locator('#guidedFlip').boundingBox();
  assert(gb.y + gb.height <= fb.y || gb.y >= fb.y + fb.height, 'the download button is not hidden behind the floating button');
  await go.click();
  await page.waitForSelector('#exportModal.is-open');
  assert(!(await page.isVisible('#guidedFlip')), 'the floating button steps aside while the download window is open');
  const w3 = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert.strictEqual(w3[0], w3[1], 'no sideways scroll in the download window');
  console.log('  ✓ phone: full-height preview, web address and download reachable, floating button steps aside');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Help, start over and phone passed!');
})().catch((e) => { console.error(e); process.exit(1); });
