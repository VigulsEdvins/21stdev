/** WebGL canvases that are scrolled out of view stop drawing and start again when they come back. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Installed before anything in the page: it sits underneath the pausing wrapper, so it counts only the draw
  // calls that actually go through to WebGL.
  await ctx.addInitScript(() => {
    window.__draws = 0;
    ['WebGLRenderingContext', 'WebGL2RenderingContext'].forEach(n => {
      const proto = window[n] && window[n].prototype;
      if (!proto) return;
      ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(fn => {
        const real = proto[fn];
        if (typeof real === 'function') proto[fn] = function () { window.__draws++; return real.apply(this, arguments); };
      });
    });
  });
  const page = await ctx.newPage();
  console.log('Offscreen WebGL pausing');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => window.builderPreview.stackManager.setStack([
    { id: 'top', slug: 'engraved-ticket', sizing: { heightMode: 'custom', customHeight: 2000, paddingY: 'none' } },
    { id: 'gl', slug: 'caustic-pool', sizing: { heightMode: 'custom', customHeight: 700, paddingY: 'none' } }
  ]));
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('gl') && d.querySelector('#gl canvas'); }, null, { timeout: 20000 });
  const frame = () => page.frames().find(f => f !== page.mainFrame());
  const draws = async (ms) => { await frame().evaluate(() => { window.__draws = 0; }); await page.waitForTimeout(ms); return frame().evaluate(() => window.__draws); };
  await page.waitForTimeout(1000);
  const offscreen = await draws(1500);
  await frame().evaluate(() => document.getElementById('gl').scrollIntoView());
  await page.waitForTimeout(800);
  const visible = await draws(1500);
  console.log(`  draw calls in 1.5 s: offscreen ${offscreen}, on screen ${visible}`);
  assert(visible > 5, 'the canvas draws while on screen');
  await frame().evaluate(() => document.getElementById('top').scrollIntoView());
  await page.waitForTimeout(800);
  const away = await draws(1500);
  console.log(`  after scrolling away again: ${away}`);
  assert(offscreen <= Math.max(2, visible / 10), 'a canvas that starts out of view does not draw');
  assert(away <= Math.max(2, visible / 10), 'drawing pauses once the canvas is out of view');
  await browser.close();
  await srv.close();
  console.log('✅ Offscreen WebGL flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
