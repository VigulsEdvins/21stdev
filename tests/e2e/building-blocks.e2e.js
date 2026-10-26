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
  await p.click('.ptw-opt[data-period="yearly"]');
  assert.strictEqual(await p.textContent('.ptw-card.is-featured .ptw-amount'), '15');
  assert.strictEqual(await p.getAttribute('.ptw-opt[data-period="yearly"]', 'aria-pressed'), 'true');
  assert.strictEqual(await p.getAttribute('.ptw-opt[data-period="monthly"]', 'aria-pressed'), 'false');
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
  const cfv = r => `.cfv-demo [data-rule="${r}"]`;
  const cfvErr = r => `.cfv-demo .cfv-field:has([data-rule="${r}"]) .cfv-error`;
  await p.click('.cfv-demo .cfv-btn');
  assert.strictEqual(await p.getAttribute(cfv('name'), 'aria-invalid'), 'true');
  assert(/name/i.test(await p.textContent(cfvErr('name'))));
  assert.strictEqual(await p.evaluate(() => document.activeElement.getAttribute('data-rule')), 'name', 'focus goes to the first bad field');
  await p.fill(cfv('name'), 'Ada'); await p.fill(cfv('email'), 'not-an-email'); await p.fill(cfv('msg'), 'Hello there, this is long enough.');
  await p.click('.cfv-demo .cfv-btn');
  assert(/email/i.test(await p.textContent(cfvErr('email'))));
  await p.fill(cfv('email'), 'ada@example.com');
  await p.click('.cfv-demo .cfv-btn');
  assert(await p.isVisible('.cfv-demo .cfv-success'), 'success message after a valid submit');
  step('contact form: errors tied to fields, focus moves, success shows');
  await p.close();

  p = await open('auth-card-login');
  await p.click('.acl-demo .acl-eye');
  assert.strictEqual(await p.getAttribute('.acl-demo .acl-pass-input', 'type'), 'text');
  assert.strictEqual(await p.getAttribute('.acl-demo .acl-eye', 'aria-pressed'), 'true');
  await p.click('.acl-demo .acl-btn');
  assert(await p.textContent('.acl-demo .acl-email-err'));
  await p.click('.acl-demo .acl-link');
  assert.strictEqual((await p.textContent('.acl-demo .acl-title')).trim(), 'Create your account');
  assert.strictEqual(await p.getAttribute('.acl-demo .acl-pass-input', 'autocomplete'), 'new-password');
  step('sign-in card: show password, validation, switch to sign up');
  await p.close();

  p = await open('multi-step-form');
  const msfKey = k => `.msf-demo [data-key="${k}"]`;
  const msfNext = '.msf-demo .msf-actions button[type="submit"]';
  const msfLabel = '.msf-demo .msf-step-label';
  await p.click(msfNext);
  assert(await p.textContent(`.msf-demo .msf-field:has([data-key="name"]) .msf-error`), 'step 1 validates');
  await p.fill(msfKey('name'), 'Ada'); await p.fill(msfKey('email'), 'ada@example.com');
  await p.click(msfNext);
  assert(/Step 2 of 3/.test(await p.textContent(msfLabel)));
  await p.click(msfNext);
  assert(await p.textContent(`.msf-demo .msf-field:has([data-key="type"]) .msf-error`), 'step 2 validates');
  await p.selectOption(msfKey('type'), 'Website');
  await p.click(msfNext);
  assert(/Ada/.test(await p.textContent('.msf-demo .msf-summary')) && /Website/.test(await p.textContent('.msf-demo .msf-summary')), 'summary lists the answers');
  await p.click('.msf-demo .msf-back');
  assert(/Step 2 of 3/.test(await p.textContent(msfLabel)), 'back works');
  await p.click(msfNext); await p.click(msfNext);
  assert(await p.isVisible('.msf-demo .msf-done'));
  step('multi-step form: validates each step, summarises, goes back, finishes');
  await p.close();

  p = await open('search-suggest-bar');
  const ssbIn = '.ssb-demo .ssb-input', ssbList = '.ssb-demo .ssb-list';
  await p.fill(ssbIn, 'pri');
  assert.strictEqual(await p.getAttribute(ssbIn, 'aria-expanded'), 'true');
  assert(/Pricing/.test(await p.textContent(ssbList)));
  await p.keyboard.press('ArrowDown');
  assert(await p.getAttribute(ssbIn, 'aria-activedescendant'));
  await p.keyboard.press('Enter');
  assert(/Pricing and plans/.test(await p.textContent('.ssb-demo .ssb-picked')));
  assert.strictEqual(await p.getAttribute(ssbIn, 'aria-expanded'), 'false');
  await p.fill(ssbIn, 'su'); await p.keyboard.press('Escape');
  assert(await p.isHidden(ssbList));
  step('search suggestions: filter, arrow keys, Enter picks, Escape closes');
  await p.close();

  p = await open('file-drop-zone');
  await p.setInputFiles('.fdz-demo .fdz-native', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }, { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.alloc(2048) }]);
  assert.strictEqual((await p.$$('.fdz-demo .fdz-file')).length, 1, 'only the image is accepted');
  assert(/notes\.txt/.test(await p.textContent('.fdz-demo .fdz-msg')), 'rejected file is named');
  await p.click('.fdz-demo .fdz-remove');
  assert.strictEqual((await p.$$('.fdz-demo .fdz-file')).length, 0);
  step('file drop zone: accepts images, rejects others, removes');
  await p.close();

  p = await open('cookie-notice-bar');
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  assert(await p.isVisible('.cnb-demo .cnb-bar'));
  await p.click('.cnb-demo .cnb-link');
  assert(await p.isVisible('.cnb-demo .cnb-settings'));
  assert.strictEqual(await p.getAttribute('.cnb-demo .cnb-link', 'aria-expanded'), 'true');
  await p.click('.cnb-demo .cnb-decline');
  assert(await p.isHidden('.cnb-demo .cnb-bar'));
  await p.reload();
  assert(await p.isHidden('.cnb-demo .cnb-bar'), 'the choice is remembered');
  step('cookie bar: settings panel, decline hides it, choice remembered');
  await p.close();

  p = await open('centered-logo-header', { width: 420, height: 800 });
  assert(await p.isHidden('.clh-demo .clh-mobile'));
  await p.click('.clh-demo .clh-burger');
  assert(await p.isVisible('.clh-demo .clh-mobile'));
  assert.strictEqual(await p.getAttribute('.clh-demo .clh-burger', 'aria-expanded'), 'true');
  await p.keyboard.press('Escape');
  assert(await p.isHidden('.clh-demo .clh-mobile'));
  step('centered header: phone menu opens and Escape closes it');
  await p.close();

  p = await open('search-first-header');
  await p.fill('.sfh-demo .sfh-input', 'shoes');
  await p.press('.sfh-demo .sfh-input', 'Enter');
  assert(/search-first-header/.test(p.url()), 'searching does not navigate away');
  step('search-first header stays on the page');
  await p.close();

  p = await open('cta-footer');
  await p.fill('.ctf-demo .ctf-input', 'nope');
  await p.click('.ctf-demo .ctf-btn');
  assert(/valid email/.test(await p.textContent('.ctf-demo .ctf-msg')));
  await p.fill('.ctf-demo .ctf-input', 'ada@example.com');
  await p.click('.ctf-demo .ctf-btn');
  assert(/Thank you/.test(await p.textContent('.ctf-demo .ctf-msg')));
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
