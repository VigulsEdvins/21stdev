/** The language button in headers: hidden with one language; with two it shows in the preview and the downloaded pages and opens the other page. No separate switcher block beside it. */
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
  console.log('Language button in headers');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#languagesBox', { state: 'attached' });
  await page.evaluate(() => {
    const m = window.builderPreview.stackManager; m.clearStack();
    ['sticky-shrink-header', 'faq-accordion-smooth'].forEach((s) => m.insertSection(m.getStack().length, s));
  });
  const frameBtn = () => page.evaluate(() => { const b = document.querySelector('iframe').contentDocument.querySelector('.lsw-lang[data-edv-lang]'); return b ? { shown: !b.hidden && b.getBoundingClientRect().width > 0, items: Array.from(b.querySelectorAll('li')).map((l) => l.textContent) } : null; });
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.ssh-header'), null, { timeout: 25000 });
  const one = await frameBtn();
  assert(!one || !one.shown, 'one language: no button on screen ' + JSON.stringify(one));
  console.log('  ✓ one language: the header has no button');

  await page.selectOption('#langAddSelect', 'lv'); await page.click('#langAdd');
  const st = await page.evaluate(() => window.builderManager.getState().pages.map((p) => ({ lang: p.lang, stack: p.stack.map((s) => s.slug) })));
  assert(st.length === 2 && st.every((p) => !p.stack.includes('multilingual-lang-switcher')), 'no separate switcher block: ' + JSON.stringify(st));
  await page.waitForFunction(() => { const b = document.querySelector('iframe').contentDocument.querySelector('.lsw-lang[data-edv-lang]'); return b && !b.hidden; }, null, { timeout: 25000 });
  const two = await frameBtn();
  assert(two.shown && two.items.length === 2, 'two languages: the header button lists them ' + JSON.stringify(two));
  console.log('  ✓ adding a language shows the header button in the preview, with no extra block');

  await page.click('#guidedStep-get');
  await page.click('#getDownload'); await page.waitForSelector('#exportChecks .export-checks-head');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  for (const f of ['index.html', 'index-lv.html']) {
    const html = await zip.file(f).async('string');
    assert(/<div class="lsw-lang" data-edv-lang="on">/.test(html) && /data-href="index-lv\.html"/.test(html) && /data-href="index\.html"/.test(html), f + ' has a working header button');
  }
  const css = await zip.file('style.css').async('string'), js = await zip.file('script.js').async('string');
  assert(/\[data-edv-lang\] \.lsw-current/.test(css) && /data-lsw-ready/.test(js) && /location\.href = o\.getAttribute\('data-href'\)/.test(js), 'the page carries the CSS and the scripts');
  console.log('  ✓ the downloaded pages carry the button and it opens the other language');

  // the editor panel can remove a language again (after a question), and the main language has no Remove button
  await page.evaluate(() => { const o = document.getElementById('adminOverlay'); if (o) o.hidden = true; });
  await page.evaluate(() => document.getElementById('openAdminBtn').click());
  const af = page.frameLocator('#adminFrame');
  await af.locator('#cms-nav-langs').click();
  await af.locator('.cms-lang-row:has-text("Latviešu") button:has-text("Remove")').click();
  await af.locator('button:has-text("Keep it")').click();
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().pages.length), 2, 'Keep it keeps the language');
  await af.locator('.cms-lang-row:has-text("Latviešu") button:has-text("Remove")').click();
  await af.locator('button:has-text("Yes, remove it")').click();
  await page.waitForFunction(() => window.builderManager.getState().pages.length === 0, null, { timeout: 15000 });
  console.log('  ✓ the editor panel removes a language after asking');
  await page.waitForFunction(() => { const b = document.querySelector('iframe').contentDocument.querySelector('.lsw-lang[data-edv-lang]'); return !b || b.hidden; }, null, { timeout: 25000 });
  console.log('  ✓ back to one language, the header button is gone');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('✅ Language button in headers passed!');
})().catch((e) => { console.error(e); process.exit(1); });
