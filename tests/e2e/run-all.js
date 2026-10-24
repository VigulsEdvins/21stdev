#!/usr/bin/env node
// Runs every tests/e2e/*.e2e.js in turn; fails on the first failure.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith('.e2e.js')).sort()) {
  console.log(`\n▶ ${f}`);
  execSync(`node ${path.join(__dirname, f)}`, { stdio: 'inherit' });
}
