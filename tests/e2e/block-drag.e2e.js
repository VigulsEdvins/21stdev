/** Drag to reorder blocks by finger or mouse in the guided picker (plan E6.12): the order changes once, on release, as one Undo step; Escape cancels; arrows still work. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#blockPicker'); await page.waitForTimeout(600);
  console.log('Drag to reorder');
  const order = () => page.$$eval('#bpYourPage .bp-item', (e) => e.map((x) => x.getAttribute('data-slug')));
  const start = await order(); assert(start.length >= 5, 'the starter page has blocks');
  const grip = (i) => page.locator('#bpYourPage .bp-item').nth(i).locator('.bp-drag');
  const centre = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  assert((await (await grip(0).boundingBox()).height) >= 40, 'the handle is a touch-sized target');

  // a finger can scroll the panel (it used to be overflow: hidden, so the lower part of a long step could not be reached)
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.sidebar-tab-pane.is-active')).overflowY), 'auto', 'the active panel scrolls');

  // drag the first block below the third
  let a = await centre(grip(0)), t = await centre(grip(2));
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x, (a.y + t.y) / 2, { steps: 6 }); await page.mouse.move(a.x, t.y + 20, { steps: 6 });
  assert(await page.isVisible('#bpYourPage.is-sorting'), 'the list shows it is sorting');
  assert.deepStrictEqual(await order(), start, 'nothing moves until the finger is lifted');
  await page.mouse.up(); await page.waitForTimeout(200);
  const after = await order();
  assert.deepStrictEqual(after, [start[1], start[2], start[0], ...start.slice(3)], 'first block now third');
  assert(!(await page.isVisible('#bpYourPage.is-sorting')), 'sorting state cleared');
  assert((await page.textContent('#bpLive')).includes('moved to place 3'), 'the move is announced');
  console.log('  ✓ dragging a block down puts it in the new place on release');

  // one Undo gives the old order back
  await page.click('#undoBtn'); await page.waitForTimeout(400);
  assert.deepStrictEqual(await order(), start, 'one Undo undoes the whole drag');
  console.log('  ✓ one Undo brings the old order back');

  // drag the last block to the top: it starts below the fold, so the list must scroll by itself while the finger rests near the top edge
  const n = start.length;
  await grip(n - 1).scrollIntoViewIfNeeded();
  const edgeTop = await page.evaluate(() => { let n = document.getElementById('bpYourPage'); while (n && !(n.scrollHeight > n.clientHeight && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement; return n ? n.getBoundingClientRect().top : 0; });
  a = await centre(grip(n - 1));
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x, edgeTop + 8, { steps: 14 });
  await page.waitForTimeout(1800); // the list scrolls up under the finger

  await page.mouse.up(); await page.waitForTimeout(200);
  assert.deepStrictEqual(await order(), [start[n - 1], ...start.slice(0, n - 1)], 'last block now first');
  await page.click('#undoBtn'); await page.waitForTimeout(300);
  console.log('  ✓ dragging a block up to the top works, and the list scrolls while dragging');

  // Escape cancels
  await grip(0).scrollIntoViewIfNeeded();
  a = await centre(grip(0)); t = await centre(grip(3));
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x, t.y, { steps: 8 }); await page.keyboard.press('Escape'); await page.mouse.up(); await page.waitForTimeout(200);
  assert.deepStrictEqual(await order(), start, 'Escape leaves the order alone');
  // a tiny wiggle is not a move
  await grip(1).scrollIntoViewIfNeeded(); a = await centre(grip(1)); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x, a.y + 4, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(150);
  assert.deepStrictEqual(await order(), start, 'a small wiggle changes nothing');
  console.log('  ✓ Escape cancels and a wiggle is not a move');

  // the arrows still work, and the handle is named for screen readers
  await page.click('#bpYourPage .bp-item:nth-child(1) .bp-down'); await page.waitForTimeout(150);
  assert.deepStrictEqual(await order(), [start[1], start[0], ...start.slice(2)]);
  assert(/Drag .* to a new place/.test(await grip(0).getAttribute('aria-label')));
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert.strictEqual(w[0], w[1], 'no sideways scroll');
  console.log('  ✓ arrows still work; the handle has a name');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Drag to reorder passed!');
})().catch((e) => { console.error(e); process.exit(1); });
