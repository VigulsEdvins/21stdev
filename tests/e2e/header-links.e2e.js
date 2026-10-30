/** Header menu items: each can be edited (text and link), items named like a section link to it by themselves, and the phone menu copies the desktop links. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Header links');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const auto = { heightMode: 'auto', customHeight: 600, paddingY: 'none' };
  await page.evaluate((sz) => window.builderPreview.stackManager.setStack([
    { id: 'hd', slug: 'centered-logo-header', title: 'Header', sizing: sz },
    { id: 'pr', slug: 'pricing-table-switch', title: 'Pricing', sizing: sz },
    { id: 'ab', slug: 'about-story', title: 'About', sizing: sz }
  ]), auto);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.getElementById('hd'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const exported = () => page.evaluate(async () => (await window.builderPreview.prepareExportData()).bundle['index.html']);

  // "About" finds the about section by itself; "Shop" and "Journal" have nothing to go to and stay unlinked
  let html = await exported();
  assert(/<a href="#about" data-edv-nav="3">About<\/a>/.test(html), 'About links to #about');
  assert(!/>Shop<\/a>/.test(html) && !/>Journal<\/a>/.test(html), 'Shop and Journal go nowhere: left out of the export');
  const warned = () => page.evaluate(async () => {
    const r = await window.builderPreview.prepareExportData();
    const sm = window.builderPreview.stackManager;
    const fixed = window.PageChecks.overrideCounts(sm.getStack());
    return window.PageChecks.checkPage(r.bundle['index.html'], sm.getState().page, fixed.alt, fixed.link).filter((i) => i.id === 'nav-no-link').map((i) => i.message);
  });
  const w1 = await warned();
  assert(w1.length === 1 && /Shop/.test(w1[0]) && /Journal/.test(w1[0]) && /Contact/.test(w1[0]), 'the check names the items left out: ' + w1.join('|'));
  // the builder preview keeps them, dimmed
  const dim = await page.evaluate(() => {
    const a = document.querySelector('iframe').contentDocument.querySelector('.clh-nav a[data-edv-nav="1"]');
    return a ? getComputedStyle(a).opacity : 'missing';
  });
  assert.strictEqual(dim, '0.4', 'preview shows the unlinked item dimmed');

  // a link set in the admin panel wins; every item has a text and a link field
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  for (let n = 1; n <= 4; n++) {
    assert.strictEqual(await af.locator('.cms-card').filter({ hasText: new RegExp('^\\s*Menu item ' + n + ': link') }).count(), 1, 'link field for item ' + n);
    assert.strictEqual(await af.locator('.cms-card').filter({ hasText: new RegExp('^\\s*Menu item ' + n + ': text') }).count(), 1, 'text field for item ' + n);
  }
  await af.locator('.cms-card').filter({ hasText: /^\s*Menu item 4: link/ }).locator('input.cms-input').fill('https://example.com/contact');
  await page.waitForFunction(() => Object.values(window.builderPreview.stackManager.getStack()[0].overrides || {}).some((o) => o.value === 'https://example.com/contact'), null, { timeout: 8000 });
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });

  html = await exported();
  assert(/data-edv-nav="4">Contact<\/a>/.test(html) && !/>Shop<\/a>/.test(html), 'a link set in the admin panel keeps its item; the others stay out');
  const w2 = await warned();
  assert(w2.length === 1 && !/Contact/.test(w2[0]) && /Shop/.test(w2[0]), 'and the warning no longer lists it');

  // the phone menu is made from the desktop links when it opens, so it shows the same address
  const panel = await page.evaluate(async () => {
    const doc = document.querySelector('iframe').contentDocument;
    const burger = doc.querySelector('.clh-burger');
    burger.click();
    const links = Array.from(doc.querySelectorAll('.clh-mobile a')).map((a) => ({ text: a.textContent, href: a.getAttribute('href'), nav: a.hasAttribute('data-edv-nav') }));
    return links;
  });
  assert.strictEqual(panel.length, 4, 'four links in the phone menu');
  assert(panel.every((l) => !l.nav), 'copies carry no item marker');
  assert(/example\.com\/contact/.test(panel[3].href), 'the phone menu has the address set for item 4: ' + JSON.stringify(panel[3]));
  console.log('  ✓ auto link by name, text and link per item, phone menu copy');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  await srv.close();
  console.log('✅ Header links passed!');
})().catch((e) => { console.error(e); process.exit(1); });
