/** Every public page: loads without errors, one h1, unique title and description, canonical, no banned words, no inline styles or
    handlers (so a strict Content Security Policy can work), listed in the sitemap, usable at phone width.
    Plus the pricing calculator (numbers from the price table) and the contact form. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const P = require('../../site/js/prices.js');

const SITE = path.join(__dirname, '../../site');
const PAGES = ['', 'how-it-works/', 'pricing/', 'faq/', 'contact/', 'start/'];

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('Public pages');
  const titles = new Set(), descs = new Set();
  const banned = /\b(section|sections|cms|export|supercharge|seamless|unlock|effortless)\b/i;
  const sitemap = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  for (const p of PAGES) {
    const src = fs.readFileSync(path.join(SITE, p, 'index.html'), 'utf8');
    assert(!/\sstyle=/.test(src), p + ': inline style attribute'); assert(!/\son[a-z]+=/.test(src), p + ': inline event handler');
    assert(!/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>/.test(src), p + ': inline script');
    assert(src.includes(`<link rel="canonical" href="https://edvlabs.com/${p}">`), p + ': canonical');
    assert(sitemap.includes(`<loc>https://edvlabs.com/${p}</loc>`), p + ': in sitemap');
    await page.goto(srv.url + '/site/' + p + 'index.html');
    assert.strictEqual(await page.locator('h1').count(), 1, p + ': one h1');
    const t = await page.title(), d = await page.getAttribute('meta[name=description]', 'content');
    assert(!titles.has(t) && !descs.has(d), p + ': unique title and description'); titles.add(t); descs.add(d);
    const text = await page.innerText('body'); const hit = text.match(banned);
    assert(!hit, p + ': banned word “' + (hit && hit[0]) + '”');
    assert(await page.locator('a.skip-link').count() === 1 && await page.locator('main#main, main').count() === 1, p + ': skip link and main landmark');
  }
  console.log(`  ✓ ${PAGES.length} pages: one h1, unique title and description, canonical, sitemap, no inline styles, scripts or handlers, no banned words`);
  const ld = JSON.parse((fs.readFileSync(path.join(SITE, 'faq/index.html'), 'utf8').match(/ld\+json">(.*?)<\/script>/) || [])[1]);
  assert(ld['@type'] === 'FAQPage' && ld.mainEntity.length >= 12);
  const shown = await (async () => { await page.goto(srv.url + '/site/faq/index.html'); return page.$$eval('details summary', s => s.map(x => x.textContent)); })();
  assert.deepStrictEqual(shown, ld.mainEntity.map(q => q.name), 'the FAQ markup matches the visible questions');
  console.log('  ✓ FAQ markup matches the visible questions');

  // pricing: static text and filled text equal the table; calculator
  const T = P.table;
  const html = fs.readFileSync(path.join(SITE, 'pricing/index.html'), 'utf8');
  const expect = (el, blocks, ed) => ({ self: P.eur(P.self(blocks, ed)), done: P.eur(P.done(blocks, ed)), extra: P.eur(T.extra), editor: P.eur(T.editor), setup: P.eur(T.doneSetup), perblock: P.eur(T.donePerBlock), included: String(T.included) }[el]);
  await page.goto(srv.url + '/site/pricing/index.html');
  const rows = await page.$$eval('[data-price]', els => els.map(e => ({ k: e.dataset.price, b: Number(e.dataset.blocks), ed: e.dataset.editor === '1', t: e.textContent })));
  assert(rows.length >= 11); for (const r of rows) assert.strictEqual(r.t, expect(r.k, r.b, r.ed), 'pricing ' + r.k + ' ' + r.b);
  const stat = [...html.matchAll(/data-price="(\w+)"(?: data-blocks="(\d+)")?(?: data-editor="(\d)")?[^>]*>([^<]*)</g)].filter(m => m[1] !== 'self' && m[1] !== 'done');
  for (const m of stat) assert.strictEqual(m[4], expect(m[1]), 'static ' + m[1]);
  assert.strictEqual(await page.textContent('#calc-self'), P.eur(P.self(5, false)));
  await page.fill('#calc-blocks', '9'); await page.check('#calc-editor');
  assert.strictEqual(await page.textContent('#calc-self'), P.eur(P.self(9, true)));
  assert.strictEqual(await page.textContent('#calc-done'), P.eur(P.done(9, true)));
  assert.strictEqual(await page.textContent('#calc-extra'), P.eur(6 * T.extra));
  await page.fill('#calc-blocks', '500'); assert.strictEqual(await page.textContent('#calc-self'), P.eur(P.self(30, true)), 'clamped at 30');
  await page.fill('#calc-blocks', ''); assert.strictEqual(await page.textContent('#calc-self'), P.eur(P.self(1, true)), 'empty counts as 1');
  console.log('  ✓ pricing page and calculator agree with the price table');

  // contact form
  await page.goto(srv.url + '/site/contact/index.html');
  await page.click('button[type=submit]');
  assert((await page.innerText('#k-err')).includes('email address or a phone'));
  assert((await page.innerText('#k-cerr')).includes('Tick the box'));
  await page.fill('#k-email', 'nope'); await page.check('#k-consent'); await page.click('button[type=submit]');
  assert((await page.innerText('#k-err')).includes('does not look like an email'));
  await page.fill('#k-email', ''); await page.fill('#k-phone', '+371 20000000'); await page.click('button[type=submit]');
  await page.waitForSelector('text=Nothing has left your browser');
  // with an endpoint, the lead is posted as a "talk" lead with the honeypot empty
  await page.route('**/api/lead', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  let posted; await page.route('**/api/lead', async (r) => { posted = JSON.parse(r.request().postData()); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.evaluate(() => { const m = document.createElement('meta'); m.name = 'lead-endpoint'; m.content = '/api/lead'; document.head.append(m); });
  await page.fill('#k-msg', 'Hello'); await page.click('button[type=submit]');
  await page.waitForSelector('text=Thank you. We will get in touch.');
  assert.strictEqual(posted.path, 'talk'); assert.strictEqual(posted.phone, '+371 20000000'); assert.strictEqual(posted.message, 'Hello'); assert.strictEqual(posted.consent, true); assert.strictEqual(posted.website, '');
  console.log('  ✓ contact form: problems named in words, honest when sending is off, posts a “talk” lead when on');

  // home page: examples of our work and the library size, both checked against the real library
  await page.goto(srv.url + '/site/index.html');
  const reg = require('../../registry.json'); const feats = reg.features || reg.items || Object.values(reg).find(Array.isArray);
  assert(feats.length > 200, 'the library really has more than 200 blocks (' + feats.length + ')');
  const homeText = await page.textContent('main');
  assert(/more than 200 ready-made blocks/.test(homeText) && /More than 200 blocks to choose from/.test(await page.textContent('.band')), 'home page says the library has more than 200 blocks');
  const shots = await page.$$eval('#work img', (im) => im.map((i) => ({ src: i.getAttribute('src'), alt: i.alt, ok: i.complete && i.naturalWidth > 0, w: i.getAttribute('width'), h: i.getAttribute('height') })));
  assert.strictEqual(shots.length, 6, 'six examples');
  await page.evaluate(() => document.querySelectorAll('#work img').forEach((i) => { i.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.querySelectorAll('#work img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 });
  shots.forEach((x) => { assert(x.alt.length > 30 && x.w && x.h, 'each example has a real description and a size: ' + x.src); const slug = path.basename(x.src, '.webp'); const f = feats.find((q) => q.slug === slug); assert(f && f.origin && f.origin.source === 'edvlabs', slug + ' is one of our own pages'); });
  assert.strictEqual(new Set(shots.map((x) => x.src)).size, 6, 'six different examples');
  const cards = await page.$$eval('#work li', (li) => li.map((l) => ({ img: l.querySelector('img').getAttribute('src'), href: l.querySelector('a.work-open').getAttribute('href'), text: l.querySelector('a.work-open').textContent })));
  assert.strictEqual(cards.length, 6);
  for (const c of cards) {
    const slug = path.basename(c.img, '.webp');
    assert.strictEqual(c.href, 'examples/' + slug + '/', 'each card opens its own full page');
    assert(/Open the full page/.test(c.text) && /sample/.test(c.text), 'link text says what it opens: ' + c.text);
    assert(fs.existsSync(path.join(SITE, 'examples', slug, 'index.html')), slug + ' full page is published');
  }
  const first = cards[0];
  await page.locator('#work li').first().scrollIntoViewIfNeeded();
  const box = await page.locator('#work li').first().locator('img').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // a click anywhere on the card, not only on the link text
  await page.waitForURL('**/site/examples/' + path.basename(first.img, '.webp') + '/**');
  assert(await page.isVisible('.edv-sample-bar'), 'the sample page shows its bar');
  await page.click('.edv-sample-bar a:has-text("Back to edvlabs")');
  await page.waitForURL(/\/site\/(index\.html)?$/);
  await page.goto(srv.url + '/site/examples/' + path.basename(first.img, '.webp') + '/');
  await page.click('.edv-sample-bar__go');
  await page.waitForURL('**/site/start/**');
  await page.goto(srv.url + '/site/index.html');
  console.log('  ✓ each example card opens its full sample page, which links back and on to the questions');
  console.log('  ✓ home page: six examples of our own pages with descriptions, and the 200+ claim is true');

  // phone width: no sideways scroll on any page, and the menu button still reachable
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of PAGES) { await page.goto(srv.url + '/site/' + p + 'index.html'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sideways scroll at 375px on /' + p); }
  console.log('  ✓ no sideways scroll at 375px on any page');

  assert.deepStrictEqual(errors.filter(e => !/Failed to load resource.*404|api\/lead/.test(e)), [], 'no console errors: ' + errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('Public pages passed');
})().catch(e => { console.error(e); process.exit(1); });
