# Backlog — epics and tasks

State on 2026-10-24 (branch `fix/theme-issues-and-builder-split`): 209 components (173 from 21st.dev with `unverified` licence, 36 own), all `stable`, 0 headless-check failures, 164 with named Content fields, 64 restyled with Tailwind, `builder.js` split down to 585 lines, unit + e2e tests pass.

Size: S ≤ 0.5 day, M ≈ 1–2 days, L ≈ 3+ days. Priority: P0 blocks real client use, P1 next, P2 later.

---

## Epic 1 — Licence compliance (P0) — SKIPPED
Done for now: all 209 components have a recorded licence (own, MIT or author permission), see docs/licence-audit/. Tasks 1.3–1.5 and the credits section are dropped by decision.

- [ ] **1.1 Audit the 173 `unverified` components (M)** — for each, check the 21st.dev page for an open licence or author contact; record with `npm run set-license`. Output: a table of component → licence → evidence URL.
- [ ] **1.2 Replace or remove components with no usable licence (M)** — rebuild a similar one as `own`, or drop it from `features/`.
- [ ] **1.3 Builder warning on unverified sections (S)** — badge in the Sections list and a confirm step on export, not only a line in the README.
- [ ] **1.4 "Licence-safe only" filter, on by default (S)** — in catalog-search, so a client build starts from `own` + verified components.
- [ ] **1.5 Verify test: fail `npm run verify` if an `own`/verified entry lacks evidence (S)**.

## Epic 2 — Theme and visual quality (P1)
Goal: every component looks right under every page theme.

- [x] **2.1 Triage `reports/themes.json` (M)** — done 2026-10-24: 8 reviewed as false positives (themeReviewed), 1 fixed (stencil-labs-template). — run `npm run audit-themes`, review each flag, then fix, add `themeReviewed`, `nativeWhen` or `ownPalette`.
- [ ] **2.2 Token migration, batch by category (L)** — `npm run lint-tokens` worst offenders first, by hand, checked in dark and light (the codemod was rejected). Start with Heroes and Headers & Nav.
- [x] **2.3 Tailwind coverage for the remaining 21st.dev components (M)** — done 2026-10-24: tried 60, before/after screenshots showed only isoline-bloom and ticket-stub-footer changed visibly for the better; the other 58 were left as they were. — find components whose `component.tsx` uses utility classes but whose `style.css` has none, run `build-tailwind`, regenerate thumbs.
- [ ] **2.4 Visual regression baseline (M)** — store thumbs/screenshots per theme and diff in CI so restyles stop being eyeballed.
- [ ] **2.5 Responsive pass (M)** — check all 209 at 375 / 768 / 1280 widths in headless Chromium, report overflow; extend `check-features`.

## Epic 3 — Catalogue coverage and content editing (P1)
Goal: every component is usable by a non-developer.

- [x] **3.1 Named Content fields for the 45 components without `customizable` (M)** — done 2026-10-24. 34 of the 45 are shader/canvas backgrounds with no editable text, so none is correct. Found that 11 imported 21st.dev components (waitlist-hero, hover-footer, web-gl-shader, …) rendered blank in the builder and exports because script.js was a stub; moved their inlined bundle into script.js/style.css, then named fields for 10 of them. Skipped on purpose: SVG-text artwork (brushstroke-portfolio-hero, alter-ego-mask-reveal, tiger-tear-reveal, silhouette-wrap, type-remix-preloader) and loading-screen preloaders, whose text is tied to the layout.
- [ ] **3.2 Thin categories (M)** — Headers & Nav has 4, Buttons & UI 6, Footers & Endings 8. Add or import until each has ~12 usable options.
- [x] **3.3 Content-field validation (S)** — done 2026-10-24: `npm run check-fields` (also in CI). It found 6 features with fields that matched nothing (counters, carousel slides, readouts); those 11 fields were removed.
- [ ] **3.4 Colour and font fields in the Content tab (S)** — surface the `color` type already in the schema.
- [x] **3.5 Re-check `mood`/`industry`/`weight` tags (S)** — done 2026-10-24: re-measured all 209; 4 weights corrected (alice-scroll-story, amour-sunrise-preloader, sidebar-portfolio-template, vertical-tabs). Mood flips on animated shader components were ignored because their brightness depends on when the frame is taken.

## Epic 4 — Builder UX and robustness (P1)
Goal: the builder is dependable for a full client session.

- [x] **4.1 Split `app.js` (M)** — done 2026-10-24: app.js 895 -> 486 lines; the inspector, workbench, Add Feature Studio and pure helpers moved to `scripts/catalog/`; new unit test and a catalogue-page e2e.
- [x] **4.2 Autosave and recovery (S)** — done 2026-10-24: `scripts/builder/autosave.js` keeps the previous good copy, retries once when storage is full, falls back to that copy when the saved one is unreadable (keeping the bad one aside) and shows a red banner with a "Download backup" button while saving fails. Unit test + e2e. The flush on tab close already existed.
- [x] **4.3 Undo/redo across content edits and page settings (M)** — done 2026-10-24: history already covered them, but the preview never put text back when an override was removed (undo, Reset), so undo of a Content edit left the new text on screen. The overrides runtime now remembers what each element held and restores it. e2e covers content, page title and theme.
- [x] **4.4 Keyboard and a11y pass on the builder shell (M)** — done 2026-10-24 with Lighthouse: builder.html 92 -> 100 accessibility (badge and URL-bar contrast, unnamed theme select, nav role, meta description), index.html 92 -> 100. Also fixed a real layout bug: the catalogue's header tabs (All Vault / Components / Templates) had lost their styles, and the header now wraps on narrow windows. New keyboard e2e (tab stops named + visible focus, Escape closes dialogs and returns focus). The catalogue's layout shift (CLS 0.11) is left.
- [x] **4.5 Preview performance with 10+ heavy sections (M)** — done 2026-10-24. Measured: 12 light or medium sections below the fold run at 40 fps, 12 WebGL ones at 2 fps (software GL), because full-screen fixed WebGL backgrounds keep painting for sections that are far off screen. A small runtime (shared by preview and export) now skips WebGL draw calls for canvases whose section is out of view: 2 -> 10 fps in the same test, and the e2e proves drawing stops and resumes. Texture uploads are not skipped, so nothing goes blank. Visible heavy sections are still slow on software rendering; real GPUs were not measured.
- [x] **4.6 Mobile/tablet preview toggle (S)** — already existed (Desktop/Tablet 768/Mobile 375 buttons); added an e2e that checks the widths and that the page sees a phone-sized window.
- [x] **4.7 Check 4 components that render empty (S)** — done 2026-10-24, in a real Chrome (DevTools): they were not GPU-gated, they were broken. `cloth-peel-reveal`, `noise-dissolve-reveal`, `spotlight-offer-quiz` and `tile-scrollbar` had a script.js built from an older demo (the demo's content was missing), and the first two also lacked Tailwind. Rebuilt and restyled; all four now render, and KNOWN_EMPTY is empty. `bundle-demo` now stamps script.js with a hash of its sources and `verify` fails if they change afterwards (Test 9). Other bundles were not rebuilt (145 would change and a blanket rebuild is risky); the stamp protects every bundle from now on.
- [x] **4.8 Blank-component guard (S)** — done 2026-10-24: `npm run verify` rejects stub script.js, `npm run check-blank` renders every feature in the builder. — make `check-features` or `verify` load every feature through the builder and fail on an empty section, so stub script.js files can't ship again.

## Epic 5 — Export and handoff (P1)
Goal: the exported site works with nothing from the vault.

- [x] **5.1 Exported-site e2e matrix (M)** — done 2026-10-24: `npm run check-exports` (also a CI job). 207 of 209 pass in both themes; 2 are known broken, see 5.6 and 5.7.
- [x] **5.2 Export weight report (S)** — done 2026-10-24: the export README gets a "Page weight" section (code and asset size, largest files, heavy sections, warning over 8 MB).
- [x] **5.3 Optional React/Vite project export (L)** — done 2026-10-24: a "React project" button in the export modal (`scripts/builder/react-export.js`). 153 of 209 features have a React source and all 153 compile when bundled one by one; the other 56 are plain HTML/JS and are left out and listed in the project's README. Content-tab edits are not carried over; dependencies without a known version are `latest`. Not run through `npm install` + `vite build` (no network installs here); verified with esbuild.
- [x] **5.4 Font and asset self-hosting option (M)** — done by 5.8.
- [x] **5.9 Remaining external hosts (M)** — decided 2026-10-24: the 9 carousels that build Unsplash URLs at run time, `tilted-grid-hero` (r2.dev), the 3 MDN-video preloaders (17 MB) and the live Unicorn Studio scene in `hero-ascii-one` stay on their hosts. Localizing them would break the single-file export, which cannot carry run-time-built paths. They are listed in KNOWN_EXTERNAL in `scripts/check-exports.js`, so a new one fails CI.
- [x] **5.5 SEO/meta basics in page settings (S)** — done 2026-10-24: share image (og:image, twitter card), canonical address and a noindex switch in the Styling tab, plus og:title/description/type; unit test and e2e. Note: the page fonts chosen in Page Settings are still loaded from Google Fonts at run time.
- [x] **5.6 Fix `forma-liquid-particle-studio` export (M)** — done 2026-10-24 with a new `exportAssets` list in meta.json (`npm run declare-assets`): declared files ship in the ZIP and the folder in the code becomes relative. ZIP only; the single-file page cannot carry them.
- [x] **5.7 Fix `magic-hour` media (S)** — done 2026-10-24: the hot-linked video was gone, so `scripts/media/make-magic-hour.js` renders a new all-keyframe WebM and poster (dusk, moon and stars, dawn; 2.4 MB) into assets/library. Also found the dev server ignored HTTP Range requests, so videos could not seek; fixed in scripts/serve.js with a test. Note: WebM may not play in older Safari; an MP4 would need an H.264 encoder.
- [x] **5.8 Self-contain exports (M)** — done for fonts and statically referenced images, 2026-10-24: `node scripts/localize-remote.js` downloaded 64 files (7 MB: Google Fonts, Unsplash, cdn.21st.dev, r2.dev) into assets/library and rewrote 34 feature files; the exporter now ships a stylesheet's own fonts and inlines them in the single-file export. 191 of 209 exports now contact no other website; `check-exports` fails if another one starts (KNOWN_EXTERNAL). Remaining: see 5.9.

## Epic 6 — Tooling, tests and CI (P2)
Goal: regressions get caught without manual runs.

- [x] **6.1 CI workflow (S)** — done 2026-10-24: `.github/workflows/ci.yml` runs verify, unit and e2e tests, and check-blank as a second job. Not yet run on GitHub.
- [ ] **6.2 Fold `check-features` and `audit-themes` into CI as non-blocking reports (S)**.
- [ ] **6.3 Pin the thumbnail pipeline (S)** — deterministic renders so regenerated thumbs don't churn the diff.
- [ ] **6.4 Repo size (M)** — `registry.json` / thumbs / assets growth; consider Git LFS or `.gitattributes` for images, and check what is tracked.
- [x] **6.5 Remove the stray TODOs** — checked 2026-10-24: not code TODOs; the matches are sample prompt text inside the agent-console demo. Nothing to remove.
- [x] **6.6 Refresh `AGENT_GUIDE.md` and the plan docs (S)** — done 2026-10-24: plans carry a status banner, the guide lists `localize-remote` and points to the backlog.

## Epic 7 — Projects and collaboration (P2)
- [ ] **7.1 Project import/export schema versioning (S)** — migrate old JSON files.
- [ ] **7.2 Client review link (L)** — static preview bundle with a comment overlay, no backend.
- [ ] **7.3 Starter project templates (M)** — pre-built stacks per industry from the existing `industry` tags.

---

## Suggested order
1. ~~Epic 1~~ skipped.
2. 2.1, 3.1, 5.1: close known quality gaps.
3. 6.1: lock the gains in.
4. 4.x and 2.2 in parallel; 3.2, 5.3, 7.x as demand shows.
