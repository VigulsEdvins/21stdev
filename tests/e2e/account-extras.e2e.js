/** The signed-in account page against a pretend Supabase: My pages (list, rename, delete with undo, other people's pages never shown),
    My answers, change email (only for email accounts), delete account (needs the address typed, removes everything), and that the
    browser cannot mark its own page as paid. */
const assert = require('assert');
const crypto = require('crypto');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const { start } = require('../lib/fake-supabase.js');

(async () => {
  const srv = await startServer();
  const fake = await start({ confirmEmails: false });
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  await page.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: fake.url, anonKey: fake.anonKey }) }));
  const url = srv.url + '/site/account/index.html';
  const vis = (s) => page.locator(s).first().isVisible();
  const text = (s) => page.locator(s).first().innerText();

  /** A person with a ready session, made straight in the pretend service (the sign-in paths have their own test). */
  function seed(email, provider) {
    const u = { id: crypto.randomUUID(), email, provider, password: 'x', confirmed: true };
    fake.users.set(email, u);
    const access = 'access-' + crypto.randomUUID(), refresh = 'refresh-' + crypto.randomUUID();
    fake.sessions.set(access, email); fake.refresh.set(refresh, email);
    return { u, session: { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: u.id, email } } };
  }
  const open = async (who) => {
    await page.goto(url);
    await page.evaluate((s) => localStorage.setItem('edvlabs.session', JSON.stringify(s)), who.session);
    await page.goto(url);
    await page.waitForSelector('#a-in:not([hidden])');
    await page.waitForFunction(() => !!document.querySelector('#pg-list li, #pg-empty:not([hidden]), #pg-msg .alert'));
  };
  console.log('Account page, signed in');

  // 1. nothing saved yet
  const anna = seed('anna@example.com', 'email'), ben = seed('ben@example.com', 'email');
  await open(anna);
  assert(await vis('#pg-empty') && (await page.locator('#pg-list li').count()) === 0, 'an empty account says so');
  assert(/not answered/.test(await text('#an-text')), 'no answers yet');
  console.log('  ✓ a new account shows no pages and no answers');

  // 2. pages and answers; other people's pages never appear; names are text, never markup
  fake.addProject('anna@example.com', 'Bakery <b>page</b>', { updated_at: '2026-10-20T10:00:00Z' });
  fake.addProject('anna@example.com', 'Sold site', { status: 'paid', updated_at: '2026-10-25T10:00:00Z' });
  fake.addProject('ben@example.com', 'Ben secret', {});
  await page.evaluate(() => localStorage.setItem('edvlabs.brief_v1', JSON.stringify({ answers: { a: 1, b: 2, c: 3 } })));
  await open(anna);
  const names = await page.locator('#pg-list .pg-name').allInnerTexts();
  assert.deepStrictEqual(names, ['Sold site', 'Bakery <b>page</b>'], 'newest first, own pages only, markup shown as words: ' + names.join(' | '));
  assert.strictEqual(await page.locator('#pg-list b').count(), 0, 'a page name never becomes markup');
  assert.strictEqual(await page.getAttribute('#pg-list li:first-child .pg-tag', 'data-status'), 'paid');
  assert(/Edited 25 October 2026/.test(await text('#pg-list li:first-child')), 'edit date in words');
  assert.strictEqual(await page.getAttribute('#pg-list li:first-child a:has-text("Open")', 'href').then((h) => /^\/builder\/\?project=[0-9a-f-]{36}$/.test(h)), true, 'Open goes to the builder with the page id');
  assert(/answered 3 questions/.test(await text('#an-text')), 'answers counted');
  assert(!(await page.content()).includes('Ben secret'), "someone else's page is not on the page");
  console.log('  ✓ my pages lists only my pages, newest first, names as plain text; my answers counts them');

  // 3. rename
  await page.click('#pg-list li:nth-child(2) button:has-text("Rename")');
  await page.fill('#pg-list li:nth-child(2) input', 'Bakery home page'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Bakery home page/.test(document.getElementById('pg-list').textContent));
  assert([...fake.projects.values()].some((p) => p.name === 'Bakery home page'), 'the new name reached the account');
  await page.click('#pg-list li:nth-child(2) button:has-text("Rename")'); await page.fill('#pg-list li:nth-child(2) input', '   ');
  await page.click('#pg-list li:nth-child(2) button:has-text("Save")'); await page.waitForFunction(() => /Give the page a name/.test(document.getElementById('pg-msg').textContent));
  await page.click('#pg-list li:nth-child(2) button:has-text("Cancel")');
  console.log('  ✓ rename works, an empty name is refused in plain words');

  // 4. delete with undo
  await page.click('#pg-list li:nth-child(2) button:has-text("Delete")');
  await page.waitForFunction(() => document.querySelectorAll('#pg-list li').length === 1);
  assert(/stays for 30 days/.test(await text('#pg-msg')), 'says it can be brought back');
  await page.click('#pg-msg button:has-text("Undo")');
  await page.waitForFunction(() => document.querySelectorAll('#pg-list li').length === 2);
  console.log('  ✓ delete moves a page out of the list and Undo brings it back');

  // 5. the browser cannot make its own page paid or take another person's
  const mine = [...fake.projects.values()].find((p) => p.name === 'Bakery home page');
  const patch = (token, id, body) => fetch(fake.url + '/rest/v1/projects?id=eq.' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: fake.anonKey, Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
  assert.strictEqual((await patch(anna.session.access_token, mine.id, { status: 'paid' })).status, 403, 'status cannot be set from the browser');
  assert.strictEqual((await patch(anna.session.access_token, mine.id, { user_id: ben.u.id })).status, 403, 'a page cannot be handed to someone else');
  const benRow = [...fake.projects.values()].find((p) => p.name === 'Ben secret');
  await patch(anna.session.access_token, benRow.id, { name: 'hacked' });
  assert.strictEqual(benRow.name, 'Ben secret', "someone else's page cannot be changed");
  assert.strictEqual((await fetch(fake.url + '/rest/v1/projects', { headers: { apikey: fake.anonKey } })).status, 401, 'no token, no pages');
  console.log('  ✓ status, owner and other people\'s pages are out of reach of the browser');

  // 6. change email
  assert(await vis('#f-email'), 'an email account can change its address');
  await page.fill('#em-new', 'not an address'); await page.click('#f-email button[type=submit]');
  await page.waitForFunction(() => /name@example\.com/.test(document.getElementById('em-new-err').textContent));
  await page.fill('#em-new', 'ben@example.com'); await page.click('#f-email button[type=submit]');
  await page.waitForFunction(() => /already been registered|That did not work/.test(document.getElementById('em-new-err').textContent));
  await page.fill('#em-new', 'anna.new@example.com'); await page.click('#f-email button[type=submit]');
  await page.waitForFunction(() => /We sent a link to anna\.new@example\.com/.test(document.getElementById('a-notice').textContent));
  assert(fake.outbox.some((m) => m.to === 'anna.new@example.com' && m.kind === 'email-change'), 'the link goes to the NEW address');
  assert(/anna@example\.com/.test(await text('#i-who')), 'the address does not change until the link is pressed');
  console.log('  ✓ change email: bad and taken addresses explained, the link goes to the new address, nothing changes early');

  // 7. a Google account has no email form
  const gina = seed('gina@example.com', 'google'); await open(gina);
  assert(!(await vis('#f-email')), 'Google accounts take their address from Google');
  console.log('  ✓ a Google account does not get the email form');

  // 8. delete account
  await open(anna);
  await page.click('#b-del'); assert(await vis('#f-del') && !(await vis('#b-del')), 'asks for the address first');
  await page.fill('#dl-email', 'someone@else.com'); await page.click('#dl-go');
  await page.waitForFunction(() => /not the address on this account/.test(document.getElementById('dl-email-err').textContent));
  assert(fake.users.has('anna@example.com'), 'a wrong address deletes nothing');
  await page.click('#dl-cancel'); assert(!(await vis('#f-del')) && await vis('#b-del'), 'Keep my account closes the question');
  await page.click('#b-del'); await page.fill('#dl-email', 'ANNA@example.com'); await page.click('#dl-go');
  await page.waitForSelector('#a-out:not([hidden])');
  assert(/account and everything saved in it are deleted/.test(await text('#a-notice')), 'says what happened');
  assert(!fake.users.has('anna@example.com'), 'the account is gone');
  assert([...fake.projects.values()].every((p) => p.user_id !== anna.u.id), 'her pages are gone with it');
  assert(fake.users.has('ben@example.com') && [...fake.projects.values()].some((p) => p.name === 'Ben secret'), "nobody else's data was touched");
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('edvlabs.session')), null, 'no session left in the browser');
  assert.strictEqual((await text('.nav a[href$="account/"]')).trim(), 'Sign in', 'the menu goes back to Sign in');
  assert.strictEqual((await fetch(fake.url + '/auth/v1/user', { headers: { apikey: fake.anonKey, Authorization: 'Bearer ' + anna.session.access_token } })).status, 401, 'the old token no longer works');
  console.log('  ✓ delete account: needs the address, removes the person and their pages, nobody else, signs out');

  // 9. layout and errors
  await open(gina);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.strictEqual(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll at 375px');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  console.log('  ✓ no sideways scroll at phone width, no page errors');

  await browser.close(); await fake.close(); srv.close && srv.close();
  console.log('✅ Account page (signed in) passed!');
})().catch((e) => { console.error(e); process.exit(1); });
