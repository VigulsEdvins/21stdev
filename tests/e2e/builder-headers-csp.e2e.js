/** The builder under the REAL headers from site/_headers (plan E16.7): the builder page runs under the strict policy, the preview frame under its own
 *  wider one, and a normal session (starter page, heavy blocks from CDNs, a download) breaks none of it. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const H = require('../../scripts/check-headers.js');

(async () => {
  const rules = H.parseHeaders(fs.readFileSync(path.join(__dirname, '../../site/_headers'), 'utf8'));
  const strip = (v) => v.replace('; upgrade-insecure-requests', '');
  const pageCsp = strip(H.effective(rules, '/builder/*')['content-security-policy']);
  const frameCsp = strip(H.effective(rules, '/builder/preview-frame/')['content-security-policy']);
  console.log('Builder under its real headers');
  // the builder page: strict. No inline or eval scripts, no hosts, only our own files
  assert(!/script-src[^;]*('unsafe-inline'|'unsafe-eval'|https?:|\*)/.test(pageCsp), 'the builder page policy allows no inline, eval or remote scripts: ' + pageCsp);
  assert(/frame-ancestors 'none'/.test(pageCsp) && /object-src 'none'/.test(pageCsp));
  // the frame: may run the blocks' own inline code, may be framed only by the builder, and is no wider than the old builder policy
  assert(/script-src[^;]*'unsafe-inline'/.test(frameCsp) && /frame-ancestors 'self'/.test(frameCsp) && !/'unsafe-eval'/.test(frameCsp) && !/script-src[^;]*\*/.test(frameCsp));

  const srv = await startServer(); const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  const policyFor = (url) => (/\/preview-frame\//.test(url) ? frameCsp : /\/builder\.html/.test(url) ? pageCsp : null);
  await page.route('**/*', async (route) => {
    const pol = policyFor(route.request().url());
    if (!pol) return route.continue();
    const res = await route.fetch(); const headers = { ...res.headers(), 'content-security-policy': pol };
    // the fallback tag stays in the page, as in production: both policies apply, the stricter wins
    await route.fulfill({ response: res, headers });
  });
  const violations = []; const errors = [];
  await page.exposeFunction('reportViolation', (v) => violations.push(v));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.reportViolation(e.effectiveDirective + ' ' + (e.blockedURI || 'inline') + ' in ' + (window === window.top ? 'builder page' : 'a frame'))));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => { const d = document.getElementById('previewFrame').contentDocument; return d && d.querySelector('.page-section'); });
  const slugs = await page.evaluate(() => window.FEATURE_REGISTRY.filter((i) => !i.isWidget && i.type !== 'template' && (i.weight === 'heavy' || /gsap|three|react/i.test((i.tech || []).join()))).slice(0, 4).map((i) => i.slug));
  await page.evaluate((s) => { const sm = window.builderPreview.stackManager; sm.setStack([]); s.forEach((x) => sm.addSection({ slug: x, title: x })); }, slugs);
  await page.waitForTimeout(3500);
  // one more block added to the loaded page takes the in-place path (parsed by the preview's own window)
  await page.evaluate((s) => window.builderPreview.stackManager.addSection({ slug: s, title: s }), 'faq-accordion-smooth');
  await page.waitForFunction(() => document.getElementById('previewFrame').contentDocument.querySelectorAll('.page-section').length >= 5);
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => { const d = document.getElementById('previewFrame').contentDocument; return { sections: d.querySelectorAll('.page-section').length, inlineScripts: Array.from(d.scripts).filter((s) => !s.src && s.textContent.trim()).length }; });
  assert(info.sections >= slugs.length && info.inlineScripts > 0, 'the preview ran with its inline scripts (' + JSON.stringify(info) + ')');
  await page.click('#openExportModalBtn'); await page.waitForSelector('#exportModal.is-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  assert(await dl.path());
  console.log('  ✓ ' + slugs.length + ' heavy blocks previewed and exported under the real policies');

  // the admin panel (the content editor over the builder) is its own page: styled, scripted, with its own preview of the page
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.sidebar-tab-btn[data-tab="content"]').click());
  await page.click('#openAdminBtn'); await page.waitForSelector('#adminOverlay:not([hidden])');
  await page.waitForFunction(() => { const d = document.getElementById('adminFrame').contentDocument; const f = d && d.getElementById('cms-frame'); return f && f.contentDocument && f.contentDocument.querySelectorAll('.page-section').length > 0; }, null, { timeout: 15000 });
  const admin = await page.evaluate(() => { const d = document.getElementById('adminFrame').contentDocument; return { sheets: d.styleSheets.length, inputs: d.querySelectorAll('input,textarea').length, bg: getComputedStyle(d.body).backgroundColor }; });
  assert(admin.sheets > 0 && admin.inputs > 3 && admin.bg !== 'rgba(0, 0, 0, 0)', 'the admin panel is styled and working under the real policies: ' + JSON.stringify(admin));
  console.log('  ✓ the admin panel opens, styled, with its own preview, under the real policies');
  assert.deepStrictEqual(violations.filter((v) => /builder page/.test(v)), [], 'the builder page has no violation: ' + violations.join(' | '));
  assert.deepStrictEqual(violations, [], 'no violation anywhere: ' + violations.join(' | '));
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  console.log('  ✓ no policy violation in the builder page or in the preview frame');
  await browser.close(); await srv.close();
  console.log('✅ Builder headers passed!');
})().catch((e) => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
