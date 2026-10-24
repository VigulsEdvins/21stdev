/**
 * End-to-end: the catalogue (index.html) works with a metadata-only registry.js,
 * loading feature source on demand.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

async function main() {
  assert(fs.statSync(path.join(__dirname, '..', '..', 'registry.js')).size < 2 * 1024 * 1024, 'registry.js must stay metadata-only (< 2 MB)');
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = n => console.log('  ✓ ' + n);

  console.log('Catalogue with on-demand source files');
  await page.goto(srv.url + '/index.html');
  await page.waitForSelector('.vault-card');
  assert((await page.$$('.vault-card')).length > 20);
  step('catalogue grid renders from metadata only');
  await page.waitForSelector('.card-preview-box iframe');
  step('card previews mount as iframes');

  await page.click('.vault-card [data-action=inspect] >> nth=0');
  await page.waitForFunction(() => !document.getElementById('inspectorModal').classList.contains('is-hidden'));
  await page.waitForFunction(() => document.getElementById('inspCodeContent') && document.getElementById('inspCodeContent').textContent.length > 50, null, { timeout: 8000 });
  const tabs = await page.$$eval('#inspCodeTabs .code-tab', els => els.map(e => e.textContent));
  assert(tabs.includes('script.js') || tabs.includes('Combined (1-File)'), 'source tabs loaded: ' + tabs.join(','));
  step(`inspector loads source on demand (${tabs.length} tabs)`);

  assert.deepStrictEqual(errors, [], 'no uncaught page errors: ' + errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Catalogue flow passed!');
}

main().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
