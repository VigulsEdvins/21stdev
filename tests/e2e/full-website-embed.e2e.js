/** A full website added in the builder shows the real site (the same page its live URL serves), not a showcase card. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Full website in the builder');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const sites = [['template-mom', '/mom/index.html'], ['template-vivmgmt', '/vivmgmt/index.html'], ['template-betteroff', '/betteroff/index.html'], ['template-carousel-play', '/carousel-gallery-play/index.html'], ['template-cvmaker', '/cvmaker/index.html']];
  for (const [slug, url] of sites) {
    await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'site', slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), slug);
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; const f = d && d.querySelector('#site .fullsite-frame'); return f && f.src; }, null, { timeout: 20000 });
    await page.waitForFunction((u) => { const f = document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame'); try { return f.contentDocument.URL.endsWith(u) && f.contentDocument.readyState === 'complete'; } catch (_) { return false; } }, url, { timeout: 20000 });
    // the site sits in a window that scrolls on its own, tall enough to see a real part of the page
    const winH = await page.evaluate(() => document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame').getBoundingClientRect().height);
    assert(winH >= 560, `${slug}: the site window is tall enough (${winH}px)`);
    const same = await page.evaluate(async (u) => {
      const f = document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame');
      const live = await (await fetch(u)).text();
      const inner = f.contentDocument.documentElement.outerHTML;
      const title = (live.match(/<title>([^<]*)<\/title>/i) || [])[1];
      return { title, innerTitle: f.contentDocument.title };
    }, url);
    assert.strictEqual(same.innerTitle.trim(), (same.title || '').trim().replace(/&amp;/g, '&'), `${slug}: the frame shows the page ${url} serves`);
    console.log(`  ✓ ${slug}: ${url} (window ${Math.round(winH)}px)`);
  }

  // an export keeps the self-contained showcase card: the site's own files are not part of the page
  const html = await page.evaluate(() => window.Assembler.assemblePreviewDocument(window.builderPreview.stackManager.getStack(), window.Assembler.THEME_PRESETS['midnight-dark'], {}));
  assert(!/fullsite-frame/.test(html), 'without embedSites the section is the card');
  console.log('  ✓ without the live preview option the section is still the showcase card');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Full website embed flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
