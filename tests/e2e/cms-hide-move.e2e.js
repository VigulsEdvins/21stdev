/**
 * Hide, move and drag in the downloaded site's own editor (admin.html): export the aurora hero as a ZIP, open admin.html
 * like a client, hide a text, move one a place and drag it freely, publish, and check a fresh visitor sees all three,
 * both from the browser's own copy and from the downloaded cms-content.js.
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
  console.log('Hide, move and drag in the downloaded editor');

  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => { const m = window.builderPreview.stackManager; m.clearStack(); m.insertSection(0, 'oklch-ambient-glow-hero'); });
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.hero-pill'), null, { timeout: 20000 });
  const [zipDl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadZipBtn').click())]);
  const zip = await require('jszip').loadAsync(fs.readFileSync(await zipDl.path()));
  const content = new Function('window', (await zip.file('cms-content.js').async('string')) + '; return window.EDV_CMS;')({});
  const pillField = content.pages[0].sections[0].fields.find(f => f.label === 'Small label');
  assert(pillField && pillField.sibs > 1 && pillField.pos === 0, 'the exported field knows its place among its neighbours: ' + JSON.stringify(pillField));
  console.log('  ✓ the exported content knows each field\'s place');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-hm-'));
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
  const card = (label) => admin.locator('.cms-card', { hasText: label }).first();
  const fh = async () => (await admin.locator('#cms-frame').elementHandle()).contentFrame();
  const inPreview = async (fn, arg) => (await fh()).evaluate(fn, arg);
  const order = () => inPreview(() => Array.from(document.querySelector('.hero-content').children).map(c => c.className.split(' ')[0]).join(','));
  await admin.waitForTimeout(1500);
  assert.strictEqual(await order(), 'hero-pill,hero-title,hero-sub,preset-chips');

  // hide the intro text, move the label one place down
  await card('Intro text').locator('.cms-hide').click();
  await admin.waitForTimeout(1000);
  assert(await card('Intro text').evaluate(n => n.classList.contains('is-hidden')), 'the card says hidden');
  assert.strictEqual(await inPreview(() => getComputedStyle(document.querySelector('.hero-sub')).display), 'none', 'hidden in the preview');
  await card('Small label').locator('.cms-down').click();
  await admin.waitForTimeout(1000);
  assert.strictEqual(await order(), 'hero-title,hero-pill,hero-sub,preset-chips', 'moved one place down');
  console.log('  ✓ hide and move in admin.html change the preview');

  // drag the label freely: down and to the right, far past the edge of the block
  const fr = await admin.locator('#cms-frame').boundingBox();
  const at = await inPreview(() => { const r = document.querySelector('.hero-pill').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await admin.mouse.move(fr.x + at.x, fr.y + at.y); await admin.mouse.down();
  await admin.mouse.move(fr.x + at.x + 30, fr.y + at.y + 30, { steps: 4 });
  await admin.mouse.move(fr.x + at.x + 9000, fr.y + at.y + 120, { steps: 8 });
  await admin.mouse.up();
  await admin.waitForTimeout(1200);
  const spot = () => inPreview(() => { const p = document.querySelector('.hero-pill'), s = p.closest('.page-section'); const r = p.getBoundingClientRect(), b = s.getBoundingClientRect(); return { right: r.right, sr: b.right, translate: p.style.translate }; });
  let sp = await spot();
  assert(sp.translate && sp.right <= sp.sr + 1, 'dragged, and held inside the block: ' + JSON.stringify(sp));
  assert.strictEqual(await card('Small label').locator('.cms-putback').count(), 1, 'a Put back button appears');
  console.log('  ✓ drag in admin.html places the text freely, inside its block');

  // undo and redo carry all three kinds of setting
  await admin.waitForTimeout(600);
  await admin.click('#cms-undo');
  await admin.waitForTimeout(900);
  assert(!(await spot()).translate, 'undo takes the drag back');
  await admin.click('#cms-redo');
  await admin.waitForTimeout(900);
  assert((await spot()).translate, 'redo puts it again');
  console.log('  ✓ undo and redo');

  // publish: a fresh visitor in this browser sees all three
  const check = async (visitor, what) => {
    await visitor.waitForFunction(() => document.querySelector('.hero-content'), null, { timeout: 8000 });
    await visitor.waitForFunction(() => getComputedStyle(document.querySelector('.hero-sub')).display === 'none', null, { timeout: 8000 });
    const r = await visitor.evaluate(() => ({
      order: Array.from(document.querySelector('.hero-content').children).map(c => c.className.split(' ')[0]).join(','),
      translate: document.querySelector('.hero-pill').style.translate,
      chips: Array.from(document.querySelectorAll('.chip')).map(c => c.textContent.trim()).join(',')
    }));
    assert.strictEqual(r.order, 'hero-title,hero-pill,hero-sub,preset-chips', what + ': order');
    assert(r.translate, what + ': placed by hand');
    assert.strictEqual(r.chips, 'Ultraviolet,Emerald Cyber,Solar Flare,Deep Cryo', what + ': chips keep their words');
  };
  await admin.click('#cms-publish');
  await admin.waitForFunction(() => document.getElementById('cms-pill').textContent === 'Published');
  const live = await ctx.newPage();
  live.on('pageerror', e => errors.push('live: ' + e.message));
  await live.goto(site.url + '/index.html');
  await check(live, 'published in this browser');
  console.log('  ✓ published settings show on the page');

  // the downloaded cms-content.js carries them to a new visitor
  await admin.click('#cms-nav-backup');
  const [fileDl] = await Promise.all([admin.waitForEvent('download'), admin.click('button:has-text("Download cms-content.js")')]);
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-hm-fresh-'));
  fs.cpSync(dir, freshDir, { recursive: true });
  fs.copyFileSync(await fileDl.path(), path.join(freshDir, 'cms-content.js'));
  const site2 = await serve(freshDir);
  const visitor = await fresh.newPage();
  visitor.on('pageerror', e => errors.push('visitor: ' + e.message));
  await visitor.goto(site2.url + '/index.html');
  await check(visitor, 'downloaded cms-content.js');
  const fileText = fs.readFileSync(await fileDl.path(), 'utf8');
  assert(/__hide/.test(fileText) && /__move/.test(fileText) && /__shift/.test(fileText), 'the file holds the three settings');
  console.log('  ✓ the downloaded cms-content.js changes the site for a new visitor');

  // everything reset, then the JSON backup loaded back: the three settings return; Reset on a card clears them again
  await admin.click('#cms-nav-backup');
  const [backupDl] = await Promise.all([admin.waitForEvent('download'), admin.click('button:has-text("Save changes as JSON")')]);
  const backupPath = await backupDl.path();
  assert(/__hide/.test(fs.readFileSync(backupPath, 'utf8')) && /__shift/.test(fs.readFileSync(backupPath, 'utf8')), 'the backup holds the settings');
  admin.once('dialog', d => d.accept());
  await admin.click('button:has-text("Reset everything")');
  await admin.waitForTimeout(800);
  await admin.click('#cms-nav .cms-nav-item >> nth=0');
  await admin.waitForTimeout(800);
  assert(!(await card('Intro text').evaluate(n => n.classList.contains('is-hidden'))), 'after Reset everything nothing is hidden');
  assert.strictEqual(await order(), 'hero-pill,hero-title,hero-sub,preset-chips');
  await admin.click('#cms-nav-backup');
  await admin.locator('input[type=file]').first().setInputFiles(backupPath);
  await admin.waitForTimeout(800);
  await admin.click('#cms-nav .cms-nav-item >> nth=0');
  await admin.waitForTimeout(1200);
  assert(await card('Intro text').evaluate(n => n.classList.contains('is-hidden')), 'the import brings the hidden text back');
  assert.strictEqual(await order(), 'hero-title,hero-pill,hero-sub,preset-chips', 'and the move');
  assert((await spot()).translate, 'and the hand placement');
  await card('Small label').locator('.cms-reset').click();
  await admin.waitForTimeout(1000);
  assert.strictEqual(await order(), 'hero-pill,hero-title,hero-sub,preset-chips', 'Reset puts the label back');
  assert(!(await spot()).translate, 'and its hand placement goes');
  console.log('  ✓ import brings the settings back; Reset clears them');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  console.log('Hide, move and drag in the downloaded editor: all checks passed');
  site.server.close(); site2.server.close();
  await browser.close(); srv.close && srv.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
