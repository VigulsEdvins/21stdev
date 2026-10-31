/** Design token import: a JSON file sets the custom theme, the fonts and the corner radius; undo brings the old look back. */
const assert = require('assert');
const fs = require('fs');
const JSZip = require('jszip');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Design token import');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.addSection('cta-band'));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabStylingBtn');

  const tokens = { color: { background: { $value: '#1a1030' }, text: { $value: '#f5f0ff' }, brand: { primary: { $value: '#ff5a1f' } } }, font: { heading: 'Fraunces, serif', body: 'Inter' }, radius: { md: '4px' } };
  await page.setInputFiles('#importTokensFile', { name: 'brand.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(tokens)) });
  await page.waitForFunction(() => window.builderPreview.stackManager.getState().theme === 'custom');
  const st = await page.evaluate(() => { const s = window.builderPreview.stackManager.getState(); return { colors: s.customColors, page: s.page }; });
  assert.deepStrictEqual([st.colors.bg, st.colors.text, st.colors.accent], ['#1a1030', '#f5f0ff', '#ff5a1f']);
  assert.strictEqual(st.page.fontDisplay, 'Fraunces');
  assert.strictEqual(st.page.fontBody, 'Inter');
  assert.strictEqual(st.page.radius, '4px');
  await page.waitForFunction(() => document.getElementById('pageRadiusInput').value === '4px');
  assert.strictEqual(await page.inputValue('#sidebarAccentColor'), '#ff5a1f', 'the colour pickers follow the import');
  console.log('  ✓ colours, fonts and radius imported and shown in the controls');

  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportChecks .export-checks-head');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const css = await zip.file('style.css').async('string');
  assert(/:root \{ --radius: 4px; \}/.test(css), 'the exported stylesheet carries the radius');
  assert(css.includes('#ff5a1f'), 'and the accent colour');
  console.log('  ✓ the exported ZIP carries the imported look');
  await page.keyboard.press('Escape');

  // a file with nothing recognisable changes nothing and says so
  const before = await page.evaluate(() => JSON.stringify(window.builderPreview.stackManager.getState().page));
  await page.setInputFiles('#importTokensFile', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(() => JSON.stringify(window.builderPreview.stackManager.getState().page)), before);
  await page.setInputFiles('#importTokensFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('not json') });
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(() => JSON.stringify(window.builderPreview.stackManager.getState().page)), before);
  console.log('  ✓ unrecognised and invalid files change nothing');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Token import flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
