/** The builder as Cloudflare will publish it: scripts/build-site.js stages dist/, the local site server serves it with site/_headers, and the
    builder at /builder/ loads, builds a page from the staged features, and links "Ask edvlabs to do it" to the public contact page. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launchBrowser } = require('../../scripts/lib/browser');
const { buildSite } = require('../../scripts/build-site.js');
const { createServer } = require('../../scripts/dev-site.js');

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'edv-dist-'));
  buildSite({ out: dist });
  const srv = createServer({}, { dir: dist });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage();
  const errors = [], missing = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.status() + ' ' + r.url().replace(base, '')); });
  console.log('Staged builder');

  const r = await fetch(base + '/builder/');
  assert.strictEqual(r.status, 200);
  assert(/frame-ancestors 'none'/.test(r.headers.get('content-security-policy')) && /script-src 'self';/.test(r.headers.get('content-security-policy')), 'the builder page runs under the strict policy (no inline scripts); the framing rule only');
  assert.strictEqual(r.headers.get('x-robots-tag'), 'noindex');
  assert.strictEqual((await fetch(base + '/builder.html')).status, 404, 'the old address is not published');
  assert.strictEqual((await fetch(base + '/builder/features/a4-resume-previewer/index.html')).status, 200, 'features are published');
  assert.strictEqual((await fetch(base + '/builder/features/a4-resume-previewer/component.tsx')).status, 404, 'React sources are not');
  const feat = await fetch(base + '/builder/features/a4-resume-previewer/index.html');
  assert(/^frame-ancestors 'self'$/.test(feat.headers.get('content-security-policy')), 'catalogue previews may be framed by the builder itself: ' + feat.headers.get('content-security-policy'));
  console.log('  ✓ served at /builder/ with its own headers; sources stay home');

  await page.goto(base + '/builder/');
  // a catalogue card preview is a component framed by the builder: it must load, not show the browser's "blocked" page
  const framed = await page.evaluate((src) => new Promise((resolve) => { const f = document.createElement('iframe'); f.onload = () => { let ok = false; try { ok = !!f.contentDocument && f.contentDocument.body && f.contentDocument.body.children.length > 0 && !/^chrome-error:/.test(f.contentWindow.location.href); } catch (e) { ok = false; } resolve(ok); }; f.src = src; document.body.append(f); setTimeout(() => resolve(false), 8000); }), 'features/a4-resume-previewer/index.html');
  assert(framed, 'a component preview frame shows the component');
  await page.waitForSelector('#blockPicker', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  await page.click('[data-kind="banner"] .bp-add');
  await page.click('[data-kind="faq"] .bp-add');
  await page.waitForFunction(() => window.builderManager.getState().stack.length === 2);
  await page.waitForFunction(() => document.querySelectorAll('iframe').length > 0 || document.querySelector('#canvas, #previewFrame'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  assert.deepStrictEqual(missing.filter((m) => !/favicon/.test(m)), [], 'every file the builder asks for is published: ' + missing.join(', '));
  const ask = await page.$eval('#guidedAsk', (a) => a.href);
  assert.strictEqual(ask, base + '/contact/', 'Ask edvlabs to do it goes to the public contact page');
  assert.strictEqual((await fetch(ask)).status, 200);
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  console.log('  ✓ the builder loads, builds a two-block page from staged files, and links to the contact page');

  await browser.close(); srv.close(); fs.rmSync(dist, { recursive: true, force: true });
  console.log('✅ Staged builder passed!');
})().catch((e) => { console.error(e); process.exit(1); });
