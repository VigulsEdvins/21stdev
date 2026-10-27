/** The header theme select and the Styling tab (preset cards, palette) always show the same theme. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');

(async () => {
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  console.log('Theme controls stay in step');
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  const view = () => page.evaluate(() => ({
    select: document.getElementById('themePresetSelect').value,
    card: (document.querySelector('#themePresetCards .theme-card-btn.is-active') || {}).dataset && document.querySelector('#themePresetCards .theme-card-btn.is-active').dataset.theme,
    headerBg: document.getElementById('bgColor') && document.getElementById('bgColor').value,
    sideBg: document.getElementById('sidebarBgColor').value,
    sideText: document.getElementById('sidebarTextColor').value,
    sideAccent: document.getElementById('sidebarAccentColor').value
  }));
  const preset = (id) => page.evaluate(i => window.Assembler.THEME_PRESETS[i], id);
  await page.click('#tabStylingBtn').catch(() => {});

  // header select -> Styling tab
  await page.selectOption('#themePresetSelect', 'clean-minimal');
  await page.waitForTimeout(400);
  let v = await view(); let p = await preset('clean-minimal');
  assert.strictEqual(v.card, 'clean-minimal', 'the preset card follows the header select, got ' + v.card);
  assert.strictEqual(v.sideBg.toLowerCase(), p.bg.toLowerCase(), 'the palette background follows');
  assert.strictEqual(v.sideAccent.toLowerCase(), p.accent.toLowerCase(), 'the palette accent follows');
  console.log('  ✓ header select -> preset card and palette');

  // preset card -> header select and colours
  await page.click('#themePresetCards .theme-card-btn[data-theme="warm-editorial"]');
  await page.waitForTimeout(400);
  v = await view(); p = await preset('warm-editorial');
  assert.strictEqual(v.select, 'warm-editorial');
  assert.strictEqual(v.headerBg.toLowerCase(), p.bg.toLowerCase(), 'header colours follow the card');
  assert.strictEqual(v.sideText.toLowerCase(), p.text.toLowerCase());
  console.log('  ✓ preset card -> header select and colours');

  // undo goes back and everything follows
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(800);
  v = await view();
  assert.strictEqual(v.select, 'clean-minimal', 'undo restores the select');
  assert.strictEqual(v.card, 'clean-minimal', 'undo restores the card');
  console.log('  ✓ undo keeps both in step');

  // a custom colour from the Styling tab shows up in the header and as "custom"
  await page.evaluate(() => { const i = document.getElementById('sidebarAccentColor'); i.value = '#ff0000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(500);
  v = await view();
  assert.strictEqual(v.select, 'custom');
  assert.strictEqual(v.card, undefined, 'no preset card is active for custom colours');
  assert.strictEqual((await page.evaluate(() => document.getElementById('accentColor').value)).toLowerCase(), '#ff0000');
  console.log('  ✓ a custom colour reaches the header');

  // a project saved with custom colours and a tablet preview comes back with its controls showing the same
  await page.evaluate(() => { const sm = window.builderPreview.stackManager; sm.setCustomColors({ bg: '#102030', text: '#f0f0f0', accent: '#ff8800' }); sm.setTheme('custom'); });
  await page.click('#viewportTabletBtn');
  await page.waitForTimeout(2500);
  await page.reload();
  await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
  await page.waitForTimeout(2500);
  v = await view();
  assert.strictEqual(v.select, 'custom', 'reload keeps the custom theme in the select');
  assert.strictEqual(v.sideBg.toLowerCase(), '#102030', 'reload shows the custom background in the palette');
  assert.notStrictEqual(await page.evaluate(() => getComputedStyle(document.getElementById('customColorsControls')).display), 'none', 'the custom colour pickers are shown for a custom theme');
  assert.strictEqual(await page.getAttribute('#viewportTabletBtn', 'aria-pressed'), 'true', 'the tablet button is pressed after reload');
  console.log('  ✓ reload: custom colours and viewport shown');

  // the viewport buttons follow the project when it is changed from code (a loaded project, an API call)
  await page.evaluate(() => window.builderPreview.stackManager.setViewport('mobile'));
  await page.waitForTimeout(500);
  assert.strictEqual(await page.getAttribute('#viewportMobileBtn', 'aria-pressed'), 'true', 'the mobile button follows the project viewport');
  console.log('  ✓ viewport buttons follow the project');

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join(' | '));
  await browser.close();
  await srv.close();
  console.log('✅ Theme controls flow passed!');
})().catch(e => { console.error(e); process.exit(1); });
