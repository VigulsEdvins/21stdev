/** "Create a new website" (builder opened with ?new=1): the builder lets go of the account page it was tied to, starts a fresh starter page, never touches the old page, and the first change creates a new account page. Set-up copied from guided-publish.e2e.js; the sign-in service and the account copy are pretended. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const UID = '11111111-1111-4111-8111-111111111111';
(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|status of 4\d\d|status of 5\d\d|Failed to load resource/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });

  /* the pretend service */
  const api = { config: true, sites: [], freePlaces: 1, published: [], taken: new Set(['taken-name']), nameChecks: 0, signedIn: true, unpublished: [] };
  await page.route('**/api/config', (r) => (api.config ? r.fulfill({ json: { supabaseUrl: 'https://sb.test', anonKey: 'anon-key' } }) : r.fulfill({ status: 404, body: '{}' })));
  await page.route('https://sb.test/**', (r) => (api.signedIn ? r.fulfill({ json: { id: UID, email: 'a@example.com' } }) : r.fulfill({ status: 401, json: { message: 'no' } })));
  await page.route('**/api/my-sites', (r) => r.fulfill({ json: { ok: true, sites: api.sites, freePlaces: api.freePlaces, limits: { publishesPerHour: 10, renamesPer30Days: 2, siteMb: 10, canBuyMore: { publishesPerHour: true, renamesPer30Days: true, siteMb: true } } } }));
  await page.route('**/api/site-name**', (r) => {
    api.nameChecks++; const name = new URL(r.request().url()).searchParams.get('name').toLowerCase();
    r.fulfill({ json: api.taken.has(name) ? { ok: true, available: false, reason: 'taken', message: 'This name is taken.' } : { ok: true, available: true, name } });
  });
  await page.route('**/api/publish', (r) => {
    const body = JSON.parse(r.request().postData()); api.published.push(body);
    if (api.freePlaces < 1 && !api.sites.some((s) => s.name === body.name)) return r.fulfill({ status: 402, json: { ok: false, errors: ['Publishing on an edvlabs address is a paid extra. Please add it to your account first.'], reason: 'payment-needed' } });
    if (api.taken.has(body.name)) return r.fulfill({ status: 409, json: { ok: false, errors: ['This name is taken.'], reason: 'taken' } });
    if (!api.sites.some((s) => s.name === body.name)) { api.sites.push({ id: '00000000-0000-4000-8000-000000000001', name: body.name, status: 'live', version: 1, address: `https://${body.name}.edvlabs.com/`, payment: 'active', paidUntil: '2027-11-01T00:00:00Z', renamesLeft: 2 }); api.freePlaces--; }
    r.fulfill({ json: { ok: true, name: body.name, address: `https://${body.name}.edvlabs.com/`, version: 1, siteId: '00000000-0000-4000-8000-000000000001', created: true } });
  });
  api.renames = [];
  await page.route('**/api/rename', (r) => {
    const body = JSON.parse(r.request().postData()); api.renames.push(body);
    if (body.name === 'twice-limit') return r.fulfill({ status: 429, json: { ok: false, errors: ['A site can be renamed twice in 30 days. Please try again later.'], reason: 'renames' } });
    const site = api.sites.find((x) => x.id === body.siteId); const old = site.name; site.renamesLeft = Math.max(0, site.renamesLeft - 1); site.name = body.name; site.address = `https://${body.name}.edvlabs.com/`;
    r.fulfill({ json: { ok: true, name: body.name, oldName: old, address: site.address, oldAddress: `https://${old}.edvlabs.com/`, holdDays: 90 } });
  });
  await page.route('**/api/unpublish', (r) => { api.unpublished.push(JSON.parse(r.request().postData()).siteId); api.sites.forEach((s) => { s.status = 'unpublished'; }); r.fulfill({ json: { ok: true } }); });

  let gate = false, configRequests = 0;
  await page.route('**/builder.html', async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: gate ? (await res.text()).replace('</head>', '<meta name="access-gate" content="on"></head>') : await res.text() }); });
  page.on('request', (rq) => { if (/\/api\/config/.test(rq.url())) configRequests++; });
  const open = async () => { await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get'); };
  const signIn = () => page.evaluate(() => localStorage.setItem('edvlabs.session', JSON.stringify({ access_token: 'a'.repeat(40), refresh_token: 'r'.repeat(10), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' } })));

  const OLD = '33333333-3333-4333-8333-333333333333', NEW = '66666666-6666-4666-8666-666666666666';
  const calls = [];
  await page.route('https://sb.test/rest/v1/projects**', (r) => {
    const m = r.request().method(), u = r.request().url(); calls.push(m + ' ' + u);
    if (m === 'GET') return r.fulfill({ json: [{ id: OLD, name: 'My paid page', state: {}, revision: 1, deleted_at: null, updated_at: '2026-01-01T00:00:00Z' }] });
    if (m === 'POST') return r.fulfill({ json: [{ id: NEW, revision: 1 }] });
    r.fulfill({ json: [{ id: OLD, revision: 2 }] });
  });
  console.log('Create a new website');
  gate = true; await open(); await signIn();
  await page.evaluate((id) => localStorage.setItem('edvlabs.cloud_project', JSON.stringify({ id, userId: '11111111-1111-4111-8111-111111111111', revision: 1, hash: 'x' })), OLD);
  await page.goto(srv.url + '/builder.html?new=1'); await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.waitForFunction(() => window.BuilderAccountSave && window.BuilderAccountSave.saver, null, { timeout: 15000 }); await page.waitForTimeout(800);
  assert(!/new=1/.test(page.url()), 'the ?new=1 is removed from the address');
  assert.strictEqual(await page.evaluate(() => localStorage.getItem('edvlabs.cloud_project')), null, 'the builder is no longer tied to the old account page');
  assert.strictEqual(await page.evaluate(() => window.builderPreview.serializeState().stack.length), 6, 'a fresh starter page, not the old one');
  assert(!calls.some((c) => c.startsWith('DELETE')), 'nothing is deleted');
  const patched = calls.filter((c) => c.startsWith('PATCH') && c.includes(OLD)).length; // the old page is saved once more before the builder lets go of it
  console.log('  ✓ ?new=1 unlinks the old page and starts a fresh one; nothing is deleted');

  // the first real change makes a new account page, and the old one is still not touched
  await page.evaluate(() => { const s = window.builderPreview.serializeState(); s.page = Object.assign({}, s.page, { title: 'My new bakery' }); window.builderPreview.applyState(s); });
  await page.evaluate(() => window.BuilderAccountSave.saver.tick(true)); await page.waitForTimeout(600);
  assert(calls.some((c) => c.startsWith('POST')), 'a new account page was created'); assert.strictEqual(calls.filter((c) => c.startsWith('PATCH') && c.includes(OLD)).length, patched, 'the new page never overwrites the old one'); assert(!calls.some((c) => c.startsWith('DELETE')));
  assert.strictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('edvlabs.cloud_project'))).id, NEW, 'now tied to the new page');
  console.log('  ✓ the first change creates a new page in the account');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('New website e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
