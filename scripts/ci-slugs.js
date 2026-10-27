#!/usr/bin/env node
/**
 * Picks which components a per-feature CI check should look at and prints them as a comma list for `--slug`.
 *   node scripts/ci-slugs.js [--base <git ref>] [--shard 2/4]
 * Without --base every component is selected (a full run). With --base only components whose files changed
 * since that ref are selected, unless shared code changed (scripts, tests, builder, styles, shared assets,
 * dependencies, workflows), which selects everything again. --shard i/n then keeps every n-th slug so the
 * work can be split across parallel jobs. Prints NONE when nothing is left to check.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const get = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : null; };

const all = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget).map(x => x.slug);
// Anything outside features/<slug>/ and thumbs/ can affect every component.
const SHARED = /^(?!features\/|thumbs\/|docs\/|reports\/|graphify-out\/)/;

function changedSlugs(base) {
  let files;
  try {
    files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch (_) {
    return null; // unknown base: fall back to everything
  }
  const slugs = new Set();
  for (const f of files) {
    const m = /^features\/([^/]+)\//.exec(f);
    if (m) { slugs.add(m[1]); continue; }
    if (SHARED.test(f) && !/\.md$/.test(f)) return null;
  }
  return all.filter(s => slugs.has(s));
}

let slugs = all;
const base = get('base');
if (base && !/^0+$/.test(base)) {
  const changed = changedSlugs(base);
  if (changed) slugs = changed;
}

const shard = get('shard');
if (shard) {
  const [i, n] = shard.split('/').map(Number);
  if (!(i >= 1 && n >= 1 && i <= n)) { console.error('--shard must look like 2/4'); process.exit(2); }
  slugs = slugs.filter((_, idx) => idx % n === i - 1);
}

console.log(slugs.length ? slugs.join(',') : 'NONE');
