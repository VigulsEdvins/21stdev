/** Automatic menu: a header added now lists the page's sections by itself, and follows when sections change. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Automatic menu');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const sm = 'window.builderPreview.stackManager';
  // a header and a hero, then five sections: added the way the builder adds blocks
  await page.evaluate((x) => {
    const m = window.builderPreview.stackManager;
    m.clearStack();
    ['sticky-shrink-header', 'ink-orbit-hero', 'about-story', 'pricing-table-switch', 'faq-accordion-smooth', 'contact-form-validated', 'team-grid-simple'].forEach((s) => m.insertSection(m.getStack().length, s));
  }, sm);
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].menuMode), 'auto', 'a new header starts automatic');
  const menu = () => page.evaluate(() => Array.from(document.querySelector('iframe').contentDocument.querySelectorAll('.ssh-nav a')).map((a) => a.textContent.trim() + '>' + a.getAttribute('href')));
  const waitMenu = (n) => page.waitForFunction((count) => document.querySelector('iframe').contentDocument.querySelectorAll('.ssh-nav a[data-edv-auto]').length === count, n, { timeout: 25000 });
  await waitMenu(5);
  assert.deepStrictEqual(await menu(), ['About>#about', 'Pricing>#pricing', 'FAQ>#faq', 'Contact>#contact', 'Team>#team'], 'five sections, five items (the banner is not listed)');

  // removing, hiding and adding a section changes the menu
  const ids = await page.evaluate(() => window.builderPreview.stackManager.getStack().map((s) => s.slug + ':' + s.id));
  const idOf = (slug) => ids.find((x) => x.startsWith(slug + ':')).split(':')[1];
  await page.evaluate((id) => window.builderPreview.stackManager.removeSection(id), idOf('faq-accordion-smooth'));
  await waitMenu(4);
  assert.deepStrictEqual((await menu()).map((t) => t.split('>')[0]), ['About', 'Pricing', 'Contact', 'Team']);
  await page.evaluate((id) => window.builderPreview.stackManager.setSectionFlag(id, 'hidden', true), idOf('team-grid-simple'));
  await waitMenu(3);
  await page.evaluate((id) => window.builderPreview.stackManager.setSectionFlag(id, 'hidden', false), idOf('team-grid-simple'));
  await page.evaluate(() => window.builderPreview.stackManager.insertSection(window.builderPreview.stackManager.getStack().length, 'faq-accordion-smooth'));
  await waitMenu(5);
  assert.deepStrictEqual((await menu()).map((t) => t.split('>')[0]), ['About', 'Pricing', 'Contact', 'Team', 'FAQ']);

  // the export has the same items as plain links to anchors that exist
  const html = await page.evaluate(async () => (await window.builderPreview.prepareExportData()).bundle['index.html']);
  ['about', 'pricing', 'contact', 'team', 'faq'].forEach((n) => {
    assert(new RegExp('<a href="#' + n + '" data-edv-auto').test(html), 'export links #' + n);
    assert(new RegExp('<span class="edv-anchor" id="' + n + '"').test(html), 'and #' + n + ' exists');
  });

  // the admin panel: the header's menu card, a section's own card
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  const mode = af.locator('#cms-menu-mode');
  await mode.waitFor({ timeout: 10000 });
  assert.strictEqual(await mode.inputValue(), 'auto');
  assert(/About, Pricing, Contact, Team, FAQ/.test(await af.locator('.cms-menu-card .cms-hint').first().textContent()), 'the card lists what the menu shows');
  // a section: switch it off, rename another
  const stackNow = async () => page.evaluate(() => window.builderPreview.stackManager.getStack().map((s) => ({ slug: s.slug, id: s.id, inMenu: s.inMenu, menuLabel: s.menuLabel })));
  await page.evaluate((id) => window.__cmsBridge.setMenu(id, { menuLabel: 'Plans <b>and</b> prices' }), idOf('pricing-table-switch'));
  await page.evaluate((id) => window.__cmsBridge.setMenu(id, { inMenu: false }), idOf('team-grid-simple'));
  const after = await stackNow();
  assert.strictEqual(after.find((s) => s.slug === 'pricing-table-switch').menuLabel, 'Plans and prices', 'a label is cleaned');
  assert.strictEqual(after.find((s) => s.slug === 'team-grid-simple').inMenu, false);
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });
  await waitMenu(4);
  assert.deepStrictEqual((await menu()).map((t) => t.split('>')[0]), ['About', 'Plans and prices', 'Contact', 'FAQ']);

  // choosing "my own items" gives the header's own items back; a header saved before this feature never changes
  await page.evaluate(() => { const m = window.builderPreview.stackManager; m.setSectionMenu(m.getStack()[0].id, { menuMode: 'manual' }); });
  await page.waitForFunction(() => /Product/.test(document.querySelector('iframe').contentDocument.querySelector('.ssh-nav')?.textContent || ''), null, { timeout: 25000 });
  assert(/Product/.test((await menu()).join('|')), 'own items are back');
  await page.evaluate(() => { const m = window.builderPreview.stackManager; m.clearStack(); m.insertSection(0, { slug: 'sticky-shrink-header' }); m.insertSection(1, 'about-story'); });
  await page.waitForFunction(() => /Product/.test(document.querySelector('iframe').contentDocument.querySelector('.ssh-nav')?.textContent || ''), null, { timeout: 25000 });
  assert.strictEqual(await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].menuMode), undefined, 'a saved header stays manual');

  console.log('  ✓ five sections five items, follows add/remove/hide, export, admin cards, manual mode, saved headers');
  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
  console.log('✅ Automatic menu passed!');
})().catch((e) => { console.error(e); process.exit(1); });
