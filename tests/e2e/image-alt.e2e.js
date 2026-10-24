/** A picture description set in the Content data reaches the preview as alt text, and undo-by-removal restores the original. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Picture descriptions');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));
  // a section that contains a picture
  const slugs = await page.evaluate(() => window.FEATURE_REGISTRY.filter(f => f.weight === 'light' && f.type === 'component' && /gallery|card|bento|team|testimonial/i.test(f.title + f.category)).map(f => f.slug).slice(0, 12));
  let target = null;
  for (const slug of slugs) {
    const id = await page.evaluate(s => window.builderPreview.stackManager.addSection(s).id, slug);
    await page.waitForFunction(i => document.querySelector('iframe').contentDocument.getElementById(i), id, { timeout: 20000 });
    await page.waitForTimeout(500);
    const has = await page.evaluate(i => !!document.querySelector('iframe').contentDocument.getElementById(i).querySelector('img[src]'), id);
    if (has) { target = id; break; }
  }
  assert(target, 'found a section with a picture');
  const orig = await page.evaluate(i => document.querySelector('iframe').contentDocument.getElementById(i).querySelector('img').getAttribute('alt'), target);
  await page.evaluate(i => window.builderPreview.stackManager.setSectionOverride(i, 'pic__alt', 'A friendly description', { selector: 'img', type: 'alt' }), target);
  await page.waitForFunction(i => { const im = document.querySelector('iframe').contentDocument.getElementById(i); return im && im.querySelector('img') && im.querySelector('img').getAttribute('alt') === 'A friendly description'; }, target, { timeout: 15000 });
  console.log('  ✓ description reaches the preview');
  await page.evaluate(i => window.builderPreview.stackManager.setSectionOverride(i, 'pic__alt', ''), target);
  await page.waitForFunction(([i, o]) => { const im = document.querySelector('iframe').contentDocument.getElementById(i).querySelector('img'); return im.getAttribute('alt') === o; }, [target, orig], { timeout: 15000 });
  console.log('  ✓ removing it restores the original');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Picture description flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
