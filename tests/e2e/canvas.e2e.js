/**
 * End-to-end: freeform canvas widgets (select, edit toolbar, delete, context menu).
 */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

async function main() {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = n => console.log('  ✓ ' + n);
  const frame = page.frameLocator('iframe');
  const widgetCount = () => page.evaluate(() => document.querySelector('iframe').contentDocument.querySelectorAll('.canvas-element').length);

  console.log('Canvas widgets');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => { const f = document.querySelector('iframe'); return f && f.contentDocument.readyState === 'complete' && f.contentDocument.querySelector('.page-section'); });

  await page.click('.scope-pill[data-scope=widgets]');
  await page.waitForSelector('.element-add-btn');
  const before = await widgetCount();
  await page.click('.element-add-btn >> nth=0');
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.canvas-element').length === n + 1, before);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.canvas-element.is-selected'));
  step('adding a widget places and selects it');

  const widget = frame.locator('.canvas-element.is-selected').first();
  await widget.dblclick();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('elementEditToolbar')).display !== 'none');
  step('double-click opens the edit toolbar');

  await page.fill('#toolbarBtnText', 'Book a call');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.innerText.includes('Book a call'), null, { timeout: 8000 });
  step('editing the toolbar text updates the widget in the preview');

  await page.click('#toolbarCloseBtn');
  const anyWidget = frame.locator('.canvas-element').first();
  await anyWidget.click();
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.canvas-element.is-selected'));
  await page.keyboard.press('Delete');
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.canvas-element').length === n, before);
  step('Delete removes the selected widget');

  await frame.locator('.page-section').nth(1).click({ button: 'right', position: { x: 200, y: 120 } });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('canvasContextMenu')).display !== 'none');
  step('right-click opens the context menu');

  assert.deepStrictEqual(errors, [], 'no uncaught page errors: ' + errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Canvas flow passed!');
}

main().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
