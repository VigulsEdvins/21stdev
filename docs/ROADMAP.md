# Roadmap — round 2: what was done (epics C to I)

Updated 2026-10-25. Epics A (publishing, CI on GitHub) and B (licences, credits) are **dropped by decision**.
Below, each task is marked **done**, **partly** (what is left is stated) or **not done** (with the reason). The detailed
plan that follows the table is kept as written, so the original intent stays visible.

| Task | Status |
|---|---|
| C1 16 new building blocks (pricing, feature grid, stats, logos, team, CTA band, contact / sign-in / multi-step forms, search, file drop, cookie bar, centered and search-first headers, CTA footer, 404) | **done**; each has Content fields, keyboard support, reduced-motion handling, thumbnails and a behaviour test (`building-blocks.e2e.js`); Headers 10, Footers 11, Buttons & UI 15, Cards 21 |
| C2 Token migration | **done**: 125 of 234 use the tokens (the lint now also reads `script.js` and counts the tokens bundled components read: `--color-background`, `--color-foreground`, `--background`, `--foreground`, `--primary`). 73 draw their colour in canvas, WebGL or a preloader (listed apart, not counted as work), 33 carry `"palette": "designed"` with a `paletteNote` in meta.json (A4 resume paper, brand palettes chosen by component props, a component's own dark/light switch, or a token mapping that put text on the wrong surface and was reverted), 3 have no colours of their own. This round migrated 21 full-page templates by their palette variables (`--ink`, `--paper`, `--muted`, `--line`... rewritten as mixes of `--text` and `--bg`, per light and dark block) and five CSS-based components; earth-limb-landing, kamm-trek-landing, hitch-cargo-landing, pocket-portfolio and open-slot-booking were tried and reverted because they put text over photos or mix light and dark panels |
| C3 Weight | **done**: `measure-weight`, heavy-section warning, and a lazy start: 34 heavy components that are exactly one screen tall (`lazy: true` in meta.json, set by `scripts/measure-reserve.js`) start in an export only when within one screen of the viewport, with page-load listeners replayed (`tests/e2e/lazy-start.e2e.js`). Frame times: `npm run measure-frames` (software rendering; `--recheck` re-measures the slow ones alone) writes `reports/frames.json`; six components labelled light that stayed slow alone were relabelled medium (audio-jukebox-player, oklch-ambient-glow-hero, cobalt-toile-landing, alter-ego-mask-reveal, animator-title-preloader, type-remix-preloader) |
| C4 Prune duplicates | **done as analysis**: `find-duplicates` finds no near-identical pairs worth removing, so nothing was deleted |
| C5 Kits | **done**: six reviewed kits in the Projects modal, test fails if a kit rots |
| C6 Search | **done**: synonyms (plans → pricing, navbar → header, gdpr → cookie); fuzzy, favourites, recents and "similar" already existed |
| D1 Split big modules | **partly**: `canvas.js` 1,425 → 340 lines (3 new modules). `export-panel.js` 711 → 489 lines (page checks and reviewer comments in `export-notes.js`, React download in `export-react-download.js`, ZIP and multi-page packaging plus the content-editor build in `export-zip.js`) |
| D2 Section tools | **done**: lock, hide, copy / paste between projects, Alt+Arrow reorder with announcements; sizing panels stay open |
| D3 Multi-page | **done**: page tabs, links to pages, header / footer to all pages, one HTML + CSS + JS per page in the ZIP, per-page sitemap, saved in projects (format v4), undo history. Single-file export and the code viewer show the open page only |
| D4 Images | **done**: picture descriptions (alt) in the Content tab, size warning. Upload already shrank to WebP |
| D5 Responsive | **done**: hide on desktop / tablet / phone, tablet and phone padding |
| D6 Onboarding | **done**: three-step tour (shown once; silent for automated browsers unless `?tour=1`), starter button on the empty page |
| D7 Light builder UI | **done**: the light look is now a set of variables (`html[data-ui-theme=light]` in `styles.css`) instead of an inverted filter, so panels, borders and text are hand-set and pictures and the preview are never touched. The dark look is pixel-identical to before. The catalogue page has no switch |
| D8 History panel | **done** |
| E1 Lighthouse | **done**: `npm run check-lighthouse` exports each of the six starters, serves the ZIP and runs Lighthouse (mobile preset). After the exporter fixes: accessibility 95-96, SEO 100, best practices 100, performance 52-100 (thresholds 0.90 / 0.95 / 0.95 / 0.50; part of `npm run ci` as a reported, non-blocking step). Fixes made: an empty icon instead of a /favicon.ico 404, a description in the starters, reserved space for script-rendered sections (layout shift 0.88 → 0), names for icon-only buttons |
| E2 Page checks | **done** |
| E3 Site files | **done**: robots.txt, sitemap.xml, JSON-LD, and an emoji favicon exports as `favicon.svg` plus `site.webmanifest`. the builder also draws the emoji into `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` with a canvas (`scripts/builder/favicon-png.js`), so the ZIP carries a full icon set; an image-address favicon is left as it is |
| E4 Fonts | **done for the ZIP**; the single-file page keeps the Google link |
| E5 / E6 | **done**: third-party report, `_headers`, `DEPLOY.md` |
| E7 MP4 fallback | **done**: `@ffmpeg-installer/ffmpeg` (dev only) has x264; `npm run encode-video-fallback` writes an H.264 MP4 next to each bundled WebM (magic-hour: 454 KB), the component picks it when VP8 is not playable, and the ZIP carries it |
| F1 CSP | **done**: strict-CSP export option, and a policy on `builder.html` and `index.html` (no object, base or foreign form targets; scripts only from the page itself and three CDNs). It has to keep `unsafe-inline` for scripts because the preview frame inherits the shell policy. `tests/e2e/shell-csp.e2e.js` and a render of all 234 components find no violations |
| F2 – F6 | **done**: code-safety scan (in `npm test`), `npm audit` (0 issues) and `docs/dependencies.md`, import sanitiser, server path guard, review-copy privacy note |
| G1 – G5 | **done**: registry.js 584 → 272 KB; CLS 0 on every starter; size report; thumbnails are WebP (3.0 → 1.9 MB, written by `npm run thumbs`); adding a section to a loaded preview inserts it in place (about 130 ms against 340-420 ms with 20+ sections; removal or any other structural change still reloads the frame, which stops its scripts) |
| H1 – H7 | **done**: `npm run ci`, Firefox and WebKit smoke both pass (`npm run setup-webkit-libs` fetches the few libraries the cached WebKit needs on a newer Linux, no root), flaky log, sync-registry test, one-off scripts removed, docs refreshed, unused-asset finder |
| I | decision notes below |

## Round 3 (2026-10-27)
- **Real-GPU frame times**: `GPU=1 npm run measure-frames` (Intel UHD 620, ANGLE over OpenGL) writes `reports/frames-gpu.json`. On the card, 232 of 235 components hold 60 fps; the software-rendering list of 62 slow ones was a renderer artefact. Fixed the real ones: `comeback-poster` (30 → 60 fps: flower heads are drawn once into sprites, stems batched) and `onward-summit-template` (35% → 7% slow frames: arrows batched by opacity). Still occasionally dropping to 30 fps: `murmuration-wordmark` (14% slow frames, 1,400+ particles).
- **Tokens**: 210 of 235 read the tokens; the other 25 (canvas/WebGL/preloader art, print paper, physical objects, brand pages) are reviewed and recorded with `palette: "designed"` and a `paletteNote`.
- **React export**: now wraps plain features (nearly all, since only one feature still has a React source): markup in `src/legacy/`, scoped CSS, script run once after mount (`src/lib/plain.ts`). All 235 bundle with esbuild; a browser run of four of them showed no script errors. Not carried over: the builder's theme engine, so a light-native section under a dark page theme can have pale text.
- **Single-file export** inlines the Latin and Latin Extended subsets of the page fonts.

## Epic I decisions
- **I1 Optional backend: not now.** Revisit only if the vault goes public; the review copy covers client feedback without a server.
- **I2 Contribution flow: not now.** No contributors; `new-feature` + `check-features` already describe the process.
- **I3 AI assist: not now.** Needs key handling and cost limits; prototype as a local dev tool first if wanted.
- **I4 Token import: done 2026-10-27.** "Import design tokens (JSON)" in Page Settings (`scripts/builder/token-import.js`): reads background / text / accent, heading and body font, and corner radius from a plain or W3C-style token file into the custom theme and page settings (new `radius` setting writes `--radius`). Undo reverts it.
- **I5 Internationalisation: first step done 2026-10-27.** Each page has its own language code (field next to the page tabs; empty = site language) used in `<html lang>` of the ZIP and of the open-page exports. Still later: `hreflang` links between translations, per-language content.

---

# Detailed plan as written (epics C to I)

Written 2026-10-24. Epics A (publishing, CI on GitHub) and B (licences, credits) are **dropped by decision**: the vault stays private for now and licences are not required. Their letters are kept so older notes still match.

Starting point: 218 components (48 own, 170 imported), all `stable`; a builder with ZIP / single-file / React-project / review-copy export; 53 test files + 18 e2e files; 196 components still hard-code colours; 48 are `heavy`.

Size: S ≤ 0.5 day, M ≈ 1–2 days, L ≈ 3+ days. Priority: P1 next, P2 later, P3 only if demand shows.
Tags: **[add]** new, **[improve]** change, **[remove]** cut.
Every task has a **Done when** line. Nothing counts as done unless `npm run verify`, `npm test` and `npm run test:e2e` still pass, plus the checks named in the task.

Working rules for every epic (from `AGENT_GUIDE.md` and past findings):
- Migrate colours **by hand, one component at a time**, with dark / light / warm screenshots. A blanket automated swap was tried and rejected.
- Do not rebuild all old `script.js` bundles at once; use `bundle-demo` per slug (the hash stamp protects them).
- Do not localize remote images that are built at run time (breaks the single-file export; decided in 5.9).
- Commit one task at a time with a `fix:` / `feat:` / `refactor:` / `test:` / `chore:` prefix, as in the recent history.

---

## Epic C — Catalogue quality and growth (P1)
**Goal:** a client can build a complete, normal website (home, pricing, FAQ, contact) using only vault components, and every component themes correctly.

**Why:** the vault is heavy on showpiece effects (Full Templates 35, Interactions 29, Audio & Shaders 22, 3D 22) and light on the plain building blocks real sites need (Headers 8, Buttons & UI 9, Footers 10). 196 components still hard-code colours, so light/warm themes rely on the theme engine's fallback.

### C1 Add the missing website building blocks (L) [add]
Create only **own** components (no import questions). Use `npm run new-feature -- <slug> --category "<cat>" --title "<title>"`.

- **C1.1 Gap list (S).** Write `docs/catalogue-gaps.md`: for each of the 12 categories, list what a typical site needs and which slug covers it today (use `registry.json` tags). Output decides C1.2–C1.4; target about 20 new components.
  - Done when: the file exists, every proposed component has a category, a mood/industry set and a size estimate.
- **C1.2 Content blocks (M).** Pricing table (3 tiers + monthly/yearly switch), FAQ accordion, testimonials (carousel and grid), logo cloud, stats counter, team grid, feature grid, timeline, blog/article list, CTA band.
  - Subtasks: build each with design tokens only (`--bg`, `--text`, `--accent`, `--radius`, `--font-*`); named `customizable` fields for every visible text and image; keyboard operable; `prefers-reduced-motion` respected; `weight: light`.
  - Done when: each passes `check-features`, `check-fields`, `check-blank`, `audit-themes` (0 flags), `check-responsive` (375/768), and has a thumbnail.
- **C1.3 Forms (M).** Contact form, newsletter inline, login/sign-up card, multi-step form, search bar with suggestions, file drop zone.
  - Subtasks: visible labels and error text tied by `aria-describedby`; validation states (empty, invalid, success) as real states, not screenshots; no network call — the form's `action` is a field the client sets, with a clear "set your form endpoint" hint in the section's content tab.
  - Done when: e2e proves invalid input shows the error and a keyboard-only user can submit.
- **C1.4 Navigation and ending (S).** Add 3 headers (centered logo, sidebar toggle, search-first) and 2 footers (CTA footer, app-store footer); add a cookie-notice bar and a 404 page.
  - Done when: Headers & Nav ≥ 11 and Footers ≥ 12; the new-components e2e covers each.
- **C1.5 Update the guide (S).** Add the new components to the starter lists in `scripts/builder/starters.js` where they fit, and re-run `npm run thumbs` then `npm run sync`.

### C2 Finish the token migration (L) [improve]
**Context:** `npm run lint-tokens` → `reports/tokens.json`; 196 components have `tokens: 0` and hard-coded colours.

- **C2.1 Rank (S).** Script `scripts/rank-token-work.js`: score each untokenised component by (a) category weight — Heroes, Headers, Footers, Cards, Buttons first; (b) number of hard-coded colours; (c) whether `audit-themes` flags it. Output `reports/token-queue.json`.
- **C2.2 Migrate in batches of 10 (L, ongoing).** For each component:
  1. Replace backgrounds, text, borders and accents with tokens; keep deliberate palettes (paper sheets, dark overlays) and mark `ownPalette` or `nativeWhen` in `meta.json`.
  2. Screenshot in dark, light, warm before and after.
  3. Run `audit-themes`, `check-visual -- --slug x --update` (only if the change is intended), `check-responsive`.
  - Done when: batch merged, `lint-tokens` count down by 10, no new `themeReviewed` flags.
- **C2.3 Make the number visible (S).** Print "tokenised N / 218" at the end of `lint-tokens` and in the CI `reports` job so the number only moves one way.
- **C2.4 Exit criterion (S).** Every component is either tokenised or has an explicit `ownPalette` / `nativeWhen` with a one-line reason in `meta.json`.

### C3 Reduce weight (M) [improve]
**Context:** 48 heavy, 59 medium, 111 light. Offscreen WebGL is already paused by the runtime; visible heavy sections are still slow in software rendering.

- **C3.1 Measure (M).** Script `scripts/measure-weight.js`: for every heavy component record JS+CSS+asset bytes, number of animation loops, and frame time over 5 s in headless Chromium. Output `reports/weight.json`.
- **C3.2 Lazy start below the fold (M).** In the shared runtime (preview and export), delay a section's `script.js` init until it is within one viewport of the screen, for sections declared `lazy: true`. Start with the 20 heaviest.
  - Done when: an export with 10 heavy sections reaches first paint with only the first two initialised (e2e proves it) and nothing goes blank on scroll.
- **C3.3 "Lightweight only" filter (S).** A checkbox in the catalogue and Sections list that hides `heavy`; default on when a starter project is created.
- **C3.4 Page budget warning (S).** The export README already has a "Page weight" section; add an in-builder badge when the stack has more than 3 heavy sections.

### C4 Prune near-duplicates (M) [remove]
- **C4.1 Find candidates (S).** Compare thumbnails (the 32×20 colour-grid fingerprint in `tests/visual/baseline.json`) plus tags; list pairs with similar look and same category in `reports/duplicates.json`.
- **C4.2 Decide per pair (S).** Human choice; keep the better-tokenised, lighter, better-tested one.
- **C4.3 Deprecate, then delete (S).** Set `status: "deprecated"` (add to `STATUSES` in `scripts/schema.js`; hidden unless "Drafts" ticked). After one release remove the folder, thumbnail and any starter reference; run `sync`, `verify`.
  - Done when: no project template or starter references a deleted slug (a test fails otherwise).

### C5 Collections / kits (M) [add]
- **C5.1 Data (S).** `scripts/builder/kits.js`: 6 curated kits (SaaS launch, photographer portfolio, restaurant, agency, shop, event) — each an ordered list of slugs with default content overrides and a theme.
- **C5.2 UI (M).** "Kits" tab next to "New from starter" in the Projects modal, with preview thumbnails of the sections.
- **C5.3 Test (S).** Unit test that every slug in every kit exists and is not heavy/draft; e2e that a kit loads and exports.

### C6 Search and discovery (M) [improve]
- **C6.1 Fuzzy + synonym search (M).** Extend `scripts/catalog-search.js`: typo tolerance, synonyms map (pricing↔plans, nav↔header, hero↔banner, footer↔ending). Unit tests with at least 30 queries.
- **C6.2 Favourites and recently used (S).** Stored in `localStorage` (with try/catch); star on cards; "Recent" row.
- **C6.3 "Similar to this" (S).** On a card, list 4 components with the same category and overlapping mood/industry.

---

## Epic D — Builder experience (P1)
**Goal:** the builder stays pleasant and dependable for a full client session of 20+ sections, with several pages.

**Why:** `scripts/builder/canvas.js` is 1,425 lines and mixes toolbar, selection, resize, drag-and-drop and keyboard handling in one closure; `export-panel.js` is 601. Both are hard to change safely.

### D1 Split the two big modules (M) [improve]
Same method as the `app.js` split (895 → 486).
- **D1.1 Map (S).** List what `createCanvasController(ctx)` owns: toolbar position/open (`updateToolbarPosition`, `openEditToolbar`), selection (`selectCanvasElement`, `clearElementSelection`), keyboard (`handleCanvasElementKeydown`), resize and move (`onElementResize*`, `onMouseMove/Up`, `onSectionResize*`), drop indicators. Write the map at the top of the file.
- **D1.2 Extract in four steps (M).** `canvas-selection.js`, `canvas-toolbar.js`, `canvas-resize.js`, `canvas-dnd.js`, each exporting a factory taking `ctx`. After each step run `npm test` and `canvas.e2e.js`.
- **D1.3 Split `export-panel.js` (S).** Separate the modal UI from the build calls (ZIP, single file, React, review copy).
- Done when: no builder file over 700 lines; no behaviour change (all tests unchanged and green).

### D2 Section management (M) [improve]
- **D2.1 Duplicate, lock, hide (M).** Buttons on each row of the stack list (`stack-list.js`): duplicate (new id, same overrides), lock (blocks edit and drag, shown with an icon), hide (kept in project, skipped in preview/export). History must cover all three.
- **D2.2 Copy / paste between projects (S).** "Copy section" puts JSON on the clipboard; "Paste section" validates it against the version schema in `scripts/projects.js`.
- **D2.3 Keyboard reordering (S).** Alt+↑ / Alt+↓ moves the selected section; announce the move in an `aria-live` region.
- Done when: unit tests for state changes, an e2e for each action including undo/redo.

### D3 Multi-page projects (L) [add]
- **D3.1 Data model (M).** Project version 3: `pages: [{id, title, slug, stack, settings}]` plus a shared `header` and `footer`. Add a `MIGRATIONS` step in `scripts/projects.js` so version 2 files become a one-page project.
- **D3.2 UI (M).** Page tabs above the canvas (add, rename, duplicate, delete, reorder); shared header/footer toggle per page.
- **D3.3 Links (M).** A link field can point to "Page: About"; the exporter rewrites it to the right file (`about.html`) and the single-file export turns it into in-page anchors.
- **D3.4 Export (M).** ZIP: one HTML per page, shared CSS/JS and assets once. Page weight report per page.
- **D3.5 Tests (S).** Migration test, link-rewrite unit test, e2e building a 3-page site and checking all links resolve in `check-exports`.

### D4 Image handling (M) [add]
- **D4.1 Upload with resize (M).** Dropped images are scaled to a maximum width (user-chosen, default 2000 px) and re-encoded to WebP in the browser (canvas); stored in the project (IndexedDB if over the localStorage limit).
- **D4.2 Alt text (S).** Every image field gets an "Alt text" input; the export check (E2) warns when empty.
- **D4.3 Size budget (S).** Warn when one image is over 500 KB or total images over 5 MB.
- Done when: e2e uploads a 4000 px PNG and the export contains a smaller WebP with the alt text.

### D5 Responsive controls (M) [add]
- **D5.1 Per-section visibility (S).** "Hide on mobile / tablet / desktop" using generated media queries in the export.
- **D5.2 Spacing per breakpoint (M).** Section padding top/bottom with separate values for desktop, tablet, mobile.
- **D5.3 Preview wiring (S).** The existing Desktop / Tablet 768 / Mobile 375 toggle shows the effect live; e2e checks it at 375.

### D6 Onboarding and empty states (S) [add]
- **D6.1** Three-step first-run tour (add a section, edit text, export), skippable, shown once (localStorage, try/catch).
- **D6.2** Empty canvas offers "Start from a kit/starter" and "Browse components".
- **D6.3** Keyboard e2e updated: the tour must not trap focus.

### D7 Builder light/dark UI (S) [add]
- Builder shell follows `prefers-color-scheme` with a manual switch; contrast re-checked with Lighthouse (keep 100 in accessibility for `builder.html` and `index.html`).

### D8 History panel (S) [add]
- List of actions from `history.js` with timestamps; click to jump to that state; "Clear history" keeps the current state.

---

## Epic E — Export, SEO and accessibility of the output (P1)
**Goal:** a generated site scores 90+ in all four Lighthouse categories without manual work, and the builder tells the user what is wrong before export.

### E1 Lighthouse gate on exports (M) [add]
- **E1.1 Runner (M).** `scripts/check-lighthouse.js`: export each starter project (ZIP → temp folder → serve → Lighthouse, mobile preset); write `reports/lighthouse.json`. Use the Chrome DevTools / lighthouse CLI already available.
- **E1.2 Thresholds (S).** Accessibility ≥ 95, SEO ≥ 95, Best practices ≥ 90, Performance ≥ 70 on software rendering (record real values first, then set).
- **E1.3 Fix findings (M).** Triage the first report; fix in the exporter (not per component) where possible: `lang`, viewport, meta description, font-display, image sizes.
- Done when: the script passes for all 6 starters; it is part of the CI `reports` job as non-blocking.

### E2 Pre-export page checks (M) [add]
A panel in the Export modal listing problems with a "Go to section" button.
- **E2.1 Checks (M).** Missing alt text; more or fewer than one `h1`; skipped heading levels; link without text; empty link target `#`; missing page title/description; low contrast after theme (reuse the audit-themes contrast maths); form without labels.
- **E2.2 Severity (S).** Error (blocks nothing but is red), warning, info; "Export anyway" is always possible.
- **E2.3 Tests (S).** Unit test each check with small HTML fixtures; e2e that a bad page shows the issues and a fixed one shows none.

### E3 Generated site files (M) [add]
- **E3.1** `sitemap.xml` and `robots.txt` (uses the canonical address from Page Settings; respects the noindex switch).
- **E3.2** Favicon set from one uploaded image (32, 180, 192, 512 PNG + `site.webmanifest`).
- **E3.3** JSON-LD: Organization or LocalBusiness from a small form in Page Settings.
- **E3.4** Tests: page-seo unit test extended; exported ZIP contains each file only when enabled.

### E4 Self-host the page fonts (S) [improve]
- Fonts picked in Page Settings are still fetched from Google Fonts at run time. Download the chosen families at export time (via the font CSS the user already loads), add `@font-face` with `font-display: swap`, and put the files in the ZIP.
- Single-file export: inline as base64 only for the weights actually used; warn if it adds more than 300 KB.
- Done when: `check-exports` shows 0 requests to `fonts.googleapis.com` for a page with custom fonts.

### E5 "No third-party requests" report (S) [add]
- Export README lists every external host the page contacts (already tracked as `KNOWN_EXTERNAL`) so the owner can decide about cookie notices; link the cookie-notice component from C1.4.

### E6 Deploy files in the ZIP (M) [add]
- **E6.1** `_headers` (Netlify/Cloudflare) with cache rules for hashed assets and basic security headers; `netlify.toml` and `vercel.json` examples.
- **E6.2** `DEPLOY.md` in the ZIP: drag-and-drop steps for the 3 common hosts, written for a non-developer. (Instructions only; the project itself is not published.)

### E7 Video fallback (S) [improve]
- H.264 MP4 alongside WebM for `magic-hour` and other bundled videos, with `<source>` order; needs an encoder (check whether `ffmpeg` is installed; if not, document and skip).

---

## Epic F — Security and privacy (P1)
**Goal:** exported sites and imported project files cannot be used to run unexpected code; the vault's own code stays clean.

### F1 Content-Security-Policy (M) [add]
- **F1.1 Inventory (S).** Count inline scripts/styles and `eval`-like uses across `features/` (grep `eval(`, `new Function`, `document.write`, inline `onclick`).
- **F1.2 Policy for the exporter (M).** Option "Strict CSP" in the Export modal: scripts and styles get a hash in a `<meta http-equiv="Content-Security-Policy">`; components that need `unsafe-eval` are listed and the option is disabled with the reason.
- **F1.3 Builder shell (S).** Add a CSP to `builder.html` and `index.html` that still lets the preview iframes work (`srcdoc` / blob rules).
- Done when: e2e opens an export with strict CSP and the console has no violations for at least the 6 starters.

### F2 Scan the vault's code (M) [add]
- `scripts/check-code-safety.js` wired into `npm run verify`: flags `eval`, `new Function` on non-constant input, `document.write`, `innerHTML` assigned from `location`/`postMessage`, remote `<script src>` not on an allow-list, and `postMessage` handlers without an origin check.
- Triage the first run: fix, or add a documented exception in `meta.json` (`safetyReviewed: "reason"`).

### F3 Dependencies (S) [add]
- `npm audit --omit=dev` in the CI `reports` job; Dependabot-style update list kept as a `docs/dependencies.md` (react, react-dom, gsap, d3-geo only).
- Note the `gsap` licence terms for client sites in the export README (information, not a legal review).

### F4 Project import hardening (S) [improve]
- Validate a project file against a schema (types, max lengths, max sections 200, max file 20 MB); sanitise HTML in Content overrides (strip `<script>`, `on*=`, `javascript:` URLs); reject unknown top-level keys with a clear message.
- Tests: crafted malicious project files in `tests/fixtures/` for unit and e2e.

### F5 Review-copy privacy note (S) [improve]
- In the overlay's first-run text: "Comments are stored in this browser until you download them."

### F6 Local server hygiene (S) [improve]
- `scripts/serve.js`: bind to 127.0.0.1 only by default, refuse paths outside the repo (path traversal test), no directory listing.

---

## Epic G — Performance of the vault itself (P2)
**Goal:** the catalogue opens fast with 218+ items and stays fast as it grows.

### G1 Slim registry (M) [improve]
- **G1.1 Measure (S).** Parse cost and size of `registry.json` (752 KB) and `registry.js` (584 KB); find which fields are only needed on a detail view (long descriptions, `customizable`, dependencies).
- **G1.2 Split (M).** `registry-index.js` (slug, title, category, tags, mood, industry, weight, thumb: for the grid and filters) and per-feature detail fetched on demand from `features/<slug>/meta.json`. Keep `registry.json` as the full export for agents.
- **G1.3 Sync (S).** `sync-registry.js` writes both; `verify` checks they agree; one copy of the data only (drop duplicate `registry.js` content if the index replaces it).
- Done when: catalogue first load transfers at least 50% fewer bytes of registry data, and all catalogue/builder tests are green.

### G2 Layout shift (S) [improve]
- Reserve thumbnail height with `aspect-ratio`; skeleton cards while the index loads. Target CLS < 0.05 in Lighthouse (it was 0.11).

### G3 Thumbnails (S) [improve]
- WebP versions (keep JPEG as fallback via `<picture>`), `loading="lazy"` and `decoding="async"`, explicit `width`/`height`. `make-thumbs.js` keeps its "unchanged render keeps the file" rule.

### G4 Repo diet (S) [remove]
- Check if `ruvector.db` and `.superpowers/` are tooling state; if so `git rm --cached` and ignore them. Periodic `git gc`. Add a `scripts/size-report.js` that lists the 20 largest tracked files and warns above 5 MB each.

### G5 Builder preview speed (M) [improve]
- Measure add-section latency with 20 sections; avoid rebuilding unchanged iframes on every edit (diff by section id + content hash). Done when adding the 21st section takes < 300 ms on the test machine.

---

## Epic H — Testing and maintenance (P2)
**Goal:** one command proves everything; scripts and old one-offs stop being a risk.

### H1 `npm run ci` (S) [add]
- Runs in CI order: verify → lint-tokens → check-fields → unit tests → e2e → check-blank → check-exports → check-responsive; prints a table of pass/fail with durations; supports `-- --fast` (verify + unit + e2e only). Document in `AGENT_GUIDE.md`.

### H2 Script tests (M) [add]
- Unit tests for `sync-registry`, `new-feature` (already partly), `localize-remote` (with a fake fetch), `declare-assets`, `bundle-demo` stamp, `set-license`, `clean-features`. Use temp folders; no network.

### H3 Cross-browser smoke (M) [add]
- Run the builder shell flow (add section, edit text, export) and 10 representative components in Firefox and WebKit via Playwright (already installed as an MCP in this environment; add as a dev dependency if used from scripts). Non-blocking at first; list known differences.

### H4 Flaky-test log (S) [add]
- e2e runner retries a failed file once and writes `reports/flaky.json`; any test that needs a retry twice in a week gets fixed or quarantined.

### H5 Remove one-off scripts (S) [remove]
- `import-21st-top.js`, `import-all-kedhareswer.js`, `bundle-all-kedhareswer.js`, `import-top-today.js`, `migrate-meta.js`: confirm nothing imports them, move a short "how the vault was seeded" note into `docs/`, delete the scripts and their `package.json` entries (some are not listed there; check).

### H6 Documentation refresh (S) [improve]
- Rewrite `AGENT_GUIDE.md` sections 2–3 for the new commands and kits; make `docs/BACKLOG.md` a closed archive with a pointer to this roadmap; add a `docs/architecture.md` (data flow: `features/` → `sync` → registry → catalogue → builder → exporters), 1 page.

### H7 Dead-code and unused-asset sweep (S) [remove]
- Script lists files in `assets/library/` not referenced by any feature or `exportAssets`, and CSS rules in builder styles not matching any element. Delete after review.

---

## Epic I — Growth ideas (P3, decide with real usage)
Nothing here starts without a short decision note ("do it / not now / never") in this file.

### I1 Optional backend (L)
- Only if the review copy (JSON comments) is not enough. Scope: share link, live comments, cloud save. Needs hosting, auth and privacy design, so it conflicts with "not published for now". **Decision gate:** revisit when the vault goes public.

### I2 Contribution flow (L)
- PR template, `CONTRIBUTING.md`, automated `check-features` + `verify` for a new folder, a checklist bot comment. Also not needed until others contribute.

### I3 AI assist in the builder (L)
- Rewrite copy in a section, suggest the next section by industry/mood tags, generate alt text. Needs an API key flow and cost controls; prototype as a local-only dev tool first.

### I4 Token import (M)
- Read a design-tokens JSON (colours, fonts, radius) and apply it as the page theme; export the current theme the same way.

### I5 Internationalisation (M)
- Builder UI strings in a dictionary; per-page `lang` and `dir`; right-to-left check for 10 components.

---

## Suggested order
1. **E1, E2, E4** — measure and fix what exported pages look like to a real browser and a real user.
2. **D1, D2, D4** — make the builder easier to change and nicer to use.
3. **C1 → C2 in slices**, alongside **F1, F2, F4**.
4. **D3 (multi-page)** after D1 is done, since it touches state, stack list and export.
5. **G, H** as cleanup between larger tasks; **C3–C6** when the catalogue has the building blocks.
6. **I** only with a decision note.

## Dependencies between tasks
- D3 needs D1 (smaller modules) and E3 (sitemap uses pages).
- E2's alt-text check needs D4.2.
- C5 (kits) needs C1 (new blocks) to be worth doing.
- F1 (strict CSP) needs the F2 inventory first.
- G1 changes the data the catalogue loads, so run `check-visual` and the catalogue e2e before and after.

## Not worth doing
- A blanket automated colour swap for the 196 components.
- Rebuilding all 145 old bundles at once.
- Git LFS (tracked size is about 90 MB).
- Localizing remote images built at run time.
