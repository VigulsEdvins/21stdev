/**
 * Page settings -> sharing and search tags: fills the new Styling-tab fields in the real builder and checks the
 * tags reach the preview and the exported index.html.
 */
const assert = require('assert');
const fs = require('fs');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Page settings: sharing and search tags');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabStylingBtn');
  await page.fill('#pageTitleInput', 'Zephyr Dental');
  await page.fill('#pageDescInput', 'Family dentistry in Riga.');
  await page.fill('#pageShareImageInput', 'https://zephyr.example/share.jpg');
  await page.fill('#pageCanonicalInput', 'https://zephyr.example/');
  await page.selectOption('#pageRobotsInput', 'noindex');
  await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.head && d.head.querySelector('meta[property="og:image"]'); }, null, { timeout: 8000 });
  const preview = await page.evaluate(() => {
    const h = document.querySelector('iframe').contentDocument.head;
    return { image: h.querySelector('meta[property="og:image"]').content, canonical: h.querySelector('link[rel=canonical]').href, robots: h.querySelector('meta[name=robots]').content };
  });
  assert.strictEqual(preview.image, 'https://zephyr.example/share.jpg');
  assert.strictEqual(preview.canonical, 'https://zephyr.example/');
  assert(/noindex/.test(preview.robots));
  console.log('  ✓ tags reach the preview');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadSingleHtmlBtn').click())]);
  const html = fs.readFileSync(await dl.path(), 'utf8');
  assert(html.includes('<meta property="og:image" content="https://zephyr.example/share.jpg">'), 'og:image in the export');
  assert(html.includes('<meta name="robots" content="noindex, nofollow">'), 'noindex in the export');
  console.log('  ✓ tags are in the exported page');

  // reload: the settings come back
  await page.reload();
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabStylingBtn');
  assert.strictEqual(await page.inputValue('#pageShareImageInput'), 'https://zephyr.example/share.jpg');
  assert.strictEqual(await page.inputValue('#pageRobotsInput'), 'noindex');
  console.log('  ✓ settings survive a reload');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Page SEO flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
