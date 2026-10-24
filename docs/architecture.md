# Architecture (one page)

```
features/<slug>/           meta.json + index.html + style.css + script.js (+ component.tsx, demo.tsx)
        │  npm run sync   (scripts/sync-registry.js, validated by scripts/schema.js)
        ▼
registry.json              full index for tools and agents (field lists, notes, file manifest)
registry.js                slim metadata for the browser (window.FEATURE_REGISTRY, ~0.27 MB)
        │
        ├─ index.html + app.js (+ scripts/catalog/*)     catalogue: search, inspector, workbench, Add Feature Studio
        └─ builder.html + builder.js (+ scripts/builder/*, builder-extras.js)
                 │  state: scripts/stack-manager.js (sections, theme, page settings, overrides, locked/hidden)
                 │  history.js (undo/redo), autosave.js, projects.js (+ project-sanitize.js on import)
                 ▼
           scripts/assembler.js        preview document, ZIP bundle, single-file page, README, site files
                 ├─ export-assets.js    localises /assets/… into the ZIP, weight and third-party reports
                 ├─ font-host.js        self-hosts the page fonts in the ZIP
                 ├─ page-checks.js      pre-export alt/heading/link/label checks
                 ├─ react-export.js     Vite + TypeScript project from component.tsx sources
                 └─ export-panel.js     the Export modal that ties these together
```

- Component sources are fetched on demand (`scripts/feature-files.js`, `fetchFeatureFiles` in the builder); the named Content-tab fields come from each `meta.json` the first time a section is opened.
- The preview is one iframe that is rebuilt from the stack on every change (about 350 ms with 20+ sections); WebGL canvases far from the viewport stop drawing.
- Exports never need the vault: assets are copied into the ZIP, fonts self-hosted, third-party hosts listed in the README.
- Safety nets: `npm run verify` (schema, registry, stamped bundles), `npm test` (unit), `npm run test:e2e`, `check-blank`, `check-exports`, `check-responsive`, `check-fields`, `check-code-safety`, `check-visual`. `npm run ci` runs them in order.
