#!/usr/bin/env node
// One command for everything CI runs, in CI order, with a pass/fail table at the end.
//   npm run ci            full run (verify, token lint, field check, unit, e2e, blank, exports, responsive)
//   npm run ci -- --fast  verify + unit tests + e2e only
//   npm run ci -- --keep-going   do not stop at the first failure
const { spawnSync } = require('child_process');

const fast = process.argv.includes('--fast');
const keepGoing = process.argv.includes('--keep-going');
const steps = [
  ['verify', 'npm run verify'],
  ['unit tests', 'npm test'],
  ['e2e tests', 'npm run test:e2e'],
  !fast && ['code safety', 'npm run check-code-safety'],
  !fast && ['content fields', 'npm run check-fields'],
  !fast && ['theme clash', 'npm run check-theme-clash'],
  !fast && ['blank sections', 'npm run check-blank'],
  !fast && ['export matrix', 'npm run check-exports'],
  !fast && ['responsive', 'npm run check-responsive'],
  !fast && ['lighthouse (starters; reported, not blocking)', 'npm run check-lighthouse', true]
].filter(Boolean);

const rows = [];
let failed = false;
for (const [name, cmd, soft] of steps) {
  if (failed && !keepGoing) { rows.push({ name, status: 'skipped', secs: 0 }); continue; }
  console.log(`\n=== ${name}: ${cmd}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  const ok = r.status === 0;
  if (!ok && !soft) failed = true;
  rows.push({ name, status: ok ? 'pass' : (soft ? 'warn' : 'FAIL'), secs: Math.round((Date.now() - t0) / 1000) });
}
console.log('\nStep'.padEnd(22) + 'Result'.padEnd(10) + 'Seconds');
rows.forEach(r => console.log(r.name.slice(0, 20).padEnd(21) + r.status.padEnd(10) + r.secs));
process.exit(failed ? 1 : 0);
