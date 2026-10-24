/**
 * Review copy round trip: export a review ZIP, open it like a client, leave a comment, download the comments
 * file, and load it back into the builder.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Review copy');

  // 1. builder: a two-section page, then the review ZIP
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([
    { id: 'a', slug: 'sticky-shrink-header', title: 'Header', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } },
    { id: 'b', slug: 'toggle-switch-set', title: 'Settings card', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }
  ]));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length >= 2, null, { timeout: 20000 });
  const [zipDl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadReviewBtn').click())]);
  assert.strictEqual(zipDl.suggestedFilename(), 'my-review-copy.zip');
  const zip = await require('jszip').loadAsync(fs.readFileSync(await zipDl.path()));
  assert((await zip.file('script.js').async('string')).includes('web-builder-review'), 'the review code is in script.js');
  assert((await zip.file('README.md').async('string')).includes('## Review copy'), 'README explains it');
  const normal = await (async () => {
    await page.waitForFunction(() => !document.getElementById('downloadZipBtn').disabled, null, { timeout: 8000 }); // the button rests for a moment after a download
    const [d] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadZipBtn').click())]);
    return require('jszip').loadAsync(fs.readFileSync(await d.path()));
  })();
  assert(!(await normal.file('script.js').async('string')).includes('web-builder-review'), 'a normal export carries no review code');
  console.log('  ✓ review ZIP has the overlay; a normal ZIP does not');

  // 2. the client opens it (served from a folder, like a web host)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  const site = http.createServer((req, res) => {
    const f = path.join(dir, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => site.listen(0, '127.0.0.1', r));
  const client = await ctx.newPage();
  client.on('pageerror', e => errors.push('client: ' + e.message));
  await client.goto(`http://127.0.0.1:${site.address().port}/`);
  await client.waitForSelector('.rv-fab');
  await client.getByText('Comment mode').click();
  await client.locator('.tsw-title').first().click(); // intercepted: opens the comment box instead of acting
  await client.waitForSelector('.rv-pop');
  await client.fill('.rv-pop textarea', 'Make this heading bigger');
  await client.fill('.rv-pop input', 'Jo from Acme');
  await client.click('.rv-pop .rv-btn:not(.rv-ghost)');
  await client.waitForSelector('.rv-pin');
  assert.strictEqual(await client.locator('.rv-pin').count(), 1);
  assert.match(await client.textContent('.rv-fab'), /Review(ing)?\s*1/);
  console.log('  ✓ client leaves a comment; a pin appears');

  await client.reload();
  await client.waitForSelector('.rv-pin');
  console.log('  ✓ the comment survives a reload');

  await client.locator('.rv-fab', { hasText: /^Review/ }).click();
  await client.waitForSelector('.rv-list');
  const [jsonDl] = await Promise.all([client.waitForEvent('download'), client.click('.rv-list [data-act=download]')]);
  const file = path.join(dir, 'comments.json');
  fs.copyFileSync(await jsonDl.path(), file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(data.format, 'web-builder-review');
  assert.strictEqual(data.comments.length, 1);
  assert.strictEqual(data.comments[0].comment, 'Make this heading bigger');
  assert.strictEqual(data.comments[0].author, 'Jo from Acme');
  assert.strictEqual(data.comments[0].section.slug, 'toggle-switch-set');
  console.log('  ✓ comments download as a file');

  // 3. back in the builder: load the file, jump to the section
  await page.evaluate(() => { document.getElementById('openExportModalBtn').click(); });
  await page.waitForSelector('#exportModal.is-open');
  await page.setInputFiles('#reviewFileInput', file);
  await page.waitForSelector('#reviewCommentList li');
  const item = await page.textContent('#reviewCommentList li');
  assert(item.includes('Make this heading bigger') && item.includes('Jo from Acme'), 'comment text and author are listed');
  assert(item.includes('Settings card') || item.includes('toggle-switch-set'), 'the section is named');
  console.log('  ✓ the builder lists the comment with its section');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  site.close();
  fs.rmSync(dir, { recursive: true, force: true });
  await browser.close();
  await srv.close();
  console.log('✅ Review copy flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
