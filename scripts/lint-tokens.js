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
// The tokens the theme engine sets for a page: our own and the shadcn-style names that bundled components read
const TOKEN_RE = /var\(\s*--(bg|text|accent|radius|font-display|font-body|color-background|color-foreground|background|foreground|primary)\b/g;
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const DRAWS_RE = /getContext\(\s*["'`](?:2d|webgl2?|experimental-webgl|bitmaprenderer)["'`]|WebGLRenderer|createLinearGradient|createRadialGradient/;

/** Tailwind's preflight (--tw-* defaults, #e5e7eb borders, #9ca3af placeholders) is boilerplate, not a design choice. */
function clean(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--tw-[\w-]+\s*:[^;}]*/g, '')
    .replace(/border:\s*0\s+solid\s+#e5e7eb|color:\s*#9ca3af/g, '')
    .replace(/(?:0 0\s+)?#0000\b|rgb\(255 255 255\/var\(--tw-text-opacity,1\)\)/g, '');
}

/**
 * `css` is style.css; `js` (optional) is script.js. A component is "tokenised" when it reads the tokens; it "draws its
 * colour" (`art`) when its colours live in canvas / WebGL / shader code or a preloader, where a CSS variable cannot
 * reach them without plumbing, so those are listed apart instead of counted as work still to do.
 */
function analyse(css, js = '', slug = '', category = '', meta = {}) {
  const stripped = clean(css);
  const tokens = (stripped.match(TOKEN_RE) || []).length + (js.match(TOKEN_RE) || []).length;
  const colors = (stripped.match(COLOR_RE) || []).length;
  const tokenised = tokens > 0 && tokens >= colors * 0.25;
  const art = !tokenised && (/preloader/i.test(slug + ' ' + category) || DRAWS_RE.test(js));
  // `palette: "designed"` in meta.json is a reviewed decision: the colours are the design (brand presets set by props,
  // print paper, a component's own light/dark switch), and `paletteNote` says why.
  const designed = !tokenised && !art && meta.palette === 'designed';
  // nothing to migrate: no colours of its own in the CSS and none in its component source
  const neutral = !tokenised && !art && !designed && colors === 0 && !meta.hasSourceColours;
  return { tokens, colors, tokenised, art, designed, neutral };
}

if (require.main === module) {
  const topIdx = process.argv.indexOf('--top');
  const top = topIdx >= 0 ? Number(process.argv[topIdx + 1]) : 15;
  const cats = Object.fromEntries(require(path.join(ROOT, 'registry.json')).items.map(i => [i.slug, i.category]));
  const rows = [];
  for (const slug of fs.readdirSync(path.join(ROOT, 'features')).sort()) {
    const file = path.join(ROOT, 'features', slug, 'style.css');
    if (!fs.existsSync(file)) continue;
    const jsFile = path.join(ROOT, 'features', slug, 'script.js');
    const metaFile = path.join(ROOT, 'features', slug, 'meta.json');
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const tsx = path.join(ROOT, 'features', slug, 'component.tsx');
    meta.hasSourceColours = fs.existsSync(tsx) && (fs.readFileSync(tsx, 'utf8').match(/#[0-9a-fA-F]{6}\b/g) || []).length >= 3;
    rows.push({ slug, ...analyse(fs.readFileSync(file, 'utf8'), fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf8') : '', slug, (cats[slug] || ''), meta) });
  }
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'tokens.json'), JSON.stringify(rows, null, 2));
  const done = rows.filter(r => r.tokenised).length;
  const count = k => rows.filter(r => r[k]).length;
  console.log(`${done}/${rows.length} features use the standard design tokens.`);
  console.log(`${count('art')} more draw their colour in canvas, WebGL or a preloader, ${count('designed')} keep a designed palette on purpose (meta.json palette: "designed"), ${count('neutral')} have no colours of their own.`);
  console.log(`\nMost hard-coded colours (migrate these first):`);
  rows.filter(r => !r.tokenised && !r.art && !r.designed && !r.neutral).sort((a, b) => b.colors - a.colors).slice(0, top)
    .forEach(r => console.log(`  ${String(r.colors).padStart(4)} colours  ${r.slug}`));
}

module.exports = { analyse };
