/** The living style page: no console errors, every contrast pair passes, every control is reachable by keyboard with a visible focus. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('Style page');
  await page.goto(srv.url + '/site/style/index.html');
  await page.waitForSelector('#pair-rows tr');
  const rows = await page.$$eval('#pair-rows tr', trs => trs.map(t => t.cells[4].textContent));
  assert(rows.length >= 17 && rows.every(r => r.startsWith('Pass')), 'every pair passes: ' + rows.join(' | '));
  console.log(`  ✓ ${rows.length} colour pairs measured live, all pass`);

  const fonts = await page.evaluate(async () => { await document.fonts.ready; return ['400 20px Gloock', '400 18px "Work Sans"'].map(f => document.fonts.check(f)); });
  assert(fonts.every(Boolean), 'self-hosted fonts load');
  console.log('  ✓ self-hosted fonts load');

  const focusable = await page.evaluate(() => document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])').length);
  const bad = [];
  for (let i = 0; i < focusable + 4; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      // option cards hide their input and ring the label instead
      const target = e.closest('label.option') && e.matches('input') ? e.closest('label.option') : e;
      const c = getComputedStyle(target);
      return { vis: (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2) || c.boxShadow !== 'none', name: e.tagName + ' ' + (e.id || e.textContent.trim().slice(0, 20)) };
    });
    if (r && !r.vis) bad.push(r.name);
  }
  assert.deepStrictEqual(bad, [], 'visible focus on every control: ' + bad.join(', '));
  console.log(`  ✓ ${focusable} controls reachable by keyboard, each with a visible focus ring`);

  await page.click('#open-modal');
  assert(await page.evaluate(() => document.getElementById('demo-modal').open), 'dialog opens');
  await page.keyboard.press('Escape');
  assert(!(await page.evaluate(() => document.getElementById('demo-modal').open)), 'Escape closes the dialog');
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'open-modal', 'focus returns to the button');
  console.log('  ✓ dialog opens, Escape closes it, focus returns');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Style page flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
