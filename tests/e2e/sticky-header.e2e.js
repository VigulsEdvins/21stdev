/** Sticky header: a ticked header stays at the top of a real scrolled page, an unticked one scrolls away; the admin card and the export agree. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 700 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Sticky header');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => {
    const m = window.builderPreview.stackManager;
    m.clearStack();
    ['sticky-shrink-header', 'about-story', 'pricing-table-switch', 'faq-accordion-smooth', 'contact-form-validated'].forEach((s) => m.insertSection(m.getStack().length, s));
  });
  const headerId = await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].id);
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].sticky), true, 'a header made for it starts sticky');
  const top = () => page.evaluate((id) => {
    const w = document.querySelector('iframe').contentWindow;
    w.scrollTo(0, 1500);
    return new Promise((res) => setTimeout(() => res({ y: Math.round(w.scrollY), top: Math.round(w.document.getElementById(id).getBoundingClientRect().top) }), 400));
  }, headerId);
  const waitSticky = (on) => page.waitForFunction(([id, want]) => {
    const el = document.querySelector('iframe').contentDocument.getElementById(id);
    return !!el && el.classList.contains('is-sticky') === want;
  }, [headerId, on], { timeout: 25000 });

  await waitSticky(true);
  await page.waitForTimeout(800);
  let r = await top();
  assert(r.y > 500, 'the page really scrolled: ' + r.y);
  assert.strictEqual(r.top, 0, 'a ticked header stays at the top');

  // the admin card unticks it; the header then scrolls away
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  const box = af.locator('#cms-sticky');
  await box.waitFor({ timeout: 10000 });
  assert(await box.isChecked(), 'the card shows it ticked');
  const inPreview = (want) => af.locator('#cms-frame').elementHandle().then((h) => h.contentFrame()).then((f) => f.waitForFunction(([id, w]) => { const el = document.getElementById(id); return !!el && el.classList.contains('is-sticky') === w; }, [headerId, want], { timeout: 15000 }));
  await inPreview(true);
  await box.uncheck();
  await inPreview(false); // the preview inside the panel follows at once, without pressing Done
  await box.check();
  await inPreview(true);
  await box.uncheck();
  await page.waitForFunction((id) => !window.builderPreview.stackManager.getStack().find((s) => s.id === id).sticky, headerId);
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });
  await waitSticky(false);
  await page.waitForTimeout(800);
  r = await top();
  assert(r.top < -500, 'an unticked header scrolls away: ' + r.top);
  const html = await page.evaluate(async () => (await window.builderPreview.prepareExportData()).bundle['index.html']);
  assert(!/is-sticky/.test(html), 'and the export agrees');

  // ticking it again, from the stack, puts it back and the export has it
  await page.evaluate((id) => window.builderPreview.stackManager.setSectionSticky(id, true), headerId);
  await waitSticky(true);
  assert(/<section class="page-section is-sticky/.test(await page.evaluate(async () => (await window.builderPreview.prepareExportData()).bundle['index.html'])), 'export has it');

  console.log('  ✓ stays at the top when ticked, scrolls away when not, card, export');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
  console.log('✅ Sticky header passed!');
})().catch((e) => { console.error(e); process.exit(1); });
