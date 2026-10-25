/** Behaviour of the nine components added for the thin categories (headers, buttons and UI, footers). */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  const open = async (slug) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(slug + ': ' + e.message));
    await page.goto(`${srv.url}/features/${slug}/index.html`);
    return page;
  };
  const step = n => console.log('  ✓ ' + n);
  console.log('New components');

  // sticky shrink header
  let p = await open('sticky-shrink-header');
  assert(!(await p.evaluate(() => document.getElementById('sshHeader').classList.contains('is-scrolled'))));
  await p.evaluate(() => window.scrollTo(0, 300));
  await p.waitForFunction(() => document.getElementById('sshHeader').classList.contains('is-scrolled'));
  const h = await p.evaluate(() => Math.round(document.querySelector('.ssh-bar').getBoundingClientRect().height));
  await p.waitForTimeout(500);
  assert((await p.evaluate(() => Math.round(document.querySelector('.ssh-bar').getBoundingClientRect().height))) < h, 'bar shrinks');
  await p.setViewportSize({ width: 420, height: 800 });
  await p.click('#sshBurger');
  assert.strictEqual(await p.getAttribute('#sshBurger', 'aria-expanded'), 'true');
  await p.keyboard.press('Escape');
  assert.strictEqual(await p.getAttribute('#sshBurger', 'aria-expanded'), 'false');
  step('sticky header shrinks; mobile menu opens and Escape closes it');
  await p.close();

  // mega menu
  p = await open('mega-menu-header');
  const trigger = p.locator('.mmh-trigger').first();
  await trigger.click();
  assert.strictEqual(await trigger.getAttribute('aria-expanded'), 'true');
  assert(await p.isVisible('#mmhPanelProduct'));
  await p.keyboard.press('ArrowDown');
  assert.strictEqual(await p.evaluate(() => document.activeElement.tagName), 'A', 'arrow down moves into the panel');
  await p.keyboard.press('Escape');
  assert.strictEqual(await trigger.getAttribute('aria-expanded'), 'false');
  assert(!(await p.isVisible('#mmhPanelProduct')));
  assert.strictEqual(await p.evaluate(() => document.activeElement.className), 'mmh-trigger', 'focus returns to the trigger');
  step('mega menu opens, arrow keys enter it, Escape closes and returns focus');
  await p.close();

  // bottom tab bar
  p = await open('bottom-tab-bar');
  await p.focus('.btb-tab.is-active');
  await p.keyboard.press('ArrowRight');
  assert.strictEqual(await p.textContent('#btbTitle'), 'Search');
  await p.keyboard.press('End');
  assert.strictEqual(await p.textContent('#btbTitle'), 'Profile');
  assert.strictEqual(await p.getAttribute('.btb-tab.is-active', 'aria-selected'), 'true');
  step('tab bar follows arrow keys and updates the title');
  await p.close();

  // announcement bar
  p = await open('split-nav-announcement');
  await p.click('#snaClose');
  await p.waitForFunction(() => document.getElementById('snaAnnounce').hidden);
  assert(!(await p.isVisible('#snaAnnounce')));
  step('announcement bar dismisses');
  await p.close();

  // magnetic button: leans toward the pointer, ripple on click
  p = await open('magnetic-cta-button');
  const box = await p.locator('#mcbButton').boundingBox();
  await p.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 30);
  await p.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40);
  await p.waitForTimeout(200);
  assert(await p.evaluate(() => parseFloat(document.getElementById('mcbButton').style.getPropertyValue('--x')) > 5), 'button leans right');
  await p.locator('#mcbButton').evaluate(el => el.addEventListener('click', e => e.preventDefault()));
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert(await p.locator('.mcb-ripple').count() >= 1, 'ripple appears');
  step('magnetic button leans and ripples');
  await p.close();

  // switches and segmented control
  p = await open('toggle-switch-set');
  assert.strictEqual(await p.textContent('#tswStatus'), '2 of 3 notifications on');
  await p.locator('.tsw-switch').nth(1).click();
  assert.strictEqual(await p.getAttribute('.tsw-switch >> nth=1', 'aria-checked'), 'true');
  assert.strictEqual(await p.textContent('#tswStatus'), '3 of 3 notifications on');
  await p.locator('.tsw-seg [role=radio]').first().focus();
  await p.keyboard.press('ArrowRight');
  assert.strictEqual(await p.getAttribute('.tsw-seg [role=radio] >> nth=1', 'aria-checked'), 'true');
  assert.strictEqual(await p.getAttribute('.tsw-seg [role=radio] >> nth=0', 'tabindex'), '-1');
  step('switches update the status line; segmented control moves with arrow keys');
  await p.close();

  // toasts
  p = await open('toast-notification-stack');
  await p.waitForSelector('.tns-toast');
  await p.click('.tns-btn[data-kind=error]');
  assert(await p.locator('.tns-toast[data-kind=error][role=alert]').count() === 1, 'errors are announced as alerts');
  const before = await p.locator('.tns-toast').count();
  await p.locator('.tns-x').first().click();
  await p.waitForFunction(n => document.querySelectorAll('.tns-toast').length < n, before);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.querySelectorAll('.tns-toast').length === 0);
  step('toasts stack, dismiss and clear with Escape');
  await p.close();

  // newsletter footer
  p = await open('sitemap-newsletter-footer');
  await p.click('.snf-submit');
  assert.match(await p.textContent('#snfMsg'), /enter your email/i);
  await p.fill('#snfEmail', 'not-an-email');
  await p.click('.snf-submit');
  assert.match(await p.textContent('#snfMsg'), /does not look like/i);
  assert.strictEqual(await p.getAttribute('#snfEmail', 'aria-invalid'), 'true');
  await p.fill('#snfEmail', 'jo@example.com');
  await p.click('.snf-submit');
  assert(await p.isDisabled('.snf-submit'), 'button disabled while sending');
  await p.waitForFunction(() => /Thanks/.test(document.getElementById('snfMsg').textContent));
  assert.strictEqual(await p.inputValue('#snfEmail'), '');
  step('newsletter form validates, disables while sending and confirms');
  await p.close();

  // credits footer: back-to-top
  p = await open('minimal-credits-footer');
  await p.setViewportSize({ width: 1200, height: 360 }); // short window so the page can scroll
  assert(!(await p.isVisible('#mcfTop')), 'hidden at the top');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForSelector('#mcfTop', { state: 'visible' });
  await p.click('#mcfTop');
  await p.waitForFunction(() => window.pageYOffset < 10, null, { timeout: 5000 });
  step('back-to-top appears after scrolling and returns to the top');
  await p.close();

  assert.deepStrictEqual(errors, [], errors.join('; '));
  await browser.close();
  await srv.close();
  console.log('✅ New components flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
