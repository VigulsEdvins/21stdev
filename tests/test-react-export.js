// React project export: generates a project from real features and bundles it with esbuild to prove it compiles.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');
const { generateReactProject, unsupportedReason } = require('../scripts/builder/react-export.js');

const ROOT = path.resolve(__dirname, '..');
const read = (slug, f) => { const p = path.join(ROOT, 'features', slug, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const source = (slug) => ({ title: slug, component: read(slug, 'component.tsx'), demo: read(slug, 'demo.tsx'), css: read(slug, 'style.css') });

const slugs = ['alice-scroll-story', 'waitlist-hero'];
const sources = Object.fromEntries(slugs.map(s => [s, source(s)]));
const stack = [...slugs, 'alice-scroll-story'].map(slug => ({ slug }));
const out = generateReactProject({ stack, theme: 'clean-minimal', page: { title: 'Zephyr Dental', description: 'Family dentistry.' }, sources });

// waitlist-hero is plain bundle code (no component.tsx): left out with a reason
assert(out.skipped.some(s => s.slug === 'waitlist-hero' && /no React source/.test(s.reason)));
assert(out.included.includes('alice-scroll-story'));
assert.strictEqual((out.files['src/App.tsx'].match(/<Section\d+ \/>/g) || []).length, 3 - out.skipped.length, 'a repeated section is rendered twice but imported once');
assert.strictEqual((out.files['src/App.tsx'].match(/import Section/g) || []).length, out.included.length);
assert(out.files['index.html'].includes('<title>Zephyr Dental</title>'));
assert(out.files['src/index.css'].includes('--bg: #ffffff'));
assert(out.files['README.md'].includes('waitlist-hero'), 'README lists what was left out');
const pkg = JSON.parse(out.files['package.json']);
assert(pkg.dependencies.react && pkg.devDependencies.vite && pkg.name === 'zephyr-dental');
assert.strictEqual(unsupportedReason('x', { component: 'import a from "next/image"', demo: 'x' }), 'it uses Next.js APIs');
assert(/not include/.test(unsupportedReason('x', { component: 'import a from "@/registry/default/lib/utils"', demo: 'x' })));

// the generated project compiles: bundle src/main.tsx with the vault's own react
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-export-'));
try {
  Object.entries(out.files).forEach(([name, text]) => { fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), text); });
  const result = esbuild.buildSync({
    entryPoints: [path.join(dir, 'src/main.tsx')], bundle: true, write: false, outfile: path.join(dir, 'out.js'),
    alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], jsx: 'automatic',
    loader: { '.css': 'css', '.woff2': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl' },
    logLevel: 'silent', external: ['/assets/*', '/features/*']
  });
  assert(result.outputFiles.some(f => f.path.endsWith('.js') && f.text.length > 1000), 'bundle produced');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('✅ React export tests passed!');
