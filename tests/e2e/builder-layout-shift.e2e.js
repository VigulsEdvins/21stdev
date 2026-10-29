/** The builder page must not jump while it loads (plan E6.12): the header and the step bar have their final size from the first paint.
 *  Measures the real layout-shift entries from load until the step bar exists, at phone, tablet and desktop widths. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer(); const browser = await launchBrowser();
  console.log('Layout shift while loading');
  for (const w of [320, 375, 412, 520, 600, 700, 800, 1360]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 823 } });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } catch (e) { /* storage blocked */ }
      window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* not supported */ }
    });
    const page = await ctx.newPage();
    await page.goto(srv.url + '/builder.html'); await page.waitForSelector('#guidedBar'); await page.waitForSelector('#blockPicker'); await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => window.__cls);
    assert(cls < 0.06, 'layout shift ' + cls.toFixed(3) + ' at ' + w + ' px');
    assert(!(await page.evaluate(() => !!document.getElementById('guidedSkel'))), 'the placeholder is gone at ' + w);
    await ctx.close();
  }
  console.log('  ✓ no visible jump while loading at 320 to 1360 px');
  await browser.close(); await srv.close();
  console.log('✅ Layout shift passed!');
})().catch((e) => { console.error(e); process.exit(1); });
