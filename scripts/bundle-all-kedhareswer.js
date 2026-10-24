#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { syncRegistry } = require('./sync-registry');

const ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(ROOT, 'features');

async function bundleAll() {
  const dirs = fs.readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const toBundle = [];
  for (const slug of dirs) {
    const featDir = path.join(FEATURES_DIR, slug);
    const compPath = path.join(featDir, 'component.tsx');
    const scriptPath = path.join(featDir, 'script.js');

    if (!fs.existsSync(compPath) || !fs.existsSync(scriptPath)) continue;

    const scriptText = fs.readFileSync(scriptPath, 'utf8');
    if (scriptText.includes('interactiveCanvas') || scriptText.includes('const rings = 12')) {
      toBundle.push(slug);
    }
  }

  console.log(`Found ${toBundle.length} components with placeholder ring canvas to bundle with real React source...`);

  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  for (let i = 0; i < toBundle.length; i++) {
    const slug = toBundle[i];
    const featDir = path.join(FEATURES_DIR, slug);
    const metaPath = path.join(featDir, 'meta.json');
    let title = slug;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        title = meta.title || meta.name || slug;
      } catch (e) {}
    }

    const entryPath = path.join(featDir, '_bundle_entry.tsx');
    const entryCode = `
import * as React from "react";
import { createRoot } from "react-dom/client";
import Comp from "./component";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(React.createElement(Comp));
}
`;
    fs.writeFileSync(entryPath, entryCode, 'utf8');

    const outScriptPath = path.join(featDir, 'script.js');
    const outHtmlPath = path.join(featDir, 'index.html');
    const outCssPath = path.join(featDir, 'style.css');

    try {
      await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        minify: true,
        format: 'iife',
        define: { 'process.env.NODE_ENV': '"production"' },
        outfile: outScriptPath,
        logLevel: 'silent'
      });

      // Write standard HTML mount
      fs.writeFileSync(outHtmlPath, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="root"></div>
  <script src="script.js"></script>
</body>
</html>
`, 'utf8');

      // Minimal CSS reset
      fs.writeFileSync(outCssPath, `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body, #root {
  width: 100%;
  min-height: 100%;
}
`, 'utf8');

      successCount++;
      if ((i + 1) % 25 === 0 || i === toBundle.length - 1) {
        console.log(`Progress: ${i + 1}/${toBundle.length} bundled successfully...`);
      }
    } catch (err) {
      failureCount++;
      failures.push({ slug, error: err.message.split('\n')[0] });
      console.error(`Failed ${slug}:`, err.message.split('\n')[0]);
    } finally {
      if (fs.existsSync(entryPath)) {
        fs.unlinkSync(entryPath);
      }
    }
  }

  console.log(`\nBundling completed! Success: ${successCount}, Failures: ${failureCount}`);
  if (failures.length > 0) {
    console.error('Failed items:', failures);
  }

  console.log('\nSyncing registry.json and registry.js...');
  syncRegistry();
  console.log('Registry synced successfully.');
}

bundleAll().catch(err => {
  console.error('Fatal bundling error:', err);
  process.exit(1);
});
