/** The last menu link says "Sign in" for a visitor and "My account" once this browser holds a session, on every page that has the menu. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const PAGES = ['', 'how-it-works/', 'pricing/', 'faq/', 'contact/', 'account/'];
const link = (page) => page.locator('.nav a[href$="account/"]');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  console.log('Menu follows the sign-in');
  for (const p of PAGES) {
    await page.goto(srv.url + '/site/' + p + 'index.html');
    assert.strictEqual((await link(page).innerText()).trim(), 'Sign in', p + ': a visitor sees Sign in');
  }
  console.log('  ✓ a visitor sees "Sign in" on every page');

  await page.evaluate(() => localStorage.setItem('edvlabs.session', JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 9999999999, user: { email: 'a@b.test' } })));
  for (const p of PAGES.filter(x => x !== 'account/')) {
    await page.goto(srv.url + '/site/' + p + 'index.html');
    assert.strictEqual((await link(page).innerText()).trim(), 'My account', p + ': a signed-in person sees My account');
    assert.strictEqual(await link(page).getAttribute('href').then(h => /account\/$/.test(h)), true, p + ': still points at the account page');
  }
  console.log('  ✓ with a saved session the link says "My account" and still opens the account page');

  await page.goto(srv.url + '/site/index.html');
  await page.evaluate(() => localStorage.removeItem('edvlabs.session'));
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'edvlabs.session' })));
  assert.strictEqual((await link(page).innerText()).trim(), 'Sign in', 'signing out in another tab changes the label');
  console.log('  ✓ signing out in another tab changes the label');

  await page.evaluate(() => localStorage.setItem('edvlabs.session', '{not json'));
  await page.goto(srv.url + '/site/index.html');
  assert.strictEqual((await link(page).innerText()).trim(), 'Sign in', 'a damaged saved session counts as signed out');
  console.log('  ✓ a damaged saved session counts as signed out');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  await browser.close(); await srv.close();
  console.log('Menu sign-in label passed');
})().catch(e => { console.error(e); process.exit(1); });
