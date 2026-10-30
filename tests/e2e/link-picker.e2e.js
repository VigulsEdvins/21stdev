/** Link fields in the admin panel: a "go to" list of this page's sections and the other pages, and a name for each section's link. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Link picker');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const auto = { heightMode: 'auto', customHeight: 600, paddingY: 'none' };
  await page.evaluate((sz) => {
    const sm = window.builderPreview.stackManager;
    sm.setStack([
      { id: 'hd', slug: 'sticky-shrink-header', title: 'Header', sizing: sz },
      { id: 'pr', slug: 'pricing-table-switch', title: 'Pricing', sizing: sz },
      { id: 'ab', slug: 'about-story', title: 'About', sizing: sz }
    ]);
    sm.addPage('Contact us');
    sm.switchPage(sm.getPages()[0].id);
  }, auto);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.getElementById('pr'), null, { timeout: 20000 });
  await page.waitForTimeout(800);

  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });

  // the header's button link has the list: sections of this page, then the other page
  const card = af.locator('.cms-card').filter({ hasText: /Button link/i }).first();
  const pick = card.locator('select.cms-pick');
  await pick.waitFor({ timeout: 10000 });
  const options = await pick.locator('option').allTextContents();
  assert(options.some((t) => /Pricing/.test(t) && /#pricing/.test(t)), 'lists the pricing section: ' + options.join(' | '));
  assert(options.some((t) => /About/.test(t) && /#about/.test(t)), 'lists the about section');
  assert(options.includes('Contact us'), 'lists the other page');
  assert(await af.locator('optgroup').count() >= 2, 'two groups');

  // choosing fills the text box and is saved to the page as a link edit
  await pick.selectOption({ label: options.find((t) => /#pricing/.test(t)) });
  assert.strictEqual(await card.locator('input.cms-input').inputValue(), '#pricing');
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.type === 'link' && o.value === '#pricing'), null, { timeout: 8000 });
  assert.strictEqual(await pick.inputValue(), '#pricing', 'the list shows the current choice');

  // another page is stored as page:<id>
  await pick.selectOption({ label: 'Contact us' });
  assert(/^page:/.test(await card.locator('input.cms-input').inputValue()));

  // typing an address clears the list's choice
  await card.locator('input.cms-input').fill('https://example.com/start');
  assert.strictEqual(await pick.inputValue(), '');

  // a section's link name can be changed; the lists follow
  const names = await af.locator('.cms-anchor-card input').count();
  assert(names >= 1, 'a link-name card on a section');
  await page.evaluate(() => window.builderPreview.stackManager.setSectionAnchor('pr', 'Plans & prices'));
  assert.strictEqual(await page.evaluate(() => window.__cmsBridge.anchorOf('pr')), 'plans-prices');
  assert(await page.evaluate(() => window.__cmsBridge.targets().sections.some((t) => t.value === '#plans-prices')));
  // two sections cannot share a name
  await page.evaluate(() => window.builderPreview.stackManager.setSectionAnchor('ab', 'plans-prices'));
  assert.strictEqual(await page.evaluate(() => window.__cmsBridge.anchorOf('ab')), 'plans-prices-2');

  // and the exported page has it
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });
  const html = await page.evaluate(async () => (await window.builderPreview.prepareExportData()).bundle['index.html']);
  assert(/id="plans-prices" data-for="pr"/.test(html), 'export uses the chosen name');
  console.log('  ✓ go-to list (sections, other pages), saved link, link names, export');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
  console.log('✅ Link picker passed!');
})().catch((e) => { console.error(e); process.exit(1); });
