/** Guided step 3: colour sets, font pairs, roundness, and the contrast guard with its one-click fix. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); } } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon\.ico$|fonts\.g/.test(m.location().url || '')) errors.push(m.text()); });
  const vis = (sel) => page.locator(sel).first().isVisible();
  const st = () => page.evaluate(() => { const s = window.builderManager.getState(); return { theme: s.theme, c: s.customColors, p: s.page }; });
  console.log('Guided look step');
  await page.goto(srv.url + '/builder.html');
  await page.waitForSelector('#lookPicker', { state: 'attached' });
  await page.evaluate(() => window.builderManager.clearStack());
  await page.click('#guidedStep-look');
  assert(await vis('#lookPicker') && !(await vis('#themePresetCards')) && !(await vis('#pageFontDisplayInput')), 'picker shown, classic theme cards and font boxes hidden');
  assert(await vis('#pageTitleInput'), 'page title stays reachable');
  assert.strictEqual(await page.locator('#lookPicker .lk-grid[aria-label="Colours"] .lk-btn').count(), 8);
  console.log('  ✓ eight colour sets shown, classic controls hidden, page title still there');

  await page.click('.lk-grid[aria-label="Colours"] .lk-btn:has-text("Night")');
  let s = await st();
  assert.strictEqual(s.theme, 'custom'); assert.strictEqual(s.c.bg.toLowerCase(), '#131a22'); assert.strictEqual(s.c.accent.toLowerCase(), '#f2b84b');
  assert.strictEqual(await page.getAttribute('.lk-grid[aria-label="Colours"] .lk-btn:has-text("Night")', 'aria-pressed'), 'true');
  assert.strictEqual(await page.getAttribute('.lk-grid[aria-label="Colours"] .lk-btn:has-text("Paper")', 'aria-pressed'), 'false');
  assert(/easy to read/.test(await page.textContent('#lookGuard')) && !(await vis('#lookFix')), 'a ready-made set passes the guard');
  console.log('  ✓ a colour set is applied to the page and marked as chosen');

  await page.click('.lk-grid[aria-label="Fonts"] .lk-btn:has-text("Warm")');
  await page.click('.lk-grid[aria-label="Corners"] .lk-btn:has-text("Round")');
  s = await st();
  assert.strictEqual(s.p.fontDisplay, 'Fraunces'); assert.strictEqual(s.p.fontBody, 'DM Sans'); assert.strictEqual(s.p.radius, '16px');
  await page.click('.lk-grid[aria-label="Corners"] .lk-btn:has-text("Original")');
  assert.strictEqual((await st()).p.radius, '');
  console.log('  ✓ font pair and corners are written to the page settings; "each block’s own" clears them');

  await page.evaluate(() => { const m = window.builderManager; m.setCustomColors({ bg: '#ffffff', text: '#bbbbbb', accent: '#ffee99' }); m.setTheme('custom'); });
  await page.waitForSelector('#lookFix', { state: 'visible' });
  const msg = await page.textContent('#lookGuard');
  assert(/text is hard to read/.test(msg) && /buttons and links are hard to see/.test(msg), msg);
  await page.click('#lookFix');
  assert(/easy to read/.test(await page.textContent('#lookGuard')) && !(await vis('#lookFix')), 'one click fixes both');
  assert.strictEqual((await st()).c.bg, '#ffffff', 'the background is kept');
  console.log('  ✓ weak colours are named in plain words and fixed in one click');

  await page.click('#guidedAdvancedSwitch');
  await page.click('#tabStylingBtn');
  assert(!(await vis('#lookPicker')) && await vis('#themePresetCards') && await vis('#pageFontDisplayInput'), 'Advanced shows the classic Styling tab');
  assert.deepStrictEqual(errors, [], errors.join(' | '));
  await browser.close(); await srv.close();
  console.log('✅ Guided look step passed!');
})().catch((e) => { console.error(e); process.exit(1); });
