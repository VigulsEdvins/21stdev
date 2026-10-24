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
- [ ] **3.3 Content-field validation (S)** — a test that every `customizable` selector resolves in the rendered component.
- [ ] **3.4 Colour and font fields in the Content tab (S)** — surface the `color` type already in the schema.
- [ ] **3.5 Re-check `mood`/`industry`/`weight` tags (S)** — measured values vs. declared; fix drift so filters can be trusted.

## Epic 4 — Builder UX and robustness (P1)
Goal: the builder is dependable for a full client session.

- [ ] **4.1 Split `app.js` (895 lines) like `builder.js` was (M)** — same module pattern in `scripts/`.
- [ ] **4.2 Autosave and recovery (S)** — check the flush on tab close, corrupted localStorage, and quota errors with a visible message.
- [ ] **4.3 Undo/redo across content edits and page settings (M)** — confirm history covers them, not just layout.
- [ ] **4.4 Keyboard and a11y pass on the builder shell (M)** — focus order, labels, contrast; use the a11y-debugging skill.
- [ ] **4.5 Preview performance with 10+ heavy sections (M)** — lazy-mount, pause off-screen WebGL/shader components.
- [ ] **4.6 Mobile/tablet preview toggle (S)** — viewport switcher in the preview frame.
- [ ] **4.7 Check 4 components that render empty in headless Chromium (S)** — (chroma-glitch, cinema-grain and mono-contrast preloaders render once given 8 s) cloth-peel-reveal, noise-dissolve-reveal, spotlight-offer-quiz, tile-scrollbar. May be WebGL/interaction-gated and fine in a real browser; confirm, fix if not.
- [x] **4.8 Blank-component guard (S)** — done 2026-10-24: `npm run verify` rejects stub script.js, `npm run check-blank` renders every feature in the builder. — make `check-features` or `verify` load every feature through the builder and fail on an empty section, so stub script.js files can't ship again.

## Epic 5 — Export and handoff (P1)
Goal: the exported site works with nothing from the vault.

- [x] **5.1 Exported-site e2e matrix (M)** — done 2026-10-24: `npm run check-exports` (also a CI job). 207 of 209 pass in both themes; 2 are known broken, see 5.6 and 5.7.
- [ ] **5.2 Export weight report (S)** — total KB and heavy-section warning in the README.
- [ ] **5.3 Optional React/Vite project export (L)** — emit `component.tsx` + `package.json` for components that have them.
- [ ] **5.4 Font and asset self-hosting option (M)** — avoid runtime Google Fonts requests.
- [ ] **5.9 Remaining external hosts (M)** — 9 features build Unsplash URLs at run time (`"…/photo-"+id+"?w=…"`), `tilted-grid-hero` does the same with r2.dev, 3 preloaders stream MDN demo videos (17 MB), `hero-ascii-one` embeds a live Unicorn Studio scene. The static localizer cannot see them: needs a declared per-feature asset list (meta.json) plus rewriting of run-time-built paths; same root cause as 5.6.
- [ ] **5.5 SEO/meta basics in page settings (S)** — OG tags, canonical, robots.
- [ ] **5.6 Fix `forma-liquid-particle-studio` export (M)** — it builds `/features/.../img/${name}.webp` paths at run time so the asset bundler never sees them. Needs the bundler to accept a declared asset list (see 5.9).
- [x] **5.7 Fix `magic-hour` media (S)** — done 2026-10-24: the hot-linked video was gone, so `scripts/media/make-magic-hour.js` renders a new all-keyframe WebM and poster (dusk, moon and stars, dawn; 2.4 MB) into assets/library. Also found the dev server ignored HTTP Range requests, so videos could not seek; fixed in scripts/serve.js with a test. Note: WebM may not play in older Safari; an MP4 would need an H.264 encoder.
- [x] **5.8 Self-contain exports (M)** — done for fonts and statically referenced images, 2026-10-24: `node scripts/localize-remote.js` downloaded 64 files (7 MB: Google Fonts, Unsplash, cdn.21st.dev, r2.dev) into assets/library and rewrote 34 feature files; the exporter now ships a stylesheet's own fonts and inlines them in the single-file export. 191 of 209 exports now contact no other website; `check-exports` fails if another one starts (KNOWN_EXTERNAL). Remaining: see 5.9.

## Epic 6 — Tooling, tests and CI (P2)
Goal: regressions get caught without manual runs.

- [x] **6.1 CI workflow (S)** — done 2026-10-24: `.github/workflows/ci.yml` runs verify, unit and e2e tests, and check-blank as a second job. Not yet run on GitHub.
- [ ] **6.2 Fold `check-features` and `audit-themes` into CI as non-blocking reports (S)**.
- [ ] **6.3 Pin the thumbnail pipeline (S)** — deterministic renders so regenerated thumbs don't churn the diff.
- [ ] **6.4 Repo size (M)** — `registry.json` / thumbs / assets growth; consider Git LFS or `.gitattributes` for images, and check what is tracked.
- [ ] **6.5 Remove the stray TODOs** in `features/agent-console-template/` (S).
- [ ] **6.6 Refresh `AGENT_GUIDE.md` and the plan docs (S)** — mark finished plans in `docs/superpowers/plans` as done.

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
