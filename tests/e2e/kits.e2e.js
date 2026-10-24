/** "New from kit" in the Projects modal builds the exact kit page, and it exports. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Kits');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  await page.click('#projectsBtn');
  await page.waitForSelector('#projKitSelect');
  const ids = await page.$$eval('#projKitSelect option', os => os.map(o => o.value));
  assert(ids.length >= 6, 'kits offered: ' + ids);
  await page.selectOption('#projKitSelect', 'saas-launch');
  page.once('dialog', d => d.accept('Kit client'));
  await page.click('#projKitBtn');
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Kit client');
  const slugs = await page.evaluate(() => window.builderPreview.stackManager.getStack().map(s => s.slug));
  const kit = require('../../scripts/builder/kits.js').KITS.find(k => k.id === 'saas-launch');
  assert.deepStrictEqual(slugs, kit.sections, 'sections match the kit, in order');
  await page.click('#closeProjectsModalBtn');
  await page.waitForFunction(n => document.querySelector('iframe').contentDocument.querySelectorAll('.page-section').length >= n, slugs.length, { timeout: 30000 });
  console.log(`  ✓ kit built (${slugs.length} sections, in order)`);
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Kits flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
