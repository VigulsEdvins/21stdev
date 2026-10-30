/* The language button in headers (scripts/assembler/lang-slot.js): slot kept or removed, CSS/JS added once, export wiring. */
const assert = require('assert');
const LS = require('../scripts/assembler/lang-slot.js');
const SP = require('../scripts/builder/single-pages.js');
const A = require('../scripts/assembler.js');

const html = '<header><div data-edv-lang></div></header>';
assert(!LS.hasLangSlot(html), 'an empty slot is not the buttons yet');
const noLang = LS.fillLangSlots(html, false);
assert(LS.hasLangSlot(noLang) && /class="edv-mode"/.test(noLang) && !/lsw-menu/.test(noLang), 'one language: the dark/light button only');
const kept = LS.fillLangSlots(html, true);
assert(/class="edv-mode"/.test(kept) && /class="lsw-menu"/.test(kept) && /lsw-lang" data-edv-lang="on" hidden>/.test(kept), 'translations: both, the language button hidden until wired');
console.log('  ✓ slot becomes the dark/light button, plus the language button with translations');

const features = { 'h-a': { html: '<header class="h"><div data-edv-lang></div><a href="#top">x</a></header>', css: '.h{display:flex}', js: '' }, 'plain': { html: '<div>x</div>', css: '', js: '' } };
const mk = (slug) => [{ id: 'sec-1', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }];
const exp = (slug, langSwitch) => A.generateExportBundle(mk(slug), 'dark', features, { page: { title: 'T', lang: 'en' }, langSwitch });
const one = exp('h-a', false), two = exp('h-a', true), none = exp('plain', false);
const all = (b) => b['index.html'] + b['style.css'] + b['script.js'];
assert(!/edv-mode|lsw-|data-mode/.test(all(none)), 'no header: no buttons, no extra styles, no script');
assert(/class="edv-mode"/.test(one['index.html']) && !/lsw-menu/.test(one['index.html']) && !/data-lsw-ready/.test(one['script.js']), 'one language: the dark/light button, no language button or script');
assert(one['style.css'].split('/* Other look').length === 2 && one['script.js'].split("var KEY = 'edv-mode'").length === 2, 'the other look and the switch script, once');
assert(/data-edv-lang="on"/.test(two['index.html']) && two['style.css'].split('/* Header buttons').length === 2 && two['script.js'].split('data-lsw-ready').length === 3, 'translations: language button, CSS and JS once');
console.log('  ✓ export: buttons, other look and scripts only with a header, language part only with translations');

const T = require('../scripts/assembler/theme.js'), TC = require('../scripts/assembler/theme-css.js');
const alt = T.altTheme('midnight-dark');
assert(alt === T.THEME_PRESETS['clean-minimal'] && !T.isDarkTheme(alt) && T.altTheme('clean-minimal') === T.THEME_PRESETS['midnight-dark'], 'without a pick, the other look is the default preset of the opposite polarity');
const scoped = TC.scopeCss(':root { --a: 1; }\n*, *::before { box-sizing: border-box; }\nhtml { color: red; }\nbody { margin: 0; }\n.x, .y:not(.z) { color: blue; }\n@media (max-width: 600px) { .x { color: green; } }\n@keyframes k { from { top: 0; } }', 'html[data-mode="alt"]');
assert(/^html\[data-mode="alt"\] \{ --a: 1; \}/.test(scoped) && !/box-sizing/.test(scoped) && !/keyframes/.test(scoped), 'root and html become the prefix; * and keyframes are dropped');
assert(/html\[data-mode="alt"\] body \{/.test(scoped) && /html\[data-mode="alt"\] \.x,\nhtml\[data-mode="alt"\] \.y:not\(\.z\) \{/.test(scoped) && /@media \(max-width: 600px\) \{\nhtml\[data-mode="alt"\] \.x/.test(scoped), 'other rules and media queries are scoped');
assert(!/^\s*(\.page-section|:root|body)/m.test(TC.generateAltThemeStyles('midnight-dark')), 'every rule of the other look is under the prefix');
console.log('  ✓ the other look: default preset, every rule scoped under html[data-mode="alt"]');

// the client may choose the other look: a preset of the opposite polarity is used; the same polarity or an unknown name falls back to the default
const warm = T.THEME_PRESETS['warm-editorial'], clean = T.THEME_PRESETS['clean-minimal'];
assert(T.isDarkTheme(T.THEME_PRESETS['midnight-dark']) && !T.isDarkTheme(warm), 'presets used below have the expected polarity');
assert.strictEqual(T.altTheme('midnight-dark', 'warm-editorial'), warm, 'a chosen preset of the opposite polarity is used');
assert.strictEqual(T.altTheme('midnight-dark', 'cyber-glow'), T.THEME_PRESETS['clean-minimal'], 'the same polarity is ignored (default)');
assert.strictEqual(T.altTheme('midnight-dark', 'nope'), T.THEME_PRESETS['clean-minimal'], 'an unknown name is ignored (default)');
assert.strictEqual(T.altTheme({ bg: '#ffffff', text: '#111111', accent: '#ff0000' }), T.THEME_PRESETS['midnight-dark'], 'custom colours never feed the other look');
const chosen = A.generateExportBundle(mk('h-a'), 'midnight-dark', features, { page: { title: 'T', lang: 'en', altTheme: 'clean-minimal' } });
assert(chosen['style.css'].includes('--preview-bg: ' + clean.bg + ';', chosen['style.css'].indexOf('/* Other look')), 'the export carries the chosen preset as the other look');
console.log('  ✓ the other look can be a chosen preset of the opposite polarity');

// a rule written for one polarity must not linger in the other look: with the button, the page's own rules apply only outside the alt mode
const modeCss = TC.generateModeThemeStyles('clean-minimal', '');
assert(/^\s*:root \{/.test(modeCss) && /html:not\(\[data-mode="alt"\]\) \.page-section/.test(modeCss) && /^\*, \*::before, \*::after \{/m.test(modeCss), 'variables and the * rule stay; the other rules wait for the base look');
const lightFix = modeCss.indexOf('.hero-pill');
assert(lightFix > 0 && /html:not\(\[data-mode="alt"\]\) \.page-section:not\(\.is-preloader\):not\(\[data-own-palette\]\) \.hero-pill/.test(modeCss.slice(lightFix - 200, lightFix + 80)), 'the light-theme fixes for dark-designed components do not apply in the dark look');
console.log('  ✓ rules of one look do not linger in the other');

// the other look in the client's own colours: only valid #rrggbb values of the opposite look are used
const own = { bg: '#fdf6e3', text: '#222222', accent: '#d33682' };
assert.strictEqual(T.altTheme('midnight-dark', 'custom', own).bg, '#fdf6e3', 'valid colours of the opposite look are used');
assert.strictEqual(T.altTheme('midnight-dark', 'custom', { ...own, bg: 'red; } body { x' }), T.THEME_PRESETS['clean-minimal'], 'invalid colours fall back to the default');
assert.strictEqual(T.altTheme('midnight-dark', 'custom', { bg: '#101820', text: '#eeeeee', accent: '#ff6600' }), T.THEME_PRESETS['clean-minimal'], 'the same look as the page is ignored');
const customExp = A.generateExportBundle(mk('h-a'), 'midnight-dark', features, { page: { title: 'T', lang: 'en', altTheme: 'custom', altBg: '#fdf6e3', altText: '#222222', altAccent: '#d33682' } });
assert(/--preview-bg: #fdf6e3;/.test(customExp['style.css']) && /--preview-accent: #d33682;/.test(customExp['style.css'].slice(customExp['style.css'].indexOf('/* Other look'))), 'the export carries the custom other look');
console.log('  ✓ the other look can use the client\'s own colours, validated');

// the light/dark button switched off (page setting modeButton: 'off')
const off1 = A.generateExportBundle(mk('h-a'), 'dark', features, { page: { title: 'T', lang: 'en', modeButton: 'off' } });
assert(!/edv-mode|data-edv-lang|data-mode/.test(off1['index.html'] + off1['style.css'] + off1['script.js']), 'off with one language: no buttons, no other look, no script');
const off2 = A.generateExportBundle(mk('h-a'), 'dark', features, { page: { title: 'T', lang: 'en', modeButton: 'off' }, langSwitch: true });
assert(!/class="edv-mode"|Other look|KEY = 'edv-mode'/.test(off2['index.html'] + off2['style.css'] + off2['script.js']) && /data-edv-lang="on"/.test(off2['index.html']), 'off with translations: only the language button stays');
console.log('  ✓ switched off: no dark/light button, no other look, no script; the language button stays');

const members = [{ id: 'a', lang: 'en', index: 0, slug: 'index' }, { id: 'b', lang: 'lv', index: 1, slug: 'index-lv' }];
const sw = '<div class="lsw-lang" data-edv-lang="on" hidden><span class="lsw-code" data-cms-skip>EN</span><ul class="lsw-menu" hidden></ul></div><div class="lsw-lang"><span class="lsw-code">EN</span><ul class="lsw-menu"></ul></div>';
const w = SP.wireLanguageSwitcher(sw, members, 'b', (m) => (m.index === 0 ? 'index.html' : m.slug + '.html'));
assert.strictEqual(w.html.split('data-href="index-lv.html"').length, 3, 'both switchers list the files');
assert(!/data-edv-lang="on" hidden/.test(w.html) && w.html.split('>LV<').length === 3, 'the header button shows and both show the current language');
console.log('  ✓ wireLanguageSwitcher fills every switcher and shows the header button');
