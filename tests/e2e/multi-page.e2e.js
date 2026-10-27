/** Multi-page site: add pages in the UI, link between them, copy header/footer, export one HTML file per page. */
const assert = require('assert');
const fs = require('fs');
const JSZip = require('jszip');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Multi-page site');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#tabSectionsBtn');
  const sm = (fn, arg) => page.evaluate(([f, a]) => { const m = window.builderPreview.stackManager; return JSON.parse(JSON.stringify(m[f](...(a || [])) ?? null)); }, [fn, arg]);
  const homeSections = (await sm('getStack')).length;

  // add a page from the UI
  page.once('dialog', d => d.accept('About us'));
  await page.click('#pageTabs .page-add');
  await page.waitForSelector('#pageTabs .page-tab.is-active:has-text("About us")');
  assert.strictEqual((await page.$$('#pageTabs .page-tab')).length, 2);
  assert.strictEqual((await sm('getStack')).length, 0, 'the new page starts empty');
  await sm('addSection', ['cta-band']);
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  console.log('  ✓ page added from the UI and filled');

  // switch back to home, history knows
  await page.click('#pageTabs .page-tab:has-text("Home")');
  await page.waitForFunction(n => window.builderPreview.stackManager.getStack().length === n, homeSections);
  console.log('  ✓ switching shows the other page');

  // link from home to About
  const pages = await sm('getPages');
  const aboutId = pages.find(p => p.slug === 'about-us').id;
  const firstId = (await sm('getStack'))[0].id;
  await page.evaluate(([id, aid]) => window.builderPreview.stackManager.setSectionOverride(id, 'lnk', 'page:' + aid, { selector: 'a', type: 'link' }), [firstId, aboutId]);

  // page settings for a canonical address so the sitemap is written
  await page.click('#tabStylingBtn');
  await page.fill('#pageCanonicalInput', 'https://site.example/');
  await page.waitForTimeout(900);

  await page.click('#openExportModalBtn');
  await page.waitForSelector('#exportChecks .export-checks-head');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const names = Object.keys(zip.files);
  for (const n of ['index.html', 'style.css', 'script.js', 'about-us.html', 'about-us.css', 'about-us.js', 'sitemap.xml']) assert(names.includes(n), `${n} in the ZIP: ${names.join(', ')}`);
  const aboutHtml = await zip.file('about-us.html').async('string');
  assert(aboutHtml.includes('href="about-us.css"') && aboutHtml.includes('src="about-us.js"'), 'the About page loads its own CSS and JS');
  assert(/<title>About us \| /.test(aboutHtml), 'page title carries the page name');
  const homeJs = await zip.file('script.js').async('string');
  assert(homeJs.includes('about-us.html') && !homeJs.includes('page:' + aboutId), 'home link points at about-us.html');
  const sitemap = await zip.file('sitemap.xml').async('string');
  assert(sitemap.includes('<loc>https://site.example/</loc>') && sitemap.includes('https://site.example/about-us.html'), 'sitemap lists both pages');
  for (const n of ['admin.html', 'admin.js', 'cms.js', 'cms-content.js']) assert(names.includes(n), `${n} in the ZIP`);
  assert(/<script src="about-us\.js"><\/script>\s*<script src="cms-content\.js"><\/script>\s*<script src="cms\.js"><\/script>/.test(aboutHtml), 'the About page loads the CMS scripts');
  const cmsContent = new Function('window', (await zip.file('cms-content.js').async('string')) + '; return window.EDV_CMS;')({});
  assert.deepStrictEqual(cmsContent.pages.map(p => p.file), ['index.html', 'about-us.html'], 'the editor lists every page');
  assert(cmsContent.pages.every(p => p.sections.length > 0), 'each page lists its sections');
  const readme = await zip.file('README.md').async('string');
  assert(/## Pages/.test(readme) && /about-us\.html/.test(readme));
  console.log('  ✓ ZIP has one HTML, CSS and JS per page; links and sitemap are right');
  await page.keyboard.press('Escape');

  // reload: pages survive, undo history shows page entries
  await page.reload();
  await page.waitForFunction(() => window.builderPreview && window.builderPreview.stackManager.getPages().length === 2);
  await page.click('#tabSectionsBtn');
  assert.strictEqual((await page.$$('#pageTabs .page-tab')).length, 2, 'pages survive a reload');
  await page.click('#historyBtn');
  const labels = await page.$$eval('#historyList .history-item span', els => els.map(e => e.textContent));
  console.log('  ✓ pages survive a reload; history entries: ' + labels.slice(0, 3).join(' | '));

  // delete the page again
  await page.click('#pageTabs .page-tab:has-text("About us")');
  page.once('dialog', d => d.accept());
  await page.click('#pageTabs .page-delete');
  await page.waitForFunction(() => window.builderPreview.stackManager.getPages().length === 0);
  assert(await page.$('#pageTabs .page-add'), 'back to a single page');
  console.log('  ✓ deleting leaves a single-page project');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Multi-page flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
