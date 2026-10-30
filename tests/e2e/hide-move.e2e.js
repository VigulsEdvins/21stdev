/** Hide or move a small text (the pill of the aurora hero) from the admin panel: the panel's preview and the page follow, Reset undoes it. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Hide or move a text');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => {
    const m = window.builderPreview.stackManager;
    m.clearStack();
    m.insertSection(0, 'oklch-ambient-glow-hero');
  });
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  const card = af.locator('.cms-card', { hasText: 'Small label' }).first();
  const inPanel = async (fn, arg) => (await af.locator('#cms-frame').elementHandle().then((h) => h.contentFrame())).evaluate(fn, arg);
  const order = () => inPanel(() => Array.from(document.querySelector('.hero-content').children).map((c) => c.className.split(' ')[0]));
  const shown = () => inPanel(() => getComputedStyle(document.querySelector('.hero-pill')).display !== 'none');
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[0], 'hero-pill');
  assert(await shown());

  // move down: the pill stands below the headline in the panel's preview
  await card.locator('.cms-down').click();
  await af.locator('.cms-card', { hasText: 'Small label' }).first().waitFor();
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[1], 'hero-pill', 'moved one place down: ' + (await order()).join(','));
  // the top place is not offered for the first item
  assert(await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-down').isEnabled());

  // drag the pill with the mouse in the panel's preview, from below the headline back to the top
  const box = async (sel) => inPanel((q) => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const fr = await af.locator('#cms-frame').boundingBox();
  const pill = await box('.hero-pill'), title = await box('.hero-title');
  await page.mouse.move(fr.x + pill.x, fr.y + pill.y);
  await page.mouse.down();
  await page.mouse.move(fr.x + pill.x, fr.y + pill.y - 30, { steps: 4 });
  await page.mouse.move(fr.x + title.x, fr.y + title.y - 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[0], 'hero-pill', 'dragged back to the top: ' + (await order()).join(','));
  assert.strictEqual(await af.locator('.cms-card.is-edited').count(), 0, 'back in its own place, so nothing is edited');
  // and a drag down: onto the lower neighbour
  const p2 = await box('.hero-pill'), t2 = await box('.hero-title');
  await page.mouse.move(fr.x + p2.x, fr.y + p2.y);
  await page.mouse.down();
  await page.mouse.move(fr.x + p2.x, fr.y + p2.y + 20, { steps: 4 });
  await page.mouse.move(fr.x + t2.x, fr.y + t2.y + 15, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[1], 'hero-pill', 'dragged one place down: ' + (await order()).join(','));
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.type === 'move' && o.value === '1'), null, { timeout: 8000 });
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-reset').click();
  await page.waitForTimeout(1000);
  // reset after the drag puts it back
  assert.strictEqual((await order())[0], 'hero-pill');

  // hide: gone from the preview, the card says so, and the text is still there to show again
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-hide').click();
  await page.waitForTimeout(1200);
  assert(!(await shown()), 'hidden in the panel preview');
  const hiddenCard = af.locator('.cms-card.is-hidden');
  assert.strictEqual(await hiddenCard.count(), 1);
  assert.strictEqual((await hiddenCard.locator('.cms-hide').textContent()).trim(), 'Show again');

  // the builder's own page gets it too, as a saved setting of the block
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.type === 'hide' && o.value === '1'), null, { timeout: 8000 });

  // Reset brings it back, in its place
  await hiddenCard.locator('.cms-reset').click();
  await page.waitForTimeout(1200);
  assert(await shown());
  assert.strictEqual((await order())[0], 'hero-pill');
  console.log('  ✓ move, hide, show again, reset');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
