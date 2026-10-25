/** Section height handle: dragging up shrinks the content (text included) down to the component's minimum, then stops. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Section fit resize');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  // two multi-part sections: a header + rows marquee and a card grid
  await page.evaluate(() => window.builderPreview.stackManager.setStack([
    { id: 'fit-a', slug: 'client-logo-marquee', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } },
    { id: 'fit-b', slug: 'stagger-testimonials', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }
  ]));
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('fit-a') && d.getElementById('fit-b') && d.querySelector('#fit-a .clients-marquee__item') && d.querySelector('#fit-b .stagger-card'); }, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const frame = () => page.frames().find(f => f !== page.mainFrame());

  for (const id of ['fit-a', 'fit-b']) {
    const sec = frame().locator('#' + id);
    await sec.scrollIntoViewIfNeeded();
    await sec.hover();
    const handle = frame().locator(`#${id} .section-resize-handle`);
    const hb = await handle.boundingBox();
    assert(hb, 'the section has a resize handle');
    const startH = await sec.evaluate(e => e.getBoundingClientRect().height);
    const grab = async (dy) => {
      const b = await handle.boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + dy / 2, { steps: 4 });
      await page.mouse.move(x, y + dy, { steps: 4 });
      const tip = await frame().locator('#sectionResizeTooltip').textContent().catch(() => '');
      await page.mouse.up();
      return tip;
    };

    // a modest shrink: the content scales, it is not cropped
    const tip1 = await grab(-Math.round(startH * 0.25));
    const h1 = await sec.evaluate(e => e.getBoundingClientRect().height);
    const content = await sec.evaluate(e => { const c = e.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)'); return { zoom: parseFloat(c.style.zoom || '1'), visual: c.getBoundingClientRect().height, scroll: c.scrollHeight * parseFloat(c.style.zoom || '1') }; });
    assert(h1 < startH - 5, `${id}: section got shorter (${startH} -> ${h1})`);
    assert(content.zoom < 1 && content.zoom >= 0.6, `${id}: content scaled to ${content.zoom}`);
    assert(Math.abs(content.visual - h1) <= 3, `${id}: content fills the section (${content.visual} vs ${h1})`);
    assert(/text \d+%/.test(tip1), `${id}: tooltip shows the text scale, got "${tip1}"`);
    const saved1 = await page.evaluate(i => window.builderPreview.stackManager.getStack().find(s => s.id === i).sizing, id);
    assert.strictEqual(saved1.heightMode, 'custom');
    assert(saved1.fitScale > 0 && saved1.fitScale < 1, `${id}: scale is saved (${saved1.fitScale})`);

    // a huge shrink stops at the minimum instead of going on
    const tip2 = await grab(-2000);
    const h2 = await sec.evaluate(e => e.getBoundingClientRect().height);
    const saved2 = await page.evaluate(i => window.builderPreview.stackManager.getStack().find(s => s.id === i).sizing, id);
    assert(h2 > 40, `${id}: stopped at a minimum, not collapsed (${h2})`);
    assert(Math.abs(saved2.fitScale - 0.6) < 0.02, `${id}: minimum scale is 0.6, got ${saved2.fitScale}`);
    assert(/minimum/.test(tip2), `${id}: tooltip says minimum, got "${tip2}"`);
    // nothing important is cropped: the content still fits inside the section
    const clipped = await sec.evaluate(e => { const c = e.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)'); return c.scrollHeight * parseFloat(c.style.zoom || '1') - e.getBoundingClientRect().height; });
    assert(clipped <= 4, `${id}: content is not cropped (overflow ${Math.round(clipped)}px)`);
    console.log(`  ✓ ${id}: ${Math.round(startH)}px -> ${Math.round(h1)}px (text ${Math.round(content.zoom * 100)}%) -> minimum ${Math.round(h2)}px`);
  }

  // the saved scale reaches the page that is exported / previewed
  const html = await page.evaluate(() => window.Assembler.assemblePreviewDocument(window.builderPreview.stackManager.getStack(), window.Assembler.THEME_PRESETS['midnight-dark'], {}));
  assert(/zoom: 0\.6/.test(html), 'the preview document carries the fit scale');
  console.log('  ✓ the fit scale is written into the page');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Section fit flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
