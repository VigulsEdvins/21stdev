# How the vault was seeded

The first ~170 components were imported from 21st.dev and the public `kedhareswer` component repository, then bundled and cleaned up. The one-off scripts that did this were removed on 2026-10-24 (they are in git history, e.g. `git log --diff-filter=D -- scripts/import-21st-top.js`):

| Script | What it did |
|---|---|
| `import-21st-top.js`, `import-top-today.js` | fetched component pages from 21st.dev and wrote `features/<slug>/` (meta, markup, styles, `component.tsx`) |
| `import-all-kedhareswer.js` | copied every component from a local clone of the kedhareswer repo (`/tmp/kedhareswer-repo/components`) into `features/` |
| `bundle-all-kedhareswer.js` | ran esbuild over every feature's `demo.tsx` to produce `script.js` (replaced by the per-slug `bundle-demo`, which also stamps a hash) |
| `migrate-meta.js` | brought every `meta.json` up to the schema in `scripts/schema.js` (`LEGACY_CATEGORY_MAP` there is what is left of it) |

To add a component now, use `npm run new-feature` (see AGENT_GUIDE.md); to refresh a bundle, `npm run bundle-demo -- --slug <slug>`.
