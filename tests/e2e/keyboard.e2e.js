/** Keyboard use of the builder shell: tab order reaches the controls with a visible focus, dialogs close with Escape and return focus. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  console.log('Keyboard use');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('.page-section'));

  // 1. tabbing through the shell lands on named controls, and focus is visible
  const stops = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || el.id || '').trim().slice(0, 30);
      const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' || el.matches(':focus-visible');
      return { tag: el.tagName.toLowerCase(), name, visible };
    }));
  }
  const reached = stops.filter(Boolean);
  assert(reached.length >= 20, 'tab reaches many controls, got ' + reached.length);
  const unnamed = reached.filter(s => !s.name && s.tag !== 'iframe');
  assert.strictEqual(unnamed.length, 0, 'every focused control has a name: ' + JSON.stringify(unnamed));
  assert(reached.every(s => s.visible), 'every focused control shows focus: ' + JSON.stringify(reached.filter(s => !s.visible)));
  console.log(`  ✓ ${reached.length} tab stops, all named, focus visible`);

  // 2. dialogs: Escape closes and focus goes back to the button that opened them
  for (const [openId, modalSel, openClass] of [['#openExportModalBtn', '#exportModal', 'is-open'], ['#projectsBtn', '#projectsModal', 'is-open']]) {
    await page.focus(openId);
    await page.keyboard.press('Enter');
    await page.waitForSelector(`${modalSel}.${openClass}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(([s, c]) => !document.querySelector(s).classList.contains(c), [modalSel, openClass]);
    const back = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert.strictEqual('#' + back, openId, `focus returns to ${openId} after Escape, got ${back}`);
  }
  console.log('  ✓ export and projects dialogs: Escape closes, focus returns');

  await browser.close();
  await srv.close();
  console.log('✅ Keyboard flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
