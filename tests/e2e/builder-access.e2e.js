/** Free blocks and account blocks in the published builder (scripts/builder/access.js). The published page carries <meta name="access-gate" content="on">;
    the repository copy does not, so here the tag is added on the way in. Signed out: free blocks work, the rest invite to sign in and add nothing. Signed in: everything works. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  await page.route('**/builder.html', async (r) => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace('</head>', '<meta name="access-gate" content="on"></head>') }); });
  const vis = (s) => page.locator(s).first().isVisible();
  const slugs = () => page.evaluate(() => window.builderManager.getStack().map((x) => x.slug));
  const open = async () => { await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#blockPicker', { state: 'attached' }); await page.evaluate(() => window.builderManager.clearStack()); };
  console.log('Free and account blocks');

  await open();
  assert(/Sign in free/.test(await page.textContent('#accessPill')), 'signed out: a small sign-in link beside the catalogue title');
  assert((await page.evaluate(() => document.querySelector('.builder-actions').contains(document.getElementById('accessPill')))) === false, 'not in the crowded top bar');
  assert(/unlocks \d+ more/.test(await page.getAttribute('#accessPill', 'title')), 'it says how many blocks a free account unlocks');
  assert(!(await page.$('#accessBox')), 'and nothing takes room in the side panel');
  assert(await page.evaluate(() => BuilderAccess.locked('perspective-tunnel-hero') === true && BuilderAccess.locked('brushstroke-portfolio-hero') === false && BuilderAccess.locked('multilingual-lang-switcher') === false), 'free ones are open, the others locked');
  console.log('  ✓ signed out: the invitation shows and the lock knows which blocks are free');

  await page.click('[data-kind="banner"] .bp-add');
  assert.deepStrictEqual(await slugs(), ['brushstroke-portfolio-hero'], 'the free look of a block kind is added');
  await page.click('.bp-item .bp-look');
  assert.notDeepStrictEqual(await slugs(), ['brushstroke-portfolio-hero'], 'another look is free too: every look of the everyday kinds can be used signed out');
  assert(!(await vis('#accessToast')), 'and nothing asks for an account');
  console.log('  ✓ signed out: the everyday block kinds work in full, with every look');

  // the classic catalogue: the card of a locked block says so, and adding it adds nothing
  await page.evaluate(() => localStorage.setItem('web_builder_mode', 'advanced')); await page.reload(); await page.waitForSelector('#elementsCatalogScroll', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  assert(await vis('#accessFreeBtn') && await page.getAttribute('#accessFreeBtn', 'aria-pressed') === 'false', 'the whole library is listed from the start; Free blocks only is off');
  const shown = () => page.locator('.element-feature-card .element-card-preview-box:not(.element-widget-preview)').evaluateAll((e) => e.map((x) => x.getAttribute('data-slug')).filter(Boolean));
  const all = await shown();
  assert(all.length > 100, 'the library is there to look at: ' + all.length);
  assert(await page.locator('.element-feature-card:has([data-slug="perspective-tunnel-hero"]) .element-lock-badge').count() === 1, 'a block that needs an account carries a lock');
  assert(await page.locator('.element-feature-card:has([data-slug="brushstroke-portfolio-hero"]) .element-lock-badge').count() === 0, 'a free one does not');
  const FREE = await page.evaluate(() => FEATURE_REGISTRY.filter((i) => i.access === 'free').map((i) => i.slug));
  await page.click('#accessFreeBtn');
  const only = await shown();
  assert(only.length > 0 && only.length < all.length && only.every((sl) => FREE.includes(sl)), 'Free blocks only lists just the free ones: ' + only.length);
  await page.click('#accessFreeBtn');
  assert(await vis('#accessPill'), 'the sign-in link shows in the classic catalogue');
  const add = page.locator('.element-feature-card:has(.element-card-preview-box[data-slug="perspective-tunnel-hero"]) .element-add-btn').first();
  await add.scrollIntoViewIfNeeded();
  assert(/Free account needed/.test(await add.textContent()), 'the card of a locked block says so');
  const free = page.locator('.element-feature-card:has(.element-card-preview-box[data-slug="brushstroke-portfolio-hero"]) .element-add-btn').first();
  assert(/Add Section/.test(await free.textContent()), 'and the card of a free one does not');
  await add.click();
  assert(/needs a free account/.test(await page.textContent('#accessToastText')), 'clicking it invites to sign in');
  assert.deepStrictEqual(await slugs(), [], 'nothing was added');
  console.log('  ✓ signed out: the catalogue path refuses a locked block');

  // signed in: a session in this browser unlocks everything
  await page.evaluate(() => { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('edvlabs.session', JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 9999999999 })); });
  await page.reload(); await page.waitForSelector('#blockPicker', { state: 'attached' }); await page.evaluate(() => window.builderManager.clearStack());
  assert(!(await page.locator('#accessPill').isVisible().catch(() => false)), 'signed in: no sign-in link');
  assert(await page.evaluate(() => BuilderAccess.locked('perspective-tunnel-hero')) === false, 'and nothing is locked');
  await page.click('[data-kind="banner"] .bp-add'); await page.click('.bp-item .bp-look');
  assert.notStrictEqual((await slugs())[0], 'brushstroke-portfolio-hero', 'another look works');
  console.log('  ✓ signed in: no lock, another look works');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('✅ Free and account blocks passed!');
})().catch((e) => { console.error(e); process.exit(1); });
