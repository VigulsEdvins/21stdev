/** Pricing blocks: every plan button has a link field in the admin panel, and the page check flags a button that goes nowhere. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Pricing plan links');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  for (const slug of ['pricing-table-switch', 'ink-orbit-pricing']) {
    await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'p', slug: s, title: 'Pricing', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
    await page.waitForFunction(() => document.querySelector('iframe').contentDocument.getElementById('p'), null, { timeout: 20000 });
    await page.waitForTimeout(800);
    const flagged = () => page.evaluate(async () => {
      const r = await window.builderPreview.prepareExportData();
      const sm = window.builderPreview.stackManager;
      const fixed = window.PageChecks.overrideCounts(sm.getStack());
      return window.PageChecks.checkPage(r.bundle['index.html'], sm.getState().page, fixed.alt, fixed.link).filter((i) => i.id === 'cta-no-link').length;
    });
    assert.strictEqual(await flagged(), 3, slug + ': three plan buttons go nowhere at first');

    // the admin panel lists a link field for each plan button
    await page.click('#tabContentBtn');
    await page.click('#openAdminBtn');
    const af = page.frameLocator('#adminFrame');
    await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    const labels = await af.locator('.cms-card .cms-label').allTextContents();
    const linkCards = await af.locator('.cms-card').filter({ hasText: /link/i }).count();
    assert(linkCards >= 3, slug + ': a link field for each plan button (found ' + linkCards + ')');
    const fieldInputs = af.locator('.cms-card').filter({ hasText: /link/i }).locator('input');
    for (let i = 0; i < 3; i++) await fieldInputs.nth(i).fill('https://pay.example/plan-' + (i + 1));
    await page.waitForFunction(() => window.builderPreview.stackManager.getStack()[0].overrides && Object.values(window.builderPreview.stackManager.getStack()[0].overrides).filter((o) => o.type === 'link' && /pay\.example/.test(o.value)).length >= 3, null, { timeout: 8000 });
    await af.locator('#cms-publish').click();
    await page.waitForSelector('#adminOverlay', { state: 'hidden' });
    assert.strictEqual(await flagged(), 0, slug + ': with three links set the warning is gone');
    console.log('  ✓ ' + slug + ': link field per plan; warned until each has a link (' + labels.length + ' labelled fields)');
  }
  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
  console.log('✅ Pricing plan links passed!');
})().catch((e) => { console.error(e); process.exit(1); });
