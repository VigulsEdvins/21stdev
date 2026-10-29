# Putting the builder on edvlabs.com (plan, 2026-10-28)

Goal: after "I will build it" and signing in, the visitor lands in the working builder at `https://edvlabs.com/builder/`.

## Status 2026-10-29

Steps 1 to 6 are **done and pushed**: `npm run build:site` stages `dist/` with the builder at `/builder/` (plus `preview-frame/` and `scripts/cms/`, the content editor files the admin panel and the editor add-on fetch; both were missing from the first version and are now checked by `tests/test-build-site.js` and `tests/e2e/builder-staged.e2e.js`); `wrangler.jsonc` publishes `./dist`; the dev server serves it with the real headers; `BUILDER_URL` points at `/builder/`. **Step 3 (headers) is done and stricter than planned:** the builder page runs under `script-src 'self'` with no cdnjs (JSZip is hosted and loaded on the first download), and the preview and the admin panel load through `preview-frame/`, which has its own policy (`docs/security/builder-csp.md`). Step 7 (sign-in check) is not built. **Step 8 remains:** run `npm run check-headers` and `node scripts/check-builder-csp.js` against the live address after the first deploy (reminder in `docs/HANDOFF.md`). The builder's speed score on a throttled phone is now 85 to 88, not 55 (`npm run check-builder-speed`).

## Where things stood on 2026-10-28 (before the work above)

- `wrangler.jsonc` publishes only `site/`. The builder lives at the repository root (`builder.html`, `builder.js`, `builder*.css`, `registry.js`, `scripts/`, `features/`, `assets/library/`, `thumbs/`, `styles.css`), so online `/builder.html` is a 404. Nothing has been deployed yet, so the layout is still free to choose.
- The builder reaches its files by relative path: `features/<slug>/...` (fetched at run time), `registry.js`, `scripts/...`, `thumbs/`, `assets/library/`, and the shared price and question scripts as `site/js/*.js`. `scripts/builder/guided-get.js` links "Ask edvlabs to do it" to `site/contact/`.
- About 1,400 files and 18 MB for the builder. Cloudflare's limit is 20,000 files and 25 MiB per file, so size is fine.
- `site/_headers` gives every page a strict policy (`script-src 'self'`, `style-src 'self'`, no other hosts). The builder uses inline styles, loads jszip from cdnjs and shows previews in frames, so it would break under that policy. `docs/HANDOFF.md` already lists "the builder's CSP (E16.7)" as open.
- `/account/` sends people to `BUILDER_URL = '/builder.html'` (top of `site/js/account.js`). It has to change to the new address.
- The builder has no sign-in check. It is client-side only; the real lock is payment before download (E4, E5).

## Recommended layout: a staged folder, like the examples build

Keep the builder files where they are (every test and the dev server read them there). Add one build step that copies what the builder needs next to the public site, and let Cloudflare publish that folder.

```
dist/                      (git-ignored, rebuilt on every deploy)
  <everything from site/>
  builder/
    index.html             <- builder.html
    builder.css  builder-e.css  builder-guided.css  builder.js  styles.css  registry.js
    scripts/               <- scripts/assembler.js, builder-extras.js, catalog-search.js, project-sanitize.js, projects.js, stack-manager.js, builder/
    features/<slug>/{index.html,style.css,script.js,meta.json}   (only what the builder fetches)
    assets/library/  thumbs/
    site/js/{prices,questions,brief,recommend}.js
```

Why a `/builder/` folder and not the root: the root already has `index.html`, `styles.css` and `app.js` for the old vault page, which must not overwrite the public ones. A folder keeps every relative path in the builder working unchanged.

Rejected: moving the builder into `site/` by hand (large churn, breaks tests and tools); publishing the repository root (holds `node_modules` and private files, `wrangler.jsonc` warns against it).

## Steps

1. **`scripts/build-site.js`** (`npm run build:site`): empties `dist/`, copies `site/`, then copies the builder files listed above into `dist/builder/`. `--check` mode fails when the list misses a file the builder asks for, found by loading the staged builder in headless Chromium and failing on any 404. Test: `tests/test-build-site.js` (file list, no `node_modules`, no `.dev.vars`, nothing outside the list).
2. **Paths:** the staged builder needs `site/js/*` (copied, as above) and the contact link changed from `site/contact/` to a value the build can set (`../contact/` in `dist`). Make `HELP_URL` in `guided-get.js` read a `<meta name="contact-url">` with the old value as the default; the build writes the meta.
3. **Headers:** add a `/builder/*` block to `site/_headers`: scripts from self and `https://cdnjs.cloudflare.com` (jszip; better, copy jszip into `dist/builder/` and keep `'self'` only), `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `frame-ancestors 'self'`, same HSTS and nosniff lines. Extend `scripts/check-headers.js` so the new block is validated and the `/*` block stays strict. This is the E16.7 work; do it with the build, not after.
4. **Wrangler:** set `assets.directory` to `./dist`; keep `run_worker_first: ["/api/*"]`. Deploy command becomes `npm run build:site && wrangler deploy` (set as the build command in Cloudflare if the repository is connected there). `.gitignore` gets `dist/`.
5. **Dev server:** `scripts/dev-site.js` serves `dist/` (run the build first) so `npm run dev:site` matches production. Tests that start the shared test server keep using the repository root, unchanged.
6. **Redirect address:** change `BUILDER_URL` in `site/js/account.js` to `/builder/`; update the e2e stub route in `tests/e2e/account.e2e.js` to match; the repository-root dev server keeps working because the test stubs the page.
7. **Sign-in check on the builder (optional, after the first deploy):** a small script that asks `/api/config` and Supabase whether the visitor is signed in and otherwise sends them to `/account/?from=start`. Needs `connect-src 'self'` plus the Supabase address in the `/builder/*` policy. This only guides honest visitors; do not call it security. Payment (E4, E5) is the real gate.
8. **Docs and check:** update `docs/HANDOFF.md` (layout decision, remove the "does not link to the builder yet" gap), `docs/deploy/accounts.md` (its line saying nothing links to the account page is now out of date), and run `npm run ci`, `check-headers` against staging, and a Lighthouse run of `/builder/` (known: performance about 55).

## Owner decisions needed

- Is `/builder/` the address you want visitors to see?
- Should the builder open to anyone who types the address in step 7's first version, or wait for the sign-in check? (Recommendation: ship without the check, add it in the next round with payment.)
- Cloudflare: is the repository connected so it can run the build command, or do you deploy with `wrangler deploy` yourself? (Changes only where the build command is set.)

## Order and size

Steps 1, 2, 4, 5, 6 are one slice (about half a day, testable locally). Step 3 is a second slice and must land before anything is deployed. Steps 7 and 8 follow.
