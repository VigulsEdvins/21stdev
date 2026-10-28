/** Guided step 5: the price meter follows the page and matches the public calculator; editor choice; download; help link. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$|fonts\.g/.test(m.location().url || '')) errors.push(m.text()); });
  const text = (s) => page.textContent(s);
  console.log('Guided get-it step');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#paneGet', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  await page.click('#guidedStep-get');
  assert(/no blocks yet/.test(await text('#getHead')) && /Add blocks in step 1/.test(await text('#getTotal')) && await page.isDisabled('#getDownload'), 'empty page: no price, no download');

  await page.click('#guidedStep-blocks');
  for (const k of ['banner', 'about', 'services', 'reviews', 'contact']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-get');
  assert(/5 blocks/.test(await text('#getHead')));
  assert(/€57/.test(await text('#getTotal')), 'five blocks: 39 + 2x9 = 57, got ' + await text('#getTotal'));
  await page.check('#getEditor');
  assert(/€96/.test(await text('#getTotal')), 'with the editor 96');
  const done = await text('#getDone');
  assert(/€\d+/.test(done) && done.includes(await page.evaluate(() => EdvPrices.eur(EdvPrices.done(5, true)))), done);
  console.log('  ✓ meter follows the page: 5 blocks €57, with editor €96, edvlabs price shown');

  // the public calculator says the same
  const pub = await ctx.newPage();
  await pub.goto(srv.url + '/site/pricing/');
  await pub.fill('#calc-blocks', '5'); await pub.check('#calc-editor');
  assert.strictEqual((await pub.textContent('#calc-self')).trim(), '€96'); await pub.close();
  console.log('  ✓ same total as the public calculator');

  await page.reload(); await page.waitForSelector('#paneGet', { state: 'attached' });
  assert.strictEqual(await page.isChecked('#getEditor'), true, 'editor choice is remembered');
  assert((await page.getAttribute('#getAsk', 'href')).endsWith('contact/') && await page.getAttribute('#getAsk', 'rel') === 'noopener');
  for (const step of ['blocks', 'words', 'look', 'check']) { await page.click('#guidedStep-' + step); assert(await page.isVisible('#guidedAsk'), 'Ask edvlabs visible on ' + step); }
  console.log('  ✓ editor choice remembered; "Ask edvlabs to do it" on every step');

  await page.click('#guidedStep-get');
  await page.click('#getDownload');
  await page.waitForSelector('#tabZip', { state: 'visible' });
  console.log('  ✓ "Go to the download" opens the download window');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Guided get-it step passed!');
})().catch((e) => { console.error(e); process.exit(1); });
