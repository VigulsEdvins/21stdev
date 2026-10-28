/** Languages in the guided builder: add a language (a linked copy of the page and a language switcher), write in it, remove it, undo, and the downloaded ZIP has both. */
const assert = require('assert');
const fs = require('fs');
const JSZip = require('jszip');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) { /* storage blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url || '')) errors.push(m.text()); });
  const vis = (sel) => page.locator(sel).first().isVisible();
  const st = () => page.evaluate(() => { const m = window.builderManager; const s = m.getState(); return { pages: s.pages.map((p) => ({ slug: p.slug, lang: p.lang, of: p.translationOf, blocks: p.stack.map((x) => x.slug) })), active: m.getActivePageId(), stack: m.getStack().map((x) => x.slug) }; });
  const text = (sel) => page.textContent(sel);
  console.log('Languages');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#languagesBox', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  await page.click('[data-kind="banner"] .bp-add'); await page.click('[data-kind="faq"] .bp-add');
  assert(await vis('#languagesBox'), 'the Languages box is in step 1');
  assert(/more than one language/.test(await text('#langLead')) && !(await vis('#langBar')), 'one language: an invitation, no language row');
  console.log('  ✓ step 1 shows the Languages box with one language');

  await page.selectOption('#langAddSelect', 'lv'); await page.click('#langAdd');
  let s = await st();
  assert.deepStrictEqual(s.pages.map((p) => p.slug), ['index', 'index-lv']); assert.strictEqual(s.pages[1].lang, 'lv'); assert(s.pages[1].of);
  assert.strictEqual(s.stack[0], 'multilingual-lang-switcher', 'the switcher is at the top');
  assert(/2 languages/.test(await text('#langLead')) && await page.locator('#langList .lg-item').count() === 2);
  assert(/Latvian added/.test(await text('#langLive')));
  console.log('  ✓ adding Latvian makes a linked copy and a language switcher');

  await page.click('#guidedStep-get');
  assert(/2 blocks/.test(await text('#getHead')), 'the switcher is not counted as a block you pay for: ' + await text('#getHead'));
  await page.click('#guidedStep-words');
  assert(await vis('#langBar'), 'step 2 shows the Writing in row');
  assert.strictEqual(await page.locator('#langBar .lb-btn.is-here').textContent(), 'English');
  await page.click('#langBar .lb-btn:has-text("Latviešu")');
  s = await st(); assert.strictEqual(s.active, await page.evaluate(() => window.builderManager.getPages()[1].id), 'now on the Latvian page');
  assert.strictEqual(await page.locator('#langBar .lb-btn.is-here').textContent(), 'Latviešu');
  console.log('  ✓ step 2 lets you switch the language you write in');

  await page.click('#guidedStep-get');
  await page.click('#getDownload'); await page.waitForSelector('#exportChecks .export-checks-head');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const names = Object.keys(zip.files);
  assert(names.includes('index.html') && names.includes('index-lv.html'), 'both languages are in the ZIP: ' + names.join(', '));
  const en = await zip.file('index.html').async('string');
  assert(/data-href="index-lv\.html"/.test(en) && /data-href="index\.html"/.test(en), 'the switcher on the English page opens the Latvian one');
  assert(/<html[^>]*lang="lv"/.test(await zip.file('index-lv.html').async('string')), 'the Latvian page says it is Latvian');
  console.log('  ✓ the downloaded site has both languages and a working switcher');

  await page.keyboard.press('Escape'); await page.evaluate(() => { const m = document.querySelector('.export-modal, #exportModal'); if (m) m.hidden = true; });
  await page.click('#guidedStep-blocks');
  await page.click('#langList .lg-item[data-lang="lv"] button:has-text("Remove")');
  assert(/Remove Latvian and its words/.test(await text('#langList')), 'asks first');
  await page.click('#langList button:has-text("Keep it")'); assert.strictEqual((await st()).pages.length, 2, 'Keep it keeps it');
  await page.click('#langList .lg-item[data-lang="lv"] button:has-text("Remove")'); await page.click('#langList button:has-text("Yes, remove it")');
  s = await st(); assert.strictEqual(s.pages.length, 0, 'back to one page'); assert.deepStrictEqual(s.stack.filter((x) => x === 'multilingual-lang-switcher'), [], 'switcher removed');
  await page.evaluate(() => document.getElementById('undoBtn').click());
  s = await st(); assert.strictEqual(s.pages.length, 2, 'Undo brings the language back');
  console.log('  ✓ remove asks first, goes back to one page, and Undo brings it back');

  await page.selectOption('#langSite', 'de');
  assert(/already one of your languages|written in/.test(await text('#langLive')));
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('✅ Languages passed!');
})().catch((e) => { console.error(e); process.exit(1); });
