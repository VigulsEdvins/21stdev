/** The account page against a pretend Supabase: signed-out view, errors under the right box, sign up with a repeated password and an emailed code
    (or link), sign in and out, Google and GitHub, forgot password, emailed sign-in, the honeypot, the optional Turnstile spam check.
    The page learns the Supabase address from /api/config, which the test answers. */
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
  const lastMail = async (to) => (await outbox()).filter((m) => m.to === to).pop();
  const waitText = async (sel, re) => { await page.waitForFunction(([q, src]) => new RegExp(src).test(document.querySelector(q).textContent), [sel, re.source], { timeout: 8000 }); return page.textContent(sel); };
  const asDevLink = (link) => link.replace(/^https?:\/\/[^/]+\/account\/?/, srv.url + '/site/account/index.html'); // the dev server serves the site under /site
  const config = (extra) => (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({ supabaseUrl: fake.url, anonKey: fake.anonKey }, extra || {})) });
  console.log('Account page');

  // 1. no sign-in service configured
  await page.goto(url);
  await page.waitForSelector('#a-closed:not([hidden])');
  assert(/not open yet/.test(await page.textContent('#a-closed')) && !(await vis('#a-out')), 'says so plainly when accounts are not set up');
  console.log('  ✓ without settings the page says accounts are not open yet');

  await page.route('**/api/config', config());
  await page.goto(url);
  await page.waitForSelector('#a-out:not([hidden])');
  assert(await vis('#b-google') && await vis('#b-github') && await vis('#f-pass'), 'Google, GitHub and the email form are there');
  assert(!(await vis('#p-pass2')), 'no repeat box when signing in');

  // 2. each problem under its own box
  await page.click('#p-go');
  await waitText('#p-email-err', /name@example\.com/); assert((await page.textContent('#p-pass-err')) === '');
  await page.fill('#p-email', 'anna@example.com'); await page.click('#p-go');
  await waitText('#p-pass-err', /Type your password/); assert((await page.textContent('#p-email-err')) === '');
  console.log('  ✓ problems appear under the box they are about');

  // 3. create an account: repeat password, then the emailed code
  await page.click('#t-up');
  assert(await vis('#p-pass2') && await vis('#p-hint') && !(await vis('#l-forgot')), 'create account shows the repeat box');
  await page.fill('#p-pass', 'short'); await page.fill('#p-pass2', 'short'); await page.click('#p-go');
  await waitText('#p-pass-err', /8 characters/);
  await page.fill('#p-pass', 'correct horse 1'); await page.fill('#p-pass2', 'correct horse 2'); const callsBefore = fake.calls.length; await page.click('#p-go');
  await waitText('#p-pass2-err', /not the same/); assert((await page.textContent('#p-pass-err')) === '' && fake.calls.length === callsBefore, 'a mismatch is named under the repeat box and nothing is sent');
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'p-pass2');
  await page.fill('#p-pass2', 'correct horse 1'); await page.click('#p-go');
  await page.waitForSelector('#f-code:not([hidden])');
  assert(/anna@example\.com/.test(await page.textContent('#c-intro')) && /6-digit code/.test(await page.textContent('#c-intro')), 'asks for the code and names the address');
  assert(await vis('#c-note') && /already has an account/.test(await page.textContent('#c-note')), 'after creating an account the page explains why no email arrives for an address that is already registered');
  assert.strictEqual(await page.getAttribute('#c-code', 'autocomplete'), 'one-time-code'); assert.strictEqual(await page.getAttribute('#c-code', 'inputmode'), 'numeric');
  assert(!(await vis('#a-in')), 'not signed in before the address is confirmed');
  const mail = await lastMail('anna@example.com'); assert(/^\d{6}$/.test(mail.code));
  await page.fill('#c-code', 'abcdef'); await page.click('#c-go'); await waitText('#c-code-err', /digits only/);
  await page.fill('#c-code', mail.code === '123456' ? '654321' : '123456'); await page.click('#c-go'); await waitText('#c-code-err', /wrong or has expired/);
  assert(!/otp/i.test(await page.textContent('#c-code-err')), 'no codes in the message');
  await page.fill('#c-code', mail.code.slice(0, 3) + ' ' + mail.code.slice(3)); await page.click('#c-go'); // a code pasted with a space still works
  await page.waitForSelector('#a-in:not([hidden])');
  assert.strictEqual(await page.textContent('#i-who'), 'anna@example.com'); assert(/email address/.test(await page.textContent('#i-how')) && await vis('#b-newpass'));
  console.log('  ✓ create account: repeat password, emailed code (wrong codes explained), signed in');

  // 4. the emailed link still works too, and the code does not stay in the address bar
  await page.click('#b-out'); await page.waitForSelector('#a-out:not([hidden])');
  await page.click('#t-up'); await page.fill('#p-email', 'ben@example.com'); await page.fill('#p-pass', 'another pass 22'); await page.fill('#p-pass2', 'another pass 22'); await page.click('#p-go');
  await page.waitForSelector('#f-code:not([hidden])');
  await page.goto(asDevLink((await lastMail('ben@example.com')).link));
  await page.waitForSelector('#a-in:not([hidden])'); assert.strictEqual(await page.textContent('#i-who'), 'ben@example.com');
  assert(!/code=/.test(page.url()), 'the one-time link code is removed from the address bar: ' + page.url());
  await page.reload(); await page.waitForSelector('#a-in:not([hidden])');
  console.log('  ✓ the link in the same email still signs in; the session survives a reload');

  // 5. a used link does not work again
  await page.goto(asDevLink((await lastMail('ben@example.com')).link));
  await page.waitForFunction(() => /expired|different browser/.test(document.getElementById('a-notice').textContent));
  assert(await vis('#a-in'), 'still signed in as before; the replayed link did nothing');
  console.log('  ✓ a link that was already used is refused in plain words');

  // 6. sign out; sign in, with the unconfirmed case explained
  await page.click('#b-out'); await page.waitForSelector('#a-out:not([hidden])');
  assert(/signed out/.test(await page.textContent('#a-notice')));
  await page.reload(); await page.waitForSelector('#a-out:not([hidden])');
  await page.click('#t-up'); await page.fill('#p-email', 'cara@example.com'); await page.fill('#p-pass', 'cara pass 1234'); await page.fill('#p-pass2', 'cara pass 1234'); await page.click('#p-go');
  await page.waitForSelector('#f-code:not([hidden])'); await page.click('#c-other'); await page.waitForSelector('#a-out:not([hidden])');
  await page.fill('#p-email', 'cara@example.com'); await page.fill('#p-pass', 'cara pass 1234'); await page.click('#p-go');
  await waitText('#p-email-err', /not confirmed yet/);
  await page.fill('#p-email', 'anna@example.com'); await page.fill('#p-pass', 'wrong wrong 1'); await page.click('#p-go');
  await waitText('#p-pass-err', /do not match/); assert((await page.textContent('#p-email-err')) === '');
  await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go'); await page.waitForSelector('#a-in:not([hidden])'); await page.click('#b-out');
  console.log('  ✓ sign out ends the session; unconfirmed and wrong passwords are explained under the right box');

  // 7. Google and GitHub
  await page.click('#b-google'); await page.waitForSelector('#a-in:not([hidden])', { timeout: 15000 });
  assert.strictEqual(await page.textContent('#i-who'), 'google.user@example.com'); assert(/Google/.test(await page.textContent('#i-how'))); assert(!(await vis('#b-newpass')), 'no password change for a Google account'); assert(!/code=/.test(page.url()));
  await page.click('#b-out'); await page.click('#b-github'); await page.waitForSelector('#a-in:not([hidden])', { timeout: 15000 });
  assert(/GitHub/.test(await page.textContent('#i-how'))); await page.click('#b-out');
  console.log('  ✓ Continue with Google and Continue with GitHub sign in and say which was used');

  // 8. forgot password with a code and a repeated new password
  await page.fill('#p-email', 'anna@example.com'); await page.click('#l-forgot');
  assert(await vis('#f-mail') && !(await vis('#f-pass')) && (await page.inputValue('#m-email')) === 'anna@example.com', 'email carried over');
  await page.fill('#m-email', 'bad'); await page.click('#m-go'); await waitText('#m-email-err', /name@example\.com/);
  await page.fill('#m-email', 'anna@example.com'); await page.click('#m-go'); await page.waitForSelector('#f-code:not([hidden])');
  const rec = await lastMail('anna@example.com'); assert.strictEqual(rec.kind, 'recovery');
  await page.fill('#c-code', rec.code); await page.click('#c-go'); await page.waitForSelector('#f-new:not([hidden])');
  await page.fill('#n-pass', 'a brand new pass 9'); await page.fill('#n-pass2', 'a different one 9'); await page.click('#f-new button[type=submit]');
  await waitText('#n-pass2-err', /not the same/);
  await page.fill('#n-pass2', 'a brand new pass 9'); await page.click('#f-new button[type=submit]');
  await page.waitForFunction(() => /password is changed/.test(document.getElementById('a-notice').textContent));
  await page.click('#b-out'); await page.fill('#p-email', 'anna@example.com'); await page.fill('#p-pass', 'correct horse 1'); await page.click('#p-go');
  await waitText('#p-pass-err', /do not match/); // the old password no longer works
  await page.fill('#p-pass', 'a brand new pass 9'); await page.click('#p-go'); await page.waitForSelector('#a-in:not([hidden])');
  console.log('  ✓ forgot password: code, new password typed twice, old one stops working');

  // 9. emailed sign-in with a code, and asking for a new code
  await page.click('#b-out'); await page.fill('#p-email', 'dan@example.com'); await page.click('#l-link'); await page.click('#m-go');
  await page.waitForSelector('#f-code:not([hidden])');
  await page.click('#c-resend'); await waitText('#a-notice', /wait half a minute/); // one a minute: the page does not hammer the service
  const dan = await lastMail('dan@example.com');
  await page.fill('#c-code', dan.code); await page.click('#c-go'); await page.waitForSelector('#a-in:not([hidden])'); assert.strictEqual(await page.textContent('#i-who'), 'dan@example.com');
  console.log('  ✓ emailed sign-in code creates and signs in an account');

  // 10. the honeypot: a filled hidden box looks like success and sends nothing
  await page.click('#b-out'); await page.waitForSelector('#a-out:not([hidden])');
  await page.click('#t-up'); await page.fill('#p-email', 'bot@example.com'); await page.fill('#p-pass', 'bot password 1'); await page.fill('#p-pass2', 'bot password 1');
  await page.evaluate(() => { document.getElementById('p-trap').value = 'http://spam.example'; });
  const before = fake.calls.length; await page.click('#p-go'); await page.waitForSelector('#f-code:not([hidden])');
  assert.strictEqual(fake.calls.length, before, 'nothing was sent to the service'); assert(!fake.users.has('bot@example.com'), 'no account was made');
  assert(!(await vis('#p-trap')), 'the trap box is not visible to people'); assert.strictEqual(await page.getAttribute('#p-trap', 'tabindex'), '-1');
  console.log('  ✓ honeypot: a bot gets a believable answer, the service gets nothing');

  assert(!fake.calls.some((c) => /password=|access_token=|refresh_token=|token=\d/.test(c)), 'no secret or code ever travels in a web address');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await page.close();

  // 11. Turnstile spam check, switched on by a site key: the token goes with every call Supabase guards
  const guarded = await start({ confirmEmails: true, requireCaptcha: true });
  const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
  await p2.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: guarded.url, anonKey: guarded.anonKey, turnstileSiteKey: 'site-key-test' }) }));
  // a stand-in for Cloudflare's script: renders at once and hands back a token
  await p2.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "window.turnstile={n:0,render:function(el,o){el.setAttribute('data-widget','1');setTimeout(function(){o.callback('" + guarded.captchaToken + "')},50);return 'w'+(++this.n)},reset:function(){}};" }));
  await p2.goto(url); await p2.waitForSelector('#a-out:not([hidden])');
  await p2.waitForSelector('#p-captcha[data-widget]', { state: 'attached' }); assert(await p2.evaluate(() => !document.getElementById('p-captcha').hidden), 'the spam check is shown when a site key is configured');
  await p2.click('#t-up'); await p2.fill('#p-email', 'turn@example.com'); await p2.fill('#p-pass', 'turnstile pass 1'); await p2.fill('#p-pass2', 'turnstile pass 1');
  await p2.waitForTimeout(200); await p2.click('#p-go'); await p2.waitForSelector('#f-code:not([hidden])', { timeout: 8000 });
  assert(guarded.users.has('turn@example.com'), 'sign up went through with the token');
  await p2.click('#c-other'); await p2.waitForSelector('#a-out:not([hidden])');
  console.log('  ✓ with a site key the spam check shows and its token is sent; Supabase accepts it');
  assert.deepStrictEqual(errs2, [], errs2.join(' | '));

  // and without the token the service refuses, in plain words (a bot that skips the page and calls the service directly)
  const direct = await fetch(guarded.url + '/auth/v1/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: guarded.anonKey }, body: JSON.stringify({ email: 'direct@example.com', password: 'a long enough pass 1' }) });
  assert.strictEqual(direct.status, 400); assert(!guarded.users.has('direct@example.com'), 'the service itself refuses a direct call without the token');
  await guarded.close();
  console.log('  ✓ without the token the service refuses, so skipping the page does not help');

  await browser.close(); await fake.close(); srv.close && srv.close();
  console.log('✅ Account page passed!');
})().catch((e) => { console.error(e); process.exit(1); });
