/** Guided step 5, "Put it online": hidden without a sign-in service, an invitation when signed out, name check while typing, publishing the real export, listing, update and take offline,
    and the plain-words refusals (no paid place, taken name). The sign-in service and the publishing API are pretended; what is sent to /api/publish is checked. */
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
  await page.route('**/api/my-sites', (r) => r.fulfill({ json: { ok: true, sites: api.sites, freePlaces: api.freePlaces } }));
  await page.route('**/api/site-name**', (r) => {
    api.nameChecks++; const name = new URL(r.request().url()).searchParams.get('name').toLowerCase();
    r.fulfill({ json: api.taken.has(name) ? { ok: true, available: false, reason: 'taken', message: 'This name is taken.' } : { ok: true, available: true, name } });
  });
  await page.route('**/api/publish', (r) => {
    const body = JSON.parse(r.request().postData()); api.published.push(body);
    if (api.freePlaces < 1 && !api.sites.some((s) => s.name === body.name)) return r.fulfill({ status: 402, json: { ok: false, errors: ['Publishing on an edvlabs address is a paid extra. Please add it to your account first.'], reason: 'payment-needed' } });
    if (api.taken.has(body.name)) return r.fulfill({ status: 409, json: { ok: false, errors: ['This name is taken.'], reason: 'taken' } });
    if (!api.sites.some((s) => s.name === body.name)) { api.sites.push({ id: '00000000-0000-4000-8000-000000000001', name: body.name, status: 'live', version: 1, address: `https://${body.name}.edvlabs.com/`, payment: 'active', paidUntil: '2027-11-01T00:00:00Z' }); api.freePlaces--; }
    r.fulfill({ json: { ok: true, name: body.name, address: `https://${body.name}.edvlabs.com/`, version: 1, siteId: '00000000-0000-4000-8000-000000000001', created: true } });
  });
  api.renames = [];
  await page.route('**/api/rename', (r) => {
    const body = JSON.parse(r.request().postData()); api.renames.push(body);
    if (body.name === 'twice-limit') return r.fulfill({ status: 429, json: { ok: false, errors: ['A site can be renamed twice in 30 days. Please try again later.'], reason: 'renames' } });
    const site = api.sites.find((x) => x.id === body.siteId); const old = site.name; site.name = body.name; site.address = `https://${body.name}.edvlabs.com/`;
    r.fulfill({ json: { ok: true, name: body.name, oldName: old, address: site.address, oldAddress: `https://${old}.edvlabs.com/`, holdDays: 90 } });
  });
  await page.route('**/api/unpublish', (r) => { api.unpublished.push(JSON.parse(r.request().postData()).siteId); api.sites.forEach((s) => { s.status = 'unpublished'; }); r.fulfill({ json: { ok: true } }); });

  let gate = false, configRequests = 0;
  await page.route('**/builder.html', async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: gate ? (await res.text()).replace('</head>', '<meta name="access-gate" content="on"></head>') : await res.text() }); });
  page.on('request', (rq) => { if (/\/api\/config/.test(rq.url())) configRequests++; });
  const open = async () => { await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#paneGet', { state: 'attached' }); await page.click('#guidedStep-get'); };
  const signIn = () => page.evaluate(() => localStorage.setItem('edvlabs.session', JSON.stringify({ access_token: 'a'.repeat(40), refresh_token: 'r'.repeat(10), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' } })));
  console.log('Guided "Put it online"');

  // the plain repository server: signed out and no access-gate tag, so nothing is shown and nothing is requested
  await open(); await page.waitForTimeout(600);
  assert.strictEqual(await page.locator('#publishBox').count(), 0, 'no sign-in service: nothing is shown');
  assert.strictEqual(configRequests, 0, 'a visitor who is not signed in makes no request');
  // signed in, but this server has no sign-in service: still nothing
  api.config = false; await signIn(); await open(); await page.waitForTimeout(600);
  assert.strictEqual(await page.locator('#publishBox').count(), 0, 'no sign-in service: nothing is shown');
  console.log('  ✓ without a sign-in service the box does not appear, and a signed-out visitor makes no request');

  // signed out: an invitation only
  api.config = true; gate = true; await page.evaluate(() => localStorage.removeItem('edvlabs.session')); await open(); await page.waitForSelector('#publishBox');
  assert(await page.isVisible('#publishSignedOut') && /Sign in/.test(await page.textContent('#publishSignIn')), 'signed out: the invitation shows');
  assert((await page.getAttribute('#publishSignIn', 'href')).endsWith('account/?from=builder'));
  assert(!(await page.isVisible('#publishName')) && !(await page.isVisible('#publishGo')), 'and no name box or button');
  console.log('  ✓ signed out: only a sign-in invitation');

  // signed in with one paid place
  await signIn(); await open(); await page.waitForSelector('#publishName', { state: 'visible' });
  assert(/1 paid place left/.test(await page.textContent('#publishPlaces')), await page.textContent('#publishPlaces'));
  assert(!(await page.isVisible('#publishAsk')), 'no need to ask when a paid place is free');
  assert(await page.isDisabled('#publishGo'), 'no name yet: nothing to press');
  console.log('  ✓ signed in: the name box shows with the paid places left');

  // typing a name: local rules first (no request), then the server check
  await page.click('#guidedStep-blocks'); await page.evaluate(() => window.builderManager.clearStack());
  for (const k of ['banner', 'about', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-get');
  const checks = () => api.nameChecks;
  await page.fill('#publishName', 'www'); await page.waitForTimeout(700);
  assert(/kept for edvlabs/.test(await page.textContent('#publishNameNote')) && await page.isDisabled('#publishGo') && checks() === 0, 'a reserved name is refused on the spot, with no request: ' + await page.textContent('#publishNameNote'));
  await page.fill('#publishName', 'p0rn'); await page.waitForTimeout(700);
  assert(/not allowed/.test(await page.textContent('#publishNameNote')) && checks() === 0);
  await page.fill('#publishName', 'taken-name'); await page.waitForFunction(() => /taken/.test(document.getElementById('publishNameNote').textContent));
  assert(await page.isDisabled('#publishGo'), 'a taken name cannot be published');
  await page.fill('#publishName', 'Bakery-Anna'); await page.waitForFunction(() => /is free/.test(document.getElementById('publishNameNote').textContent));
  assert(/bakery-anna\.edvlabs\.com is free/.test(await page.textContent('#publishNameNote')) && !(await page.isDisabled('#publishGo')));
  console.log('  ✓ name rules apply while typing; the server says free or taken; the button waits for "free"');

  // fast typing sends one check, not one per key
  api.nameChecks = 0; await page.fill('#publishName', ''); await page.type('#publishName', 'quick-shop', { delay: 30 }); await page.waitForFunction(() => /is free/.test(document.getElementById('publishNameNote').textContent));
  assert(api.nameChecks <= 2, 'typing is debounced: ' + api.nameChecks + ' checks');
  await page.fill('#publishName', 'bakery-anna'); await page.waitForFunction(() => /bakery-anna\.edvlabs\.com is free/.test(document.getElementById('publishNameNote').textContent));

  // publish: the real export goes to the API, the answer is a link
  await page.click('#publishGo');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent), null, { timeout: 30000 }).catch(async (e) => { console.log('RESULT TEXT:', await page.textContent('#publishResult'), '| errors:', errors.join(' / ')); throw e; });
  const sent = api.published[0];
  assert.strictEqual(sent.name, 'bakery-anna');
  const paths = sent.files.map((f) => f.path);
  assert(paths.includes('index.html') && paths.includes('style.css') && paths.includes('script.js'), 'the finished site is sent: ' + paths.join(', '));
  assert(!paths.some((p) => /^(admin|cms)/.test(p)), 'the content editor is not published: ' + paths.join(', '));
  /* what the browser sends is exactly what the server's script check accepts (the library read from the repository's own files) */
  const checker = require('../../functions/lib/script-check.js').createScriptChecker({ library: async (slug) => { try { return require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'features', slug, 'script.js'), 'utf8'); } catch (e) { return null; } } });
  for (const f of sent.files.filter((x) => x.path.endsWith('.js'))) { const r = await checker.check(f.content); assert(r.ok, f.path + ' passes the server script check: ' + r.problem); }
  const check = require('../../functions/lib/publish.js').checkFiles(sent.files);
  assert(check.ok, 'the server would accept what the builder sends: ' + (check.errors || []).join(' | '));
  const index = sent.files.find((f) => f.path === 'index.html').content;
  assert(/<html/.test(index) && /<title>/.test(index), 'it is a real page');
  const link = page.locator('#publishResult a');
  assert.strictEqual(await link.getAttribute('href'), 'https://bakery-anna.edvlabs.com/'); assert.strictEqual(await link.getAttribute('rel'), 'noopener');
  assert(/1 paid place left|no paid place/.test(await page.textContent('#publishPlaces')) && /no paid place/.test(await page.textContent('#publishPlaces')), 'the place is used: ' + await page.textContent('#publishPlaces'));
  assert(await page.isVisible('#publishAsk'), 'with no paid place left, the way to ask edvlabs shows');
  assert(/bakery-anna\.edvlabs\.com/.test(await page.textContent('#publishSites')) && /Online/.test(await page.textContent('#publishSites')));
  assert.strictEqual(await page.inputValue('#publishName'), '', 'the name box is clear for the next site');
  console.log('  ✓ publishing sends the real export without the editor, shows the live link, lists the site');

  // a file kind a live site cannot hold (a video): the page still publishes, and the person is told what was left out
  api.published.length = 0;
  await page.evaluate(() => { const real = window.builderExport.collectFiles; window.__realCollect = real; window.builderExport.collectFiles = async (o) => { const c = await real(o); c.assets['assets/clip.mp4'] = new Uint8Array([0, 0, 0, 24]); c.assets['assets/theme.mp3'] = new Uint8Array([73, 68, 51]); return c; }; });
  await page.click('[data-act="update"]');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent));
  const warn = await page.textContent('#publishResult');
  assert(/Left out: assets\/clip\.mp4, assets\/theme\.mp3\./.test(warn) && /will not show or play/.test(warn), warn);
  assert.strictEqual(await page.getAttribute('#publishResult', 'data-problem'), 'true');
  assert(!api.published[0].files.some((f) => /\.(mp4|mp3)$/.test(f.path)), 'the left-out files are not sent');
  assert(!/Left out/.test(await page.evaluate(() => { window.builderExport.collectFiles = window.__realCollect; return ''; })), 'collection restored');
  console.log('  ✓ a video or sound is not silently dropped: the person is told what was left out');

  // update the same site, then take it offline and bring it back
  api.published.length = 0;
  await page.click('[data-act="update"]');
  await page.waitForFunction(() => /Your page is online/.test(document.getElementById('publishResult').textContent));
  assert.strictEqual(api.published[0].name, 'bakery-anna'); console.log('  ✓ "Update with this page" publishes to the same name');
  // renaming: checked as typed, one button, the new address, the old one explained
  await page.click('[data-act="rename"]');
  assert(await page.isVisible('.gt-rename') && await page.isDisabled('[data-act="rename-save"]'), 'the form opens with the button waiting');
  await page.fill('.gt-rename input', 'bakery-anna'); await page.waitForFunction(() => /already the name/.test(document.querySelector('.gt-rename small').textContent));
  assert(await page.isDisabled('[data-act="rename-save"]'), 'the same name cannot be saved');
  await page.fill('.gt-rename input', 'www'); await page.waitForFunction(() => /kept for edvlabs/.test(document.querySelector('.gt-rename small').textContent));
  await page.fill('.gt-rename input', 'taken-name'); await page.waitForFunction(() => /taken/.test(document.querySelector('.gt-rename small').textContent));
  assert(await page.isDisabled('[data-act="rename-save"]'), 'a taken name cannot be saved');
  await page.fill('.gt-rename input', 'anna-bakery'); await page.waitForFunction(() => /is free/.test(document.querySelector('.gt-rename small').textContent));
  await page.click('[data-act="rename-save"]');
  await page.waitForFunction(() => /The name is changed/.test(document.getElementById('publishResult').textContent));
  assert.deepStrictEqual(api.renames[0], { siteId: '00000000-0000-4000-8000-000000000001', name: 'anna-bakery' });
  const done = await page.textContent('#publishResult'); assert(/anna-bakery\.edvlabs\.com/.test(done) && /bakery-anna\.edvlabs\.com, sends visitors to the new one for 90 days/.test(done), done);
  assert.strictEqual(await page.locator('#publishResult a').getAttribute('href'), 'https://anna-bakery.edvlabs.com/');
  await page.waitForFunction(() => /anna-bakery\.edvlabs\.com/.test(document.getElementById('publishSites').textContent));
  assert.strictEqual(await page.locator('.gt-rename').count(), 0, 'the form is gone after a rename');
  await page.click('[data-act="rename"]'); await page.fill('.gt-rename input', 'twice-limit'); await page.waitForFunction(() => /is free/.test(document.querySelector('.gt-rename small').textContent));
  await page.click('[data-act="rename-save"]'); await page.waitForFunction(() => /renamed twice in 30 days/.test(document.getElementById('publishResult').textContent));
  assert.strictEqual(await page.getAttribute('#publishResult', 'data-problem'), 'true');
  await page.click('[data-act="rename-cancel"]'); assert.strictEqual(await page.locator('.gt-rename').count(), 0);
  console.log('  ✓ rename: checked as typed, saved, the old address explained, the limit in plain words, cancel closes it');

  await page.click('[data-act="offline"]');
  await page.waitForFunction(() => /is offline/.test(document.getElementById('publishResult').textContent));
  assert.deepStrictEqual(api.unpublished, ['00000000-0000-4000-8000-000000000001']); await page.waitForFunction(() => /Offline/.test(document.getElementById('publishSites').textContent));
  assert.strictEqual(await page.locator('[data-act="offline"]').count(), 0, 'an offline site offers to come back, not to go offline again');
  assert(/Put back online/.test(await page.textContent('[data-act="update"]')));
  console.log('  ✓ take offline, and put back online');

  // refusals in plain words
  await page.fill('#publishName', 'second-shop'); await page.waitForFunction(() => /second-shop\.edvlabs\.com is free/.test(document.getElementById('publishNameNote').textContent));
  await page.click('#publishGo');
  await page.waitForFunction(() => /paid extra/.test(document.getElementById('publishResult').textContent));
  assert.strictEqual(await page.getAttribute('#publishResult', 'data-problem'), 'true');
  console.log('  ✓ no paid place: the refusal is in plain words and the way to ask edvlabs is shown');

  // an empty page cannot be published
  await page.evaluate(() => window.builderManager.clearStack());
  await page.fill('#publishName', 'empty-page'); await page.waitForFunction(() => /empty-page\.edvlabs\.com is free/.test(document.getElementById('publishNameNote').textContent));
  await page.click('#publishGo'); await page.waitForFunction(() => /at least one block/.test(document.getElementById('publishResult').textContent));
  console.log('  ✓ an empty page: "Add at least one block first."');

  // a session the service no longer accepts: back to the invitation
  api.signedIn = false; await open(); await page.waitForSelector('#publishBox'); await page.waitForFunction(() => !document.getElementById('publishSignedOut').hidden);
  assert(!(await page.isVisible('#publishName')), 'a rejected session shows the invitation');
  console.log('  ✓ a session that is no longer valid shows the sign-in invitation');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('Guided publish e2e ok');
})().catch((e) => { console.error(e); process.exit(1); });
