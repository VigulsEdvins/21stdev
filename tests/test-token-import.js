// Design token import: plain and W3C-style files, loose names, bad values, and applying the result to a project.
const assert = require('assert');
const { parseTokens, applyTokens, toHex, toRadius } = require('../scripts/builder/token-import.js');
const { createStackManager } = require('../scripts/stack-manager.js');
const { resolveTheme } = require('../scripts/assembler.js');

assert.strictEqual(toHex('#ABC'), '#aabbcc');
assert.strictEqual(toHex('#11223344'), '#112233', 'alpha is dropped');
assert.strictEqual(toHex('rgb(255, 0, 128)'), '#ff0080');
assert.strictEqual(toHex('rgba(10 20 30 / .5)'), '#0a141e');
assert.strictEqual(toHex('rgb(300,0,0)'), '', 'out of range');
assert.strictEqual(toHex('hotpink'), '', 'named colours are not guessed');
assert.strictEqual(toRadius(8), '8px');
assert.strictEqual(toRadius('0.5rem'), '0.5rem');
assert.strictEqual(toRadius('50%'), '');
assert.strictEqual(toRadius('8px; color:red'), '', 'nothing but a length gets through');

const plain = parseTokens({ colors: { background: '#101820', text: '#f2f2f2', accent: '#ff5a1f', muted: '#888888' }, fonts: { heading: 'Fraunces, serif', body: '"DM Sans", sans-serif' }, radius: 6 });
assert.deepStrictEqual(plain.colors, { bg: '#101820', text: '#f2f2f2', accent: '#ff5a1f' });
assert.strictEqual(plain.fontDisplay, 'Fraunces');
assert.strictEqual(plain.fontBody, 'DM Sans');
assert.strictEqual(plain.radius, '6px');

const w3c = parseTokens({
  color: { brand: { primary: { $value: '#0057ff', $type: 'color' } }, background: { default: { $value: 'rgb(255,255,255)' } }, text: { default: { $value: '#111' }, muted: { $value: '#999' } } },
  typography: { fontFamily: { heading: { $value: 'Playfair Display' }, body: { $value: 'Inter' } }, fontSize: { base: { $value: '16px' } } },
  borderRadius: { sm: { $value: '2px' }, md: { $value: '10px' }, full: { $value: '9999px' } }
});
assert.strictEqual(w3c.colors.accent, '#0057ff');
assert.strictEqual(w3c.colors.bg, '#ffffff');
assert.strictEqual(w3c.colors.text, '#111111', 'the muted text colour is not picked');
assert.strictEqual(w3c.fontDisplay, 'Playfair Display');
assert.strictEqual(w3c.fontBody, 'Inter');
assert.strictEqual(w3c.radius, '10px', 'the medium radius wins, not the pill');

const generic = parseTokens({ fonts: { body: 'system-ui, sans-serif' } });
assert.strictEqual(generic.fontBody, '', 'generic families are not Google fonts');
assert.strictEqual(parseTokens({ foo: 1 }).found.length, 0);
assert(parseTokens('nope').notes.length, 'a non-object is explained');
assert.strictEqual(parseTokens({ font: { heading: 'x<script>' } }).fontDisplay, '', 'unsafe family names are refused');

// applying: colours become the custom theme (missing ones keep the current theme's), fonts and radius go to the page
const sm = createStackManager({ theme: 'midnight-dark' });
applyTokens(sm, parseTokens({ colors: { accent: '#ff5a1f' }, fonts: { heading: 'Syne' }, radius: '4px' }), resolveTheme);
const st = sm.getState();
assert.strictEqual(st.theme, 'custom');
assert.strictEqual(st.customColors.accent, '#ff5a1f');
assert.strictEqual(st.customColors.bg, resolveTheme('midnight-dark').bg, 'colours the file does not name keep the old theme');
assert.strictEqual(st.page.fontDisplay, 'Syne');
assert.strictEqual(st.page.radius, '4px');

// fonts and radius alone leave the theme alone
const sm2 = createStackManager({ theme: 'midnight-dark' });
applyTokens(sm2, parseTokens({ radius: 12 }), resolveTheme);
assert.strictEqual(sm2.getState().theme, 'midnight-dark');

// the radius reaches the exported page, after the theme's own --radius, and a bad value does not
const { generateExportBundle } = require('../scripts/assembler.js');
const css = (radius) => generateExportBundle([], 'midnight-dark', {}, { page: { radius } })['style.css'];
assert(/:root \{ --radius: 4px; \}/.test(css('4px')), 'radius is written to the page');
assert(css('4px').indexOf('--radius: 12px') < css('4px').indexOf('--radius: 4px'), 'and comes after the theme default');
assert(!css('4px; color:red').includes('color:red'), 'a bad value is ignored');

console.log('✅ Token import tests passed!');
