/** Perspective Tunnel Hero holds the page while the tunnel plays, then releases it to the next section. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Scroll pin');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const sz = { heightMode: 'auto', customHeight: 600, paddingY: 'none' };
  await page.evaluate((z) => window.builderPreview.stackManager.setStack([
    { id: 'a', slug: 'perspective-tunnel-hero', sizing: z }, { id: 'b', slug: 'cta-band', sizing: z }, { id: 'c', slug: 'cta-band', sizing: z }]), sz);
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('c') && d.querySelector('#a [data-scroll-pin]'); }, null, { timeout: 20000 });
  await page.waitForTimeout(2000);
  const fr = page.frames().find(f => f !== page.mainFrame());
  const box = await page.locator('#previewFrame').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 300);
  const state = () => fr.evaluate(() => ({ y: Math.round(document.scrollingElement.scrollTop), max: document.scrollingElement.scrollHeight - innerHeight }));
  assert((await state()).max > 200, 'the page is taller than the screen');

  // while the tunnel is playing the page does not move
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(100); }
  assert.strictEqual((await state()).y, 0, 'the page is held while the tunnel plays');
  console.log('  ✓ page held while the tunnel plays');

  // once the tunnel has reached the end the page moves on
  for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(100); }
  await page.waitForTimeout(300);
  const after = await state();
  assert(after.y >= after.max - 2, `the page is released to the next section (y ${after.y} of ${after.max})`);
  console.log('  ✓ released at the end of the tunnel');

  // scrolling back up rewinds the tunnel first, then the page returns to the top
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(100); }
  await page.waitForTimeout(300);
  assert.strictEqual((await state()).y, 0, 'scrolling back reaches the top again');
  console.log('  ✓ scrolling back returns to the top');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Scroll pin flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
