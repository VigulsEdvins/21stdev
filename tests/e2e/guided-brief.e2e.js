/** Entry from the questions: the builder offers to start from the saved answers; bad or missing answers are ignored. */
const assert = require('assert');
const fs = require('fs');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const complete = JSON.parse(fs.readFileSync(__dirname + '/../data/briefs/valid-complete.json', 'utf8'));
complete.answers.blocks.value = ['banner', 'about', 'services', 'map', 'contact']; // map has no component yet

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const open = async (stored) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript((b) => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); if (b) localStorage.setItem('edvlabs.brief_v1', b); } } catch (e) {} }, stored);
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$|fonts\.g/.test(m.location().url || '')) errors.push(m.text()); });
    await page.goto(srv.url + '/builder.html');
    await page.waitForSelector('#blockPicker', { state: 'attached' });
    await page.waitForTimeout(300);
    return { ctx, page, errors };
  };
  console.log('Start from your answers');

  let t = await open(null);
  assert.strictEqual(await t.page.locator('#briefOffer').count(), 0, 'no answers, no offer');
  await t.ctx.close();
  t = await open('{"v":1,"answers":{"purpose":{"value":"nonsense","unknown":false}}}');
  assert.strictEqual(await t.page.locator('#briefOffer').count(), 0, 'a broken brief is ignored');
  await t.ctx.close();
  console.log('  ✓ no offer without answers, and a broken brief is ignored');

  t = await open(JSON.stringify(complete));
  const { page } = t;
  await page.waitForSelector('#briefOffer', { state: 'visible' });
  assert(/chose/.test(await page.textContent('.bo-lead')));
  assert(/Map and opening hours/.test(await page.textContent('.bo-missing')), 'the block with no component is named');
  assert(/replaces/.test(await page.textContent('#briefWarn')), 'warns when the page already has blocks');
  const before = await page.evaluate(() => window.builderManager.getStack().length);
  await page.click('#briefUse');
  const st = await page.evaluate(() => { const s = window.builderManager.getState(); return { titles: s.stack.map(x => x.title), theme: s.theme, bg: s.customColors.bg, fd: s.page.fontDisplay }; });
  assert.deepStrictEqual(st.titles, ['Opening banner', 'About you', 'What you offer', 'Contact form']);
  assert.strictEqual(st.theme, 'custom'); assert.strictEqual(st.bg.toLowerCase(), '#f6efe0'); assert.strictEqual(st.fd, 'Fraunces');
  assert(!(await page.isVisible('#briefOffer')), 'offer goes away once used');
  assert(/4 blocks added/.test(await page.textContent('#briefLive')));
  console.log('  ✓ one click builds the page from the answers (blocks, colours, fonts); the missing block is named');

  await page.click('#guidedStep-get');
  assert.strictEqual(await page.isChecked('#getEditor'), true, 'editor answer carried over');
  assert(/4 blocks/.test(await page.textContent('#getHead')));
  console.log('  ✓ the editor answer reaches the price panel');

  assert(before >= 0);
  await page.click('#guidedStep-blocks');
  await page.click('#undoBtn');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.builderManager.getStack().length);
  assert.strictEqual(after, before, 'one undo gives the old page back (' + before + ' -> 4 -> ' + after + ')');
  console.log('  ✓ undo brings the old page back');
  assert.deepStrictEqual(t.errors, [], t.errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Start from your answers passed!');
})().catch((e) => { console.error(e); process.exit(1); });
