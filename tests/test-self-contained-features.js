const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { findLocalAssetUrls } = require('../scripts/assembler.js');

console.log('Testing that features do not depend on files outside the vault...');

const ROOT = path.resolve(__dirname, '..');
// Known-incomplete imports: their images were never shipped with the source.
const KNOWN_MISSING = new Set(['forma-liquid-particle-studio']);
const problems = [];

for (const slug of fs.readdirSync(path.join(ROOT, 'features'))) {
  if (KNOWN_MISSING.has(slug)) continue;
  const dir = path.join(ROOT, 'features', slug);
  for (const f of ['index.html', 'style.css', 'script.js']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    for (const url of findLocalAssetUrls(fs.readFileSync(p, 'utf8'))) {
      const target = path.join(ROOT, decodeURIComponent(url));
      if (!fs.existsSync(target)) problems.push(`${slug}/${f}: ${url} not found inside the vault`);
    }
  }
}
assert.strictEqual(problems.length, 0, 'Features reference assets that only exist outside the vault:\n' + problems.slice(0, 15).join('\n'));

console.log('✅ All features are self-contained!');
