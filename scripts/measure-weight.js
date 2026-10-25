#!/usr/bin/env node
// Size and cost hints for every component (all weights, heavy first): bytes of its own files, number of
// requestAnimationFrame loops and WebGL contexts in its script. Writes reports/weight.json.
//   npm run measure-weight
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function measure(slug) {
  const dir = path.join(ROOT, 'features', slug);
  let bytes = 0;
  let js = '';
  for (const f of ['index.html', 'style.css', 'script.js']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    bytes += Buffer.byteLength(t);
    if (f === 'script.js') js = t;
  }
  const count = (re) => (js.match(re) || []).length;
  return { slug, bytes, rafLoops: count(/requestAnimationFrame\s*\(/g), webgl: count(/getContext\(\s*["'`](?:webgl2?|experimental-webgl)/g), threejs: /THREE\.|from\s*["']three["']|WebGLRenderer/.test(js) };
}

function run() {
  const items = require(path.join(ROOT, 'registry.json')).items.filter(i => !i.isWidget);
  const rows = items.map(i => ({ ...measure(i.slug), weight: i.weight, category: i.category }));
  const order = { heavy: 0, medium: 1, light: 2 };
  rows.sort((a, b) => (order[a.weight] - order[b.weight]) || (b.bytes - a.bytes));
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'weight.json'), JSON.stringify(rows, null, 2));
  return rows;
}

module.exports = { measure, run };

if (require.main === module) {
  const rows = run();
  const by = {};
  rows.forEach(r => { (by[r.weight] = by[r.weight] || []).push(r); });
  Object.entries(by).forEach(([w, list]) => console.log(`${w}: ${list.length} components, median ${Math.round(list.map(x => x.bytes).sort((a, b) => a - b)[list.length >> 1] / 1000)} KB, WebGL in ${list.filter(x => x.webgl || x.threejs).length}`));
  console.log('Largest:');
  rows.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 8).forEach(r => console.log(`  ${(r.bytes / 1e3).toFixed(0).padStart(5)} KB  ${r.slug} (${r.weight})`));
  // a "light" component that uses WebGL is probably mislabelled
  const odd = rows.filter(r => r.weight === 'light' && (r.webgl || r.threejs));
  if (odd.length) console.log('Labelled light but uses WebGL: ' + odd.map(r => r.slug).join(', '));
}
