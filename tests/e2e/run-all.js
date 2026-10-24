#!/usr/bin/env node
// Runs every tests/e2e/*.e2e.js in turn. A failing file is retried once; a file that only passes on the retry is
// recorded in reports/flaky.json (with a date) so flaky tests get fixed instead of ignored. Two failures in a row fail the run.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = (f) => path.join(__dirname, f);
const flakyPath = path.join(__dirname, '..', '..', 'reports', 'flaky.json');
const flaky = [];
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith('.e2e.js')).sort()) {
  console.log(`\n▶ ${f}`);
  let r = spawnSync('node', [file(f)], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.log(`\n↻ ${f} failed, retrying once`);
    r = spawnSync('node', [file(f)], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
    flaky.push(f);
  }
}
if (flaky.length) {
  fs.mkdirSync(path.dirname(flakyPath), { recursive: true });
  let log = [];
  try { log = JSON.parse(fs.readFileSync(flakyPath, 'utf8')); } catch (_) { /* first entry */ }
  flaky.forEach(f => log.push({ file: f, at: new Date().toISOString() }));
  fs.writeFileSync(flakyPath, JSON.stringify(log, null, 2));
  console.log(`\n⚠ passed only on retry: ${flaky.join(', ')} (logged in reports/flaky.json)`);
}
