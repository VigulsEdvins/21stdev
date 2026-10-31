/** A customer's own domain in a real browser, against the local demo (plan 2026-10-31-custom-domain.md): put a page online, add a domain on the account page, see the
    record to add and the waiting state, see it confirmed (the demo's pretend Cloudflare confirms after a few seconds), check that the domain shows the page and the edvlabs
    address redirects to it, then remove the domain. Only the sign-in service, the storage and Cloudflare are stand-ins; the publishing, serving and domain code is the real code. */
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { launchBrowser } = require('../../scripts/lib/browser');
const { buildSite } = require('../../scripts/build-site.js');
const { createServer } = require('../../scripts/dev-site.js');
const demoMod = require('../../scripts/demo-publish.js');

const ACCOUNT_PW = ['Correct', 'Horse', '1!'].join('-'); // throw-away test value

/** One request to the local server with another Host header: what a visitor of a customer's domain, or of the edvlabs address, sends. */
const asHost = (port, host, pathname) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: pathname || '/', headers: { Host: host } }, (res) => { let body = ''; res.on('data', (c) => { body += c; }); res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location, body })); }).on('error', reject);
});

(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'site-domain-'));
  buildSite({ out });
  const demo = {}, env = {};
  const server = createServer(env, { dir: out, demo });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = 'http://localhost:' + port;
  Object.assign(demo, await demoMod.start({ port }));
  Object.assign(env, demo.env);
  const session = await (await fetch(base + '/__auth/auth/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: demo.env.SUPABASE_ANON_KEY }, body: JSON.stringify({ email: 'anna@example.com', password: ACCOUNT_PW }) })).json();
  assert(session.access_token);

  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((s) => { try { if (location.hostname === 'localhost' && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); localStorage.setItem('edvlabs.session', JSON.stringify(s)); } } catch (e) { /* storage blocked */ } }, session);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|Failed to load resource/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  console.log('Own domain, end to end');

  // 1. a page online at its edvlabs address
  await page.goto(base + '/builder/'); await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.click('#guidedStep-blocks'); await page.evaluate(() => window.builderManager.clearStack());
  for (const k of ['banner', 'about', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-words'); await page.click('#guidedStep-get');
  await page.waitForSelector('#publishName', { state: 'visible' });
  await page.fill('#publishName', 'bakery-anna'); await page.waitForFunction(() => /is free/.test(document.getElementById('publishNameNote').textContent));
  await page.click('#publishGo');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent), null, { timeout: 60000 });
  const hostOld = 'bakery-anna.localhost:' + port, hostNew = 'www.bakery-anna.example';
  assert.strictEqual((await asHost(port, hostOld)).status, 200);
  console.log('  ✓ published at its edvlabs address');

  // 2. the account page offers a domain; a bare domain and a wrong address are refused in plain words
  const acct = await ctx.newPage(); acct.on('pageerror', (e) => errors.push(e.message));
  await acct.goto(base + '/account/'); await acct.waitForSelector('#ws-list .ws-item');
  await acct.click('text=Use my own domain');
  await acct.fill('.ws-form input[id$="-hostname"]', 'bakery-anna.example'); await acct.click('.ws-form button[type="submit"]');
  await acct.waitForFunction(() => /bare domain/.test(document.querySelector('.ws-form .error-text').textContent));
  await acct.fill('.ws-form input[id$="-hostname"]', 'https://www.bakery-anna.example/x'); await acct.click('.ws-form button[type="submit"]');
  await acct.waitForFunction(() => /only the host name/i.test(document.querySelector('.ws-form .error-text').textContent)); // an address with a path is refused
  await acct.fill('.ws-form input[id$="-hostname"]', hostNew); await acct.click('.ws-form button[type="submit"]');
  await acct.waitForSelector('.ws-domain code');
  const shown = await acct.textContent('.ws-domain');
  assert(/CNAME/.test(shown) && shown.includes(hostNew) && /sites\.localhost/.test(shown), 'the record to add is shown: ' + shown);
  assert((await asHost(port, hostOld)).status === 200, 'still served on the edvlabs address while waiting');
  console.log('  ✓ domain added: refused when wrong, record shown, edvlabs address still serves');

  // 3. the pretend Cloudflare confirms after a few seconds; the page notices
  await acct.waitForTimeout(4500);
  await acct.click('text=Check now');
  await acct.waitForFunction(() => /domain is working/i.test(document.getElementById('ws-msg').textContent), null, { timeout: 15000 });
  assert.strictEqual(await acct.getAttribute('#ws-list .ws-item a', 'href'), 'https://' + hostNew + '/', 'the website link now shows the domain');
  const ownPage = await asHost(port, hostNew); assert.strictEqual(ownPage.status, 200); assert(/Fresh bread|<html/i.test(ownPage.body));
  const old = await asHost(port, hostOld, '/about?x=1'); assert.strictEqual(old.status, 301); assert.strictEqual(old.location, 'https://' + hostNew + '/about?x=1');
  console.log('  ✓ confirmed: the domain serves the page, the edvlabs address redirects to it, the account page shows the domain');

  // 4. remove it
  await acct.click('text=Remove domain'); await acct.click('text=Yes, remove it');
  await acct.waitForFunction(() => /domain is removed/i.test(document.getElementById('ws-msg').textContent));
  assert.strictEqual((await asHost(port, hostOld)).status, 200, 'the edvlabs address serves, no redirect'); // an unknown host showing no site is covered by tests/test-site-domain.js; the dev server falls back to the main site there
  assert.strictEqual(await acct.getAttribute('#ws-list .ws-item a', 'href'), 'http://' + hostOld + '/');
  console.log('  ✓ removed: the edvlabs address serves again');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await demo.close(); await new Promise((r) => server.close(r)); fs.rmSync(out, { recursive: true, force: true });
  console.log('Own domain e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
