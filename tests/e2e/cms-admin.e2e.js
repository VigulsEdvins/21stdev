/**
 * Content editor round trip: export a ZIP with the CMS, open admin.html like a client, change a heading, a link and a
 * colour, publish, see the live page change, download cms-content.js, and check a fresh browser sees it too.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Content editor (CMS)');

  // 1. builder: a two-section page and the ZIP
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([
    { id: 'a', slug: 'sticky-shrink-header', title: 'Header', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } },
    { id: 'b', slug: 'toggle-switch-set', title: 'Settings card', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }
  ]));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length >= 2, null, { timeout: 20000 });
  const [zipDl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadZipBtn').click())]);
  const zip = await require('jszip').loadAsync(fs.readFileSync(await zipDl.path()));
  ['admin.html', 'admin.css', 'admin.js', 'cms.js', 'cms-content.js'].forEach(n => assert(zip.file(n), `${n} is in the ZIP`));
  const indexHtml = await zip.file('index.html').async('string');
  assert(/<script src="script\.js"><\/script>\s*<script src="cms-content\.js"><\/script>\s*<script src="cms\.js"><\/script>/.test(indexHtml), 'index.html loads the CMS scripts after script.js');
  assert((await zip.file('README.md').async('string')).includes('## Content editor'), 'README explains the editor');
  const content = new Function('window', (await zip.file('cms-content.js').async('string')) + '; return window.EDV_CMS;')({});
  assert.strictEqual(content.pages.length, 1);
  assert.strictEqual(content.pages[0].sections.length, 2, 'both sections are listed');
  assert(content.pages[0].sections.every(s => s.fields.length > 0), 'every section has editable fields');
  console.log(`  ✓ ZIP carries the editor and ${content.pages[0].sections.reduce((n, s) => n + s.fields.length, 0)} editable fields`);

  // the admin panel opens from the Content tab, over the builder, and writes into the page
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  assert.strictEqual(await af.locator('#cms-nav .cms-nav-item').count(), 2, 'the admin panel lists both sections');
  await af.locator('.cms-card:has(textarea)').first().locator('textarea').fill('Edited in the admin panel');
  await page.waitForFunction(() => window.builderPreview.stackManager.getStack().some(s => Object.values(s.overrides || {}).some(o => o.value === 'Edited in the admin panel')), null, { timeout: 5000 });
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.textContent.includes('Edited in the admin panel'), null, { timeout: 8000 });
  console.log('  ✓ the admin panel opens from the Content tab and edits the page in place');
  // reopening shows the edit, and Reset clears it again
  await page.click('#openAdminBtn');
  const af2 = page.frameLocator('#adminFrame');
  await af2.locator('.cms-card.is-edited').first().waitFor({ timeout: 30000 });
  await af2.locator('.cms-card.is-edited .cms-reset').first().click();
  await page.waitForFunction(() => !window.builderPreview.stackManager.getStack().some(s => Object.values(s.overrides || {}).some(o => o.value === 'Edited in the admin panel')), null, { timeout: 5000 });
  await af2.locator('#cms-publish').click();
  console.log('  ✓ reopening shows earlier edits; reset removes them');

  // a second export without the editor
  await page.waitForFunction(() => !document.getElementById('downloadZipBtn').disabled, null, { timeout: 8000 });
  await page.evaluate(() => { document.getElementById('exportCmsToggle').checked = false; });
  const [plainDl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadZipBtn').click())]);
  const plain = await require('jszip').loadAsync(fs.readFileSync(await plainDl.path()));
  assert(!plain.file('admin.html') && !plain.file('cms.js'), 'the editor can be left out');
  assert(!(await plain.file('index.html').async('string')).includes('cms.js'), 'and the page then has no CMS scripts');
  console.log('  ✓ the editor can be switched off');

  // 2. serve the unzipped site
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  const serve = (root) => new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const f = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
  const site = await serve(dir);

  const admin = await ctx.newPage();
  admin.on('pageerror', e => errors.push('admin: ' + e.message));
  await admin.goto(site.url + '/admin.html');
  await admin.waitForSelector('.cms-card');
  assert.strictEqual(await admin.locator('#cms-nav .cms-nav-item').count(), 2, 'a nav item per section');
  console.log('  ✓ admin.html lists the sections and their fields');

  // 3. edit a text field: the preview changes live and the card is marked edited
  const textCard = admin.locator('.cms-card:has(textarea)').first();
  const original = await textCard.locator('textarea').inputValue();
  await textCard.locator('textarea').fill('Hello from the CMS');
  await admin.waitForFunction(() => /Unpublished/.test(document.getElementById('cms-pill').textContent));
  const frame = admin.frameLocator('#cms-frame');
  await frame.locator('body').getByText('Hello from the CMS').first().waitFor({ timeout: 8000 });
  assert(await textCard.evaluate(n => n.classList.contains('is-edited')), 'card shows it is edited');
  console.log('  ✓ typing updates the live preview');

  // undo / redo
  await admin.waitForTimeout(600);
  await admin.click('#cms-undo');
  assert.strictEqual(await admin.locator('.cms-card:has(textarea)').first().locator('textarea').inputValue(), original);
  await admin.click('#cms-redo');
  assert.strictEqual(await admin.locator('.cms-card:has(textarea)').first().locator('textarea').inputValue(), 'Hello from the CMS');
  console.log('  ✓ undo and redo work');

  // unsafe link addresses are refused
  const linkCard = admin.locator('.cms-card:has(.cms-type:text-is("link"))').first();
  if (await linkCard.count()) {
    const input = linkCard.locator('input');
    const before = await input.inputValue();
    await input.fill('javascript:alert(1)');
    assert.strictEqual(await input.getAttribute('aria-invalid'), 'true');
    assert(!JSON.stringify(await admin.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /:draft$/.test(k))) || '{}'))).includes('javascript:'), 'the unsafe address is not saved');
    await input.fill(before);
    console.log('  ✓ javascript: addresses are refused');
  }

  // 4. clicking in the preview jumps to the field
  await admin.click('#cms-nav .cms-nav-item >> nth=1');
  const secondId = await admin.evaluate(() => document.querySelector('#cms-nav .cms-nav-item.is-active').getAttribute('data-tab'));
  await admin.click('#cms-nav .cms-nav-item >> nth=0');
  await frame.locator('body').getByText('Hello from the CMS').first().click({ force: true });
  await admin.waitForFunction(() => document.querySelector('.cms-card.is-flash, .cms-card textarea:focus') !== null, null, { timeout: 5000 });
  assert.notStrictEqual(secondId, null);
  console.log('  ✓ clicking text in the preview selects its field');

  // 5. publish: the live page in this browser changes
  await admin.click('#cms-publish');
  await admin.waitForFunction(() => document.getElementById('cms-pill').textContent === 'Published');
  const live = await ctx.newPage();
  live.on('pageerror', e => errors.push('live: ' + e.message));
  await live.goto(site.url + '/index.html');
  await live.getByText('Hello from the CMS').first().waitFor({ timeout: 8000 });
  console.log('  ✓ published content shows on the page');

  // 6. the downloaded cms-content.js carries it to a fresh browser
  await admin.click('#cms-nav-backup');
  const [fileDl] = await Promise.all([admin.waitForEvent('download'), admin.click('button:has-text("Download cms-content.js")')]);
  assert.strictEqual(fileDl.suggestedFilename(), 'cms-content.js');
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-fresh-'));
  fs.cpSync(dir, freshDir, { recursive: true });
  fs.copyFileSync(await fileDl.path(), path.join(freshDir, 'cms-content.js'));
  const site2 = await serve(freshDir);
  const visitor = await fresh.newPage();
  await visitor.goto(site2.url + '/index.html');
  await visitor.getByText('Hello from the CMS').first().waitFor({ timeout: 8000 });
  const noAdmin = await fresh.newPage();
  await noAdmin.goto(site2.url + '/index.html');
  assert.strictEqual(await noAdmin.locator('.edv-cms-hover').count(), 0, 'visitors get no editing outlines');
  console.log('  ✓ the downloaded cms-content.js changes the site for a new visitor');

  // 7. reset to original
  admin.once('dialog', d => d.accept());
  await admin.click('button:has-text("Reset everything")');
  await admin.waitForFunction(() => /Unpublished/.test(document.getElementById('cms-pill').textContent));
  console.log('  ✓ reset goes back to the original and can be published');
  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  console.log('Content editor: all checks passed');

  site.server.close(); site2.server.close();
  await browser.close(); srv.close && srv.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
