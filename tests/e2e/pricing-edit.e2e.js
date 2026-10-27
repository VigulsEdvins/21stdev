/** Pricing sections: prices, currency, plan features and badges are editable, and an edited price survives the billing switch. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Pricing edits');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));

  for (const slug of ['pricing-table-switch', 'ink-orbit-pricing']) {
    await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'p', slug: s, title: 'Pricing', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
    await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('#p .ptw-card, #p .op-card'), null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const fields = await page.evaluate(async (s) => {
      const meta = await (await fetch(`features/${s}/meta.json`)).json();
      const root = document.querySelector('iframe').contentDocument.getElementById('p');
      return window.BuilderExtras.discoverFields(root, meta.customizable, { limit: 60 }).map(f => ({ label: f.label, current: f.current, selector: f.selector, type: f.type, id: f.id }));
    }, slug);
    const labels = fields.map(f => f.label.toLowerCase());
    assert(labels.some(l => /plan 2 price per month \(big/.test(l)), `${slug}: monthly price field, got ${labels.join(' | ')}`);
    assert(labels.some(l => /plan 2 price per month when/.test(l)), `${slug}: yearly price field`);
    assert(fields.some(f => /Pro|Crew/.test(f.current) || /Priority|Unlimited projects/.test(f.current)), `${slug}: plan features or names are listed`);
    assert(fields.some(f => f.current === '$'), `${slug}: the currency sign is editable`);
    assert(!fields.some(f => /billed|save \$/i.test(f.current) && /note/.test(f.selector)), `${slug}: computed note is not offered`);

    const monthly = fields.find(f => /plan 2 price per month \(big/i.test(f.label));
    const yearly = fields.find(f => /plan 2 price per month when/i.test(f.label));
    await page.evaluate(([m, y]) => {
      const sm = window.builderPreview.stackManager;
      sm.setSectionOverride('p', m.id, '31', { selector: m.selector, type: 'text' });
      sm.setSectionOverride('p', y.id, '27', { selector: y.selector, type: 'text' });
    }, [monthly, yearly]);
    const amount = () => page.evaluate(() => {
      const d = document.querySelector('iframe').contentDocument;
      return d.querySelectorAll('#p .ptw-amount, #p .op-num')[1].textContent.trim();
    });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d.querySelectorAll('#p .ptw-amount, #p .op-num')[1].textContent.trim() === '31'; }, null, { timeout: 8000 });
    assert.strictEqual(await amount(), '31', slug + ': the big number shows the edited price at once');
    // trigger the billing switch and read the yearly price
    await page.evaluate(() => { const d = document.querySelector('iframe').contentDocument; const b = d.querySelector('#p [data-period="yearly"], #p [data-per="year"]'); b.click(); });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d.querySelectorAll('#p .ptw-amount, #p .op-num')[1].textContent.trim() === '27'; }, null, { timeout: 8000 });
    assert.strictEqual(await amount(), '27', `${slug}: yearly price follows the edit`);
    console.log(`  ✓ ${slug}: prices editable and used by the billing switch`);
  }
  // in the admin panel: a currency choice and a numbers-only price
  for (const slug of ['pricing-table-switch', 'ink-orbit-pricing']) {
    await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'p', slug: s, title: 'Pricing', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
    await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('#p .ptw-card, #p .op-card'), null, { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.click('#tabContentBtn');
    await page.click('#openAdminBtn');
    const af = page.frameLocator('#adminFrame');
    await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
    const cur = af.locator('.cms-card:has(.cms-type:text-is("currency"))').first();
    assert.strictEqual(await cur.locator('select').count(), 1, slug + ': currency is a choice list');
    assert(await cur.locator('select option').count() > 10, slug + ': several currencies to pick from');
    await cur.locator('select').selectOption('€');
    const shown = af.frameLocator('#cms-frame').locator('.ptw-cur, .op-cur');
    await page.waitForFunction(() => true);
    await af.frameLocator('#cms-frame').locator('.ptw-cur, .op-cur').nth(2).waitFor();
    await page.waitForTimeout(600);
    assert.deepStrictEqual(await shown.allTextContents(), ['€', '€', '€'], slug + ': one currency for every plan');
    const price = af.locator('.cms-card:has(.cms-type:text-is("number"))').first().locator('input');
    await price.fill('');
    await price.pressSequentially('1a2b,5c9');
    assert.strictEqual(await price.inputValue(), '12,59', slug + ': only numbers can be typed');
    await af.locator('#cms-publish').click();
    await page.waitForSelector('#adminOverlay', { state: 'hidden' });
    console.log(`  ✓ ${slug}: currency list and numbers-only price in the admin panel`);
  }
  assert.deepStrictEqual(errors, []);
  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
