/** Colour fields in the Content tab: the picker starts at the component's real colour, changes the preview and the export, and can be reset. */
const assert = require('assert');
const fs = require('fs');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Colour fields');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'a', slug: 'hairline-bento-portfolio', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('#a .hn-root'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.click('#tabContentBtn');
  await page.evaluate(() => { document.querySelector('.quick-edit').open = true; });
  const field = page.locator('#contentFields .content-field', { hasText: 'Accent colour' });
  await field.waitFor();
  const input = field.locator('input[type=color]');
  assert.strictEqual(await input.inputValue(), '#e4572e', 'the picker starts at the component\'s own accent');
  const accent = () => page.evaluate(() => getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('#a .hn-root')).getPropertyValue('--hn-accent').trim());
  await input.fill('#00aa55');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('#a .hn-root')).getPropertyValue('--hn-accent').trim() === '#00aa55', null, { timeout: 8000 });
  console.log('  ✓ picker starts at #e4572e, changing it recolours the preview');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadSingleHtmlBtn').click())]);
  const html = fs.readFileSync(await dl.path(), 'utf8');
  assert(html.includes('#00aa55') && html.includes('--hn-accent'), 'the colour is in the exported page');
  console.log('  ✓ the export carries it');

  await page.locator('#contentFields .content-field', { hasText: 'Accent colour' }).locator('.content-reset').click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('#a .hn-root')).getPropertyValue('--hn-accent').trim() === '#e4572e', null, { timeout: 8000 });
  console.log('  ✓ reset brings the original colour back');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Colour field flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
