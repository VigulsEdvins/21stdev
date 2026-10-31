/** The admin panel of a published site in a real browser, against the local demo (plan 2026-10-31-site-admin-panel.md): add it on the account page, put the page online
    again from the builder, sign in on the secret address, edit a text, save, see it on the public page; wrong password, a changed password, remove. Only the sign-in
    service and the storage are stand-ins; the publishing, serving and admin code is the real code. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launchBrowser } = require('../../scripts/lib/browser');
const { buildSite } = require('../../scripts/build-site.js');
const { createServer } = require('../../scripts/dev-site.js');
const demoMod = require('../../scripts/demo-publish.js');

const PW = ['Tulip', 'Garden', '7', 'Moon!'].join('-'), NEW_PW = ['Quiet', 'River', '9', 'Stone?'].join('-'), ACCOUNT_PW = ['Correct', 'Horse', '1!'].join('-'); // throw-away test values

(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'site-admin-'));
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
  console.log('Site admin panel, end to end');

  // 1. publish a page without an admin panel
  await page.goto(base + '/builder/'); await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.click('#guidedStep-blocks'); await page.evaluate(() => window.builderManager.clearStack());
  for (const k of ['banner', 'about', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-words'); await page.click('#guidedStep-get');
  await page.waitForSelector('#publishName', { state: 'visible' });
  await page.fill('#publishName', 'bakery-anna'); await page.waitForFunction(() => /is free/.test(document.getElementById('publishNameNote').textContent));
  await page.click('#publishGo');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent), null, { timeout: 60000 });
  assert(/Add an admin panel to this site/.test(await page.textContent('#publishResult')), 'the builder points to the account page');
  const siteUrl = 'http://bakery-anna.localhost:' + port + '/';
  console.log('  ✓ published without an admin panel; the builder points to the account page');

  // 2. account page: the website link is shown, the admin panel is added with a strong password
  const acct = await ctx.newPage(); acct.on('pageerror', (e) => errors.push(e.message));
  await acct.goto(base + '/account/'); await acct.waitForSelector('#ws-list .ws-item');
  assert.strictEqual(await acct.getAttribute('#ws-list .ws-item a', 'href'), siteUrl);
  await acct.click('text=Add admin panel');
  await acct.fill('.ws-form input[id$="-username"]', 'anna.baker');
  await acct.fill('.ws-form input[id$="-password"]', 'weak'); await acct.fill('.ws-form input[id$="-password2"]', 'weak'); await acct.click('.ws-form button[type="submit"]');
  assert(/stronger|easy/.test(await acct.textContent('.ws-form .error-text')), 'a weak password is refused in plain words');
  await acct.fill('.ws-form input[id$="-password"]', PW); await acct.fill('.ws-form input[id$="-password2"]', PW + 'x'); await acct.click('.ws-form button[type="submit"]');
  assert(/not the same/.test(await acct.textContent('.ws-form .error-text')));
  await acct.fill('.ws-form input[id$="-password2"]', PW); await acct.click('.ws-form button[type="submit"]');
  await acct.waitForFunction(() => /admin panel is on/i.test(document.getElementById('ws-msg').textContent));
  const adminHref = await acct.evaluate(() => [...document.querySelectorAll('#ws-list .ws-item a')].map((a) => a.href).find((h) => /\/admin\d{10}$/.test(h)));
  assert(adminHref && adminHref.startsWith('http://bakery-anna.localhost:' + port + '/admin'), 'the admin link is shown: ' + adminHref);
  assert(/Username: anna\.baker/.test(await acct.textContent('#ws-list')) && !(await acct.content()).includes(PW), 'the username is shown, never the password');
  console.log('  ✓ account page: weak and mismatched passwords refused, admin panel added, both links shown');

  // 3. nothing to edit yet: put the page online again from the builder so the editor has fields
  await page.reload(); await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.click('#guidedStep-get'); await page.waitForSelector('#publishSites li, #publishOthers summary');
  // this site was put online before the page was saved to the account, so it has no page of its own yet and waits under "other websites"; updating it from here links it to this page
  if (await page.locator('#publishOthers summary').isVisible()) await page.click('#publishOthers summary');
  await page.locator('#publishSites li, #publishOthers li', { hasText: 'bakery-anna' }).locator('[data-act="update"]').click();
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent), null, { timeout: 60000 });
  assert(!/Add an admin panel to this site/.test(await page.textContent('#publishResult')), 'no hint once the panel is on');
  const live = await ctx.newPage(); const cspHits = []; live.on('pageerror', (e) => errors.push('live: ' + e.message));
  await live.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  await live.goto(siteUrl); await live.waitForLoadState('networkidle');
  assert.deepStrictEqual(await live.evaluate(() => window.__csp), [], 'the public page, now with the content scripts, runs under its policy');
  assert(await live.evaluate(() => !!window.EDV_CMS && window.EDV_CMS.pages.length >= 1), 'the page loads its content file from the server');
  assert(!(await live.content()).includes('/admin' + adminHref.slice(-10)), 'the public page never mentions the secret address');
  console.log('  ✓ put online again: the public page loads its content, no policy violations, no secret address in it');

  // 4. the secret address: login page, wrong password, right password, editor
  const admin = await ctx.newPage(); admin.on('pageerror', (e) => errors.push('admin: ' + e.message));
  const wrong = await admin.goto(adminHref.replace(/\/admin\d{10}$/, '/admin0000000000')); assert.strictEqual(wrong.status(), 404);
  await admin.goto(adminHref); assert(await admin.locator('input[type="password"]').count() === 1 && !(await admin.content()).includes('cms-layout'), 'login page only');
  await admin.fill('input[name="username"]', 'anna.baker'); await admin.fill('input[name="password"]', 'Wrong-Passw0rd-1!'); await admin.click('button[type="submit"]');
  await admin.waitForSelector('.bad'); assert(/Wrong username or password/.test(await admin.textContent('body')));
  await admin.fill('input[name="username"]', 'Anna.Baker'); await admin.fill('input[name="password"]', PW); await admin.click('button[type="submit"]');
  await admin.waitForSelector('#cms-layout', { timeout: 15000 });
  const cookies = await ctx.cookies(adminHref); const c = cookies.find((x) => /edv_admin/.test(x.name));
  assert(c && c.httpOnly && c.sameSite === 'Strict', 'the session cookie is HttpOnly and SameSite=Strict');
  assert(!(await admin.evaluate(() => document.cookie)).includes('edv_admin'), 'script cannot read the cookie');
  console.log('  ✓ secret address: wrong address 404, wrong password refused, right password opens the editor with a protected cookie');

  // 5. edit a text, save, see it on the public page
  await admin.waitForSelector('#cms-editor .cms-field, #cms-editor textarea, #cms-editor input', { timeout: 15000 });
  const first = admin.locator('#cms-editor textarea, #cms-editor input[type="text"]').first();
  await first.fill('Fresh bread every morning'); await admin.waitForFunction(() => !document.getElementById('cms-publish').disabled);
  assert(/Save changes/.test(await admin.textContent('#cms-publish')), 'the button says Save changes on a live site');
  await admin.click('#cms-publish');
  await admin.waitForFunction(() => /^Saved$/.test(document.getElementById('cms-publish').textContent.trim()), null, { timeout: 15000 });
  const visitor = await (await browser.newContext()).newPage(); // a new visitor: the content file is cached for a minute in a browser that has it
  await visitor.goto(siteUrl); await visitor.waitForLoadState('networkidle');

  assert(/Fresh bread every morning/.test(await visitor.textContent('body')), 'visitors see the saved text');
  assert(!(await admin.evaluate(() => Object.keys(localStorage).some((k) => /edv-cms/.test(k)))), 'the live editor keeps nothing in the browser storage');
  console.log('  ✓ edited a text, pressed Save changes, a visitor sees it');

  // 6. password changed in the account ends the session
  await acct.reload(); await acct.waitForSelector('#ws-list .ws-item'); await acct.click('.ws-admin button:has-text("Change password")');
  await acct.fill('.ws-form input[id$="-password"]', NEW_PW); await acct.fill('.ws-form input[id$="-password2"]', NEW_PW); await acct.click('.ws-form button[type="submit"]');
  await acct.waitForFunction(() => /password is changed/i.test(document.getElementById('ws-msg').textContent));
  await admin.goto(adminHref); assert(await admin.locator('input[type="password"]').count() === 1, 'the old session ended');
  await admin.fill('input[name="username"]', 'anna.baker'); await admin.fill('input[name="password"]', PW); await admin.click('button[type="submit"]');
  await admin.waitForSelector('.bad'); assert(/Wrong username or password/.test(await admin.textContent('body')), 'the old password no longer works');
  await admin.fill('input[name="username"]', 'anna.baker'); await admin.fill('input[name="password"]', NEW_PW); await admin.click('button[type="submit"]');
  await admin.waitForSelector('#cms-layout');
  console.log('  ✓ changing the password in the account ends the session; the new one works');

  // 7. remove: the address becomes a plain missing page and the edits go
  await acct.click('text=Remove admin panel'); await acct.click('text=Yes, remove it');
  await acct.waitForFunction(() => /admin panel is removed/i.test(document.getElementById('ws-msg').textContent));
  assert.strictEqual((await admin.goto(adminHref)).status(), 404);
  const visitor2 = await (await browser.newContext()).newPage(); await visitor2.goto(siteUrl); await visitor2.waitForLoadState('networkidle'); assert(!/Fresh bread every morning/.test(await visitor2.textContent('body')), 'the page is back to how the builder made it');
  console.log('  ✓ removed: the address is a missing page and the page is as the builder made it');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await demo.close(); await new Promise((r) => server.close(r)); fs.rmSync(out, { recursive: true, force: true });
  console.log('Site admin e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
