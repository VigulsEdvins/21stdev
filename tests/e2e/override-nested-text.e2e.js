/** A text edit on an element whose words sit in a child (a button with a <span> label) replaces them instead of adding a second set. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Nested text edit');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'a', slug: 'responsive-burger-menu', title: 'Menu', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('#a .burger-btn'), null, { timeout: 20000 });
  await page.evaluate(() => window.builderPreview.stackManager.setSectionOverride('a', 'btn', 'SEC', { selector: ':scope .burger-btn', type: 'text' }));
  await page.waitForFunction(() => /^\s*SEC\s*$/.test(((document.querySelector('iframe').contentDocument.querySelector('#a .burger-label')) || {}).textContent || ''), null, { timeout: 8000 });
  const read = () => page.evaluate(() => { const b = document.querySelector('iframe').contentDocument.querySelector('#a .burger-btn'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  await page.waitForFunction(() => { const b = document.querySelector('iframe').contentDocument.querySelector('#a .burger-btn'); return b && b.textContent.replace(/\s+/g, ' ').trim() === 'SEC'; }, null, { timeout: 8000 }).catch(() => {});
  const text = await read();
  assert.strictEqual(text, 'SEC', 'the button shows SEC only, got: ' + text);
  console.log('  ✓ the label is replaced, not added to');
  assert.deepStrictEqual(errors, []);
  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
