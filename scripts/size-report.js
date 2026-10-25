#!/usr/bin/env node
// Lists the largest tracked files and warns about any over 5 MB (assets/library grows with every localized image or video).
//   npm run size-report
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = execSync('git ls-files', { cwd: ROOT, maxBuffer: 1 << 26 }).toString().split('\n').filter(Boolean)
  .map(f => { try { return { f, n: fs.statSync(path.join(ROOT, f)).size }; } catch (_) { return null; } }).filter(Boolean);
const total = files.reduce((n, x) => n + x.n, 0);
files.sort((a, b) => b.n - a.n).slice(0, 20).forEach(x => console.log(`${(x.n / 1e6).toFixed(2).padStart(7)} MB  ${x.f}`));
console.log(`\n${files.length} tracked files, ${(total / 1e6).toFixed(1)} MB in total`);
const big = files.filter(x => x.n > 5e6);
if (big.length) { console.log(`WARNING: ${big.length} file(s) over 5 MB`); process.exitCode = 1; }
