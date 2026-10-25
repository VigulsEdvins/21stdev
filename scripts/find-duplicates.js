#!/usr/bin/env node
// Finds components that look almost the same: same category, near-identical 16x10 colour fingerprint
// (tests/visual/baseline.json) and overlapping tags. Report only; a human decides which one to keep
// (set `"status": "deprecated"` on the other: the builder hides it, then delete it after one release).
//   npm run find-duplicates [-- --max 6] [--write]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length; // average difference per channel value, 0 to 255
}

function findDuplicates(baseline, registry, maxDistance = 6) {
  const bySlug = new Map(registry.map(i => [i.slug, i]));
  const slugs = Object.keys(baseline.items).filter(s => bySlug.has(s) && baseline.items[s].fp);
  const pairs = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = bySlug.get(slugs[i]);
      const b = bySlug.get(slugs[j]);
      if (a.category !== b.category) continue;
      const d = distance(baseline.items[slugs[i]].fp, baseline.items[slugs[j]].fp);
      if (d > maxDistance) continue;
      const tags = new Set((a.tags || []).map(t => t.toLowerCase()));
      const sharedTags = (b.tags || []).filter(t => tags.has(t.toLowerCase())).length;
      pairs.push({ a: a.slug, b: b.slug, category: a.category, distance: Number(d.toFixed(2)), sharedTags });
    }
  }
  return pairs.sort((x, y) => x.distance - y.distance);
}

module.exports = { findDuplicates, distance };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const max = Number(argv[argv.indexOf('--max') + 1]) || 6;
  const minTags = argv.includes('--min-tags') ? Number(argv[argv.indexOf('--min-tags') + 1]) : 2;
  const pairs = findDuplicates(require('../tests/visual/baseline.json'), require('../registry.json').items, max).filter(p => p.sharedTags >= minTags);
  pairs.forEach(p => console.log(`${p.distance.toFixed(2).padStart(6)}  ${p.a}  ~  ${p.b}  (${p.category}, ${p.sharedTags} shared tags)`));
  console.log(`${pairs.length} pair(s) within distance ${max}`);
  if (argv.includes('--write')) { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'reports', 'duplicates.json'), JSON.stringify(pairs, null, 2)); }
}
