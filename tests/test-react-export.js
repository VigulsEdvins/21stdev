// React project export: generates a project from real features and bundles it with esbuild to prove it compiles.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');
const { generateReactProject, unsupportedReason } = require('../scripts/builder/react-export.js');

const ROOT = path.resolve(__dirname, '..');
const read = (slug, f) => { const p = path.join(ROOT, 'features', slug, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const source = (slug) => ({ title: slug, component: read(slug, 'component.tsx'), demo: read(slug, 'demo.tsx'), index: read(slug, 'index.html'), js: read(slug, 'script.js'), css: read(slug, 'style.css') });

(async () => {
const slugs = ['alice-scroll-story', 'waitlist-hero'];
const sources = Object.fromEntries(slugs.map(s => [s, source(s)]));
const stack = [...slugs, 'alice-scroll-story'].map(slug => ({ slug }));
const out = generateReactProject({ stack, theme: 'clean-minimal', page: { title: 'Zephyr Dental', description: 'Family dentistry.' }, sources });

// features without a React source are wrapped as plain HTML sections instead of being left out
assert.deepStrictEqual(out.skipped, [], 'plain features are wrapped, not skipped');
assert(out.included.includes('waitlist-hero') && out.included.includes('alice-scroll-story'));
assert(out.files['src/legacy/waitlist-hero.html'] && out.files['src/lib/plain.ts'] && out.files['src/vite-env.d.ts'], 'the wrapper runtime ships');
assert(/\?raw/.test(out.files['src/sections/waitlist-hero.tsx']) && /runPlainScript/.test(out.files['src/sections/waitlist-hero.tsx']));
assert(!/<script/i.test(out.files['src/legacy/waitlist-hero.html']), 'scripts are moved out of the markup');
assert(/\.page-section#sec-waitlist-hero/.test(out.files['src/styles/waitlist-hero.css']) || !/\bbody\b/.test(out.files['src/styles/waitlist-hero.css']), 'body rules are scoped to the section');
assert.strictEqual((out.files['src/App.tsx'].match(/<Section\d+ \/>/g) || []).length, 3, 'a repeated section is rendered twice but imported once');
assert.strictEqual((out.files['src/App.tsx'].match(/import Section/g) || []).length, out.included.length);
assert(out.files['index.html'].includes('<title>Zephyr Dental</title>'));
assert(out.files['src/index.css'].includes('--bg: #ffffff'));
const pkg = JSON.parse(out.files['package.json']);
assert(pkg.dependencies.react && pkg.devDependencies.vite && pkg.name === 'zephyr-dental');
assert.strictEqual(unsupportedReason('x', { component: 'import a from "next/image"', demo: 'x' }), 'it uses Next.js APIs');
assert(/ES module/.test(unsupportedReason('x', { index: '<script type="module" src="a.js"></script>' })));
assert.strictEqual(unsupportedReason('x', { index: '<p>hi</p>' }), null, 'plain HTML is supported');
assert(/not include/.test(unsupportedReason('x', { component: 'import a from "@/registry/default/lib/utils"', demo: 'x' })));

// a feature that keeps its own palette keeps its inks; others follow the project's theme variables
{
  const own = generateReactProject({ stack: [{ slug: 'onward-summit-template' }], sources: { 'onward-summit-template': { ...source('onward-summit-template'), ownPalette: true } } });
  assert(/--os-ink:\s*#14213d/.test(own.files['src/styles/onward-summit-template.css']), 'own-palette ink is kept');
  const themed = generateReactProject({ stack: [{ slug: 'onward-summit-template' }], sources: { 'onward-summit-template': source('onward-summit-template') } });
  assert(/--os-ink:\s*var\(--preview-text\)/.test(themed.files['src/styles/onward-summit-template.css']), 'without ownPalette the ink follows the page text');
  assert(/--preview-text:/.test(themed.files['src/index.css']), 'the project defines the variables the themed CSS reads');
}

// Vite's "?raw" imports, for esbuild
const rawPlugin = {
  name: 'raw',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, a => ({ path: path.resolve(a.resolveDir, a.path.replace(/\?raw$/, '')), namespace: 'raw' }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, a => ({ contents: fs.readFileSync(a.path, 'utf8'), loader: 'text' }));
  }
};

// the generated project compiles: bundle src/main.tsx with the vault's own react
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-export-'));
try {
  Object.entries(out.files).forEach(([name, text]) => { fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), text); });
  const result = await esbuild.build({
    entryPoints: [path.join(dir, 'src/main.tsx')], bundle: true, write: false, outfile: path.join(dir, 'out.js'),
    alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], jsx: 'automatic',
    loader: { '.css': 'css', '.woff2': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
    logLevel: 'silent', external: ['/assets/*', '/features/*'], plugins: [rawPlugin]
  });
  assert(result.outputFiles.some(f => f.path.endsWith('.js') && f.text.length > 1000), 'bundle produced');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

// every feature in the vault: wrapped or skipped with a reason, and the whole project compiles
{
  const all = require('../registry.json').items.filter(i => !i.isWidget).map(i => i.slug);
  const big = generateReactProject({ stack: all.map(slug => ({ slug })), theme: 'midnight-dark', page: {}, sources: Object.fromEntries(all.map(s => [s, source(s)])) });
  assert(big.included.length >= all.length - 10, `almost every feature is included (${big.included.length}/${all.length}); skipped: ${big.skipped.map(s => s.slug + ' (' + s.reason + ')').join(', ')}`);
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'react-export-all-'));
  try {
    Object.entries(big.files).forEach(([name, text]) => { fs.mkdirSync(path.dirname(path.join(dir2, name)), { recursive: true }); fs.writeFileSync(path.join(dir2, name), text); });
    const r = await esbuild.build({
      entryPoints: [path.join(dir2, 'src/main.tsx')], bundle: true, write: false, outfile: path.join(dir2, 'out.js'),
      alias: { '@': path.join(dir2, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], jsx: 'automatic',
      loader: { '.css': 'css', '.woff2': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
      logLevel: 'silent', external: ['/assets/*', '/features/*'], plugins: [rawPlugin]
    });
    assert(r.outputFiles.length > 0);
  } finally { fs.rmSync(dir2, { recursive: true, force: true }); }
  console.log(`  ${big.included.length} of ${all.length} features go into the React project; skipped: ${big.skipped.length}`);
}
console.log('✅ React export tests passed!');

})().catch(e => { console.error(e); process.exit(1); });
