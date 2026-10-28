/** What the browser kept from an earlier visit is cleaned when it is loaded: a javascript: link written into storage does not survive. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('web_builder_tour_done', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  console.log('Saved state is cleaned on load');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && window.builderManager);
  await page.evaluate(() => {
    const m = window.builderManager;
    m.setStack([{ id: 'a', slug: 'cta-band', title: 'Band', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
    m.setSectionOverride('a', 'link', 'javascript:alert(1)', { selector: ':scope a', type: 'link' });
    m.setSectionOverride('a', 'ok', 'https://example.com/', { selector: ':scope a', type: 'link' });
    window.builderPreview.saveStateToStorage();
  });
  const raw = await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('\n'));
  assert(/javascript:alert/.test(raw), 'the hostile value really is in storage before the reload');
  await page.reload();
  await page.waitForFunction(() => window.builderManager && window.builderManager.getStack().length > 0);
  const ov = await page.evaluate(() => { const s = window.builderManager.getStack().find(x => x.id === 'a'); return s ? JSON.stringify(s.overrides || {}) : 'missing'; });
  assert.notStrictEqual(ov, 'missing', 'the saved page came back');
  assert(!/javascript:/i.test(ov), 'the javascript: link was dropped: ' + ov);
  assert(/example\.com/.test(ov), 'a normal link was kept: ' + ov);
  console.log('  ✓ javascript: dropped, normal link kept');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Saved state is cleaned on load passed!');
})().catch((e) => { console.error(e); process.exit(1); });
