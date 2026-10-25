/**
 * Autosave safety net in the real builder: a corrupt saved copy falls back to the previous one, and a browser
 * that refuses to store shows a warning until saving works again.
 */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const KEY = 'web_builder_state_v2';
  const ready = () => page.waitForFunction(() => window.builderPreview && document.querySelector('iframe').contentDocument && document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const sectionCount = () => page.evaluate(() => window.builderPreview.stackManager.getStack().length);
  console.log('Autosave safety net');

  await page.goto(srv.url + '/builder.html');
  await ready();
  await page.evaluate(() => { const sm = window.builderPreview.stackManager; sm.setStack([{ id: 'a', slug: 'engraved-ticket', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]); });
  // autosave is debounced: let the first save land before making the second change
  await page.waitForFunction(k => { try { return JSON.parse(localStorage.getItem(k)).stack.length === 1; } catch (_) { return false; } }, KEY, { timeout: 8000 });
  await page.evaluate(() => { const sm = window.builderPreview.stackManager; sm.setStack([{ id: 'a', slug: 'engraved-ticket', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }, { id: 'b', slug: 'glass-folder-cards', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]); });
  // autosave is debounced: wait for the second save to land rather than a fixed time
  await page.waitForFunction(k => { try { return JSON.parse(localStorage.getItem(k)).stack.length === 2 && JSON.parse(localStorage.getItem(k + '_prev')).stack.length === 1; } catch (_) { return false; } }, KEY, { timeout: 8000 }).catch(() => {});
  const saved = await page.evaluate(k => ({ now: JSON.parse(localStorage.getItem(k)).stack.length, prev: JSON.parse(localStorage.getItem(k + '_prev')).stack.length }), KEY);
  assert.deepStrictEqual(saved, { now: 2, prev: 1 }, 'the previous good copy is kept');
  console.log('  ✓ each save keeps the one before it');

  // 1. corrupt the current copy: the previous one is restored and the person is told
  await page.evaluate(k => localStorage.setItem(k, '{"stack":[{"id":'), KEY);
  await page.reload();
  await ready();
  assert.strictEqual(await sectionCount(), 1, 'the previous copy (1 section) is restored');
  await page.waitForSelector('.toast, #toastContainer *', { timeout: 5000 });
  assert(await page.evaluate(() => /restored/i.test(document.body.innerText)), 'a message says it was restored');
  assert(await page.evaluate(k => (localStorage.getItem(k + '_corrupt') || '').startsWith('{"stack"'), KEY), 'the unreadable copy is kept aside');
  console.log('  ✓ corrupt copy: previous one restored, unreadable one kept');

  // 2. the browser refuses to store: a warning appears, and goes when saving works again
  await page.evaluate(() => {
    window.__realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  });
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'c', slug: 'holo-card', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForSelector('#storageWarning', { timeout: 5000 });
  assert((await page.textContent('#storageWarning')).includes('storage is full'));
  console.log('  ✓ full storage shows a warning with a backup button');
  await page.evaluate(() => { Storage.prototype.setItem = window.__realSet; });
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'd', slug: 'engraved-ticket', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForFunction(() => !document.getElementById('storageWarning'), null, { timeout: 5000 });
  console.log('  ✓ the warning clears once saving works');

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Autosave flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
