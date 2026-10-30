/** The whole publish flow in a real browser against the local demo (scripts/demo-publish.js): the staged builder, a pretend account, "Put it online", and the finished site opened on its own
    <name>.localhost address, a different origin from the builder. Nothing is pretended in the page code or in the publishing code; only the sign-in service and the storage are stand-ins. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launchBrowser } = require('../../scripts/lib/browser');
const { buildSite } = require('../../scripts/build-site.js');
const { createServer } = require('../../scripts/dev-site.js');
const demoMod = require('../../scripts/demo-publish.js');

(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-publish-'));
  buildSite({ out });
  const demo = {}, env = {};
  const server = createServer(env, { dir: out, demo });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = 'http://localhost:' + port;
  Object.assign(demo, await demoMod.start({ port }));
  Object.assign(env, demo.env); // what scripts/dev-site.js does: /api/config hands the page the pretend sign-in service
  const session = await (await fetch(base + '/__auth/auth/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: demo.env.SUPABASE_ANON_KEY }, body: JSON.stringify({ email: 'anna@example.com', password: 'Correct-Horse-1!' }) })).json();
  assert(session.access_token, 'the pretend service signed the account in');

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((s) => { try { if (location.hostname === 'localhost' && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); localStorage.setItem('edvlabs.session', JSON.stringify(s)); } } catch (e) { /* storage blocked */ } }, session);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|Failed to load resource/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  console.log('Demo publish, end to end');

  await page.goto(base + '/builder/'); await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.click('#guidedStep-blocks'); await page.evaluate(() => window.builderManager.clearStack());
  for (const k of ['banner', 'about', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-words');
  await page.click('#guidedStep-get');
  await page.waitForSelector('#publishName', { state: 'visible' });
  assert(/2 paid places left/.test(await page.textContent('#publishPlaces')), await page.textContent('#publishPlaces'));
  await page.fill('#publishName', 'bakery-anna'); await page.waitForFunction(() => /is free/.test(document.getElementById('publishNameNote').textContent));
  await page.click('#publishGo');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent), null, { timeout: 60000 });
  const href = await page.getAttribute('#publishResult a', 'href');
  assert.strictEqual(href, 'http://bakery-anna.localhost:' + port + '/'); console.log('  ✓ published from the builder; the link is ' + href);

  const site = await ctx.newPage();
  const resp = await site.goto(href);
  assert.strictEqual(resp.status(), 200); assert.strictEqual(new URL(site.url()).hostname, 'bakery-anna.localhost');
  const html = await site.content();
  assert(/<html/.test(html) && (await site.locator('body *').count()) > 5, 'a real page is shown');
  assert.notStrictEqual(await site.evaluate(() => location.origin), await page.evaluate(() => location.origin), 'the site is its own origin');
  assert.strictEqual(await site.evaluate(() => localStorage.getItem('edvlabs.session')), null, 'the published site cannot see the account session');
  console.log('  ✓ the finished page opens on its own address, in its own origin, without the account session');
  const css = await site.request.get(href + 'style.css'); assert.strictEqual(css.status(), 200); assert(/text\/css/.test(css.headers()['content-type']));
  const missing = await site.request.get(href + 'nope'); assert.strictEqual(missing.status(), 404);
  console.log('  ✓ its stylesheet is served with the right type; a missing page is a 404');

  await page.click('[data-act="offline"]'); await page.waitForFunction(() => /is offline/.test(document.getElementById('publishResult').textContent));
  await site.reload(); assert(/not available/.test(await site.textContent('body')), 'offline: the address shows the plain notice');
  console.log('  ✓ take offline: the address shows the plain notice');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await demo.close(); await new Promise((r) => server.close(r)); fs.rmSync(out, { recursive: true, force: true });
  console.log('Demo publish e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
