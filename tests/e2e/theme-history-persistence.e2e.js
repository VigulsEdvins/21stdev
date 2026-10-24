/**
 * End-to-end: adding sections, theme switching, undo/redo and reload persistence.
 */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

async function main() {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = name => console.log('  ✓ ' + name);
  const count = () => page.evaluate(() => Number(document.getElementById('stackCountBadge').textContent));
  const ready = () => page.waitForFunction(() => { const f = document.querySelector('iframe'); return f && f.contentDocument.readyState === 'complete' && f.contentDocument.querySelector('.page-section'); });

  console.log('Theme, history and persistence');
  await page.goto(srv.url + '/builder.html');
  await ready();
  const start = await count();
  assert(start >= 5, 'starter template is loaded on first visit');
  step(`starter page loads with ${start} sections`);

  // add a section from the sidebar
  await page.click('.scope-pill[data-scope=sections]');
  await page.fill('#elementsSearchInput', 'holo card');
  await page.waitForFunction(() => document.querySelector('.element-feature-card'));
  await page.click('.element-add-btn >> nth=0');
  await page.waitForFunction(n => Number(document.getElementById('stackCountBadge').textContent) === n + 1, start);
  step('adding a section from the sidebar grows the stack');

  // undo / redo
  await page.click('#undoBtn');
  await page.waitForFunction(n => Number(document.getElementById('stackCountBadge').textContent) === n, start);
  await page.click('#redoBtn');
  await page.waitForFunction(n => Number(document.getElementById('stackCountBadge').textContent) === n + 1, start);
  step('undo and redo step through history');

  // theme
  await ready();
  await page.selectOption('#themePresetSelect', 'clean-minimal');
  await page.waitForFunction(() => (document.querySelector('iframe').contentDocument.documentElement || { getAttribute() {} }).getAttribute('data-theme') === 'light', null, { timeout: 8000 });
  step('switching to a light theme reaches the preview');

  // reload restores everything
  await page.reload();
  await ready();
  assert.strictEqual(await count(), start + 1);
  assert.strictEqual(await page.inputValue('#themePresetSelect'), 'clean-minimal');
  step('reload restores the sections and the theme');

  assert.deepStrictEqual(errors, [], 'no uncaught page errors: ' + errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Theme, history and persistence flow passed!');
}

main().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
