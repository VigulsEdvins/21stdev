/** The builder and catalogue pages carry a Content-Security-Policy, and a normal session breaks none of it. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  const violations = [];
  page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => violations.push('pageerror: ' + e.message));
  console.log('Shell CSP');
  for (const url of ['/index.html', '/builder.html']) {
    await page.goto(srv.url + url);
    const policy = await page.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '');
    assert(/object-src 'none'/.test(policy) && /base-uri 'self'/.test(policy), url + ' has a policy');
    assert(!/script-src[^;]*\*/.test(policy), 'no wildcard script source');
  }
  console.log('  ✓ both pages carry a policy');

  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  const slugs = await page.evaluate(() => window.FEATURE_REGISTRY.filter(i => !i.isWidget && i.type !== 'template' && (i.weight === 'heavy' || /gsap|three|react/i.test((i.tech || []).join()))).slice(0, 4).map(i => i.slug));
  await page.evaluate(s => { const sm = window.builderPreview.stackManager; sm.setStack([]); s.forEach(x => sm.addSection({ slug: x, title: x })); }, slugs);
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.getElementById('openExportModalBtn').click());
  await page.waitForSelector('#exportModal.is-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  assert(await dl.path());
  console.log('  ✓ ' + slugs.length + ' sections previewed and exported with no policy violations');
  assert.deepStrictEqual(violations, [], 'no violations: ' + violations.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Shell CSP flow passed!');
})().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
