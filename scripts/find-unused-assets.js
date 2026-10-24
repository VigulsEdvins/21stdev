#!/usr/bin/env node
// Lists files in assets/library that no source file mentions by name (features, builder, scripts, tests, docs).
//   node scripts/find-unused-assets.js            report only
//   node scripts/find-unused-assets.js --delete   git rm the unused files
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'assets', 'library');
const SKIP_DIRS = new Set(['node_modules', '.git', 'graphify-out', 'thumbs']);
const TEXT_EXT = /\.(js|json|html|css|tsx|ts|md|yml|mjs|svg)$/i;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TEXT_EXT.test(name) && st.size < 8e6) out.push(p);
  }
  return out;
}

function unused() {
  if (!fs.existsSync(LIB)) return [];
  const corpus = walk(ROOT).filter(f => !/registry\.(json|js)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const files = fs.readdirSync(LIB).filter(n => fs.statSync(path.join(LIB, n)).isFile());
  // a file is used when its name appears, or it is the poster/thumbnail sibling of a used one (same base name)
  const usedBases = new Set(files.filter(n => corpus.includes(n) || corpus.includes(encodeURI(n))).map(n => n.replace(/\.[^.]+$/, '')));
  return files.filter(n => !corpus.includes(n) && !corpus.includes(encodeURI(n)) && !usedBases.has(n.replace(/\.[^.]+$/, '')));
}

module.exports = { unused };

if (require.main === module) {
  const list = unused();
  const bytes = list.reduce((n, f) => n + fs.statSync(path.join(LIB, f)).size, 0);
  list.forEach(f => console.log('unused: assets/library/' + f));
  console.log(`${list.length} unused file(s), ${(bytes / 1e6).toFixed(1)} MB`);
  if (process.argv.includes('--delete') && list.length) {
    execSync('git rm -q -- ' + list.map(f => JSON.stringify('assets/library/' + f)).join(' '), { cwd: ROOT, stdio: 'inherit' });
    console.log('removed');
  }
}
