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
  console.log('  ✓ one language: the header has no language button');
  const mode = await page.evaluate(() => { const d = document.querySelector('iframe').contentDocument, b = d.querySelector('.edv-mode'); if (!b || b.getBoundingClientRect().width === 0) return null; const before = d.documentElement.getAttribute('data-theme'); b.click(); const r = { before, after: d.documentElement.getAttribute('data-theme'), alt: d.documentElement.getAttribute('data-mode') }; b.click(); r.back = !d.documentElement.hasAttribute('data-mode'); return r; });
  assert(mode && mode.before !== mode.after && mode.alt === 'alt' && mode.back, 'the dark/light button is in the header and flips the page: ' + JSON.stringify(mode));
  console.log('  ✓ the dark/light button flips the preview and back');
  // "Other look": choose a theme for the button to switch to (only themes of the opposite polarity are offered)
  const opts = await page.evaluate(() => Array.from(document.querySelectorAll('#altThemeSelect option')).map((o) => o.value));
  const presetId = opts.filter((v) => v !== 'custom').pop();
  assert(!opts.includes('') && opts.includes('custom') && opts.length >= 3 && !opts.includes(await page.evaluate(() => window.builderManager.getState().theme)), 'the Other look list: only opposite-polarity themes: ' + opts);
  await page.evaluate((v) => { const el = document.getElementById('altThemeSelect'); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, presetId); // the header controls are hidden in the guided mode this test runs in
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().page.altTheme), presetId, 'the choice is saved with the page');
  await page.waitForTimeout(1500);
  const picked = await page.evaluate((id) => { const d = document.querySelector('iframe').contentDocument, b = d.querySelector('.edv-mode'); b.click(); const bg = getComputedStyle(d.body).backgroundColor, want = window.Assembler.THEME_PRESETS[id].bg; b.click(); return { bg, want }; }, presetId);
  const hex = (c) => { const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join(''); };
  assert.strictEqual(hex(picked.bg), picked.want.toLowerCase(), 'the button switches to the chosen theme: ' + JSON.stringify(picked));
  console.log('  ✓ the client can choose the theme the button switches to');

  // custom colours for the other look (the header's Other look select, "Custom colours...")
  const customLook = await page.evaluate(async () => {
    const sel = document.getElementById('altThemeSelect'); sel.value = 'custom'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const dark = window.Assembler.isDarkTheme(window.Assembler.resolveTheme(window.builderManager.getState().theme === 'custom' ? window.builderManager.getState().customColors : window.builderManager.getState().theme));
    const set = (id, v) => { const i = document.getElementById(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
    const bg = dark ? '#fdf6e3' : '#101820';
    set('altBgColor', bg); set('altTextColor', dark ? '#222222' : '#eeeeee'); set('altAccentColor', '#d33682');
    await new Promise((r) => setTimeout(r, 1800));
    const pg = window.builderManager.getState().page, d = document.querySelector('iframe').contentDocument, b = d.querySelector('.edv-mode');
    b.click(); const got = getComputedStyle(d.body).backgroundColor; b.click();
    return { saved: [pg.altTheme, pg.altBg, pg.altAccent], got, bg, shown: getComputedStyle(document.getElementById('altCustomControls')).display };
  });
  const hexOf = (c) => '#' + c.match(/\d+/g).slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
  assert(customLook.saved[0] === 'custom' && customLook.saved[2] === '#d33682' && hexOf(customLook.got) === customLook.bg && customLook.shown !== 'none', 'custom colours for the other look: ' + JSON.stringify(customLook));
  console.log('  ✓ the other look can use the client\'s own colours');
  const guidedAlt = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#lookPicker [aria-label="Other look"] button')); b.find((x) => !x.classList.contains('is-on')).click(); return { n: b.length, saved: window.builderManager.getState().page.altTheme }; });
  assert(guidedAlt.n >= 2 && guidedAlt.saved, 'the guided Look step offers the Other look too: ' + JSON.stringify(guidedAlt));
  console.log('  ✓ the guided Look step has the same choice');

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
  assert(/class="edv-mode"/.test(await zip.file('index.html').async('string')) && /html\[data-mode="alt"\]/.test(css) && /edv-mode/.test(js), 'the downloaded page has the dark/light button, the other look and the script');
  console.log('  ✓ the downloaded pages carry the button and it opens the other language');

  // the downloaded editor: a Light/dark mode tab, and the published choice `__mode: 'off'` takes the button away on the live page
  const dir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'edv-mode-'));
  for (const name of Object.keys(zip.files)) { if (zip.files[name].dir) continue; const f = require('path').join(dir, name); fs.mkdirSync(require('path').dirname(f), { recursive: true }); fs.writeFileSync(f, await zip.file(name).async('nodebuffer')); }
  const live = await ctx.newPage();
  await live.goto('file://' + dir + '/index.html');
  assert(await live.evaluate(() => { const b = document.querySelector('.edv-mode'); return !!b && getComputedStyle(b).display !== 'none'; }), 'the exported page shows the button');
  const content = fs.readFileSync(dir + '/cms-content.js', 'utf8');
  assert(/"mode": \{\s*"has": true/.test(content), 'the exported editor knows the page has the button');
  fs.writeFileSync(dir + '/cms-content.js', content.replace(/"published": \{/, '"published": { "__mode": "off",'));
  await live.goto('file://' + dir + '/index.html');
  assert(await live.evaluate(() => getComputedStyle(document.querySelector('.edv-mode')).display === 'none' && !document.documentElement.hasAttribute('data-mode')), 'published __mode off: the button is gone');
  const ed = await ctx.newPage();
  await ed.goto('file://' + dir + '/admin.html');
  await ed.waitForSelector('#cms-nav-mode:not([hidden])', { timeout: 15000 });
  await ed.click('#cms-nav-mode');
  assert(await ed.locator('#cms-mode-on').count() === 1, 'the downloaded editor has the Light/dark mode tab');
  await live.close(); await ed.close();
  console.log('  ✓ the downloaded editor can switch the button off for the live page');

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

  // the admin panel can switch the light/dark button off and on again
  await page.evaluate(() => { const o = document.getElementById('adminOverlay'); if (o) o.hidden = true; });
  await page.evaluate(() => document.getElementById('openAdminBtn').click());
  const af2 = page.frameLocator('#adminFrame');
  await af2.locator('#cms-nav-mode').click();
  await af2.locator('#cms-mode-on').uncheck();
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().page.modeButton), 'off', 'unticking saves modeButton: off');
  await page.waitForFunction(() => { const f = document.querySelector('#adminFrame').contentDocument.querySelector('iframe'); return f && f.contentDocument && f.contentDocument.querySelector('.page-section') && !f.contentDocument.querySelector('.edv-mode'); }, null, { timeout: 15000 });
  assert.strictEqual(await page.evaluate(() => document.getElementById('altThemeWrap').hidden), true, 'switched off: the builder header has no Other look choice, only the one theme select');
  await af2.locator('#cms-mode-on').check();
  assert.strictEqual(await page.evaluate(() => window.builderManager.getState().page.modeButton), '', 'ticking turns it on again');
  console.log('  ✓ the admin panel switches the light/dark button off and on');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); srv.close && srv.close();
  console.log('✅ Language button in headers passed!');
})().catch((e) => { console.error(e); process.exit(1); });
