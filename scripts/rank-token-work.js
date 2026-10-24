#!/usr/bin/env node
// Orders the components that still hard-code colours by how much a client page needs them: Headers, Heroes, Footers,
// Cards and Buttons first, then by fewest colours (quick wins first). Components that keep their own palette on
// purpose (ownPalette, nativeWhen) are left out. Writes reports/token-queue.json.
//   npm run rank-token-work [-- --top 20]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PRIORITY = { 'Headers & Nav': 0, Heroes: 1, 'Footers & Endings': 2, 'Cards & Tiles': 3, 'Buttons & UI': 4 };

function rank(tokens, registry) {
  const meta = new Map(registry.map(i => [i.slug, i]));
  return tokens.filter(t => !t.tokenised && meta.has(t.slug) && !meta.get(t.slug).ownPalette && !(meta.get(t.slug).nativeWhen || []).length && t.colors > 0)
    .map(t => ({ slug: t.slug, colors: t.colors, category: meta.get(t.slug).category, priority: PRIORITY[meta.get(t.slug).category] ?? 9 }))
    .sort((a, b) => (a.priority - b.priority) || (a.colors - b.colors));
}

module.exports = { rank };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const top = Number(argv[argv.indexOf('--top') + 1]) || 20;
  const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'tokens.json'), 'utf8'));
  const queue = rank(tokens, require('../registry.json').items);
  fs.writeFileSync(path.join(ROOT, 'reports', 'token-queue.json'), JSON.stringify(queue, null, 2));
  console.log(`${queue.length} components still to migrate. Next ${top}:`);
  queue.slice(0, top).forEach(q => console.log(`  ${String(q.colors).padStart(3)} colours  ${q.slug}  (${q.category})`));
}
