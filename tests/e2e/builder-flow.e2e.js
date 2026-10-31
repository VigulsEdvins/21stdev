/**
 * End-to-end behaviour tests for builder.html in headless Chromium.
 *   npm run test:e2e
 * Covers: catalog search/filters/favourites, in-place preview updates, client content editing,
 * page settings, client projects, and a real ZIP export that is opened and checked.
 */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

async function main() {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = name => console.log('  ✓ ' + name);

  console.log('Builder end-to-end flow');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#elementsCardsGrid .element-feature-card');
  await page.waitForFunction(() => document.querySelector('iframe') && document.querySelector('iframe').contentDocument.querySelector('.page-section'));

  // --- catalog -----------------------------------------------------------
  await page.click('.scope-pill[data-scope=sections]');
  await page.fill('#elementsSearchInput', 'carosel disc');
  await page.waitForFunction(() => document.getElementById('elementsTotalCount').textContent.trim() === '1 items');
  assert.strictEqual(await page.textContent('.element-card-title'), 'Vinyl Slope Carousel');
  step('typo-tolerant search finds the component');
  await page.fill('#elementsSearchInput', '');
  await page.selectOption('#filterWeight', 'heavy');
  const heavy = Number((await page.textContent('#elementsTotalCount')).split(' ')[0]);
  assert(heavy > 0 && heavy < 209, 'weight filter narrows results');
  await page.selectOption('#filterWeight', '');
  step('attribute filters narrow the list');
  await page.click('.element-fav-btn >> nth=0');
  await page.click('#quickFavouritesBtn');
  assert.strictEqual(await page.textContent('#elementsTotalCount'), '1 items');
  await page.click('#quickFavouritesBtn');
  step('favourites quick filter');

  // --- in-place preview ---------------------------------------------------
  const frame = () => page.frames().find(f => f !== page.mainFrame());
  await page.evaluate(() => { document.querySelector('iframe').contentWindow.__marker = 'alive'; });
  await page.click('.scope-pill[data-scope=widgets]');
  await page.click('.element-add-btn >> nth=0');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.canvas-element').length > 0);
  assert.strictEqual(await page.evaluate(() => document.querySelector('iframe').contentWindow.__marker), 'alive', 'adding a widget must not reload the preview');
  step('adding a widget patches the preview without reloading it');

  // --- page settings -------------------------------------------------------
  await page.click('#tabStylingBtn');
  await page.fill('#pageTitleInput', 'Acme Studio');
  await page.fill('#pageFaviconInput', '🚀');
  await page.fill('#pageFontDisplayInput', 'Playfair Display');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.title === 'Acme Studio', null, { timeout: 8000 });
  step('page title reaches the preview');

  // --- content editor ------------------------------------------------------
  await page.click('#tabContentBtn');
  await page.evaluate(() => { document.querySelector('.quick-edit').open = true; });
  await page.waitForSelector('#contentFields .content-field');
  // pick a text field: link and photo fields change an href or src, not visible text
  const textField = page.locator('#contentFields .content-field').filter({ hasNotText: /link|photo|logo/i }).first();
  const firstLabel = await textField.locator('.ps-field span').first().textContent();
  const input = textField.locator('input[type=text], textarea').first();
  await page.evaluate(() => { document.querySelector('iframe').contentWindow.__marker = 'alive2'; });
  await input.fill('Hello from the builder');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.innerText.toLowerCase().includes('hello from the builder'), null, { timeout: 8000 });
  assert.strictEqual(await page.evaluate(() => document.querySelector('iframe').contentWindow.__marker), 'alive2', 'content edit must not reload the preview');
  step(`content edit (“${firstLabel.trim()}”) shows in the preview in place`);

  // --- projects ------------------------------------------------------------
  await page.click('#projectsBtn');
  await page.waitForSelector('#projectsModal.is-open');
  await page.fill('#projName', 'Acme Studio site');
  await page.dispatchEvent('#projName', 'change');
  page.once('dialog', d => d.accept('First draft'));
  await page.click('#projSnapshotBtn');
  await page.waitForSelector('[data-restore]');
  step('project renamed and snapshot saved');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#projExportBtn')]);
  const fs = require('fs');
  const exported = fs.readFileSync(await download.path(), 'utf8');
  const parsed = JSON.parse(exported);
  assert.strictEqual(parsed.format, 'web-builder-project');
  assert.strictEqual(parsed.project.name, 'Acme Studio site');
  assert(parsed.project.state.page.title === 'Acme Studio');
  assert(parsed.project.snapshots.length === 1);
  step('project exports as a JSON file with page settings and snapshot');
  page.once('dialog', d => d.accept('Blank client'));
  await page.click('#projBlankBtn');
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Blank client');
  await page.waitForFunction(() => document.getElementById('stackCountBadge').textContent.trim() === '0');
  step('blank project empties the page');
  await page.click('[data-open]');
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Acme Studio site');
  await page.waitForFunction(() => Number(document.getElementById('stackCountBadge').textContent) > 0);
  step('switching back restores the first project');
  await page.click('#closeProjectsModalBtn');

  // --- export ----------------------------------------------------------------
  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportModal.is-open');
  const [zipDownload] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(await zipDownload.path()));
  const names = Object.keys(zip.files);
  const indexHtml = await zip.file('index.html').async('string');
  const scriptJs = await zip.file('script.js').async('string');
  assert(/<title>Acme Studio<\/title>/.test(indexHtml), 'ZIP index.html has the page title');
  const styleCss = await zip.file('style.css').async('string');
  // fonts are self-hosted when Google Fonts is reachable, otherwise the page keeps the Google link
  assert(indexHtml.includes('Playfair+Display') || (/Playfair Display/.test(styleCss) && names.some(n => n.startsWith('assets/fonts/'))), 'ZIP loads the chosen font');
  assert(scriptJs.includes('Hello from the builder'), 'ZIP script.js carries the content override');
  assert(!/["'(]\/(edv-roster|edv-yearbook|mom|edv-arena|assets\/library)\//.test(indexHtml + scriptJs), 'no root-relative asset paths left in the export');
  assert(names.some(n => n.startsWith('assets/')), 'ZIP contains an assets folder');
  step(`ZIP export is complete (${names.filter(n => !n.endsWith('/')).length} files)`);

  assert.deepStrictEqual(errors, [], 'no uncaught page errors: ' + errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Builder end-to-end flow passed!');
}

main().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
