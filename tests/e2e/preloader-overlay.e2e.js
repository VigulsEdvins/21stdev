/** A preloader covers the whole page while it plays and then hides itself so the page underneath shows. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

// two that finish on their own, two that wait for a button press
const cases = [
  { slug: 'amour-sunrise-preloader' },
  { slug: 'slat-count-preloader' },
  { slug: 'chroma-glitch-preloader', button: '#cgGo' },
  { slug: 'dragon-seal-preloader', button: '#dsEnter' }
];

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  console.log('Preloader overlay');
  const sz = { heightMode: 'auto', customHeight: 600, paddingY: 'none' };
  for (const c of cases) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 1300 } })).newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(srv.url + '/builder.html');
    await page.waitForFunction(() => window.builderPreview && window.builderPreview.stackManager && document.querySelector('iframe'));
    await page.evaluate(({ slug, sz }) => window.builderPreview.stackManager.setStack([{ id: 'p', slug, sizing: sz }, { id: 'q', slug: 'cta-band', sizing: sz }]), { slug: c.slug, sz });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('p'); }, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const frame = page.frames().find(f => f !== page.mainFrame());
    const box = await frame.evaluate(() => { const r = document.getElementById('p').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, iw: innerWidth, ih: innerHeight }; });
    assert(box.x === 0 && box.y === 0 && Math.abs(box.w - box.iw) < 1 && Math.abs(box.h - box.ih) < 1, `${c.slug} covers the whole viewport (${JSON.stringify(box)})`);
    // what is painted must cover the page too: the element on top at every corner and the centre belongs to the preloader
    const uncovered = await frame.evaluate(() => {
      const p = document.getElementById('p');
      const pts = [[2, 2], [innerWidth - 3, 2], [2, innerHeight - 3], [innerWidth - 3, innerHeight - 3], [innerWidth / 2, innerHeight / 2], [innerWidth / 2, innerHeight - 3]];
      return pts.filter(([x, y]) => { const e = document.elementFromPoint(x, y); return !e || !p.contains(e); }).length;
    });
    assert.strictEqual(uncovered, 0, `${c.slug} is on top of the page everywhere`);
    const bottomBg = await frame.evaluate(() => {
      const p = document.getElementById('p'); const e = document.elementFromPoint(innerWidth / 2, innerHeight - 3);
      for (let n = e; n && p.contains(n); n = n.parentElement) { const s = getComputedStyle(n); const c = s.backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; if (s.backgroundImage && s.backgroundImage !== 'none') return s.backgroundImage; }
      return null;
    });
    assert(bottomBg, `${c.slug} paints an opaque background down to the bottom of the viewport`);
    let hidden = false, clicked = false;
    for (let i = 0; i < 40 && !hidden; i++) {
      await page.waitForTimeout(500);
      if (c.button && !clicked) {
        clicked = await frame.evaluate((s) => { const b = document.querySelector(s); if (b && !b.disabled && b.offsetParent) { b.click(); return true; } return false; }, c.button);
      }
      hidden = await frame.evaluate(() => getComputedStyle(document.getElementById('p')).display === 'none').catch(() => false);
    }
    assert(hidden, `${c.slug} hides itself when it is done`);
    assert.deepStrictEqual(errors, [], errors.join('; '));
    console.log(`  ✓ ${c.slug}: covers the page, then reveals it`);
    await page.close();
  }
  await browser.close();
  await srv.close();
  console.log('✅ Preloader overlay flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
