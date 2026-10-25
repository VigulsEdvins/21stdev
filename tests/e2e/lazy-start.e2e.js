/** Heavy one-screen sections in an export start only when they are about to scroll into view. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const builder = await (await browser.newContext()).newPage();
  await builder.goto(srv.url + '/builder.html');
  await builder.waitForFunction(() => window.Assembler);
  const bundle = await builder.evaluate(() => {
    const sections = [
      { id: 'a', slug: 'tall', html: '<div style="height:3000px">top</div>', css: '', js: '' },
      { id: 'b', slug: 'heavy-one', html: '<div id="root-b" style="height:600px">B</div>', css: '', js: "window.__ran = (window.__ran || 0) + 1; document.addEventListener('DOMContentLoaded', function () { window.__dcl = true; }); window.addEventListener('load', function () { window.__load = true; });" },
      { id: 'c', slug: 'eager-one', html: '<div>C</div>', css: '', js: 'window.__eager = true;' }
    ];
    return window.Assembler.generateExportBundle(sections, 'midnight-dark', {}, { lazyMap: { 'heavy-one': true } });
  });
  assert(bundle['script.js'].includes('__lazySection(') && bundle['script.js'].includes('window.__eager = true'), 'lazy wrapper only around the flagged section');
  assert.strictEqual(await builder.evaluate(() => window.Assembler.generateExportBundle([{ id: 'a', slug: 'x', html: '<p>x</p>', css: '', js: 'window.q=1' }], 'midnight-dark', {}, {})['script.js'].includes('__lazySection')), false, 'no runtime when nothing is lazy');
  console.log('Lazy start');
  console.log('  ✓ bundle wraps only flagged sections');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lazy-'));
  Object.entries(bundle).forEach(([n, c]) => { if (typeof c === 'string') fs.writeFileSync(path.join(dir, n), c); });
  const site = http.createServer((q, r) => {
    const f = path.join(dir, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
    if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' });
    fs.createReadStream(f).pipe(r);
  });
  await new Promise(r => site.listen(0, '127.0.0.1', r));
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${site.address().port}/`);
  await page.waitForTimeout(400);
  assert.strictEqual(await page.evaluate(() => window.__eager), true, 'the eager section starts at once');
  assert.strictEqual(await page.evaluate(() => window.__ran), undefined, 'the heavy section has not started while far away');
  console.log('  ✓ far-away heavy section waits');
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForFunction(() => window.__ran === 1, null, { timeout: 5000 });
  assert.strictEqual(await page.evaluate(() => [window.__dcl, window.__load]).then(a => a.join()), 'true,true', 'page-load listeners still run');
  console.log('  ✓ starts once it is near, load listeners still fire');
  assert.deepStrictEqual(errors, []);
  fs.rmSync(dir, { recursive: true, force: true });
  await new Promise(r => site.close(r));
  await browser.close(); await srv.close();
  console.log('✅ Lazy start flow passed!');
})().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
