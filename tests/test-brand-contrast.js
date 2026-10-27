// Brand tokens: every colour pair used by the design passes WCAG AA, and a weakened token is caught.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { check, ratio, PAIRS } = require('../scripts/check-brand-contrast.js');

const css = fs.readFileSync(path.join(__dirname, '..', 'site', 'styles', 'tokens.css'), 'utf8');
const rows = check(css);
assert.strictEqual(rows.length, PAIRS.length);
assert(rows.every(r => !r.error && r.ok), 'all pairs pass: ' + JSON.stringify(rows.filter(r => r.error || !r.ok)));

assert(Math.abs(ratio('#000000', '#ffffff') - 21) < 0.01, 'black on white is 21:1');
const weakened = css.replace('--accent-text: #a8401a', '--accent-text: #c4522a');
assert(check(weakened).some(r => r.fg === '--accent-text' && !r.ok), 'using the lighter rust for text is caught');
assert(check(css.replace('--text-on-rust: #ffffff', '--text-on-rust: #f4ead3')).some(r => r.fg === '--text-on-rust' && !r.ok), 'cream on rust is caught');
assert(check(css.replace('--paper: #f4ead3;', '')).some(r => r.error), 'a missing token is reported');

// every font file the stylesheet names exists
const fonts = fs.readFileSync(path.join(__dirname, '..', 'site', 'styles', 'fonts.css'), 'utf8');
(fonts.match(/url\(\.\.\/fonts\/[^)]+\)/g) || []).forEach(u => assert(fs.existsSync(path.join(__dirname, '..', 'site', 'fonts', u.slice(13, -1))), 'font file exists: ' + u));
console.log('✅ Brand contrast tests passed!');
