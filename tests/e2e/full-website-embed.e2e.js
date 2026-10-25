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

  // links inside the site go to the site's own pages (they point at /work.html, the site root of the live domain)
  await page.evaluate(() => window.builderPreview.stackManager.setStack([{ id: 'site', slug: 'template-mom', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]));
  await page.waitForFunction(() => { const f = document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame'); try { return f.contentDocument.URL.endsWith('/mom/index.html') && f.contentDocument.readyState === 'complete'; } catch (_) { return false; } }, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const home = page.frames().find(f => f.url().endsWith('/mom/index.html'));
  await home.locator('a[href="/work.html"]').first().click();
  await page.waitForFunction(() => { const f = document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame'); try { return f.contentDocument.URL.endsWith('/mom/work.html') && f.contentDocument.readyState === 'complete'; } catch (_) { return false; } }, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  const work = await page.evaluate(() => { const d = document.querySelector('iframe').contentDocument.querySelector('#site .fullsite-frame').contentDocument; const cs = getComputedStyle(d.body); return { title: d.title, bg: cs.backgroundColor, font: cs.fontFamily, pad: getComputedStyle(d.querySelector('h1') || d.body).fontSize }; });
  assert(/All Work/i.test(work.title), 'the All Work page of the site opened: ' + work.title);
  assert(!/Times/i.test(work.font) && work.bg !== 'rgba(0, 0, 0, 0)', `the page is styled like the live site (font ${work.font}, background ${work.bg})`);
  console.log('  ✓ All Work inside the site opens the site\'s own styled page');

  // an export keeps the self-contained showcase card: the site's own files are not part of the page
  const html = await page.evaluate(() => window.Assembler.assemblePreviewDocument(window.builderPreview.stackManager.getStack(), window.Assembler.THEME_PRESETS['midnight-dark'], {}));
  assert(!/fullsite-frame/.test(html), 'without embedSites the section is the card');
  console.log('  ✓ without the live preview option the section is still the showcase card');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Full website embed flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
