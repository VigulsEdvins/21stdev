/** History panel lists changes in words, jumps to an earlier state and can be cleared. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('History panel');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const count = () => page.evaluate(() => window.builderPreview.stackManager.getStack().length);
  const n0 = await count();
  await page.evaluate(() => window.builderPreview.stackManager.addSection('faq-accordion-smooth'));
  await page.waitForTimeout(400);
  const first = await page.evaluate(() => window.builderPreview.stackManager.getStack()[0].id);
  await page.evaluate(i => window.builderPreview.stackManager.setSectionFlag(i, 'hidden', true), first);
  await page.waitForTimeout(400);
  await page.click('#historyBtn');
  assert.strictEqual(await page.getAttribute('#historyBtn', 'aria-expanded'), 'true');
  const labels = await page.$$eval('#historyList .history-item span', els => els.map(e => e.textContent));
  assert(labels.some(l => /^Added /.test(l)), 'an "Added" entry: ' + labels.join(' | '));
  assert(labels.some(l => /^Hid /.test(l)), 'a "Hid" entry: ' + labels.join(' | '));
  assert.strictEqual(await page.getAttribute('#historyList .history-item:first-child', 'aria-current'), 'true', 'newest is current');
  // jump back to the state before the section was added
  const added = labels.findIndex(l => /^Added /.test(l));
  await page.click(`#historyList li:nth-child(${added + 2}) .history-item`);
  await page.waitForFunction(n => window.builderPreview.stackManager.getStack().length === n, n0);
  console.log('  ✓ jump restores the earlier page (' + n0 + ' sections)');
  await page.click('#historyClearBtn');
  assert.strictEqual((await page.$$('#historyList .history-item')).length, 1, 'only the current state is left');
  assert(await page.isDisabled('#undoBtn'), 'nothing to undo after clearing');
  assert.strictEqual(await count(), n0, 'page unchanged by clearing');
  await page.keyboard.press('Escape');
  assert.strictEqual(await page.getAttribute('#historyBtn', 'aria-expanded'), 'false');
  console.log('  ✓ clear keeps the page, Escape closes');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ History panel flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
