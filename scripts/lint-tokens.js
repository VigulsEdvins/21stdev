#!/usr/bin/env node
/**
 * Reports how much each feature relies on the standard design tokens instead of hard-coded colours.
 *   npm run lint-tokens [-- --top 15]
 * Standard tokens: --bg, --text, --accent, --radius, --font-display, --font-body.
 * New features should score "tokenised"; older ones are migrated incrementally using this list.
 * Writes reports/tokens.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKEN_RE = /var\(\s*--(bg|text|accent|radius|font-display|font-body)\b/g;
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

function analyse(css) {
  // Tailwind's preflight (--tw-* defaults, #e5e7eb borders, #9ca3af placeholders) is boilerplate, not a design choice.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--tw-[\w-]+\s*:[^;}]*/g, '')
    .replace(/border:\s*0\s+solid\s+#e5e7eb|color:\s*#9ca3af/g, '');
  const tokens = (stripped.match(TOKEN_RE) || []).length;
  const colors = (stripped.match(COLOR_RE) || []).length;
  return { tokens, colors, tokenised: tokens > 0 && tokens >= colors * 0.25 };
}

if (require.main === module) {
  const topIdx = process.argv.indexOf('--top');
  const top = topIdx >= 0 ? Number(process.argv[topIdx + 1]) : 15;
  const rows = [];
  for (const slug of fs.readdirSync(path.join(ROOT, 'features')).sort()) {
    const file = path.join(ROOT, 'features', slug, 'style.css');
    if (!fs.existsSync(file)) continue;
    rows.push({ slug, ...analyse(fs.readFileSync(file, 'utf8')) });
  }
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'tokens.json'), JSON.stringify(rows, null, 2));
  const done = rows.filter(r => r.tokenised).length;
  console.log(`${done}/${rows.length} features use the standard design tokens.`);
  console.log(`\nMost hard-coded colours (migrate these first):`);
  rows.filter(r => !r.tokenised).sort((a, b) => b.colors - a.colors).slice(0, top)
    .forEach(r => console.log(`  ${String(r.colors).padStart(4)} colours  ${r.slug}`));
}

module.exports = { analyse };
