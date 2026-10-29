/**
 * "Form messages" tab of the admin panel: set in the builder's panel, carried into the ZIP as the default, changed later in
 * the exported admin.html, picked up by the site from the uploaded cms-content.js, and never trusted blindly.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const JSZip = require('jszip');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function serve(dir, posts) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => { posts.push({ url: req.url, body: new URLSearchParams(body) }); res.writeHead(200); res.end(); });
        return;
      }
      const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
      if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  console.log('Form messages in the admin panel');

  // ------------------------------------------------------------ the builder's panel
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  assert.strictEqual(await page.locator('#pageFormMethodInput').count(), 0, 'the setting is no longer in Page Settings');
  await page.evaluate(() => window.builderPreview.stackManager.setStack([
    { id: 'a', slug: 'contact-form-validated', title: 'Contact', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }
  ]));
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length >= 1, null, { timeout: 20000 });
  await page.click('#tabContentBtn');
  await page.click('#openAdminBtn');
  const af = page.frameLocator('#adminFrame');
  await af.locator('.cms-card').first().waitFor({ timeout: 30000 });
  assert(/messages go/.test(await af.locator('#cms-form-panel h2').textContent()), 'the card is in the form block\u2019s own field list');
  assert.strictEqual(await af.locator('#cms-editor .cms-card').count() > 0, true, 'under the block\u2019s other fields');
  await af.locator('#cms-form-method').selectOption('whatsapp');
  await af.locator('#cms-form-target').fill('123');
  assert(/8 to 15 digits/.test(await af.locator('#cms-form-hint').textContent()), 'a wrong number is explained');
  assert.strictEqual(await af.locator('#cms-form-target').getAttribute('aria-invalid'), 'true');
  await af.locator('#cms-form-target').fill('+371 2000 0000');
  await page.waitForFunction(() => { const p = window.builderPreview.stackManager.getState().page; return p.formMethod === 'whatsapp' && p.formTarget === '+371 2000 0000'; }, null, { timeout: 5000 });
  await af.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });
  console.log('  ✓ choosing WhatsApp in the builder panel is saved to the page (a wrong number is refused with a reason)');
  await page.click('#openAdminBtn');
  const af2 = page.frameLocator('#adminFrame');
  await af2.locator('.cms-card').first().waitFor({ timeout: 30000 });
  assert.strictEqual(await af2.locator('#cms-form-method').inputValue(), 'whatsapp');
  assert.strictEqual(await af2.locator('#cms-form-target').inputValue(), '+371 2000 0000');
  console.log('  ✓ reopening shows what was chosen');
  await af2.locator('#cms-publish').click();
  await page.waitForSelector('#adminOverlay', { state: 'hidden' });

  // ------------------------------------------------------------ the ZIP carries it as the default
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadZipBtn').click())]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  ['admin.html', 'admin.js', 'cms.js', 'form-rules.js', 'cms-content.js'].forEach((n) => assert(zip.file(n), n + ' is in the ZIP'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'form-admin-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  const content = new Function('window', fs.readFileSync(path.join(dir, 'cms-content.js'), 'utf8') + '; return window.EDV_CMS;')({});
  assert.deepStrictEqual(content.forms, { method: 'whatsapp', target: '+371 2000 0000', has: true });
  assert(/data-edv-method="whatsapp" data-edv-target="37120000000"/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')));
  console.log('  ✓ the ZIP carries the choice as the default, plus the editor and the rules file');

  // ------------------------------------------------------------ the client changes it later in admin.html
  const posts = [];
  const site = await serve(dir, posts);
  const base = `http://127.0.0.1:${site.address().port}`;
  const fast = async (c) => c.addInitScript(() => { window.__edvMinFillMs = 0; window.open = (u) => { window.__opened = (window.__opened || []).concat(u); return {}; }; });
  const submit = async (p) => {
    const f = p.locator('form[data-edv-form="message"]').first();
    await f.locator('input[name=name]').fill('Ada');
    await f.locator('input[name=email]').fill('ada@example.com');
    await f.locator('textarea[name=message]').fill('Hello, I need a website.');
    await f.locator('button[type=submit]').click();
    await p.waitForTimeout(500);
    return p.evaluate(() => window.__opened || []);
  };
  await fast(ctx);

  const live0 = await ctx.newPage();
  await live0.goto(base + '/index.html');
  assert.strictEqual((await submit(live0)).length, 1, 'as exported, the site opens WhatsApp');
  await live0.close();

  const admin = await ctx.newPage();
  admin.on('pageerror', (e) => errors.push(e.message));
  await admin.goto(base + '/admin.html');
  await admin.waitForSelector('.cms-card');
  assert.strictEqual(await admin.locator('#cms-nav-forms').isVisible(), true);
  await admin.click('#cms-nav-forms');
  assert.strictEqual(await admin.locator('#cms-form-method').inputValue(), 'whatsapp', 'the exported choice is the starting point');
  await admin.selectOption('#cms-form-method', 'custom');
  await admin.fill('#cms-form-target', 'http://evil.example/x');
  assert(await admin.locator('#cms-form-hint.cms-error').count() === 1, 'an unsafe address shows an error');
  await admin.keyboard.press('Control+s');
  assert(/Fix the form messages setting/.test(await admin.locator('#cms-toast').textContent()), 'publishing is refused while it is wrong');
  await admin.selectOption('#cms-form-method', 'netlify');
  assert.strictEqual(await admin.locator('#cms-form-target').isVisible(), false, 'Netlify needs nothing typed');
  await admin.click('#cms-publish');
  assert.strictEqual(await admin.locator('#cms-pill').textContent(), 'Published');

  const live1 = await ctx.newPage(); // same browser: it sees the editor's published copy at once
  await live1.goto(base + '/index.html');
  assert.strictEqual((await submit(live1)).length, 0, 'WhatsApp is no longer used');
  assert.strictEqual(posts.length, 1, 'the message went to the site (Netlify)');
  assert.strictEqual(posts[0].body.get('email'), 'ada@example.com');
  assert.strictEqual(posts[0].body.get('form-name'), 'form-1');
  await live1.close();
  console.log('  ✓ the client switches to Netlify in admin.html and the site follows without a new export');

  // download cms-content.js and upload it: a visitor with fresh storage gets the new choice
  await admin.selectOption('#cms-form-method', 'email');
  await admin.fill('#cms-form-target', 'owner@zephyr.example');
  await admin.click('#cms-nav-backup');
  const [file] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: 'Download cms-content.js' }).click()]);
  fs.copyFileSync(await file.path(), path.join(dir, 'cms-content.js'));
  const uploaded = new Function('window', fs.readFileSync(path.join(dir, 'cms-content.js'), 'utf8') + '; return window.EDV_CMS;')({});
  assert.deepStrictEqual(uploaded.published.__form, { method: 'email', target: 'owner@zephyr.example' });
  await admin.close();

  const visitorCtx = await browser.newContext();
  await fast(visitorCtx);
  const sent = [];
  const vis = await visitorCtx.newPage();
  await vis.route('https://formsubmit.co/**', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    sent.push(JSON.parse(route.request().postData()));
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"success":"true"}' });
  });
  await vis.goto(base + '/index.html');
  await submit(vis);
  assert.strictEqual(sent.length, 1, 'a new visitor reaches the email service');
  assert.strictEqual(sent[0].email, 'ada@example.com');
  console.log('  ✓ after uploading cms-content.js every visitor uses the new choice');

  // a hand-edited file cannot send messages somewhere unsafe
  const hostile = fs.readFileSync(path.join(dir, 'cms-content.js'), 'utf8').replace('"owner@zephyr.example"', '"http://evil.example/x"').replace('"email"', '"custom"');
  fs.writeFileSync(path.join(dir, 'cms-content.js'), hostile);
  const posts2 = posts.length;
  const evilCtx = await browser.newContext();
  await fast(evilCtx);
  const evil = await evilCtx.newPage();
  const requests = [];
  evil.on('request', (r) => { if (/evil\.example/.test(r.url())) requests.push(r.url()); });
  await evil.goto(base + '/index.html');
  assert.strictEqual((await submit(evil)).length, 0);
  assert.deepStrictEqual(requests, [], 'nothing goes to the unsafe address');
  assert.strictEqual(posts.length, posts2, 'and nothing is posted to the site');
  console.log('  ✓ an unsafe value in cms-content.js sends nothing');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  site.close();
  await browser.close();
  await srv.close();
  console.log('✅ Form messages admin flow passed!');
})().catch((e) => { console.error(e); process.exit(1); });
