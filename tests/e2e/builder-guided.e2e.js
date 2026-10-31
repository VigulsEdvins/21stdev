/** The guided path: five steps over the same engine, an Advanced switch that brings the classic tools back and is remembered. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // start in guided mode once; later loads keep whatever the page saved
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url || '')) errors.push(m.text() + ' ' + (m.location().url || '')); });
  const vis = (sel) => page.locator(sel).first().isVisible();
  console.log('Guided builder');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#guidedBar', { state: 'attached' });

  const labels = await page.$$eval('.guided-step .guided-label', els => els.map(e => e.textContent));
  assert.deepStrictEqual(labels, ['Blocks', 'Words', 'Look', 'Check', 'Get it']);
  assert.strictEqual(await page.getAttribute('#guidedStep-blocks', 'aria-current'), 'step');
  assert((await page.textContent('#guidedHint')).startsWith('Step 1 of 5'));
  assert(!(await vis('.mode-switcher')) && !(await vis('.elements-attr-row')), 'power controls are hidden in guided mode');
  assert(!(await vis('#tabStylingBtn')) && !(await vis('#tabContentBtn')), 'classic tabs hidden in guided mode');
  console.log('  ✓ five steps, step 1 current, power tools hidden');

  await page.click('#guidedNext');
  assert.strictEqual(await page.getAttribute('#tabContentBtn', 'aria-selected'), 'true', 'step 2 shows the Content pane');
  assert.strictEqual(await page.getAttribute('#guidedStep-words', 'aria-current'), 'step');
  assert(!(await vis('.sidebar-tab-switcher')), 'no tab bar on step 2');
  await page.click('#guidedStep-look');
  assert.strictEqual(await page.getAttribute('#tabStylingBtn', 'aria-selected'), 'true', 'step 3 shows the Styling pane');
  assert.strictEqual(await page.getAttribute('body', 'data-step'), '3');
  await page.click('#guidedPrev');
  assert.strictEqual(await page.getAttribute('#guidedStep-words', 'aria-current'), 'step', 'Back goes to step 2');
  console.log('  ✓ Next, Back and a direct click move between steps and show the right pane');

  await page.click('#guidedStep-get');
  assert(await page.locator('#paneGet').isVisible(), 'step 5 shows the Get it panel');
  assert(!(await page.locator('#guidedNext').isVisible()), 'no Next on the last step');
  assert(await page.locator('#guidedAsk').isVisible(), 'Ask edvlabs is in the step bar');
  console.log('  ✓ step 5 shows the price panel; Ask edvlabs is in the bar');

  // advanced switch: classic tools return, the choice survives a reload
  await page.click('.guided-switch');
  assert(await vis('.viewport-mode-switcher') && await vis('#tabStylingBtn'), 'classic tools return in advanced mode');
  assert(await vis('#guidedCheckoutBtn') && !(await vis('#openExportModalBtn')), 'advanced mode has Get your page in the header, and no Export button');
  await page.click('#guidedCheckoutBtn');
  assert(await page.locator('#paneGet').isVisible() && !(await page.isChecked('#guidedAdvancedSwitch')), 'it goes back to the guided bar, on step 5');
  await page.waitForSelector('#exportModal.is-open, #buyOverlay', { timeout: 5000 }); // the window of step 5 opens (the download window, or the buying window when buying is on)
  await page.keyboard.press('Escape');
  assert(!(await vis('#guidedCheckoutBtn')), 'and the button is only for advanced mode');
  await page.click('.guided-switch');
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('web_builder_mode')), 'advanced');
  await page.reload(); await page.waitForSelector('#guidedBar', { state: 'attached' });
  assert(await page.isChecked('#guidedAdvancedSwitch'), 'advanced is remembered');
  assert(await vis('#tabStylingBtn'));
  await page.goto(srv.url + '/builder.html?guided=1'); await page.waitForSelector('#guidedBar', { state: 'attached' });
  assert(!(await vis('#tabStylingBtn')), '?guided=1 overrides the saved choice');
  console.log('  ✓ Advanced tools switch brings the classic tabs back, is remembered, ?guided=1 overrides');

  // keyboard: every step is a real button with a visible ring
  await page.focus('#guidedStep-blocks');
  const ring = await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== 'none'; });
  assert(ring, 'visible focus ring on a step');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.strictEqual(await page.getAttribute('#guidedStep-words', 'aria-current'), 'step', 'a step works from the keyboard');
  console.log('  ✓ steps work from the keyboard with a visible focus ring');

  assert.deepStrictEqual(errors, [], 'no console errors: ' + errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('Guided builder passed');
})().catch(e => { console.error(e); process.exit(1); });
