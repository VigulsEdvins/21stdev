/** The whole-website samples: an edit made in a sample's admin panel and published shows on that sample's own page, in that browser only,
    and never on another sample (they share one web address, so their storage names must be their own). */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const base = srv.url + '/site/examples/';
  console.log('Whole-website samples: admin edits');

  await page.goto(base + 'arena/index.html'); await page.waitForTimeout(1500);
  const before = await page.textContent('body');
  assert(!before.includes('SAMPLE EDIT 123'));
  const rosterBefore = await (async () => { await page.goto(base + 'roster/index.html'); await page.waitForTimeout(1500); return page.textContent('body'); })();

  await page.goto(base + 'arena/admin.html'); await page.waitForTimeout(1200);
  await page.click('[data-tab="hero-about"]');
  await page.fill('#hero-subtitle-input', 'SAMPLE EDIT 123');
  await page.waitForFunction(() => !document.getElementById('btn-save-all').disabled, null, { timeout: 5000 });
  await page.click('#btn-save-all');
  await page.waitForFunction(() => document.getElementById('btn-save-all').disabled, null, { timeout: 5000 });
  console.log('  ✓ an edit in the Arena admin can be published');

  await page.goto(base + 'arena/index.html'); await page.waitForTimeout(1500);
  assert((await page.textContent('body')).includes('SAMPLE EDIT 123'), 'the published edit shows on the Arena page');
  console.log('  ✓ the edit shows on the Arena page');

  const keys = await page.evaluate(() => Object.keys(localStorage));
  assert(keys.some(k => k.startsWith('edv_arena_site_data')), 'Arena keeps its content under its own name: ' + keys);
  assert(!keys.some(k => /^edv_site_(data|draft)_v1$|^edv_cms_sync_channel$/.test(k)), 'no shared storage names are used: ' + keys);

  await page.goto(base + 'roster/index.html'); await page.waitForTimeout(1500);
  const rosterAfter = await page.textContent('body');
  assert(!rosterAfter.includes('SAMPLE EDIT 123'), 'the Roster page is not affected by the Arena edit');
  assert.strictEqual(rosterAfter.length, rosterBefore.length, 'the Roster page is unchanged');
  console.log('  ✓ the Roster sample is not affected (own storage names)');

  // a new visitor (a fresh browser) sees the original, not the edit
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto(base + 'arena/index.html'); await fresh.waitForTimeout(1500);
  assert(!(await fresh.textContent('body')).includes('SAMPLE EDIT 123'), 'another visitor does not see the edit');
  console.log('  ✓ another visitor still sees the original page');

  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Whole-website samples: admin edits passed!');
})().catch((e) => { console.error(e); process.exit(1); });
