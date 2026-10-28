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
  await page.route('**/site/**', async (route) => {
    const res = await route.fetch(); const headers = { ...res.headers(), 'content-security-policy': csp };
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
    if (p === 'contact/') { await page.click('button[type=submit]'); assert((await page.innerText('#k-err')).includes('email')); }
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('400 20px Gloock'); });
    assert(fonts, p + ': fonts load under the policy');
  }
  const { SLUGS } = require('../../scripts/build-examples.js');
  for (const slug of SLUGS) {
    await page.goto(srv.url + '/site/examples/' + slug + '/index.html'); await page.waitForLoadState('networkidle');
    assert(await page.isVisible('.edv-sample-bar'), slug + ': the sample bar shows under the policy');
    assert(await page.evaluate(() => document.querySelector('meta[name=robots]').content.includes('noindex')), slug + ': noindex');
  }
  assert.deepStrictEqual(violations, [], 'no policy violations: ' + violations.join(' | '));
  assert.deepStrictEqual(errors, []);
  console.log('  ✓ six pages and six full sample pages work under the policy with zero violations');
  await browser.close(); srv.close && srv.close();
  console.log('CSP passed');
})().catch(e => { console.error(e); process.exit(1); });
