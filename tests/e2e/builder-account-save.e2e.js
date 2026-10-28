/** The builder keeps the page in the account too: nothing is made from the untouched starter, the first change creates an account page, later changes
    save, a second computer opens it (?project=), a newer page from elsewhere is brought in when nothing here changed, and when both changed the
    person chooses. Opening another page first saves the one that is here. The pretend Supabase is reached through a made-up https address. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const { start } = require('../lib/fake-supabase.js');
const A = require('../../site/js/auth.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

(async () => {
  const srv = await startServer();
  const fake = await start({ confirmEmails: false });
  const host = 'https://fake-supabase.test';
  const storage = mem();
  const auth = A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage, tempStorage: mem(), origin: 'http://x.test' });
  assert((await auth.signUp('dana@example.com', 'Correct-Horse-1!')).ok); assert((await auth.signIn('dana@example.com', 'Correct-Horse-1!')).ok);
  const session = storage.getItem('edvlabs.session');
  const browser = await launchBrowser();
  const errors = [];
  /** A new browser (own storage) signed in as Dana. `local` seeds the builder's saved page before it starts. */
  const open = async (query, local) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([sess, loc]) => { try { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('edvlabs.session', sess); if (loc) localStorage.setItem('web_builder_state_v2', loc); } } catch (_) { /* ignore */ } }, [session, local || null]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
    await page.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: host, anonKey: fake.anonKey }) }));
    await page.route(host + '/**', async (r) => {
      const req = r.request(); const u = new URL(req.url());
      const res = await fetch(fake.url + u.pathname + u.search, { method: req.method(), headers: req.headers(), body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
      await r.fulfill({ status: res.status, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' }, body: await res.text() });
    });
    await page.goto(srv.url + '/builder.html' + (query || ''));
    await page.waitForSelector('#cloudStatus', { state: 'attached', timeout: 15000 });
    return { ctx, page };
  };
  const title = (p) => p.evaluate(() => window.builderManager.getState().page.title);
  const setTitle = (p, t) => p.evaluate((x) => { window.builderManager.setPage({ title: x }); }, t);
  const rows = () => [...fake.projects.values()];
  const status = (p) => p.locator('#cloudStatus').innerText();
  const waitRows = (n, ms) => new Promise((res, rej) => { const t0 = Date.now(); const id = setInterval(() => { if (rows().length === n) { clearInterval(id); res(); } else if (Date.now() - t0 > (ms || 12000)) { clearInterval(id); rej(new Error('expected ' + n + ' account pages, found ' + rows().length)); } }, 100); });
  const waitFor = (fn, ms) => new Promise((res, rej) => { const t0 = Date.now(); const id = setInterval(() => { if (fn()) { clearInterval(id); res(); } else if (Date.now() - t0 > (ms || 12000)) { clearInterval(id); rej(new Error('timed out waiting: ' + fn)); } }, 100); });
  console.log('Builder saves to the account');

  // 1. the untouched starter is never made into an account page
  const a = await open();
  await a.page.waitForTimeout(4500);
  assert.strictEqual(rows().length, 0, 'opening the builder alone makes no account page');
  console.log('  ✓ the untouched starter page is not saved to the account');

  // 2. the first change creates it, later changes save
  await setTitle(a.page, 'Bakery');
  await waitRows(1);
  assert.strictEqual(rows()[0].name, 'Bakery'); assert.strictEqual(rows()[0].state.page.title, 'Bakery'); assert.strictEqual(rows()[0].user_id, [...fake.users.values()][0].id);
  await a.page.waitForFunction(() => /Saved to your account/.test(document.getElementById('cloudStatus').textContent));
  await setTitle(a.page, 'Bakery two'); await waitFor(() => rows()[0].revision === 2);
  assert.strictEqual(rows()[0].state.page.title, 'Bakery two'); assert.strictEqual(rows()[0].name, 'Bakery', 'the name stays what the person chose');
  console.log('  ✓ the first change creates an account page; later changes save as new revisions');
  const id = rows()[0].id;

  // 3. another computer opens it
  const b = await open('?project=' + id);
  await b.page.waitForFunction(() => window.builderManager.getState().page.title === 'Bakery two', null, { timeout: 12000 });
  assert.strictEqual(rows().length, 1, 'the untouched starter on the second computer did not become a page');
  assert(!/project=/.test(b.page.url()), 'the address is tidied');
  assert.strictEqual(await b.page.evaluate(() => JSON.parse(localStorage.getItem('edvlabs.cloud_project')).id), id, 'it keeps saving to the same page');
  console.log('  ✓ ?project= opens the account page on a second computer');

  // 4. a newer page from elsewhere is brought in when nothing here changed
  await setTitle(a.page, 'Bakery three'); await waitFor(() => rows()[0].revision === 3);
  await b.page.reload(); await b.page.waitForSelector('#cloudStatus', { state: 'attached' });
  await b.page.waitForFunction(() => window.builderManager.getState().page.title === 'Bakery three', null, { timeout: 12000 });
  console.log('  ✓ a page saved on another computer is brought in when nothing here changed');

  // 5. both changed: the person chooses (use the other version)
  await setTitle(a.page, 'From A'); await waitFor(() => rows()[0].revision === 4);
  await setTitle(b.page, 'From B');
  await b.page.waitForSelector('#cloudConflict', { timeout: 12000 });
  assert.strictEqual(rows()[0].state.page.title, 'From A', "nothing was overwritten");
  await b.page.click('#cloudUseTheirs');
  await b.page.waitForFunction(() => window.builderManager.getState().page.title === 'From A');
  assert(!(await b.page.$('#cloudConflict')), 'the question is gone');
  await setTitle(b.page, 'B continues'); await waitFor(() => rows()[0].state.page.title === 'B continues');
  console.log('  ✓ both changed: asked, nothing overwritten, "use the other version" works and saving carries on');

  // 6. both changed: keep mine
  await a.page.reload(); await a.page.waitForSelector('#cloudStatus', { state: 'attached' }); // A is behind (B saved since): it catches up like any reload
  await a.page.waitForFunction(() => window.builderManager.getState().page.title === 'B continues', null, { timeout: 12000 });
  await setTitle(a.page, 'A again'); await waitFor(() => rows()[0].state.page.title === 'A again');
  await setTitle(b.page, 'B wins');
  await b.page.waitForSelector('#cloudConflict', { timeout: 12000 }); await b.page.click('#cloudKeepMine');
  await waitFor(() => rows()[0].state.page.title === 'B wins');
  console.log('  ✓ "keep what I see here" saves this version over the other');
  await a.ctx.close(); await b.ctx.close();

  // 7. opening another account page first saves the page that is here
  const other = fake.addProject('dana@example.com', 'Second page', { state: { stack: [{ id: 's1', slug: 'minimal-navbar', title: 'Nav' }], theme: 'midnight-dark', page: { title: 'Second' } } });
  const local = JSON.stringify({ stack: [{ id: 'x1', slug: 'minimal-navbar', title: 'Nav' }], theme: 'midnight-dark', customColors: {}, page: { title: 'Unsaved local work' }, viewport: 'desktop', pages: [], activePageId: null });
  const c = await open('?project=' + other.id, local);
  await c.page.waitForFunction(() => window.builderManager.getState().page.title === 'Second', null, { timeout: 12000 });
  assert(rows().some((p) => p.name === 'Unsaved local work' && p.state.page.title === 'Unsaved local work'), 'the page that was here was saved to the account first');
  console.log('  ✓ opening another page first saves the page that was here');
  await c.ctx.close();

  // 8. a page that does not exist or is not mine
  const d = await open('?project=11111111-1111-4111-8111-111111111111');
  await d.page.waitForFunction(() => /could not be found/.test(document.getElementById('cloudStatus').textContent), null, { timeout: 12000 });
  console.log('  ✓ a page that cannot be found says so and the builder carries on');
  await d.ctx.close();

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await fake.close(); srv.close && srv.close();
  console.log('✅ Builder account save passed!');
})().catch((e) => { console.error(e); process.exit(1); });
