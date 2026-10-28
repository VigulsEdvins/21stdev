/** The builder's own light/dark switch: default light (the edvlabs paper look), toggles to dark, remembered, and the preview keeps its real colours. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Builder light/dark UI');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'light', 'light by default');
  assert.strictEqual(await page.getAttribute('#uiThemeBtn', 'aria-pressed'), 'true');
  const lum0 = c => { const [r, g, b] = (c.match(/[\d.]+/g) || []).map(Number); return 0.299 * r + 0.587 * g + 0.114 * b; };
  const first = await page.evaluate(() => ({ panel: getComputedStyle(document.querySelector('.builder-header')).backgroundColor, text: getComputedStyle(document.body).color }));
  assert(lum0(first.panel) > 200 && lum0(first.text) < 80, 'light panels, dark text by default: ' + JSON.stringify(first));
  await page.click('#uiThemeBtn');
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'dark');
  assert.strictEqual(await page.getAttribute('#uiThemeBtn', 'aria-pressed'), 'false');
  // the dark look is a set of variables, not an inverted filter: panels are dark, the preview is not touched
  const look = await page.evaluate(() => ({
    filter: getComputedStyle(document.body).filter,
    frameFilter: getComputedStyle(document.querySelector('iframe')).filter,
    panel: getComputedStyle(document.querySelector('.builder-header')).backgroundColor,
    text: getComputedStyle(document.body).color
  }));
  assert.strictEqual(look.filter, 'none', 'no filter hack');
  assert.strictEqual(look.frameFilter, 'none');
  const lum = c => { const [r, g, b] = (c.match(/[\d.]+/g) || []).map(Number); return 0.299 * r + 0.587 * g + 0.114 * b; };
  assert(lum(look.panel) < 80 && lum(look.text) > 200, 'dark panels, light text: ' + JSON.stringify(look));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'dark', 'remembered across a reload');
  await page.click('#uiThemeBtn');
  assert.strictEqual(await page.getAttribute('html', 'data-ui-theme'), 'light');
  console.log('  ✓ toggles, remembered, preview untouched');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ UI theme flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
