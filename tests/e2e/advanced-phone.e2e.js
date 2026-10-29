/** Advanced mode on a phone (plan E6.12): one column, the panel and the preview take turns by the floating button, no sideways page,
 *  and the same full-height preview as the guided path. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'advanced'); localStorage.setItem('web_builder_tour_done', '1'); } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Advanced mode on a phone');
  await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#guidedFlip', { state: 'attached' }); await page.waitForTimeout(800);
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.strictEqual(w[0], w[1], 'no sideways page (' + w + ')');
  assert(await page.isVisible('#guidedFlip'), 'the floating button is on screen');
  const fb = await page.locator('#guidedFlip').boundingBox(); assert(fb.y + fb.height <= 844, 'it sits inside the screen');
  const sb = await page.locator('.builder-sidebar').boundingBox(); assert(sb.width >= 380, 'the panel takes the full width');
  assert(!(await page.isVisible('.builder-viewport')), 'the preview waits its turn');
  assert(await page.isVisible('#paneElements'), 'the catalogue is there');
  // every header control is on screen: nothing is pushed off the right edge (the Download button used to be)
  const off = await page.evaluate(() => Array.from(document.querySelectorAll('.builder-header button, .builder-header a, .builder-header select')).filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map((e) => e.id || e.className));
  assert.deepStrictEqual(off, [], 'header controls off screen: ' + off.join(', '));
  assert(await page.isVisible('#openExportModalBtn'), 'the Download button is reachable');
  assert(!(await page.isVisible('.viewport-mode-switcher')), 'no desktop / tablet / mobile switch on a phone');
  console.log('  ✓ one column, panel first, no sideways page, floating button on screen');

  await page.click('#guidedFlip');
  const fr = await page.locator('#previewFrame').boundingBox();
  assert(await page.isVisible('.builder-viewport') && !(await page.isVisible('.builder-sidebar')), 'preview shown, panel hidden');
  assert(fr.width >= 388 && fr.height > 500, 'the preview is the page at full size (' + Math.round(fr.width) + 'x' + Math.round(fr.height) + ')');
  assert(!(await page.isVisible('.viewport-browser-bar')), 'no fake browser window');
  await page.evaluate(() => { document.getElementById('viewportStage').setAttribute('data-active-viewport', 'tablet'); }); // a size chosen earlier on a bigger screen
  assert((await page.locator('#previewFrame').boundingBox()).width >= 388, 'a remembered tablet size does not shrink the phone preview');
  await page.evaluate(() => { document.getElementById('viewportStage').setAttribute('data-active-viewport', 'desktop'); });
  assert.strictEqual(await page.textContent('#guidedFlip'), 'Back to editing');
  await page.click('#guidedFlip');
  assert(await page.isVisible('.builder-sidebar') && !(await page.isVisible('.builder-viewport')), 'back to the panel');
  console.log('  ✓ the button flips between panel and a full-size preview');

  for (const tab of ['.sidebar-tab-btn[data-tab="sections"]', '.sidebar-tab-btn[data-tab="styling"]', '.sidebar-tab-btn[data-tab="content"]']) {
    assert(await page.locator(tab).count(), tab + ' exists');
    const el = page.locator(tab); if (!(await el.count())) continue;
    await el.click(); await page.waitForTimeout(250);
    const w2 = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert.strictEqual(w2[0], w2[1], tab + ' fits the screen');
  }
  console.log('  ✓ Sections, Styling and Content fit the screen');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Advanced mode on a phone passed!');
})().catch((e) => { console.error(e); process.exit(1); });
