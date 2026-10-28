/** Loads every public page under the real policy from site/_headers and fails on any violation. Also proves the header check catches a weakened policy. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const H = require('../../scripts/check-headers.js');
const { start: startFake } = require('../lib/fake-supabase.js');

(async () => {
  const rules = H.parseHeaders(fs.readFileSync(path.join(__dirname, '../../site/_headers'), 'utf8'));
  const csp = rules['/*']['content-security-policy'].replace('; upgrade-insecure-requests', ''); // the test server is plain http
  assert.deepStrictEqual(H.problems(rules['/*']), []);
  assert(H.problems({ ...rules['/*'], 'content-security-policy': csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") }).length, 'a weakened policy is caught');
  assert(H.problems({ ...rules['/*'], 'strict-transport-security': undefined }).some(e => e.includes('missing')), 'a missing header is caught');

  const fake = await startFake({ confirmEmails: false });
  const srv = await startServer(); const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const accountCsp = H.effective(rules, '/account/*')['content-security-policy'].replace('; upgrade-insecure-requests', '').replace(/https:\/\/[a-z0-9]+\.supabase\.co/, fake.url); // the same policy, with the pretend service in place of the real address
  assert.deepStrictEqual(H.problems(H.effective(rules, '/account/*')), []);
  const policyFor = (url) => { const m = /\/site\/examples\/(yearbook|arena|roster)\//.exec(url); return m ? H.effective(rules, '/examples/' + m[1] + '/*')['content-security-policy'].replace('; upgrade-insecure-requests', '') : csp; };
  assert.deepStrictEqual(H.problems(H.effective(rules, '/examples/yearbook/*'), { strictStyles: false, frameAncestors: ["'self'"] }), []);
  assert(H.problems(Object.assign({}, rules['/*'], { 'content-security-policy': H.effective(rules, '/examples/yearbook/*')['content-security-policy'].replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") }), { strictStyles: false, frameAncestors: ["'self'"] }).length, 'a weakened whole-website policy is caught');
  await page.route('**/site/**', async (route) => {
    const res = await route.fetch(); const headers = { ...res.headers(), 'content-security-policy': policyFor(route.request().url()) };
    await route.fulfill({ response: res, headers });
  });
  const violations = [];
  await page.exposeFunction('reportViolation', (v) => violations.push(v));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.reportViolation(`${e.violatedDirective} ${e.blockedURI}`)));
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  console.log('Content Security Policy');
  for (const p of ['', 'how-it-works/', 'pricing/', 'faq/', 'contact/', 'start/']) {
    await page.goto(srv.url + '/site/' + p + 'index.html'); await page.waitForLoadState('networkidle');
    if (p === 'pricing/') { await page.fill('#calc-blocks', '8'); await page.check('#calc-editor'); assert((await page.textContent('#calc-self')).startsWith('€')); }
    if (p === 'start/') { await page.getByText('My business').click(); assert.strictEqual(await page.locator('.option input:checked').count(), 1); await page.click('text=Next'); await page.waitForSelector('text=Question 2 of 10'); }
    if (p === 'contact/') { await page.click('button[type=submit]'); assert((await page.innerText('#k-err-email')).includes('email')); }
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('400 20px Gloock'); });
    assert(fonts, p + ': fonts load under the policy');
  }
  const { SLUGS } = require('../../scripts/build-examples.js');
  for (const slug of SLUGS) {
    await page.goto(srv.url + '/site/examples/' + slug + '/index.html'); await page.waitForLoadState('networkidle');
    assert(await page.isVisible('.edv-sample-bar'), slug + ': the sample bar shows under the policy');
    assert(await page.evaluate(() => document.querySelector('meta[name=robots]').content.includes('noindex')), slug + ': noindex');
  }
  for (const name of ['yearbook', 'arena', 'roster']) {
    for (const f of ['index', 'admin']) {
      await page.goto(srv.url + '/site/examples/' + name + '/' + f + '.html'); await page.waitForLoadState('load'); await page.waitForTimeout(1500);
      assert((await page.title()).length > 3, name + ' ' + f + ' has a title');
    }
    await page.goto(srv.url + '/site/examples/' + name + '/index.html'); await page.waitForTimeout(500);
    assert(await page.isVisible('.edv-sample-bar'), name + ': the sample bar shows');
  }
  // The account page under its own policy, served through a real proxy that adds the header (a page faked by the test tool would count as an
  // unknown network and could not call the local stand-in for Supabase). It loads, talks to the sign-in service, signs up and goes off to Google and back.
  const http = require('http');
  const proxy = http.createServer((req, res) => {
    const up = http.request(srv.url + req.url, { method: req.method, headers: Object.assign({}, req.headers, { host: new URL(srv.url).host }) }, (r) => { res.writeHead(r.statusCode, Object.assign({}, r.headers, { 'content-security-policy': accountCsp })); r.pipe(res); });
    up.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(up);
  });
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
  const proxied = 'http://127.0.0.1:' + proxy.address().port;
  const accountPage = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const accountViolations = [];
  await accountPage.exposeFunction('reportAccount', (v) => accountViolations.push(v));
  await accountPage.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.reportAccount(`${e.violatedDirective} ${e.blockedURI}`)));
  await accountPage.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: fake.url, anonKey: fake.anonKey }) }));
  await accountPage.goto(proxied + '/site/account/index.html'); await accountPage.waitForSelector('#a-out:not([hidden])');
  await accountPage.click('#t-up'); await accountPage.fill('#p-email', 'csp@example.com'); await accountPage.fill('#p-pass', 'A-Long-Enough-Pass-1!'); await accountPage.fill('#p-pass2', 'A-Long-Enough-Pass-1!'); await accountPage.click('#p-go');
  await accountPage.waitForSelector('#a-in:not([hidden])'); await accountPage.click('#b-out'); await accountPage.waitForSelector('#a-out:not([hidden])');
  await accountPage.click('#b-google'); await accountPage.waitForSelector('#a-in:not([hidden])', { timeout: 15000 });
  assert(/google/i.test(await accountPage.textContent('#i-how')), 'Google sign-in completes under the policy');
  assert.deepStrictEqual(accountViolations, [], 'no policy violations on the account page: ' + accountViolations.join(' | '));
  proxy.close();
  assert.deepStrictEqual(violations, [], 'no policy violations: ' + violations.join(' | '));
  assert.deepStrictEqual(errors, []);
  console.log('  ✓ six pages, six sample pages, three whole websites and the account page (signing up and Google sign-in included) work under their policies with zero violations');
  await browser.close(); await fake.close(); srv.close && srv.close();
  console.log('CSP passed');
})().catch(e => { console.error(e); process.exit(1); });
