/** "New from starter" in the Projects modal builds a page for an industry and keeps it as a project. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Starter projects');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#projectsBtn');
  await page.waitForSelector('#projStarterSelect');
  const options = await page.$$eval('#projStarterSelect option', os => os.map(o => o.value));
  assert(options.includes('saas') && options.includes('portfolio'), 'industries are offered: ' + options);
  await page.selectOption('#projStarterSelect', 'saas');
  page.once('dialog', d => d.accept('Acme Cloud'));
  await page.click('#projStarterBtn');
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Acme Cloud');
  const stack = await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug));
  assert(stack.length >= 4 && stack.length <= 7, 'a starter page was built: ' + stack.join(','));
  await page.click('#closeProjectsModalBtn');
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length >= n, stack.length, { timeout: 20000 });
  await page.waitForTimeout(500);
  // the project keeps it: reload and the page is still there
  await page.reload();
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Acme Cloud');
  assert.deepStrictEqual(await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug)), stack);
  console.log(`  ✓ saas starter built (${stack.length} sections) and kept across a reload`);
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Starter project flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
