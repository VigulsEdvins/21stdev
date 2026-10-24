#!/usr/bin/env node
/**
 * Codemod: swaps a feature's dominant hard-coded background and text colours for the standard
 * tokens with the old value as fallback (`var(--bg, #09090b)`), so the feature looks identical
 * standalone and follows the theme in the builder.
 * Every change is verified by comparing computed colours of all elements before and after;
 * a feature that would change (e.g. it defines its own --bg) is left untouched.
 *   npm run tokenize -- --slug a,b [--dry]
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const HEX = '#[0-9a-fA-F]{3,8}';

function dominant(css, prop) {
  const re = new RegExp(`^(\\s*)${prop}\\s*:\\s*(${HEX})\\s*(!important)?\\s*;`, 'gm');
  const counts = {};
  for (const m of css.matchAll(re)) counts[m[2].toLowerCase()] = (counts[m[2].toLowerCase()] || 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function saturation(hex) {
  const [r, g, b] = rgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Only swaps when the dominant colours really are a page background / body text pair: both present,
 * neutral (low saturation, so an accent colour is never turned into the text token) and readable
 * together. Anything else is left for a human.
 */
function transform(css) {
  let out = css;
  const bg = dominant(css, 'background(?:-color)?');
  const text = dominant(css, 'color');
  const changes = [];
  if (!bg || !text || saturation(bg) > 0.3 || saturation(text) > 0.3 || contrast(bg, text) < 4.5) {
    return { css, changes };
  }
  if (bg) {
    out = out.replace(new RegExp(`^(\\s*)(background(?:-color)?)\\s*:\\s*(${bg})\\s*(!important)?\\s*;`, 'gim'), (m, ind, prop, hex, imp) => `${ind}${prop}: var(--bg, ${hex})${imp ? ' !important' : ''};`);
    changes.push(`background ${bg}`);
  }
  if (text) {
    out = out.replace(new RegExp(`^(\\s*)color\\s*:\\s*(${text})\\s*(!important)?\\s*;`, 'gim'), (m, ind, hex, imp) => `${ind}color: var(--text, ${hex})${imp ? ' !important' : ''};`);
    changes.push(`text ${text}`);
  }
  return { css: out, changes };
}

async function computedColours(page, slug) {
  await page.goto(`${page.__base}/features/${slug}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  return page.evaluate(() => [...document.querySelectorAll('body, body *')].slice(0, 1500).map(el => {
    const cs = getComputedStyle(el);
    return [cs.backgroundColor, cs.color].join('|');
  }));
}

async function main() {
  const argv = process.argv.slice(2);
  const si = argv.indexOf('--slug');
  if (si < 0) { console.error('Usage: tokenize --slug a,b [--dry]'); process.exit(1); }
  const dry = argv.includes('--dry');
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.__base = srv.url;

  for (const slug of argv[si + 1].split(',')) {
    const file = path.join(ROOT, 'features', slug, 'style.css');
    const original = fs.readFileSync(file, 'utf8');
    const { css, changes } = transform(original);
    if (css === original) { console.log(`- ${slug}: nothing to change`); continue; }
    if (dry) { console.log(`~ ${slug}: would change ${changes.join(', ')}`); continue; }
    const before = await computedColours(page, slug);
    fs.writeFileSync(file, css);
    const after = await computedColours(page, slug);
    const diffs = before.length === after.length ? before.filter((v, i) => v !== after[i]).length : -1;
    if (diffs === 0) console.log(`✓ ${slug}: ${changes.join(', ')} -> tokens (computed colours identical on ${before.length} elements)`);
    else { fs.writeFileSync(file, original); console.log(`✗ ${slug}: reverted (${diffs < 0 ? 'element count changed' : diffs + ' elements differ'})`); }
  }
  await browser.close();
  await srv.close();
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { transform, dominant };
