#!/usr/bin/env node
/**
 * Brand contrast check: every text/background pair the design uses is read from site/styles/tokens.css and measured
 * against WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and for interface outlines).
 *   npm run check-brand
 * Add a row to PAIRS when a new combination is used; the check fails if a token name is missing or a ratio is too low.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'site', 'styles', 'tokens.css');
const NORMAL = 4.5, LARGE = 3;

// [foreground token, background token, size class, where it is used]
const PAIRS = [
  ['--text', '--paper', 'normal', 'body text on the page'],
  ['--text', '--paper-raised', 'normal', 'text on cards'],
  ['--text-muted', '--paper', 'normal', 'secondary text on the page'],
  ['--text-muted', '--paper-raised', 'normal', 'secondary text on cards'],
  ['--accent-text', '--paper', 'normal', 'kickers, links and labels in rust on the page'],
  ['--accent-text', '--paper-raised', 'normal', 'kickers and links on cards'],
  ['--text-on-teal', '--teal', 'normal', 'text on the teal field'],
  ['--text-on-teal-soft', '--teal', 'normal', 'lead text on the teal field'],
  ['--accent-on-teal', '--teal', 'large', 'big mustard words in headlines on teal (24px and up)'],
  ['--text-on-rust', '--rust', 'normal', 'button text on rust'],
  ['--text-on-mustard', '--mustard', 'normal', 'text on the mustard panel and band'],
  ['--text-on-ink', '--ink', 'normal', 'footer and builder bar text'],
  ['--accent-on-teal', '--ink', 'normal', 'prices and buttons in mustard on the dark bar'],
  ['--ok', '--paper', 'normal', 'saved status'],
  ['--error', '--paper', 'normal', 'error messages'],
  ['--ink', '--paper', 'large', 'outlines and checkbox borders (3:1 for interface parts)'],
  ['--teal', '--paper', 'large', 'teal shapes and icons on paper (3:1)']
];

function vars(css) {
  const out = {};
  css.replace(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g, (m, k, v) => { out[k] = v.toLowerCase(); return m; });
  return out;
}
const lum = (hex) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function check(css = fs.readFileSync(FILE, 'utf8')) {
  const v = vars(css);
  return PAIRS.map(([fg, bg, size, use]) => {
    if (!v[fg] || !v[bg]) return { fg, bg, size, use, error: `missing token ${!v[fg] ? fg : bg}` };
    const r = ratio(v[fg], v[bg]);
    const need = size === 'large' ? LARGE : NORMAL;
    return { fg, bg, size, use, ratio: +r.toFixed(2), need, ok: r >= need };
  });
}

if (require.main === module) {
  const rows = check();
  rows.forEach(r => console.log(`${r.error ? '✗' : r.ok ? '✓' : '✗'} ${r.fg} on ${r.bg}  ${r.ratio ? r.ratio + ':1 (needs ' + r.need + ')' : r.error}  — ${r.use}`));
  const bad = rows.filter(r => r.error || !r.ok);
  if (bad.length) { console.error(`${bad.length} pair(s) below WCAG AA`); process.exit(1); }
  console.log(`All ${rows.length} pairs pass WCAG AA.`);
}
module.exports = { check, ratio, vars, PAIRS };
