/**
 * React project export through the real "Download React project" button: unpack the ZIP, check its files and that
 * assets landed in public/.
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
  console.log('React project export');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.evaluate(() => {
    const sm = window.builderPreview.stackManager;
    sm.setTheme('clean-minimal');
    sm.setPage({ title: 'Zephyr Dental' });
    sm.setStack([
      { id: 'a', slug: 'alice-scroll-story', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } },
      { id: 'b', slug: 'waitlist-hero', sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }
    ]);
  });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('downloadReactBtn').click())]);
  const zip = await require('jszip').loadAsync(fs.readFileSync(await dl.path()));
  const names = Object.keys(zip.files);
  for (const f of ['package.json', 'vite.config.ts', 'index.html', 'src/App.tsx', 'src/main.tsx', 'src/components/ui/alice-scroll-story.tsx', 'src/sections/alice-scroll-story.tsx', 'README.md']) assert(names.includes(f), 'missing ' + f);
  assert(names.some(n => n.startsWith('public/assets/library/edv-art-')), 'library images in public/');
  for (const f of ['src/sections/waitlist-hero.tsx', 'src/legacy/waitlist-hero.html', 'src/legacy/waitlist-hero.js', 'src/styles/waitlist-hero.css', 'src/lib/plain.ts']) assert(names.includes(f), 'plain-HTML section is wrapped: missing ' + f);
  assert(!/<script/i.test(await zip.file('src/legacy/waitlist-hero.html').async('string')), 'no script tags left in the markup');
  const readme = await zip.file('README.md').async('string');
  assert(!/Sections left out/.test(readme), 'nothing was left out');
  assert((await zip.file('index.html').async('string')).includes('<title>Zephyr Dental</title>'));
  console.log('  ✓ project files, assets and README');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ React export flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
