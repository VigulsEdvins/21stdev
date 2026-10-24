#!/usr/bin/env node
/**
 * Records the result of a licence check on components.
 *   npm run set-license -- --slug a,b --license MIT [--source "https://..."] [--note "checked 2026-10-24"]
 *   npm run set-license -- --list            # components whose licence is still unverified
 * `unverified` components are flagged in the builder and listed in every export README.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const get = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : null; };

const features = fs.readdirSync(path.join(ROOT, 'features')).filter(s => fs.existsSync(path.join(ROOT, 'features', s, 'meta.json')));

if (argv.includes('--list')) {
  const rows = features.map(s => ({ s, m: JSON.parse(fs.readFileSync(path.join(ROOT, 'features', s, 'meta.json'), 'utf8')) }))
    .filter(({ m }) => (m.origin || {}).license === 'unverified');
  console.log(`${rows.length} of ${features.length} components have an unverified licence.`);
  const bySource = {};
  rows.forEach(({ m }) => { const k = (m.origin || {}).source || 'unknown'; bySource[k] = (bySource[k] || 0) + 1; });
  console.log(bySource);
  process.exit(0);
}

const slugs = (get('slug') || '').split(',').filter(Boolean);
const license = get('license');
if (!slugs.length || !license) {
  console.error('Usage: set-license --slug a,b --license <SPDX id or "own"> [--source url] [--note text]  |  --list');
  process.exit(1);
}
for (const slug of slugs) {
  const file = path.join(ROOT, 'features', slug, 'meta.json');
  if (!fs.existsSync(file)) { console.error(`✗ ${slug}: no such feature`); continue; }
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
  meta.origin = { ...(meta.origin || { source: meta.source || 'custom' }), license, verifiedAt: new Date().toISOString().slice(0, 10) };
  if (get('source')) meta.origin.url = get('source');
  if (get('note')) meta.origin.note = get('note');
  fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n');
  console.log(`✓ ${slug}: ${license}`);
}
console.log('Run `npm run sync` to refresh the registry.');
