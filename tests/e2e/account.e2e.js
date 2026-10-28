/** The account page against a pretend Supabase: signed-out view, errors under the right box, sign up with the emailed link, sign in and out,
    Google, forgot password, a replayed link. The page learns the Supabase address from /api/config, which the test answers. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const { start } = require('../lib/fake-supabase.js');

(async () => {
  const srv = await startServer();
  const fake = await start({ confirmEmails: true });
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  const url = srv.url + '/site/account/index.html';
  const vis = (s) => page.locator(s).first().isVisible();
  const outbox = async () => (await fetch(fake.url + '/__outbox')).json();
  const waitText = async (sel, re) => { await page.waitForFunction(([q, src]) => new RegExp(src).test(document.querySelector(q).textContent), [sel, re.source], { timeout: 8000 }); return page.textContent(sel); };
  const lastLink = async (to) => (await outbox()).filter((m) => m.to === to).pop().link;
  console.log('Account page');

  // 1. no sign-in service configured
  await page.goto(url);
  await page.waitForSelector('#a-closed:not([hidden])');
  assert(/not open yet/.test(await page.textContent('#a-closed')) && !(await vis('#a-out')), 'says so plainly when accounts are not set up');
  console.log('  ✓ without settings the page says accounts are not open yet');

  await page.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: fake.url, anonKey: fake.anonKey }) }));
  await page.goto(url);
  await page.waitForSelector('#a-out:not([hidden])');
  assert(await vis('#b-google') && await vis('#b-github') && await vis('#f-pass'), 'Google, GitHub and the email form are there');
  assert((await page.textContent('#b-google')).includes('Continue with Google') && (await page.textContent('#b-github')).includes('Continue with GitHub'));

  // 2. each problem under its own box
  await page.click('#p-go');
  await waitText('#p-email-err', /name@example\.com/); assert((await page.textContent('#p-pass-err')) === '', 'a bad email is named under the email box only');
  assert(await page.evaluate(() => document.activeElement.id) === 'p-email', 'focus goes to the box with the problem');
  await page.fill('#p-email', 'anna@example.com'); await page.click('#p-go');
  await waitText('#p-pass-err', /Type your password/); assert((await page.textContent('#p-email-err')) === '', 'a missing password is named under the password box only');
  console.log('  ✓ problems appear under the box they are about');

  // 3. create an account: asks to check email, nothing is signed in yet
  await page.click('#t-up');
  assert.strictEqual(await page.getAttribute('#p-pass', 'autocomplete'), 'new-password'); assert(await vis('#p-hint') && !(await vis('#l-forgot')));
  await page.fill('#p-pass', 'short'); await page.click('#p-go');
  await waitText('#p-pass-err', /8 characters/);
  await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go');
  await page.waitForFunction(() => /We sent a link to anna@example.com/.test(document.getElementById('a-notice').textContent));
  assert(!(await vis('#a-in')), 'not signed in before the address is confirmed');
  // signing in before confirming says why
  await page.click('#t-in'); await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go');
  await waitText('#p-email-err', /not confirmed yet/);
  console.log('  ✓ create account asks to check the email, and does not sign in early');

  // 4. the emailed link signs in, and the code does not stay in the address bar
  const link = await lastLink('anna@example.com');
  const target = link.replace(/^https?:\/\/[^/]+\/account\/?/, srv.url + '/site/account/index.html'); // the dev server serves the site under /site
  await page.goto(target);
  await page.waitForSelector('#a-in:not([hidden])');
  assert.strictEqual(await page.textContent('#i-who'), 'anna@example.com'); assert(/email address/.test(await page.textContent('#i-how')) && await vis('#b-newpass'));
  assert(!/code=/.test(page.url()), 'the one-time code is removed from the address bar: ' + page.url());
  await page.reload(); await page.waitForSelector('#a-in:not([hidden])');
  console.log('  ✓ the emailed link signs in; the code leaves the address bar; the session survives a reload');

  // 5. a used link does not work again
  await page.goto(target);
  await page.waitForFunction(() => /expired|different browser/.test(document.getElementById('a-notice').textContent));
  assert(await vis('#a-in'), 'still signed in as before; the replayed link did nothing');
  console.log('  ✓ a link that was already used is refused in plain words');

  // 6. sign out
  await page.click('#b-out');
  await page.waitForSelector('#a-out:not([hidden])');
  assert(/signed out/.test(await page.textContent('#a-notice')));
  await page.reload(); await page.waitForSelector('#a-out:not([hidden])');
  console.log('  ✓ sign out ends the session');

  // 7. sign in: wrong password under the password box, right password works
  await page.fill('#p-email', 'anna@example.com'); await page.fill('#p-pass', 'wrong wrong 1'); await page.click('#p-go');
  await waitText('#p-pass-err', /do not match/); assert((await page.textContent('#p-email-err')) === '');
  await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go');
  await page.waitForSelector('#a-in:not([hidden])');
  await page.click('#b-out');
  console.log('  ✓ wrong password is explained under the password box; the right one signs in');

  // 8. Google
  await page.click('#b-google');
  await page.waitForSelector('#a-in:not([hidden])', { timeout: 15000 });
  assert.strictEqual(await page.textContent('#i-who'), 'google.user@example.com'); assert(/Google/.test(await page.textContent('#i-how')));
  assert(!(await vis('#b-newpass')), 'no password change for a Google account');
  assert(!/code=/.test(page.url()));
  await page.click('#b-out');
  await page.click('#b-github'); await page.waitForSelector('#a-in:not([hidden])', { timeout: 15000 });
  assert(/GitHub/.test(await page.textContent('#i-how'))); await page.click('#b-out');
  console.log('  ✓ Continue with Google and Continue with GitHub sign in and say which was used');

  // 9. forgot password
  await page.fill('#p-email', 'anna@example.com'); await page.click('#l-forgot');
  assert(await vis('#f-mail') && !(await vis('#f-pass')) && (await page.inputValue('#m-email')) === 'anna@example.com', 'email carried over');
  await page.fill('#m-email', 'bad'); await page.click('#m-go'); await waitText('#m-email-err', /name@example\.com/);
  await page.fill('#m-email', 'anna@example.com'); await page.click('#m-go');
  await page.waitForFunction(() => /If there is an account for anna@example.com/.test(document.getElementById('a-notice').textContent));
  const rec = (await lastLink('anna@example.com')).replace(/^https?:\/\/[^/]+\/account\/?/, srv.url + '/site/account/index.html');
  await page.goto(rec);
  await page.waitForSelector('#f-new:not([hidden])');
  await page.fill('#n-pass', 'tiny'); await page.click('#f-new button[type=submit]');
  await waitText('#n-pass-err', /8 characters/);
  await page.fill('#n-pass', 'a brand new pass 9'); await page.click('#f-new button[type=submit]');
  await page.waitForFunction(() => /password is changed/.test(document.getElementById('a-notice').textContent));
  await page.click('#b-out');
  await page.fill('#p-email', 'anna@example.com'); await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go');
  await waitText('#p-pass-err', /do not match/); // the old password no longer works
  await page.fill('#p-pass', 'a brand new pass 9'); await page.click('#p-go');
  await page.waitForSelector('#a-in:not([hidden])');
  console.log('  ✓ forgot password: link, new password, old one stops working');

  // 10. magic link
  await page.click('#b-out');
  await page.fill('#p-email', 'carl@example.com'); await page.click('#l-link');
  await page.click('#m-go');
  await page.waitForFunction(() => /We sent a link to carl@example.com/.test(document.getElementById('a-notice').textContent));
  await page.goto((await lastLink('carl@example.com')).replace(/^https?:\/\/[^/]+\/account\/?/, srv.url + '/site/account/index.html'));
  await page.waitForSelector('#a-in:not([hidden])'); assert.strictEqual(await page.textContent('#i-who'), 'carl@example.com');
  console.log('  ✓ emailed sign-in link creates and signs in an account');

  assert(!fake.calls.some((c) => /password=|access_token=|refresh_token=/.test(c)), 'no secret ever travels in a web address');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await fake.close(); await srv.close && srv.close();
  console.log('✅ Account page passed!');
})().catch((e) => { console.error(e); process.exit(1); });
