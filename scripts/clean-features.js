#!/usr/bin/env node
/**
 * Removes scraped-in junk from feature markup: Cloudflare analytics beacons (they would ship
 * third-party tracking to client sites) and the Vite template favicon (/vite.svg does not exist).
 * Idempotent. Run `npm run sync` afterwards.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RULES = [
  [/<script\b[^>]*cloudflareinsights\.com[^>]*>\s*<\/script>/gi, ''],
  [/[ \t]*<link\b[^>]*href=["']\/vite\.svg["'][^>]*>\s*\n?/gi, '']
];

function cleanHtml(html) {
  return RULES.reduce((acc, [re, rep]) => acc.replace(re, rep), html);
}

if (require.main === module) {
  let changed = 0;
  for (const slug of fs.readdirSync(path.join(ROOT, 'features'))) {
    const file = path.join(ROOT, 'features', slug, 'index.html');
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    const after = cleanHtml(before);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  console.log(`Cleaned ${changed} feature index.html files`);
}

module.exports = { cleanHtml };
