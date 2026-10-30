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
  await page.keyboard.down('Shift');
  await page.mouse.move(fr.x + pill.x, fr.y + pill.y);
  await page.mouse.down();
  await page.mouse.move(fr.x + pill.x, fr.y + pill.y - 30, { steps: 4 });
  await page.mouse.move(fr.x + title.x, fr.y + title.y - 20, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[0], 'hero-pill', 'dragged back to the top: ' + (await order()).join(','));
  assert.strictEqual(await af.locator('.cms-card.is-edited').count(), 0, 'back in its own place, so nothing is edited');
  // and a drag down: onto the lower neighbour
  const p2 = await box('.hero-pill'), t2 = await box('.hero-title');
  await page.keyboard.down('Shift');
  await page.mouse.move(fr.x + p2.x, fr.y + p2.y);
  await page.mouse.down();
  await page.mouse.move(fr.x + p2.x, fr.y + p2.y + 20, { steps: 4 });
  await page.mouse.move(fr.x + t2.x, fr.y + t2.y + 15, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForTimeout(1200);
  assert.strictEqual((await order())[1], 'hero-pill', 'dragged one place down: ' + (await order()).join(','));
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.type === 'move' && o.value === '1'), null, { timeout: 8000 });
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-reset').click();
  await page.waitForTimeout(1000);
  // reset after the drag puts it back
  assert.strictEqual((await order())[0], 'hero-pill');

  // a plain drag places it anywhere inside the block, and stays inside it
  const where = () => inPanel(() => { const r = document.querySelector('.hero-pill').getBoundingClientRect(), s = document.querySelector('.hero-pill').closest('.page-section').getBoundingClientRect(); return { x: r.left, y: r.top, right: r.right, bottom: r.bottom, sl: s.left, st: s.top, sr: s.right, sb: s.bottom, tr: document.querySelector('.hero-pill').style.translate }; });
  const w0 = await where(), p3 = await box('.hero-pill');
  await page.mouse.move(fr.x + p3.x, fr.y + p3.y);
  await page.mouse.down();
  await page.mouse.move(fr.x + p3.x + 40, fr.y + p3.y + 40, { steps: 4 });
  await page.mouse.move(fr.x + p3.x + 9000, fr.y + p3.y + 150, { steps: 8 }); // far past the right edge of the block
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const w1 = await where();
  assert(w1.x > w0.x + 100 && w1.y > w0.y + 100, 'moved to the lower right: ' + JSON.stringify([w0, w1]));
  assert(w1.right <= w1.sr + 1 && w1.bottom <= w1.sb + 1, 'and stays inside the block');
  assert.strictEqual((await order())[0], 'hero-pill', 'its place in the row is the same');
  assert.strictEqual(await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-putback').count(), 1);
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.type === 'shift'), null, { timeout: 8000 });
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-putback').click();
  await page.waitForTimeout(1200);
  const w2 = await where();
  assert(Math.abs(w2.x - w0.x) < 1 && Math.abs(w2.y - w0.y) < 1 && !w2.tr, 'Put back: ' + JSON.stringify(w2));

  // dragging near the block's centre snaps to it (a green line shows), and Alt turns snapping off
  const geo = () => inPanel(() => { const e = document.querySelector('.hero-pill').getBoundingClientRect(), r = document.querySelector('.hero-pill').closest('.page-section').getBoundingClientRect(); return { cx: (e.left + e.right) / 2, rc: (r.left + r.right) / 2, cy: (e.top + e.bottom) / 2, x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
  const guides = () => inPanel(() => Array.from(document.body.children).filter((d) => d.style.position === 'fixed' && d.style.display === 'block' && /rgb\(0, 177, 129\)/.test(d.style.background)).length);
  const g0 = await geo();
  const nudge = async (alt) => {
    const g = await geo();
    if (alt) await page.keyboard.down('Alt');
    await page.mouse.move(fr.x + g.x, fr.y + g.y); await page.mouse.down();
    await page.mouse.move(fr.x + g.x + 20, fr.y + g.y + 20, { steps: 3 });
    await page.mouse.move(fr.x + g.x + (g.rc - g.cx) + 2, fr.y + g.y + 30, { steps: 6 }); // 2 px right of the centre
    await page.waitForTimeout(200);
    const during = await guides();
    await page.mouse.up(); if (alt) await page.keyboard.up('Alt'); await page.waitForTimeout(1200);
    return { during, after: await geo() };
  };
  const snapped = await nudge(false);
  assert(snapped.during >= 1, 'a green guide shows while it is near the centre');
  assert(Math.abs(snapped.after.cx - snapped.after.rc) < 0.8, 'centred: ' + JSON.stringify(snapped.after));
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-putback').click();
  await page.waitForTimeout(1000);
  const free = await nudge(true);
  assert(Math.abs(free.after.cx - free.after.rc - 2) < 1.5, 'with Alt it stays where the mouse put it: ' + JSON.stringify(free.after));
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-putback').click();
  await page.waitForTimeout(1000);

  // it also lines up with another text: the left side of the pill with the left side of the first chip
  const edges = () => inPanel(() => ({ pill: document.querySelector('.hero-pill').getBoundingClientRect().left, pw: document.querySelector('.hero-pill').getBoundingClientRect().width, chip: document.querySelector('.chip').getBoundingClientRect().left, x: document.querySelector('.hero-pill').getBoundingClientRect().left + document.querySelector('.hero-pill').getBoundingClientRect().width / 2, y: document.querySelector('.hero-pill').getBoundingClientRect().top + 10 }));
  const e0 = await edges();
  await page.mouse.move(fr.x + e0.x, fr.y + e0.y); await page.mouse.down();
  await page.mouse.move(fr.x + e0.x - 20, fr.y + e0.y + 20, { steps: 3 });
  await page.mouse.move(fr.x + e0.x + (e0.chip - e0.pill) + 3, fr.y + e0.y + 60, { steps: 6 }); // 3 px right of the chip's left side
  await page.mouse.up(); await page.waitForTimeout(1200);
  const e1 = await edges();
  assert(Math.abs(e1.pill - e1.chip) < 0.8, 'lined up with the chip: ' + JSON.stringify(e1));
  await af.locator('.cms-card', { hasText: 'Small label' }).first().locator('.cms-putback').click();
  await page.waitForTimeout(1000);

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
  // the label at the very end of its box: the chip fields (positional selectors) still edit their own chips
  const sl = () => af.locator('.cms-card', { hasText: 'Small label' }).first();
  for (let i = 0; i < 3; i++) { await sl().locator('.cms-down').click(); await page.waitForTimeout(500); }
  await page.waitForTimeout(1000);
  assert.strictEqual((await order()).slice(-1)[0], 'hero-pill', 'the label is last: ' + (await order()).join(','));
  await af.locator('.cms-card', { hasText: 'Button text 2' }).first().locator('textarea').fill('Second');
  await page.waitForTimeout(1200);
  assert.strictEqual(await inPanel(() => Array.from(document.querySelectorAll('.chip')).map((c) => c.textContent.trim()).join(',')), 'Ultraviolet,Second,Solar Flare,Deep Cryo');
  console.log('  ✓ move, hide, show again, reset');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
