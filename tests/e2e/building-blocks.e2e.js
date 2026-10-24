/** Behaviour of the sixteen website building blocks (pricing, forms, search, cookie bar, headers, footer, 404 ...). */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  const open = async (slug, viewport) => {
    const page = await ctx.newPage();
    if (viewport) await page.setViewportSize(viewport);
    page.on('pageerror', e => errors.push(slug + ': ' + e.message));
    await page.goto(`${srv.url}/features/${slug}/index.html`);
    return page;
  };
  const step = n => console.log('  ✓ ' + n);
  console.log('Building blocks');

  let p = await open('pricing-table-switch');
  assert.strictEqual(await p.textContent('.ptw-card.is-featured .ptw-amount'), '19');
  await p.click('[data-period="yearly"]');
  assert.strictEqual(await p.textContent('.ptw-card.is-featured .ptw-amount'), '15');
  assert.strictEqual(await p.getAttribute('[data-period="yearly"]', 'aria-pressed'), 'true');
  assert.strictEqual(await p.getAttribute('[data-period="monthly"]', 'aria-pressed'), 'false');
  step('pricing switch changes the prices and the pressed state');
  await p.close();

  p = await open('stats-count-up');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForFunction(() => /12,000\+/.test(document.querySelector('.scu-value').textContent), null, { timeout: 8000 });
  step('stats count up to their final numbers');
  await p.close();
  const rm = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
  await rm.goto(`${srv.url}/features/stats-count-up/index.html`);
  await rm.waitForFunction(() => /99\.9%/.test(document.querySelectorAll('.scu-value')[1].textContent));
  step('with reduced motion the final numbers show at once');

  p = await open('contact-form-validated');
  await p.click('.cfv-btn');
  assert.strictEqual(await p.getAttribute('#cfvName', 'aria-invalid'), 'true');
  assert(/name/i.test(await p.textContent('#cfvNameErr')));
  assert.strictEqual(await p.evaluate(() => document.activeElement.id), 'cfvName', 'focus goes to the first bad field');
  await p.fill('#cfvName', 'Ada'); await p.fill('#cfvEmail', 'not-an-email'); await p.fill('#cfvMsg', 'Hello there, this is long enough.');
  await p.click('.cfv-btn');
  assert(/email/i.test(await p.textContent('#cfvEmailErr')));
  await p.fill('#cfvEmail', 'ada@example.com');
  await p.click('.cfv-btn');
  assert(await p.isVisible('#cfvSuccess'), 'success message after a valid submit');
  step('contact form: errors tied to fields, focus moves, success shows');
  await p.close();

  p = await open('auth-card-login');
  await p.click('#aclEye');
  assert.strictEqual(await p.getAttribute('#aclPass', 'type'), 'text');
  assert.strictEqual(await p.getAttribute('#aclEye', 'aria-pressed'), 'true');
  await p.click('#aclSubmit');
  assert(await p.textContent('#aclEmailErr'));
  await p.click('#aclSwitch');
  assert.strictEqual((await p.textContent('#aclTitle')).trim(), 'Create your account');
  assert.strictEqual(await p.getAttribute('#aclPass', 'autocomplete'), 'new-password');
  step('sign-in card: show password, validation, switch to sign up');
  await p.close();

  p = await open('multi-step-form');
  await p.click('#msfNext');
  assert(await p.textContent('#msfNameErr'), 'step 1 validates');
  await p.fill('#msfName', 'Ada'); await p.fill('#msfEmail', 'ada@example.com');
  await p.click('#msfNext');
  assert(/Step 2 of 3/.test(await p.textContent('#msfLabel')));
  await p.click('#msfNext');
  assert(await p.textContent('#msfTypeErr'), 'step 2 validates');
  await p.selectOption('#msfType', 'Website');
  await p.click('#msfNext');
  assert(/Ada/.test(await p.textContent('#msfSummary')) && /Website/.test(await p.textContent('#msfSummary')), 'summary lists the answers');
  await p.click('#msfBack');
  assert(/Step 2 of 3/.test(await p.textContent('#msfLabel')), 'back works');
  await p.click('#msfNext'); await p.click('#msfNext');
  assert(await p.isVisible('#msfDone'));
  step('multi-step form: validates each step, summarises, goes back, finishes');
  await p.close();

  p = await open('search-suggest-bar');
  await p.fill('#ssbInput', 'pri');
  assert.strictEqual(await p.getAttribute('#ssbInput', 'aria-expanded'), 'true');
  assert(/Pricing/.test(await p.textContent('#ssbList')));
  await p.keyboard.press('ArrowDown');
  assert(await p.getAttribute('#ssbInput', 'aria-activedescendant'));
  await p.keyboard.press('Enter');
  assert(/Pricing and plans/.test(await p.textContent('#ssbPicked')));
  assert.strictEqual(await p.getAttribute('#ssbInput', 'aria-expanded'), 'false');
  await p.fill('#ssbInput', 'su'); await p.keyboard.press('Escape');
  assert(await p.isHidden('#ssbList'));
  step('search suggestions: filter, arrow keys, Enter picks, Escape closes');
  await p.close();

  p = await open('file-drop-zone');
  await p.setInputFiles('#fdzInput', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }, { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.alloc(2048) }]);
  assert.strictEqual((await p.$$('.fdz-file')).length, 1, 'only the image is accepted');
  assert(/notes\.txt/.test(await p.textContent('#fdzMsg')), 'rejected file is named');
  await p.click('.fdz-remove');
  assert.strictEqual((await p.$$('.fdz-file')).length, 0);
  step('file drop zone: accepts images, rejects others, removes');
  await p.close();

  p = await open('cookie-notice-bar');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  assert(await p.isVisible('#cnbBar'));
  await p.click('#cnbToggle');
  assert(await p.isVisible('#cnbSettings'));
  assert.strictEqual(await p.getAttribute('#cnbToggle', 'aria-expanded'), 'true');
  await p.click('#cnbDecline');
  assert(await p.isHidden('#cnbBar'));
  await p.reload();
  assert(await p.isHidden('#cnbBar'), 'the choice is remembered');
  step('cookie bar: settings panel, decline hides it, choice remembered');
  await p.close();

  p = await open('centered-logo-header', { width: 420, height: 800 });
  assert(await p.isHidden('#clhMobile'));
  await p.click('#clhBurger');
  assert(await p.isVisible('#clhMobile'));
  assert.strictEqual(await p.getAttribute('#clhBurger', 'aria-expanded'), 'true');
  await p.keyboard.press('Escape');
  assert(await p.isHidden('#clhMobile'));
  step('centered header: phone menu opens and Escape closes it');
  await p.close();

  p = await open('search-first-header');
  await p.fill('#sfhQ', 'shoes');
  await p.press('#sfhQ', 'Enter');
  assert(/search-first-header/.test(p.url()), 'searching does not navigate away');
  step('search-first header stays on the page');
  await p.close();

  p = await open('cta-footer');
  await p.fill('#ctfEmail', 'nope');
  await p.click('.ctf-btn');
  assert(/valid email/.test(await p.textContent('#ctfMsg')));
  await p.fill('#ctfEmail', 'ada@example.com');
  await p.click('.ctf-btn');
  assert(/Thank you/.test(await p.textContent('#ctfMsg')));
  step('CTA footer validates the email');
  await p.close();

  for (const slug of ['feature-grid-icons', 'logo-cloud-grid', 'team-grid-simple', 'cta-band', 'not-found-page']) {
    p = await open(slug);
    const box = await p.evaluate(() => { const b = document.body.getBoundingClientRect(); return b.height; });
    assert(box > 150, slug + ' renders');
    await p.close();
  }
  step('static blocks render');
  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ Building blocks flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
