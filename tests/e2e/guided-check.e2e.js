/** Guided step 4: plain-words list with fixes, jump to the block, inline title and description. */
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
  const vis = (sel) => page.locator(sel).first().isVisible();
  const has = (id) => page.locator(`#checkList [data-check="${id}"]`).count();
  console.log('Guided check step');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#paneCheck', { state: 'attached' });
  await page.evaluate(() => { window.builderManager.clearStack(); window.builderManager.setPage({ title: 'Assembled Web Page', description: '' }); });
  await page.click('#guidedStep-check');
  await page.waitForSelector('#checkList li');
  assert(await vis('#paneCheck') && !(await vis('#blockPicker')), 'check panel replaces the block picker');
  assert(await has('empty') === 1 && /no blocks/.test(await page.textContent('#checkList')), 'empty page says so');
  assert(!(await vis('#exportModal')) , 'no download window opens on step 4');
  console.log('  ✓ step 4 shows its own panel; an empty page is named');

  await page.click('#guidedStep-blocks');
  for (const k of ['banner', 'services']) await page.click(`[data-kind="${k}"] .bp-add`);
  await page.click('#guidedStep-check');
  await page.waitForFunction(() => document.querySelectorAll('#checkList [data-check^="sample-"]').length === 2, null, { timeout: 20000 });
  assert(await has('page-title') === 1 && await has('page-description') === 1, 'title and description asked for');
  assert(/things to look at/.test(await page.textContent('#checkHead')));
  console.log('  ✓ placeholder title, missing description and sample-text blocks are listed');

  await page.fill('#checkList [data-check="page-title"] input', 'My little shop');
  await page.click('#checkList [data-check="page-title"] button');
  await page.fill('#checkList [data-check="page-description"] textarea', 'Handmade soap made in Riga.');
  await page.click('#checkList [data-check="page-description"] button');
  await page.waitForFunction(() => !document.querySelector('#checkList [data-check="page-title"]') && !document.querySelector('#checkList [data-check="page-description"]'), null, { timeout: 20000 });
  const pg = await page.evaluate(() => window.builderManager.getState().page);
  assert.strictEqual(pg.title, 'My little shop'); assert.strictEqual(pg.description, 'Handmade soap made in Riga.');
  console.log('  ✓ title and description are fixed on the spot and leave the list');

  await page.evaluate(() => { const m = window.builderManager; m.setCustomColors({ bg: '#ffffff', text: '#cccccc', accent: '#2b4dd8' }); m.setTheme('custom'); });
  await page.waitForSelector('#checkList [data-check="contrast-text"]', { timeout: 20000 });
  await page.click('#checkList [data-check="contrast-text"] button');
  await page.waitForFunction(() => !document.querySelector('#checkList [data-check="contrast-text"]'), null, { timeout: 20000 });
  console.log('  ✓ hard-to-read colours are fixed in one click');

  const target = await page.evaluate(() => window.builderManager.getStack()[1].id);
  await page.click(`#checkList [data-check="sample-${target}"] button`);
  assert.strictEqual(await page.getAttribute('#guidedStep-words', 'aria-current'), 'step', 'jumps to the Words step');
  assert.strictEqual(await page.inputValue('#contentSectionSelect'), target, 'with that block picked');
  assert(!(await vis('#paneCheck')), 'check panel is hidden again');
  console.log('  ✓ "Write your words" jumps to Words with that block picked');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Guided check step passed!');
})().catch((e) => { console.error(e); process.exit(1); });
