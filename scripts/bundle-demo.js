#!/usr/bin/env node
/**
 * Rebuilds a React feature's script.js from its demo.tsx (the component with real props/data),
 * instead of mounting the bare component with no props.
 *   npm run bundle-demo -- --slug a,b        rebuild the named features
 *   npm run bundle-demo -- --failing         rebuild features that failed the last check-features run
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');

async function bundleDemo(slug) {
  const dir = path.join(ROOT, 'features', slug);
  if (!fs.existsSync(path.join(dir, 'demo.tsx')) || !fs.existsSync(path.join(dir, 'component.tsx'))) {
    throw new Error('needs demo.tsx and component.tsx');
  }
  const entry = path.join(dir, '_demo_entry.tsx');
  fs.writeFileSync(entry, `import * as React from "react";\nimport { createRoot } from "react-dom/client";\nimport Demo from "./demo";\nconst el = document.getElementById("root");\nif (el) createRoot(el).render(React.createElement(Demo));\n`);
  try {
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      format: 'iife',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      outfile: path.join(dir, 'script.js'),
      logLevel: 'silent',
      plugins: [{
        name: 'ui-alias',
        setup(build) {
          build.onResolve({ filter: /^@\/components\/ui\// }, () => ({ path: path.join(dir, 'component.tsx') }));
        }
      }]
    });
  } finally {
    fs.rmSync(entry, { force: true });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--slug');
  let slugs = [];
  if (i >= 0) slugs = argv[i + 1].split(',');
  else if (argv.includes('--failing')) {
    const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'features.json'), 'utf8'));
    slugs = report.results.filter(r => !r.ok && r.errors.some(e => e.startsWith('pageerror'))).map(r => r.slug);
  } else {
    console.error('Usage: bundle-demo --slug a,b | --failing');
    process.exit(1);
  }
  for (const slug of slugs) {
    try { await bundleDemo(slug); console.log('✓', slug); } catch (e) { console.error('✗', slug, e.message.split('\n')[0]); }
  }
}

if (require.main === module) main();
module.exports = { bundleDemo };
