/** Home page and question flow: prices agree with the price table, every question can be answered "I don't know yet",
    answers survive a refresh, the keyboard works, and the contact step needs an email or a phone number. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const P = require('../../site/js/prices.js');
const Q = require('../../site/js/questions.js');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  // the plain dev server has no Worker: answer the spam-check key request the way a Worker without keys does (nothing is shown, nothing is sent)
  await page.route('**/api/form-check', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('Home page');
  await page.goto(srv.url + '/site/index.html');
  const prices = await page.$$eval('[data-price]', els => els.map(e => [e.dataset.price, e.dataset.blocks, e.textContent]));
  const T = P.table;
  const expect = { self: P.eur(P.self(3, false)), done: P.eur(P.done(3, false)), extra: P.eur(T.extra), editor: P.eur(T.editor), setup: P.eur(T.doneSetup), perblock: P.eur(T.donePerBlock) };
  for (const [k, , text] of prices) assert.strictEqual(text, expect[k], `home price ${k}`);
  // the static text (what search engines and no-JS visitors see) must match the table too
  const html = fs.readFileSync(path.join(__dirname, '../../site/index.html'), 'utf8');
  for (const m of html.matchAll(/data-price="(\w+)"[^>]*>([^<]*)</g)) assert.strictEqual(m[2], expect[m[1]], `static price ${m[1]}`);
  assert.strictEqual(await page.textContent('#band-from'), 'From ' + P.eur(P.self(3, false)));
  assert.strictEqual(await page.locator('h1').count(), 1, 'one h1');
  const banned = /\b(section|cms|export|supercharge|seamless|unlock|effortless)\b/i;
  const visible = await page.innerText('body');
  assert(!banned.test(visible), 'no banned word on the home page: ' + (visible.match(banned) || [])[0]);
  console.log('  ✓ every price comes from the price table; one h1; no banned words');

  console.log('Questions');
  await page.goto(srv.url + '/site/start/index.html');
  assert.strictEqual(await page.textContent('#q-count'), 'Question 1 of 10');
  // every question: "I don't know yet" is a real choice; pick it, move on
  for (let i = 0; i < Q.QUESTIONS.length; i++) {
    await page.waitForFunction(n => document.getElementById('q-count').textContent === `Question ${n} of 10`, i + 1);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'q-title', `focus on title, q${i + 1}`);
    const unknown = page.locator('input[value="__unknown"], #a-text ~ * input, label.choice input').last();
    await unknown.check();
    await page.click('text=/^(Next|See my answers)$/');
  }
  assert(page.url().endsWith('#check'));
  const summary = await page.innerText('.summary');
  assert.strictEqual((summary.match(/I don’t know yet/g) || []).length, 10, 'all ten unknown');
  console.log('  ✓ all ten questions answerable with “I don’t know yet”');

  // real answers, refresh, back button
  await page.goto(srv.url + '/site/start/index.html#q4');
  await page.getByText('About you').click();
  await page.getByText('Prices', { exact: true }).click();
  await page.getByText('Contact form').click();
  await page.getByText('Gallery').click();
  assert(/about €\d+/.test(await page.innerText('#q-price')), 'price shows from question 4');
  assert((await page.innerText('#q-price')).includes('4 blocks'));
  await page.reload();
  assert.strictEqual(await page.locator('.option input:checked').count(), 4, 'answers survive refresh');
  await page.goto(srv.url + '/site/start/index.html#q5');
  await page.getByText('Yes, add the editor').click();
  assert((await page.innerText('#q-price')).includes('about ' + P.eur(P.self(4, true))), 'estimate with editor');
  await page.goBack();
  assert.strictEqual(await page.textContent('#q-count'), 'Question 4 of 10', 'back button');
  console.log('  ✓ answers survive a refresh; the price follows the answers; the back button works');

  // keyboard-only: tab to a radio card, space selects, a visible ring shows
  await page.goto(srv.url + '/site/start/index.html#q1');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // logo
  let found = false;
  for (let i = 0; i < 8 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement.matches('.option input')); }
  assert(found, 'a card is reachable by Tab');
  const ring = await page.evaluate(() => { const l = document.activeElement.closest('label'); const c = getComputedStyle(l); return parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== 'none'; });
  assert(ring, 'visible focus ring on the card');
  await page.keyboard.press('Space');
  assert.strictEqual(await page.locator('.option input:checked').count(), 1);
  console.log('  ✓ keyboard-only: reachable, visible focus, Space selects');

  // fork and contact rules
  await page.goto(srv.url + '/site/start/index.html#choose');
  assert((await page.innerText('.fork')).includes(P.eur(P.done(4, true))), 'fork shows the done-for-you price');
  await page.getByRole('button', { name: 'Ask edvlabs to do it' }).click();
  await page.getByRole('button', { name: 'Send my answers' }).click();
  assert((await page.innerText('#c-err-email')).includes('email address or a phone number'));
  assert((await page.innerText('#c-cerr')).includes('Tick the box'));
  assert.strictEqual(await page.innerText('#c-err-phone'), '', 'nothing is said under the phone box when nothing is wrong with it');
  assert(await page.evaluate(() => document.activeElement.id === 'c-email'), 'focus goes to the first box with a problem');
  // a wrong email and a wrong phone number are each named under their own box, at the same time
  await page.fill('#c-email', 'ewfewfc'); await page.fill('#c-phone', '3vadvd'); await page.check('#c-consent');
  await page.getByRole('button', { name: 'Send my answers' }).click();
  assert(/does not look like an email/.test(await page.locator('.field:has(#c-email) .error-text').innerText()), 'the email problem is under the email box');
  assert(/does not look like a phone number/.test(await page.locator('.field:has(#c-phone) .error-text').innerText()), 'the phone problem is under the phone box');
  assert(!/email/.test(await page.locator('.field:has(#c-phone) .error-text').innerText()), 'and the phone box does not carry the email message');
  await page.fill('#c-email', '');
  await page.fill('#c-phone', '12 ab');
  await page.check('#c-consent');
  await page.getByRole('button', { name: 'Send my answers' }).click();
  assert((await page.innerText('#c-err-phone')).includes('does not look like a phone number'));
  assert.strictEqual(await page.innerText('#c-err-email'), '', 'no email message when the email is empty and the phone is the problem');
  await page.fill('#c-phone', '+371 20000000');
  // the page carries the address of the lead receiver; take it away to test the "sending is off" wording
  assert.strictEqual(await page.getAttribute('meta[name="lead-endpoint"]', 'content'), '/api/lead', 'the page points at the lead receiver');
  await page.evaluate(() => document.querySelector('meta[name="lead-endpoint"]').remove());
  await page.getByRole('button', { name: 'Send my answers' }).click();
  await page.waitForSelector('text=Nothing has left your browser');
  assert(page.url().endsWith('#thanks'));
  assert((await page.innerText('main')).includes('Nothing has left your browser'), 'honest when sending is off');
  console.log('  ✓ phone number alone is enough; errors name the problem; honest when sending is not switched on');

  // no horizontal scroll on a phone
  await page.setViewportSize({ width: 375, height: 800 });
  for (const u of ['/site/index.html', '/site/start/index.html#q4']) {
    await page.goto(srv.url + u);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 375px on ' + u);
  }
  console.log('  ✓ no sideways scroll at 375px');

  assert.deepStrictEqual(errors, [], 'no console errors: ' + errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('Storefront e2e passed');
})().catch(e => { console.error(e); process.exit(1); });
