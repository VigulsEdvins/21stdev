/** The buying overlay in guided step 5: hidden while payment is off; three steps (where, extras, pay); the options follow the destination; the total comes from the server; a waiver gates Pay;
 *  the order carries no price; Escape closes it without touching the page. Set-up copied from guided-publish.e2e.js; the sign-in service, the publishing API and Stripe are pretended. */
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

  const PID = '33333333-3333-4333-8333-333333333333';
  const buy = { paymentOn: true, purchases: [], quotes: [], checkouts: [], testMode: true, payToday: 96 };
  buy.polls = 0; buy.pending = null; buy.deploy = [];
  await page.route('**/api/my-purchases', (r) => { if (buy.pending && ++buy.polls >= 3) buy.purchases = buy.pending; r.fulfill({ json: { ok: true, paymentOn: buy.paymentOn, purchases: buy.purchases } }); });
  buy.domainCalls = []; buy.domainState = 'pending';
  await page.route('**/api/site-domain**', (r) => { const q = r.request(), view = (h, st) => ({ ok: true, hostname: h, status: st, records: [{ type: 'CNAME', name: h, value: 'fallback.edvlabs.test' }], optionalRecords: [], error: '' }); if (q.method() === 'POST') { const b = JSON.parse(q.postData()); buy.domainCalls.push(b); return r.fulfill({ json: view(b.hostname, 'pending') }); } r.fulfill({ json: view('www.bakery-anna.com', buy.domainState) }); });
  await page.route('**/api/deploy-request', (r) => { buy.deploy.push(JSON.parse(r.request().postData())); r.fulfill({ json: { ok: true } }); });
  await page.route('**/api/quote', (r) => { const b = JSON.parse(r.request().postData()); buy.quotes.push(b); r.fulfill({ json: { ok: true, lines: [{ key: 'base', label: 'Website, 3 blocks included', amount: 39 }, { key: 'editor', label: 'Admin panel', amount: 39 }], payToday: buy.payToday, hosting: b.hosting ? { plan: b.hosting, amount: b.hosting === 'monthly' ? 3 : 29, trialDays: 30 } : null, blocks: 5, testMode: buy.testMode } }); });
  await page.route('**/api/checkout', (r) => { buy.checkouts.push(JSON.parse(r.request().postData())); r.fulfill({ json: { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1', testMode: true } }); });
  await page.route('https://checkout.stripe.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<title>Stripe</title>' }));
  let rev = 1; // the account copy of the page: every save moves the revision on, and a read answers the current one (so the builder keeps its own page)
  await page.route('https://sb.test/rest/v1/projects**', (r) => { if (r.request().method() === 'GET') return r.fulfill({ json: [{ id: PID, name: 'Shop', state: {}, revision: rev, deleted_at: null, updated_at: '2026-01-01T00:00:00Z' }] }); rev += 1; r.fulfill({ json: [{ id: PID, revision: rev }] }); });
  const link = () => page.evaluate(([id, uid]) => localStorage.setItem('edvlabs.cloud_project', JSON.stringify({ id, userId: uid, revision: 1, hash: 'x' })), [PID, UID]);
  console.log('Guided buying overlay');

  // payment off: the old step 5 is untouched
  buy.paymentOn = false; gate = true; await open(); await signIn(); await link(); await open(); await page.waitForSelector('#publishBox'); await page.waitForTimeout(500);
  assert.strictEqual(await page.locator('#buyProceed').count(), 0, 'no Proceed button while payment is off');
  console.log('  ✓ with payment switched off nothing changes');

  buy.paymentOn = true; await open(); await page.waitForSelector('#buyProceed');
  await page.click('#buyProceed'); await page.waitForSelector('#buyOverlay', { timeout: 8000 }).catch(async (e) => { throw new Error('overlay did not open; note: ' + await page.textContent('#buyNote') + ' link: ' + await page.evaluate(() => localStorage.getItem('edvlabs.cloud_project'))); });
  assert.strictEqual(await page.getAttribute('#buyOverlay', 'role'), 'dialog'); assert.strictEqual(await page.getAttribute('#buyOverlay', 'aria-modal'), 'true');
  assert.strictEqual(await page.locator('#buyOverlay input[name="buyDestination"]').count(), 3, 'edvlabs address, own domain, download');
  assert(await page.isChecked('#buyOverlay input[value="edvlabs"]'), 'the edvlabs address is the default');
  assert(await page.isDisabled('#buyNext'), 'Next waits for a free name');
  await page.fill('#buyName', 'bakery-anna'); await page.waitForFunction(() => !document.getElementById('buyNext').disabled);
  console.log('  ✓ Proceed opens the overlay; the edvlabs address needs a free name');

  assert(!(await page.isVisible('#buyPay')), 'Pay is not shown on step 1');
  // download: no name, no hosting; deploy help offered; edvlabs: no deploy help
  await page.check('#buyOverlay input[value="download"]');
  assert(!(await page.isVisible('#buyName')), 'a download needs no name'); await page.click('#buyNext');
  assert(!(await page.isVisible('#buyHosting')), 'a download has no hosting'); assert(await page.isVisible('#buyDeployHelp'), 'deploy help is offered with a download');
  await page.click('#buyBack'); await page.check('#buyOverlay input[value="edvlabs"]'); await page.click('#buyNext');
  assert(!(await page.isVisible('#buyPay')), 'Pay is not shown on step 2'); assert(await page.isVisible('#buyNext'), 'Next is');
  assert(await page.isVisible('#buyHosting'), 'hosting with an edvlabs address'); assert(!(await page.isVisible('#buyDeployHelp')), 'no deploy help on an edvlabs address: it publishes itself');
  assert(/first month free/i.test(await page.textContent('#buyHosting')), 'the free month is said plainly');
  console.log('  ✓ the options follow the destination');

  // step 3: the total is the server's, the waiver gates Pay, the order carries no price
  await page.check('#buyEditor'); await page.check('#buyHosting input[value="yearly"]'); await page.click('#buyNext');
  await page.waitForFunction(() => /96/.test(document.getElementById('buyTotal').textContent));
  assert(/test mode/i.test(await page.textContent('#buyOverlay')), 'test mode is visible');
  assert(!(await page.isVisible('#buyNext')), 'step 3 has no Next button'); assert(await page.isVisible('#buyPay'), 'Pay is on step 3');
  await page.click('#buyPay'); await page.waitForSelector('#buyWaiverError', { state: 'visible' });
  assert(/tick the box/i.test(await page.textContent('#buyWaiverError')), 'Pay without the tick says what to do'); assert.strictEqual(buy.checkouts.length, 0, 'nothing was sent to Stripe');
  await page.check('#buyWaiver'); await page.waitForFunction(() => { const e = document.getElementById('buyWaiverError'); return !e || e.hidden; });
  await page.click('#buyPay'); await page.waitForURL(/checkout\.stripe\.com/);
  assert.deepStrictEqual(buy.checkouts[0], { projectId: PID, destination: 'edvlabs', editor: true, hosting: 'yearly', deployHelp: false, siteName: 'bakery-anna' }, JSON.stringify(buy.checkouts[0]));
  console.log('  ✓ one total from the server, a waiver before paying, and an order without any price');

  // closing keeps the page; coming back from a cancelled payment says nothing was charged
  await open(); await page.waitForSelector('#buyProceed'); await page.waitForTimeout(800);
  const kept = await page.evaluate(() => window.builderPreview.serializeState().stack.length); assert(kept > 0, 'the builder has its starter blocks');
  await page.click('#buyProceed'); await page.waitForSelector('#buyOverlay'); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('buyOverlay') || document.getElementById('buyOverlay').hidden);
  assert.strictEqual(await page.evaluate(() => window.builderPreview.serializeState().stack.length), kept, 'the builder page is untouched');
  await page.goto(srv.url + '/builder.html?paid=0'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get'); await page.waitForSelector('#buyProceed');
  await page.waitForFunction(() => /nothing was charged/i.test((document.getElementById('buyNote') || {}).textContent || ''));
  console.log('  ✓ Escape returns to the builder untouched; a cancelled payment says nothing was charged');

  // step 5 stays short while buying is on: the count, one total and Proceed; the rest waits in "More options"
  buy.purchases = []; await open(); await page.waitForSelector('#buyProceed'); await page.waitForTimeout(500);
  assert(!(await page.isVisible('#getLines')), 'the long price lines are not shown (the overlay shows them)'); assert(!(await page.isVisible('#getNote')), 'no "payment is not switched on" line');
  assert(!(await page.isVisible('#getAddress')) && !(await page.isVisible('#getEditor')), 'address and editor wait in More options');
  assert.strictEqual(await page.evaluate(() => document.getElementById('buyMore').open), false, 'More options starts closed');
  await page.click('#buyMore summary'); assert(await page.isVisible('#getAddress') && await page.isVisible('#getEditor'), 'opened, they are there');
  console.log('  ✓ step 5 is short: count, total, Proceed, and a closed "More options"');

  // nothing is unlocked before the purchase; the purchase unlocks the download and the publish box
  buy.purchases = []; await open(); await page.waitForSelector('#buyProceed'); await page.waitForTimeout(600);
  assert(!(await page.isVisible('#getDownload')), 'the download waits for the purchase'); assert(!(await page.isVisible('#publishBox')), 'so does "Put it online"');
  buy.purchases = [{ id: 'pur-1', projectId: PID, allowance: 5, editor: true, destination: 'download', createdAt: '2026-11-02T10:00:00Z', deployHelp: false, deployDetailsSent: false }];
  await open(); await page.waitForSelector('#buyProceed'); await page.waitForSelector('#getDownload', { state: 'visible' }); await page.waitForSelector('#publishBox', { state: 'visible' });
  buy.purchases = [{ id: 'pur-9', projectId: '99999999-9999-4999-8999-999999999999', allowance: 5, editor: true, destination: 'download', createdAt: 'x', deployHelp: false, deployDetailsSent: false }];
  await open(); await page.waitForSelector('#buyProceed'); await page.waitForTimeout(600);
  assert(!(await page.isVisible('#getDownload')), 'a purchase for another page does not unlock this one');
  console.log('  ✓ download and "Put it online" wait for the purchase of this page');

  // publishing carries the id of the page, because the server only publishes a page that was bought
  buy.purchases = [{ id: 'pur-1', projectId: PID, allowance: 5, editor: true, destination: 'edvlabs', createdAt: 'x', deployHelp: false, deployDetailsSent: false }]; api.published = [];
  await open(); await page.waitForSelector('#publishName', { state: 'visible' }); await page.fill('#publishName', 'bakery-anna'); await page.waitForFunction(() => !document.getElementById('publishGo').disabled);
  await page.waitForTimeout(800); await page.click('#publishGo'); await page.waitForFunction(() => /bakery-anna/.test(document.getElementById('publishResult').textContent), null, { timeout: 8000 }).catch(async () => { throw new Error('publish result: ' + await page.textContent('#publishResult')); });
  assert.strictEqual(api.published[0].projectId, PID, 'the publish request names the page');
  // a page that is already bought: hosting is "No change" by default, so more blocks never start a second subscription
  buy.quotes = []; await page.click('#buyProceed'); await page.waitForSelector('#buyOverlay'); await page.check('#buyOverlay input[value="domain"]'); await page.fill('#buyDomain', 'www.bakery-anna.com'); await page.waitForFunction(() => !document.getElementById('buyNext').disabled); await page.click('#buyNext');
  assert(await page.isChecked('#buyHosting input[value="none"]'), 'No change is the default for a bought page');
  await page.waitForFunction(() => true); await page.click('#buyNext'); await page.waitForFunction(() => /96/.test(document.getElementById('buyTotal').textContent), null, { timeout: 8000 }).catch(async () => { throw new Error('total: ' + await page.textContent('#buyTotal') + ' / ' + await page.textContent('#buyOverlay')); });
  assert.strictEqual(buy.quotes[buy.quotes.length - 1].hosting, null, 'the order asks for no hosting'); await page.keyboard.press('Escape');
  console.log('  ✓ publishing names the page; a bought page does not buy hosting again by default');

  // back from Stripe: the webhook can be a moment late, so the page looks again, then unlocks and asks for the deploy details once
  buy.purchases = []; buy.polls = 0; buy.pending = [{ id: 'pur-2', projectId: PID, allowance: 5, editor: false, destination: 'domain', createdAt: '2026-11-03T10:00:00Z', deployHelp: true, deployDetailsSent: false }];
  await page.goto(srv.url + '/builder.html?paid=1'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get');
  await page.waitForFunction(() => /confirming/i.test((document.getElementById('buyNote') || {}).textContent || ''));
  await page.waitForFunction(() => /payment received/i.test((document.getElementById('buyNote') || {}).textContent || ''), null, { timeout: 15000 });
  assert(await page.isVisible('#getDownload'), 'unlocked after the payment'); assert(await page.isVisible('#buyDeployForm'), 'the details for "we put it online for you" are asked for');
  await page.fill('#buyDeployDomain', 'shop.example.com'); await page.fill('#buyDeployNotes', 'Registered at Namecheap'); await page.click('#buyDeploySend');
  await page.waitForFunction(() => !document.getElementById('buyDeployForm') || document.getElementById('buyDeployForm').hidden);
  assert.deepStrictEqual(buy.deploy, [{ purchaseId: 'pur-2', domain: 'shop.example.com', notes: 'Registered at Namecheap' }]);
  console.log('  ✓ after paying the page unlocks and the deploy details are collected once');

  // an edvlabs address: right after paying, the page goes online at the chosen name without another click
  buy.purchases = []; buy.polls = 0; api.published = []; api.sites = []; api.freePlaces = 1;
  buy.pending = [{ id: 'pur-3', projectId: PID, allowance: 5, editor: false, destination: 'edvlabs', createdAt: '2026-11-04T10:00:00Z', deployHelp: false, deployDetailsSent: false }];
  await page.evaluate(() => sessionStorage.setItem('edvlabs.buy_name', 'bakery-anna'));
  await page.goto(srv.url + '/builder.html?paid=1'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get');
  await page.waitForFunction(() => /bakery-anna\.edvlabs\.com/.test((document.getElementById('publishResult') || {}).textContent || ''), null, { timeout: 25000 }).catch(async () => { throw new Error('errors: ' + errors.join(' / ') + ' | proceed: ' + await page.locator('#buyProceed').count() + ' | url: ' + page.url() + ' | note: ' + (await page.locator('#buyNote').count() ? await page.textContent('#buyNote') : '(none)') + ' | result: ' + await page.textContent('#publishResult') + ' | name: ' + await page.inputValue('#publishName') + ' | go disabled: ' + await page.isDisabled('#publishGo')); });
  assert.strictEqual(api.published.length, 1, 'published once, with no click'); assert.strictEqual(api.published[0].name, 'bakery-anna'); assert.strictEqual(api.published[0].projectId, PID);
  console.log('  ✓ after paying for an edvlabs address the page goes online by itself');

  // own domain: the client types it (a bare domain is explained), the site is first put online under a name made from it, and the order carries that name
  buy.purchases = []; buy.pending = null; buy.checkouts = []; api.taken.clear(); await open(); await page.waitForSelector('#buyProceed'); await page.click('#buyProceed'); await page.waitForSelector('#buyOverlay');
  await page.check('#buyOverlay input[value="domain"]'); assert(await page.isVisible('#buyDomain'), 'the domain is asked for'); assert(!(await page.isVisible('#buyName')), 'no edvlabs name box for a domain');
  assert(await page.isDisabled('#buyNext'), 'Next waits for a domain');
  await page.fill('#buyDomain', 'bakery-anna.com'); await page.waitForFunction(() => /www\.yourdomain\.com/.test(document.getElementById('buyDomainNote').textContent)); assert(await page.isDisabled('#buyNext'), 'a bare domain is explained and refused');
  await page.fill('#buyDomain', 'www.bakery-anna.com'); await page.waitForFunction(() => !document.getElementById('buyNext').disabled);
  assert(/bakery-anna\.edvlabs\.com/.test(await page.textContent('#buyDomainNote')), 'it says the site is first put online at the edvlabs name made from the domain');
  await page.click('#buyNext'); await page.click('#buyNext'); await page.waitForFunction(() => /96/.test(document.getElementById('buyTotal').textContent)); await page.check('#buyWaiver'); await page.click('#buyPay'); await page.waitForURL(/checkout\.stripe\.com/);
  assert.deepStrictEqual(buy.checkouts[0], { projectId: PID, destination: 'domain', editor: false, hosting: 'monthly', deployHelp: false, siteName: 'bakery-anna' }, JSON.stringify(buy.checkouts[0]));
  console.log('  ✓ own domain: asked for, bare domains explained, the order carries the name made from it');

  // after paying: online at the edvlabs name, the domain attached, and the client is told what to do at his domain provider
  buy.purchases = []; buy.polls = 0; api.published = []; api.sites = []; api.freePlaces = 1; buy.domainCalls = [];
  buy.pending = [{ id: 'pur-4', projectId: PID, allowance: 5, editor: false, destination: 'domain', createdAt: '2026-11-05T10:00:00Z', deployHelp: false, deployDetailsSent: false }];
  await ctx.addInitScript(() => { try { sessionStorage.setItem('edvlabs.buy_name', 'bakery-anna'); sessionStorage.setItem('edvlabs.buy_domain', 'www.bakery-anna.com'); } catch (e) { /* no storage */ } });
    await page.goto(srv.url + '/builder.html?paid=1'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get');
  await page.waitForSelector('#buyDomainHelp', { state: 'visible', timeout: 30000 }).catch(async () => { throw new Error('note: ' + await page.textContent('#buyNote') + ' | published: ' + JSON.stringify(api.published.map((x) => x.name)) + ' | domain calls: ' + JSON.stringify(buy.domainCalls)); });
  assert.strictEqual(api.published[0].name, 'bakery-anna'); assert.deepStrictEqual(buy.domainCalls, [{ action: 'add', siteId: '00000000-0000-4000-8000-000000000001', hostname: 'www.bakery-anna.com' }]);
  const help = await page.textContent('#buyDomainHelp');
  assert(/CNAME/.test(help) && /www\.bakery-anna\.com/.test(help) && /fallback\.edvlabs\.test/.test(help), 'the record to add is shown exactly: ' + help.slice(0, 200)); assert(/domain provider|where you bought/i.test(help), 'it says where to add it'); assert(/hour/i.test(help), 'and how long it can take');
  assert(/bakery-anna\.edvlabs\.com/.test(help), 'meanwhile the edvlabs address works');
  await page.click('#buyDomainCheck'); await page.waitForFunction(() => /waiting|not yet|pending/i.test(document.getElementById('buyDomainState').textContent));
  buy.domainState = 'active'; await page.click('#buyDomainCheck'); await page.waitForFunction(() => /working/i.test(document.getElementById('buyDomainState').textContent));
  console.log('  ✓ after paying: online, the domain attached, the DNS record shown with what to do, and a way to check');

  // the payment was confirmed BEFORE the page came back from Stripe: the new purchase is already in the list, and it must still count as new
  buy.pending = null; buy.polls = 0; api.published = []; api.sites = []; api.freePlaces = 1; buy.domainCalls = [];
  buy.purchases = [{ id: 'pur-5', projectId: PID, allowance: 6, editor: true, destination: 'domain', createdAt: '2026-11-06T10:00:00Z', deployHelp: false, deployDetailsSent: false }];
  await ctx.addInitScript(() => { try { sessionStorage.setItem('edvlabs.buy_known', '[]'); } catch (e) { /* no storage */ } });
  await page.goto(srv.url + '/builder.html?paid=1'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get');
  await page.waitForSelector('#buyDomainHelp', { state: 'visible', timeout: 30000 });
  assert.strictEqual(api.published.length, 1, 'published once, right away'); assert.deepStrictEqual(buy.domainCalls.map((c) => c.hostname), ['www.bakery-anna.com']);
  // a bought page does not show the price or the add-on choice again
  assert(!(await page.isVisible('#getTotal')), 'no "Build it yourself" price on a bought page');
  const bought = await page.textContent('#buyBought'); assert(/bought/i.test(bought) && /6 blocks/.test(bought) && /admin panel/i.test(bought), 'it says what was bought: ' + bought);
  console.log('  ✓ a purchase confirmed before the page returns still goes online; a bought page shows what was bought, not a price');

  // the "Put it online" list shows the site of the open page; the account's other websites wait in a closed section
  const site = (n, name, address, projectId) => ({ id: '00000000-0000-4000-8000-00000000000' + n, name, status: 'live', version: 1, address, payment: 'active', paidUntil: '2027-12-01T00:00:00Z', renamesLeft: 2, projectId });
  api.sites = [site(1, 'test-ed', 'https://test-ed.edvlabs.com/', PID), site(2, 'first-site', 'https://www.first-site.example/', null)];
  buy.purchases = [{ id: 'pur-9', projectId: PID, allowance: 6, editor: true, destination: 'edvlabs', createdAt: 'x', deployHelp: false, deployDetailsSent: false }]; buy.pending = null;
  await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#paneGet', { state: 'attached' }); await link(); await page.click('#guidedStep-get'); await page.waitForSelector('#publishSites li');
  const mine = await page.locator('#publishSites > li').allTextContents(); assert.strictEqual(mine.length, 1, 'only this page\'s site is listed: ' + mine.join(' | ')); assert(/test-ed\.edvlabs\.com/.test(mine[0]));
  assert(!(await page.isVisible('#publishOthers li')), 'the other website is hidden while the section is closed');
  assert(/Your other websites \(1\)/.test(await page.textContent('#publishOthers summary')), 'the section says how many');
  await page.click('#publishOthers summary'); const other = page.locator('#publishOthers li').first();
  assert(/first-site\.example/.test(await other.textContent())); assert(/Replace with this page/.test(await other.locator('[data-act="update"]').textContent()), 'updating another site says it replaces it');
  console.log('  ✓ the list shows the open page\'s site; the other websites are in a closed section');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('Guided buy e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
