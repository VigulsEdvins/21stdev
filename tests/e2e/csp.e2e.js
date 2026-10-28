/** Loads every public page under the real policy from site/_headers and fails on any violation. Also proves the header check catches a weakened policy. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const H = require('../../scripts/check-headers.js');

(async () => {
  const rules = H.parseHeaders(fs.readFileSync(path.join(__dirname, '../../site/_headers'), 'utf8'));
  const csp = rules['/*']['content-security-policy'].replace('; upgrade-insecure-requests', ''); // the test server is plain http
  assert.deepStrictEqual(H.problems(rules['/*']), []);
  assert(H.problems({ ...rules['/*'], 'content-security-policy': csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") }).length, 'a weakened policy is caught');
  assert(H.problems({ ...rules['/*'], 'strict-transport-security': undefined }).some(e => e.includes('missing')), 'a missing header is caught');

  const srv = await startServer(); const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
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
  assert.deepStrictEqual(violations, [], 'no policy violations: ' + violations.join(' | '));
  assert.deepStrictEqual(errors, []);
  console.log('  ✓ six pages, six sample pages and three whole websites (with their admin pages) work under their policies with zero violations');
  await browser.close(); srv.close && srv.close();
  console.log('CSP passed');
})().catch(e => { console.error(e); process.exit(1); });
