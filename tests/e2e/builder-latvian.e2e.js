/** The Latvian builder at /lv/builder/ (plan 2026-10-31-latvian-builder.md): the same page and files as /builder/ under a <base> tag, its words replaced by
    scripts/builder/ui-lang.js. Checks the page, the headers, the guided steps in Latvian, text added later, the preview left alone, and English untouched. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launchBrowser } = require('../../scripts/lib/browser');
const { buildSite } = require('../../scripts/build-site.js');
const { createServer } = require('../../scripts/dev-site.js');

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'edv-dist-'));
  buildSite({ out: dist });
  const srv = createServer({}, { dir: dist });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } catch (e) { /* storage blocked */ } });
  const errors = [], missing = [];
  const watch = (p) => { p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); }); p.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.status() + ' ' + r.url().replace(base, '')); }); };
  console.log('Latvian builder');

  const r = await fetch(base + '/lv/builder/');
  assert.strictEqual(r.status, 200);
  assert(/frame-ancestors 'none'/.test(r.headers.get('content-security-policy')) && /script-src 'self';/.test(r.headers.get('content-security-policy')), 'the same strict policy as /builder/');
  assert.strictEqual(r.headers.get('x-robots-tag'), 'noindex');
  const html = await r.text();
  assert(/<html lang="lv">/.test(html) && /<base href="\/builder\/" \/>/.test(html) && /name="contact-url" content="\/lv\/contact\/"/.test(html));
  assert((await fetch(base + '/builder/')).headers.get('content-security-policy') === r.headers.get('content-security-policy'));
  assert(!/ui-lang/.test(await (await fetch(base + '/builder/')).text()), 'the English page does not load the translator');
  console.log('  ✓ /lv/builder/ is the builder page in Latvian, under the same strict headers; English does not load the translator');

  const page = await ctx.newPage(); watch(page);
  await page.goto(base + '/lv/builder/');
  await page.waitForSelector('.guided-bar, #guidedBar, [data-guided]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const text = async () => (await page.innerText('body'));
  let t = await text();
  assert(t.includes('1. solis no 5. Izvēlieties lapas blokus un sakārtojiet tos.'), 'step 1 title in Latvian');
  assert(t.includes('Atpakaļ') && t.includes('Tālāk') && t.includes('Lūgt edvlabs to izdarīt'), 'the buttons are Latvian');
  assert.strictEqual(await page.title(), 'edvlabs — lapu veidotājs un priekšskatījums');
  assert.strictEqual(await page.getAttribute('html', 'lang'), 'lv');
  // a text added later (the block list opens) is translated, and so is a message built from a number
  await page.locator('button:visible', { hasText: /^Pievienot$/ }).first().click();
  await page.waitForTimeout(400);
  t = await text();
  assert(/Pievienots/.test(t), 'after adding a block its button says “Pievienots”');
  console.log('  ✓ guided step 1 is in Latvian, including what the builder adds later');

  for (let s = 2; s <= 5; s++) { await page.getByRole('button', { name: /^Tālāk/ }).first().click(); await page.waitForTimeout(500); }
  t = await text();
  assert(/Pamatcena, iekļauti \d+ bloki/.test(t) || /Jūsu lapā ir \d+ (bloks|bloki|bloku)/.test(t), 'step 5 prices are in Latvian: ' + t.slice(0, 200));
  assert(/Pāriet uz lejupielādi/.test(t) && /Ievietot internetā/.test(t), 'the take-it buttons are Latvian');
  console.log('  ✓ the last step (price, download, put it online) is in Latvian');

  // the preview is the visitor's page, not the builder's screen: its words are not touched
  const frames = page.frames().filter((f) => f !== page.mainFrame());
  const frameText = (await Promise.all(frames.map((f) => f.innerText('body').catch(() => '')))).join(' ');
  assert(!/Pievienot|Atpakaļ|Tālāk/.test(frameText), 'the preview frame is not translated');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  assert.deepStrictEqual(missing.filter((x) => !/favicon/.test(x)), [], 'every file the Latvian page asks for exists: ' + missing.join(', '));
  console.log('  ✓ the preview is left alone; no errors, no missing files');

  const en = await ctx.newPage();
  await en.goto(base + '/builder/'); await en.waitForTimeout(2000);
  const et = await en.innerText('body');
  assert(et.includes('Step 1 of 5. Choose the blocks of your page and put them in order.') && !/Pievienot|Tālāk/.test(et), 'the English builder is unchanged');
  console.log('  ✓ the English builder is unchanged');
  // the first-run tour follows the five steps of the guided bar, in both languages
  const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await tctx.addInitScript(() => { try { localStorage.setItem('web_builder_mode', 'guided'); } catch (e) { /* storage blocked */ } });
  for (const [url, title, last] of [['/builder/?tour=1', '1. Pick your blocks', 'Got it'], ['/lv/builder/?tour=1', '1. Izvēlieties blokus', 'Sapratu']]) {
    const tp = await tctx.newPage(); await tp.goto(base + url);
    await tp.waitForSelector('.tour-card', { timeout: 15000 });
    assert.strictEqual((await tp.innerText('.tour-title')).trim(), title);
    assert(await tp.evaluate(() => !!document.querySelector('#guidedStep-blocks.tour-highlight')), 'the first step lights the Blocks step of the bar');
    for (let k = 0; k < 4; k++) await tp.click('.tour-next');
    assert.strictEqual((await tp.innerText('.tour-next')).trim(), last);
    assert(await tp.evaluate(() => !!document.querySelector('#guidedStep-get.tour-highlight')), 'the last step lights “Get it”');
    await tp.click('.tour-next'); assert.strictEqual(await tp.locator('.tour-card').count(), 0);
  }
  console.log('  ✓ the first-run tour walks the guided steps, in English and in Latvian');
  await browser.close(); srv.close();
  console.log('✅ Latvian builder passed!');
})().catch((e) => { console.error(e); process.exit(1); });
