/** Someone who already answered the questions is not sent back to question 1 when they press "Start your page": a welcome-back screen lets them
    carry on, open the builder, look at their answers or go through them again. Nothing is erased. First-time visitors still start at question 1. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const { QUESTIONS } = require('../../site/js/questions.js');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const KEY = 'edvlabs.brief_v1';
  const errors = [];
  /** A browser with `n` questions already answered (the first n, each "I don't know yet" except the first, which is a real answer). */
  const open = async (n, query, opts) => {
    const ctx = await browser.newContext({ viewport: { width: opts && opts.width || 1100, height: 900 } });
    const brief = { v: 1, path: null, answers: {} };
    QUESTIONS.slice(0, n).forEach((q, i) => { brief.answers[q.id] = i === 0 ? { value: q.options[0][0], unknown: false, note: '' } : { value: q.type === 'many' ? [] : null, unknown: true, note: '' }; });
    if (n) await ctx.addInitScript(([k, b]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k, b); } }, [KEY, JSON.stringify(brief)]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    if (opts && opts.accounts) await page.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: 'https://x.supabase.test', anonKey: 'k' }) }));
    else await page.route('**/api/config', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto(srv.url + '/site/start/index.html' + (query || ''));
    return { ctx, page, brief };
  };
  const h1 = (p) => p.locator('#q-title').innerText();
  const stored = (p) => p.evaluate((k) => localStorage.getItem(k), KEY);
  console.log('Start page, welcome back');

  // 1. first visit: straight to question 1
  const fresh = await open(0);
  await fresh.page.waitForSelector('#q-title');
  assert.strictEqual(await fresh.page.innerText('#q-count'), 'Question 1 of 10', 'no answers: question 1');
  assert(!/Welcome back/.test(await h1(fresh.page)), 'no welcome screen for a first visit');
  await fresh.page.goto(srv.url + '/site/start/index.html#welcome');
  await fresh.page.waitForFunction(() => /#q1$/.test(location.hash));
  console.log('  ✓ a first-time visitor starts at question 1 (and a typed #welcome does not show an empty welcome)');
  await fresh.ctx.close();

  // 2. some answers: the choice, carry on at the first open question
  const part = await open(3);
  await part.page.waitForSelector('#w-carry');
  assert.strictEqual(await h1(part.page), 'Welcome back.');
  assert(/answered 3 of 10 questions/.test(await part.page.innerText('#q .lead')), 'says how far they got');
  assert.strictEqual(await part.page.locator('#q-dots i.is-done').count(), 3, 'the dots show the three answered');
  for (const id of ['w-carry', 'w-build', 'w-look', 'w-again']) assert(await part.page.locator('#' + id).isVisible(), id + ' is there');
  const before = await stored(part.page);
  await part.page.click('#w-carry');
  await part.page.waitForFunction(() => document.getElementById('q-count').textContent === 'Question 4 of 10');
  assert.strictEqual(await stored(part.page), before, 'nothing was erased or changed');
  console.log('  ✓ some answers saved: "Carry on" goes to the first open question, nothing changes');
  await part.ctx.close();

  // 3. all answered: the builder is the main choice; look and again work; the old answers are ready to change
  const all = await open(10);
  await all.page.waitForSelector('#w-build');
  assert(/all 10 questions/.test(await all.page.innerText('#q .lead')));
  assert.strictEqual(await all.page.locator('#w-carry').count(), 0, 'nothing left to carry on with');
  assert(/btn(\s|$)/.test(await all.page.getAttribute('#w-build', 'class')) && !/secondary/.test(await all.page.getAttribute('#w-build', 'class')), 'Open the builder is the main button');
  await all.page.click('#w-look'); await all.page.waitForFunction(() => /Here is what you told us/.test(document.getElementById('q-title').textContent));
  await all.page.goBack(); await all.page.waitForSelector('#w-again');
  await all.page.click('#w-again'); await all.page.waitForFunction(() => document.getElementById('q-count').textContent === 'Question 1 of 10');
  assert.strictEqual(await all.page.locator('input[name="a-purpose"]:checked').count(), 1, 'going through again shows the old answer, ready to change');
  console.log('  ✓ all answered: builder first; "Look at my answers" and "Go through them again" work, the old answers are shown');

  // 4. open the builder: accounts on -> the account page then the builder; accounts off -> the honest "not open yet" form
  await all.page.goto(srv.url + '/site/start/index.html');
  await all.page.waitForSelector('#w-build'); await all.page.click('#w-build');
  await all.page.waitForFunction(() => /builder is being finished/.test(document.getElementById('q-title').textContent));
  await all.ctx.close();
  const on = await open(10, '', { accounts: true });
  await on.page.waitForSelector('#w-build'); await on.page.click('#w-build');
  await on.page.waitForURL(/\/site\/account\/\?from=start/, { timeout: 8000 });
  assert.strictEqual(JSON.parse(await stored(on.page)).path, 'self', 'remembered as "I will build it"');
  console.log('  ✓ "Open the builder" goes through sign-in to the builder (or the honest form when accounts are off)');
  await on.ctx.close();

  // 5. phone width
  const ph = await open(10, '', { width: 375 });
  await ph.page.waitForSelector('#w-build');
  assert.strictEqual(await ph.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll at 375px');
  await ph.ctx.close();
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('Start page welcome passed');
})().catch((e) => { console.error(e); process.exit(1); });
