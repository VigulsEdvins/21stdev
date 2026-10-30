# Split `scripts/assembler.js` into smaller modules

Status: **steps 0 to 6 built 2026-10-30; step 7 (one shared `escapeHtml`) not started and needs the owner's decision.**

### Built so far

- **Step 0:** `tests/snapshot-assembler.js` with `tests/data/assembler-golden.json` (414 checks: 5 themes × 9 stack variants × 7 option sets for preview, folder export and single file, plus every smaller function, a fake-DOM run of `applyThemeToDocument`, the zip bytes with a frozen clock, and the two export lists). `node tests/snapshot-assembler.js` compares; `--write` rewrites. Not yet in `npm test` (to be added once the refactor is done).
- **Step 1:** `scripts/assembler/sizing.js` and `scripts/assembler/zip.js` moved out verbatim (re-indented only). `assembler.js` is 3,890 lines (was 4,145). Snapshot unchanged, `npm test` passes, `security:static` passes with no change to the suppressions, `builder.html` opened in a browser with no errors and `window.Assembler` working, `builder-flow` and `csp-export` end-to-end tests pass, `build-site` copies both new files into `dist/builder/scripts/assembler/`.

- **Steps 2 to 4 (same day):** `assembler.js` went from 3,890 to 1,020 lines. New modules in `scripts/assembler/`: `util`, `theme`, `pages`, `site-files`, `theme-css`, `section-isolation`, `overlay`, `runtimes` (plus `sizing` and `zip` from step 1). Snapshot unchanged after every one of them, `npm test` (now including the snapshot and `tests/test-theme-tokens.js`), `npm run security`, `build-site`, the builder in a browser (all ten `window.Asm*` objects present, no console errors) and the `builder-flow`, `csp-export`, `multi-page` end-to-end tests pass.
- **Step 3 as built:** the `:root` variables are now a table (`TOKEN_GROUPS` in `theme-css.js`: groups with a comment and `[name, value]` rows). The rules after `:root` stay one template string in the same file, because they hold real `${isDark ? … : …}` choices. Output is byte-identical, so the two names that two groups both set (`--pl-ink`, `--pl-muted`, the Polaroid footer and the Postmark CTA) are still printed twice. `tests/test-theme-tokens.js` proves they always get the same value, and that no name repeats inside one group. Removing the second pair is a separate, visible change (it alters the CSS bytes) and is left for the owner to decide.

- **Steps 5 and 6 (same day):** `assembler.js` is now a front door of about 100 lines (the requires and the two export lists, unchanged). `preview.js` and `export.js` hold the two big functions, each split into named steps: `previewNav`, `collectPreviewSections`, `renderPreviewDocument`, `assemblePreviewDocument`; `collectExportSections`, `renderExportIndex`, `renderExportStyles`, `renderExportScript`, `renderExportReadme`, `generateExportBundle`. Snapshot unchanged at every move; `npm test`, `npm run security`, `build-site`, the browser check and six end-to-end tests (`builder-flow`, `csp-export`, `multi-page`, `client-site`, `form-delivery`, `guided-brief`) pass.
- **Step 5 as built (smaller than planned, on purpose):** the two per-section loops differ in many small ways (the preview has embedded full sites, suppressed preloaders and a resize handle; the export has lazy start, section info for the README and a different comment style), so they were **not** merged into one loop. What is shared now lives in `scripts/assembler/section-parts.js`: `sectionIdentity`, `pickSource`, `isPreloaderSection`, `nativeAttrFor`, `renderSectionTag` (the `<section>` element, identical in both). The two preloader auto-dismiss scripts (they differ in a selector and in indentation) and the preview page's own script moved to `runtimes.js` as `PRELOADER_DISMISS_PREVIEW`, `PRELOADER_DISMISS_EXPORT` and `previewPageScript(isDark)`, copied exactly.
- **What caught mistakes while doing it:** the snapshot (an `isDark` that the export collector had not been given changed 113 checks at once) and a `no-undef` lint pass on the moved code; script order in `builder.html` is also checked, because the snapshot loads the files the way the page does.

### Corrections found while building

- Node exports **35** names, not 30. The browser's `window.Assembler` exports a **shorter list (29)** (no `render404`, `renderSecurityTxt`, `resolvePageLink`, `mapPageLinks`, `renderCsp`, `REVIEW_RUNTIME`). Both lists are kept exactly as they were; the snapshot checks both.
- The snapshot freezes `Date` and `Math.random` (the zip and the review runtime stamp them).

## Why

`scripts/assembler.js` is 4,145 lines, by far the biggest file we wrote (the next is 1,146). It builds the live preview and every download (folder, single file, zip), so a slip here breaks what clients pay for. Three problems make it risky to touch:

- **Three functions do too much:** `generateUniversalThemeStyles` (506 lines, mostly one table of CSS variables), `assemblePreviewDocument` (341) and `generateExportBundle` (202). The first two repeat the same steps (map page links, resolve theme, collect head links and section blocks), so a fix made in one is easily missed in the other.
- **A table written as code hides mistakes.** The 2026-10-30 audit found `--pl-ink` and `--pl-muted` each set twice in one object. They were removed; the way the file is written is what let them in.
- **Every change loads 4,000 lines into the reader's head.** The builder side is already split into about 45 small modules (`scripts/builder/*`); the assembler is the one that was never done.

This is a pure refactor: **no change to what any page, preview, download or test sees.**

## The rule that keeps it safe

Output must be **byte-identical** before and after each step. We prove it, we do not eyeball it:

1. **Step 0 builds a golden snapshot** (a script, `tests/snapshot-assembler.js`, not committed to `npm test` until it is stable): for every theme preset, a fixed set of stacks (one per kind: hero, header with menu, form, pricing, a full template, a multi-page project, a section with overrides, a sticky header, an empty stack), and each option combination the tests use, it writes the output of `assemblePreviewDocument`, `generateExportBundle`, `generateSingleFileBundle`, `renderPageHead`, `renderSiteFiles`, `createZipArchive` (with a fixed date) to a hash file `tests/data/assembler-golden.json`.
2. After **every** step below: run the snapshot (must show zero differences) and `npm test` (must pass). A step that changes one byte is reverted, not "fixed forward".
3. One step = one commit, so any step can be undone alone.

## The public face does not change

`scripts/assembler.js` stays and keeps exporting **exactly the same names** (35 in Node, 29 in the browser; `THEME_PRESETS`, `resolveTheme`, `assemblePreviewDocument`, `generateExportBundle`, `createZipArchive`, …). 34 test files, `react-export.js`, `localize-assets.js` and `builder.html` use it. They are not edited. The file turns into a thin front door that gathers the parts and re-exports them.

## Target layout

New folder `scripts/assembler/` (same pattern as `scripts/builder/`: each file works both in the browser as `window.AsmX` and in Node via `require`):

| New file | Takes from `assembler.js` | About lines |
|---|---|---|
| `theme.js` | `THEME_PRESETS`, `resolveTheme`, `isDarkHex`, `isDarkTheme`, `NATIVE_PRESET_FOR_PAGE`, `nativePolarities`, `sectionNativeList`, `sectionThemeAttr`, `renderNativePaletteCss` | 650 |
| `theme-css.js` | `generateUniversalThemeStyles`, `applyThemeToDocument` (table-driven, see step 3) | 660 → ~350 |
| `section-isolation.js` | `scopeSectionStyles`, `isolateSectionMarkup`, `isolateSectionScript`, `previewSectionScript`, `renderPreviewSectionScripts`, `extractHeadLinks`, `LAZY_SECTION_RUNTIME` | 250 |
| `overlay.js` | `renderSectionOverlayHtml`, `OVERLAY_ELEMENT_CSS`, `escapeHtml` | 800 |
| `sizing.js` | `computeSectionSizingStyles`, `fitScaleCss`, `sectionSizingStyle`, `renderResponsiveCss`, `BREAKPOINT_QUERIES`, `PADDING_PX` | 140 |
| `runtimes.js` | the browser-side script strings: `OFFSCREEN_RUNTIME`, `REVIEW_RUNTIME`, `OVERRIDES_RUNTIME`, the `matchMedia` shim | 700 |
| `pages.js` | `resolvePageLink`, `mapPageLinks`, `sectionLookups`, `anchorNames`, `menuItems`, `anchorSpan`, `navLinker`, `ANCHOR_CSS`, `collectOverrides` | 150 |
| `site-files.js` | `renderPageHead`, `renderJsonLd`, `renderCsp`, `render404`, `renderSecurityTxt`, `renderDeployFiles`, `renderSiteFiles`, `SITE_EXTRA_FILES`, `emojiFavicon`, `siteEmbedFor`, `formDelivery`, `deployGuide`, `originOf`, `validEmail` | 260 |
| `preview.js` | `assemblePreviewDocument`, `renderEmptyPreview` | 450 |
| `export.js` | `generateExportBundle`, `generateSingleFileBundle` | 220 |
| `zip.js` | `createZipArchive`, `calculateCrc32`, `CRC32_TABLE`, `stringToUint8`, `putU16`, `putU32`, `findLocalAssetUrls`, `rewriteLocalAssetUrls`, `LOCAL_ASSET_RE` | 150 |

`assembler.js` ends at about 60 lines: the requires and the export list.

Line counts are estimates from today's function boundaries and will be re-measured in step 1.

## Steps (each one is its own commit, smallest and safest first)

**Step 0: Safety net.** Write the snapshot script and commit `tests/data/assembler-golden.json` from today's code. Also record the current list of exports (35 names in Node, 29 in the browser) in a test that fails if one is added or lost. Nothing else changes. *Done when:* running the snapshot twice gives identical results (proves it is not flaky) and it covers every exported function.

**Step 1: Move the leaf pieces that depend on nothing.** `zip.js` (CRC, zip writer, asset-URL helpers) and `sizing.js`. These have no links into the rest of the file. *Why first:* proves the loading pattern end to end (browser tag order, `require` in Node, `build-site.js` copying the new files) on the least risky code. Add the new `<script>` tags to `builder.html` before `assembler.js`; `build-site.js` copies whatever the page lists, so deploy needs no change (checked: it reads `builder.html`). Also check `site/_headers` CSP: same origin scripts, no change expected.

**Step 2: Move theme data and the page/site helpers.** `theme.js`, `pages.js`, `site-files.js`. These only depend on each other in one direction (`site-files` → `theme`, `pages`), which we keep one-way to avoid circular requires.

**Step 3: Make `generateUniversalThemeStyles` table-driven.** Replace the 506-line template string by a short list: `[variable, value]` pairs grouped by family (preview, design-system aliases, `--ip-*`, `--pl-*`, `--pd-*`, section rules), turned into CSS by one small function. Duplicate names become impossible (the list is checked in a test for repeated variable names within a family). The big selector blocks that are not variables stay as plain CSS strings in their own constants. *Done when:* the golden snapshot is unchanged. This is the step with the most value and the most care, and it is done alone.

**Step 4: Move runtimes and overlay.** `runtimes.js` (script strings; they are inserted into pages, so whitespace matters and the snapshot guards it), `overlay.js`, `section-isolation.js`.

**Step 5: Share the common steps of preview and export.** `assemblePreviewDocument` and `generateExportBundle` both start with the same sequence (filter hidden, map page links, render head, resolve theme, set up collectors for head links, styles, markup, scripts). Pull that into one function `collectSections(sections, theme, featuresData, options)` returning `{ headLinks, scopedStyleBlocks, sectionHtmlBlocks, scriptBlocks, … }`, used by both. Then split each big function into named steps (collect, build head, build body, join). *Risk:* the two functions differ in small ways (anchors, lazy runtime, the review overlay). Any difference is kept as an explicit option, not removed. If a difference turns out not to be intentional, it is written down in `docs/BACKLOG.md` and **not** changed in this refactor.

**Step 6: Move `preview.js` and `export.js`, shrink `assembler.js` to the front door.**

**Step 7 (optional, separate decision): one shared `escapeHtml`.** There are about ten copies across the repo (`ui-helpers.js`, `catalog/helpers.js`, `builder-extras.js`, the assembler and six `esc` one-liners). Some escape different characters on purpose (for example the regex-escape in `export-assets.js` is not an HTML escape). Plan: compare each, merge only the ones that behave identically, leave the rest with a one-line comment saying why they differ. Left out of the main refactor so it cannot block it.

## What could go wrong, and how we catch it

| Risk | Catch |
|---|---|
| Output changes by a space or a line break | Golden snapshot after every step |
| A browser script tag is missing or in the wrong order (works in Node tests, breaks in the browser) | `npm run test:e2e` (builder opens, preview paints, export downloads) after steps 1, 4 and 6, plus one manual open of `builder.html` through `npm start` |
| Circular requires | Dependencies only point one way: `theme`, `zip`, `sizing` ← `pages` ← `site-files` ← `overlay`, `section-isolation` ← `preview`, `export` ← `assembler`. A test loads each file alone to prove it |
| Deploy misses a new file | `npm run build-site` then check the files exist in `dist/builder/scripts/assembler/` |
| `eslint-suppressions.json` is keyed by file and line counts | Moved code moves its suppressed findings to the new file; run `npm run security:static` and update the counts for the moved files only. The number of findings must not grow |
| The two big functions differ in ways nobody remembers | Step 5 keeps every difference as an option; unexplained ones go in the backlog |

## What this does not do

- No new features, no output change, no performance work.
- Does not touch `scripts/cms/admin.js` (1,146 lines) or `scripts/builder-extras.js` (870 lines). They are the next candidates, but they are looked at **after** this one, with this plan's method.
- Does not rename or remove any export.
- Does not rewrite history or touch the committed `site/examples` copies.

## Effort and order

Roughly 7 small commits. Steps 0 to 2 are low risk and can be stopped after at any point with a better file than today. Step 3 is the main gain. Step 5 is the only one that changes how code is organised in a way that needs thought, so it comes last, once the safety net has proven itself on the earlier steps.

## Decision for the owner

Steps 0 and 1 are done and checked. Go ahead with steps 2 to 6? (Step 7 stays a separate question.)

## Differences from the plan, found while building steps 2 to 4

- **`util.js` is new.** `escapeHtml` is needed by the overlay, the site files and the export, so it sits in a tiny shared module instead of in `overlay.js`.
- **`renderNativePaletteCss` is in `theme-css.js`, not `theme.js`**, because it calls `generateUniversalThemeStyles`.
- **Moved code is not re-indented** in the modules that hold long template strings (indenting would change the text inside them). `sizing.js` and `zip.js`, which have none, are indented.
- **Files that name the assembler moved with the code:** the `eval(` waiver in `scripts/check-code-safety.js`, the three verdicts in `docs/security/innerhtml-verdicts.json`, and the ESLint suppression counts (same totals, now under the new files). `docs/security/README.md` and `regression-map.md` still say `assembler.js` in prose, which stays right for the front door; update when step 6 is done.
- **`theme-css.js` is still 731 lines** (the rules template). Splitting that template into named CSS blocks per component family is a possible follow-up, not part of this plan.
- **`assembler.js` still holds** `renderEmptyPreview`, `siteEmbedFor`, `assemblePreviewDocument`, `generateExportBundle`, `generateSingleFileBundle` and a few script strings inside them: steps 5 and 6.
- **Merging the two loops is still possible** but would need the differences above turned into options first. It is not needed to get the benefit of the split, and each difference might be intentional, so it is left as a possible later step.
