#!/usr/bin/env node
/**
 * Declares files a component loads at run time (paths built in its code, which the exporter cannot see) in
 * meta.json "exportAssets", so exports carry them. Lists every file under the given folders.
 *   npm run declare-assets -- --slug forma-liquid-particle-studio --dir features/forma-liquid-particle-studio/img[,more/dirs]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const slug = get('slug');
const dirs = (get('dir') || '').split(',').filter(Boolean);
if (!slug || !dirs.length) { console.error('Usage: declare-assets --slug <slug> --dir <folder>[,<folder>]'); process.exit(1); }

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const list = dirs.flatMap(d => walk(path.join(ROOT, d))).map(f => '/' + path.relative(ROOT, f).split(path.sep).join('/')).sort();
const file = path.join(ROOT, 'features', slug, 'meta.json');
const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
meta.exportAssets = list;
fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n');
console.log(`${slug}: ${list.length} exportAssets declared. Run \`npm run sync\` next.`);
