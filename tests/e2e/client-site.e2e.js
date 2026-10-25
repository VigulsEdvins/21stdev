/**
 * End-to-end "pretend client" run: build a page through the real UI, edit its content, export the ZIP,
 * unpack it into a temp folder and open it from disk (file://), the way a client would receive it.
 * Fails on any console error, failed local request, or broken image in the delivered site.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

const SECTIONS = ['responsive burger menu', 'oklch ambient glow hero', 'client logo marquee', 'ink orbit features', 'ink orbit pricing', 'polaroid string carousel', 'parallax 5col gallery', 'beam wordmark footer'];

async function main() {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const step = n => console.log('  ✓ ' + n);
  const count = () => page.evaluate(() => Number(document.getElementById('stackCountBadge').textContent));

  console.log('Pretend client: build, edit, export, open from disk');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));

  // 1. start from a blank project and add sections by searching
  await page.click('#projectsBtn');
  page.once('dialog', d => d.accept('Zephyr Dental'));
  await page.click('#projBlankBtn');
  await page.waitForFunction(() => document.getElementById('projectNameLabel').textContent === 'Zephyr Dental');
  await page.click('#closeProjectsModalBtn');
  await page.click('.scope-pill[data-scope=sections]');
  for (const query of SECTIONS) {
    const before = await count();
    await page.fill('#elementsSearchInput', query);
    await page.waitForFunction(() => document.querySelector('.element-feature-card'));
    await page.click('.element-add-btn >> nth=0');
    await page.waitForFunction(n => Number(document.getElementById('stackCountBadge').textContent) >= n + 1, before);
  }
  assert(await count() >= SECTIONS.length);
  step(`${await count()} sections added by search`);

  // 2. page settings
  await page.click('#tabStylingBtn');
  await page.fill('#pageTitleInput', 'Zephyr Dental — Gentle care in Riga');
  await page.fill('#pageDescInput', 'Family dentistry with evening appointments.');
  await page.fill('#pageFaviconInput', '🦷');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.title.startsWith('Zephyr Dental'), null, { timeout: 8000 });
  step('page settings applied');

  // 3. edit the hero headline through the Content tab
  await page.click('#tabSectionsBtn');
  await page.click('#tabContentBtn');
  await page.selectOption('#contentSectionSelect', { index: 1 });
  await page.waitForSelector('#contentFields .content-field');
  const headline = page.locator('#contentFields .content-field', { hasText: 'Headline' }).locator('input, textarea').first();
  await headline.fill('Gentle dentistry, on your schedule');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.body.innerText.includes('Gentle dentistry, on your schedule'), null, { timeout: 8000 });
  step('hero headline edited in place');

  // 4. snapshot the version we are about to send
  await page.click('#projectsBtn');
  page.once('dialog', d => d.accept('Sent to client v1'));
  await page.click('#projSnapshotBtn');
  await page.waitForSelector('[data-restore]');
  await page.click('#closeProjectsModalBtn');
  step('snapshot saved');

  // 5. export the ZIP and unpack it
  await page.click('#openExportModalBtn');
  await page.waitForSelector('#exportModal.is-open');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadZipBtn')]);
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-site-'));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) { fs.mkdirSync(path.join(dir, name), { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
  }
  assert(zip.file('favicon.svg') && zip.file('site.webmanifest'), 'an emoji favicon ships as favicon.svg with a manifest');
  const fileCount = Object.keys(zip.files).filter(n => !n.endsWith('/')).length;
  assert(Object.keys(zip.files).some(n => n.startsWith('assets/library/')), 'image-heavy sections bring their assets into the ZIP');
  step(`ZIP unpacked (${fileCount} files)`);

  // 6. open it from disk like the client would
  const site = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const sp = await site.newPage();
  const siteErrors = [];
  const failed = [];
  sp.on('pageerror', e => siteErrors.push(e.message));
  sp.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) siteErrors.push(m.text()); });
  sp.on('requestfailed', r => { if (r.url().startsWith('file:')) failed.push(r.url()); });
  await sp.goto('file://' + path.join(dir, 'index.html'));
  await sp.waitForTimeout(3000);
  const report = await sp.evaluate(() => ({
    title: document.title,
    sections: document.querySelectorAll('.page-section').length,
    headline: document.body.innerText.includes('Gentle dentistry, on your schedule'),
    brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-60))
  }));
  assert.strictEqual(report.title, 'Zephyr Dental — Gentle care in Riga');
  assert(report.sections >= SECTIONS.length, 'all sections present');
  assert(report.headline, 'the edited headline is in the delivered site');
  assert.deepStrictEqual(report.brokenImages, [], 'no broken images when opened from disk');
  assert.deepStrictEqual(failed, [], 'no failed local requests: ' + failed.join(', '));
  assert.deepStrictEqual(siteErrors, [], 'no console errors in the delivered site: ' + siteErrors.join('; '));
  await sp.screenshot({ path: path.join(dir, 'delivered.png') });
  step(`delivered site opens from disk with ${report.sections} sections and no errors`);

  assert.deepStrictEqual(errors, [], 'no uncaught builder errors: ' + errors.join('; '));
  fs.rmSync(dir, { recursive: true, force: true });
  await browser.close();
  await srv.close();
  console.log('✅ Pretend-client flow passed!');
}

main().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
