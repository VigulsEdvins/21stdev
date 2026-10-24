# Local 21st.dev Feature & Design Registry Implementation Plan

> **Status (2026-10-24): implemented.** This plan was carried out and the work is in git history; its checkboxes were not kept up to date. Open work now lives in `docs/BACKLOG.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% local, zero-auth, zero-build Component, Feature & Design Vault modeled after 21st.dev inside `/home/edvins/features-for-web/web-for-options` with 26 standalone, runnable features and full templates extracted from `photo-caroulsel`, `carousel-gallery-play`, `betteroff`, `vivmgmt`, and `21st.dev`.

**Architecture:** Each feature lives in its own isolated folder (`features/<slug>/`) with `meta.json`, standalone `index.html`, scoped `style.css`, clean `script.js` (and `component.tsx` where applicable). A Node sync utility (`scripts/sync-registry.js`) compiles all `features/*/meta.json` and raw source files into `registry.json` (for agents/tools) and `registry.js` (`window.FEATURE_REGISTRY`, including pre-combined single-file HTML strings for instant zero-CORS copying and `srcdoc` previewing). The main application (`index.html`, `styles.css`, `app.js`) provides both a **21st.dev Catalog Grid + Slide-Over Inspector Modal** and an **IDE Split-Screen Workbench**, plus a **"+ Add Feature"** studio modal and `AGENT_GUIDE.md`.

**Tech Stack:** Vanilla HTML5, CSS3 (OKLCH variables, Grid/Flex, View Transitions), ES2022 JavaScript, Canvas 2D / Web Audio API / 3D CSS Transforms, Node.js (`fs`, `path`, `assert` for `sync-registry.js` and `tests/verify-registry.js`).

**Spec:** `/home/edvins/features-for-web/web-for-options/docs/superpowers/specs/2026-10-21-feature-vault-design.md`

## Global Constraints

- **Strictly Local Personal Tool:** Zero login, zero sign-up buttons, zero pricing or paid tiers, zero external analytics or trackers.
- **No AI Prompt Fluff:** Every catalog item must provide 100% functional, self-contained, runnable code (`Combined Single-File HTML`, `index.html`, `style.css`, `script.js`, plus `component.tsx` for React items) and one-click local path copy (`/home/edvins/features-for-web/web-for-options/features/<slug>`).
- **Zero Broken Assets:** Standalone features in `features/<slug>/` must not rely on fragile external network images; they must use procedural canvas graphics, inline SVGs, CSS gradients/shaders, or local relative assets copied/linked from the workspace.
- **Dual Workspace Modes:** Must support switching seamlessly between **Catalog Grid Mode (Option A)** and **IDE Split-Screen Workbench Mode (Option B)**.

## Review Focus

- **Single-File Combined HTML Generation (`combineFeatureHtml`):** Inlining `style.css` and `script.js` into `index.html` must safely handle `</script>` or `$` replacement patterns (using function replacers `() => css` / `() => js`) so regex special characters in JS code (like `$&` or `$'`) never corrupt the combined output.
- **Iframe Sandbox & Performance:** Rendering 26+ live previews simultaneously would choke the browser; grid cards must lazy-mount/unmount iframes via `IntersectionObserver` or hover/active state while keeping the active Inspector/Workbench iframe responsive across Desktop (`100%`), Tablet (`768px`), and Mobile (`375px`) widths.
- **Custom Feature Creation (`+ Add Feature` Modal):** Adding a feature through the UI must validate required fields (`title`, `slug`, `category`, `html`/`css`/`js`), sanitize the slug (`[a-z0-9-]+`), persist to `localStorage`, immediately render in both Grid and Workbench views, and allow exporting a ready-to-drop folder bundle or updated `registry.json`.
- **Full Template Relative Paths:** The 3 full website templates (`template-betteroff`, `template-carousel-play`, `template-vivmgmt`) must link cleanly to `../betteroff/index.html` (and `admin.html`), `../carousel-gallery-play/index.html`, and `../vivmgmt/index.html` when served from `/home/edvins/features-for-web`, while also embedding their full entry source code in `registry.js` for inspection and copying.
- **Search & Multi-Filter State Consistency:** Combining text search (`⌘K`), source project filter (`all`, `photo-caroulsel`, `carousel-gallery-play`, `betteroff`, `vivmgmt`, `21st-crafted`), and category filter must update both the Catalog Grid count and the IDE Workbench sidebar tree without stale active selections.

---

### Task 1: Registry Sync Engine, Verification Suite & Agent Guide

**Files:**
- Create: `scripts/sync-registry.js`
- Create: `tests/verify-registry.js`
- Create: `AGENT_GUIDE.md`

**Interfaces:**
- Consumes: `features/<slug>/meta.json`, `features/<slug>/index.html`, `features/<slug>/style.css`, `features/<slug>/script.js`, optional `features/<slug>/component.tsx`
- Produces:
  - `combineFeatureHtml(html, css, js) -> string`: Replaces `<link rel="stylesheet" href="style.css">` with `<style>\n${css}\n</style>` and `<script src="script.js"></script>` with `<script>\n${js}\n</script>` using function replacers so `$` characters in JS are preserved verbatim.
  - `syncRegistry(rootDir) -> { count: number, items: Array<FeatureItem> }`: Scans `features/*/`, builds `registry.json` and `registry.js` (`window.FEATURE_REGISTRY = [...]`).
  - `FeatureItem` schema: `{ slug, title, category, source, type, description, tags, dependencies, folderPath, previewUrl, adminUrl?, files: { combined, html, css, js, tsx? } }`.

- [ ] **Step 1: Write the failing test in `tests/verify-registry.js`**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { combineFeatureHtml, syncRegistry } = require('../scripts/sync-registry.js');

// Test 1: combineFeatureHtml preserves special $ replacement tokens in JS/CSS
const sampleHtml = '<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"></head><body><script src="script.js"></script></body></html>';
const sampleCss = '.box { content: "$& $1"; }';
const sampleJs = 'const str = "price $100 $& $\'"; console.log(str);';
const combined = combineFeatureHtml(sampleHtml, sampleCss, sampleJs);
assert(combined.includes('const str = "price $100 $& $\'";'), 'JS special $ tokens must not be corrupted');
assert(combined.includes('.box { content: "$& $1"; }'), 'CSS special $ tokens must not be corrupted');
assert(!combined.includes('href="style.css"'), 'External style.css link should be replaced');
assert(!combined.includes('src="script.js"'), 'External script.js tag should be replaced');

console.log('Unit tests for combineFeatureHtml passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with `Cannot find module '../scripts/sync-registry.js'`

- [ ] **Step 3: Implement `scripts/sync-registry.js` and `AGENT_GUIDE.md`**

Implement `combineFeatureHtml(html, css, js)` and `syncRegistry(rootDir)` in `scripts/sync-registry.js` (exporting both for Node tests and running `syncRegistry` when invoked via CLI `node scripts/sync-registry.js`). Also write `AGENT_GUIDE.md` documenting exact step-by-step instructions for an AI agent to:
1. Read `registry.json` to find features by `slug`, `category`, or `tags`.
2. Copy/implement `features/<slug>/` into any target project.
3. Add a new feature by creating `features/<new-slug>/{meta.json,index.html,style.css,script.js}` and running `node scripts/sync-registry.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-registry.js`
Expected: PASS (`Unit tests for combineFeatureHtml passed.`)

---

### Task 2: Extract `photo-caroulsel` Features (`works-wheel-3d` & `polaroid-string-carousel`)

**Files:**
- Create: `features/works-wheel-3d/meta.json`
- Create: `features/works-wheel-3d/component.tsx` (copied from `/home/edvins/features-for-web/photo-caroulsel/code.txt`)
- Create: `features/works-wheel-3d/style.css`
- Create: `features/works-wheel-3d/script.js`
- Create: `features/works-wheel-3d/index.html`
- Create: `features/polaroid-string-carousel/meta.json`
- Create: `features/polaroid-string-carousel/component.tsx` (copied from `/home/edvins/features-for-web/photo-caroulsel/code2.txt`)
- Create: `features/polaroid-string-carousel/style.css`
- Create: `features/polaroid-string-carousel/script.js`
- Create: `features/polaroid-string-carousel/index.html`
- Modify: `tests/verify-registry.js`

**Interfaces:**
- Consumes: `/home/edvins/features-for-web/photo-caroulsel/code.txt` and `code2.txt`
- Produces: Two standalone, 100% working Vanilla HTML/CSS/JS + React `.tsx` feature bundles in `features/works-wheel-3d` and `features/polaroid-string-carousel`.
  - `works-wheel-3d/script.js`: Exact port of `place()`, `bowAt()`, `WHEEL_UNITS=900`, `DRAG_UNITS=420`, `SETTLE=140`, `EASE=0.12`, ring-to-drum 3D transform loop, wheel/pointer drag handlers, and right-side index ticks with procedural/SVG artwork cards so it needs zero external images.
  - `polaroid-string-carousel/script.js`: Exact port of `stringY()`, `springStep()`, `swingStep()`, `nearestAt()`, `mulberry32()`, `paintLandscape()` (`dawn`, `alpine`, `dusk`, `mist` palettes), SVG sagging catenary path + pegs, pointer drag, keyboard arrows, and breeze oscillation.

- [ ] **Step 1: Add verification assertions in `tests/verify-registry.js` for `works-wheel-3d` and `polaroid-string-carousel`**

Check that both directories exist, contain `meta.json`, `index.html`, `style.css`, `script.js`, and `component.tsx`, and contain the core physics identifiers (`bowAt` / `rotateX` in `works-wheel-3d`, `stringY` / `swingStep` / `paintLandscape` in `polaroid-string-carousel`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with missing `features/works-wheel-3d`

- [ ] **Step 3: Create `works-wheel-3d` and `polaroid-string-carousel` standalone bundles and run `node scripts/sync-registry.js`**

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-registry.js`
Expected: PASS

---

### Task 3: Extract `carousel-gallery-play` Features (6 Standalone Features)

**Files:**
- Create: `features/cylindrical-3d-carousel/{meta.json,index.html,style.css,script.js}`
- Create: `features/cursor-image-trail/{meta.json,index.html,style.css,script.js}`
- Create: `features/client-logo-marquee/{meta.json,index.html,style.css,script.js}`
- Create: `features/athletes-filter-showcase/{meta.json,index.html,style.css,script.js}`
- Create: `features/custom-magnetic-cursor/{meta.json,index.html,style.css,script.js}`
- Create: `features/faq-accordion-smooth/{meta.json,index.html,style.css,script.js}`
- Modify: `tests/verify-registry.js`

**Interfaces:**
- Consumes: Patterns and math from `/home/edvins/features-for-web/carousel-gallery-play/{index.html,styles.css,app.js}`
- Produces: 6 isolated, self-contained feature folders in `features/`:
  1. `cylindrical-3d-carousel`: 12-panel 3D cylinder (`rotateY(i * 30deg) translateZ(radius)`) with drag + wheel inertia, top/center/bottom row slots, and mobile touch slider fallback.
  2. `cursor-image-trail`: Velocity-tracked pointer trail spawning decaying visual cards with rotation/scale inertia across the stage.
  3. `client-logo-marquee`: Dual-row infinite seamless SVG partner logo marquee with edge fade masks and hover slow-down.
  4. `athletes-filter-showcase`: Filterable roster grid (`All`, `Exclusive`, `Football`, `Creative`) with smooth FLIP-style card transitions and portrait hover overlays.
  5. `custom-magnetic-cursor`: Dual-ring lerp cursor follower (`requestAnimationFrame`) with magnetic button pull and hover label expansion (`VIEW`, `DRAG`).
  6. `faq-accordion-smooth`: Smooth height-animated editorial FAQ accordion with rotating `+`/`×` icons and keyboard accessibility.

- [ ] **Step 1: Add verification assertions in `tests/verify-registry.js` for all 6 `carousel-gallery-play` slugs**

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with missing `cylindrical-3d-carousel`

- [ ] **Step 3: Implement all 6 standalone feature bundles and sync registry**

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-registry.js`
Expected: PASS

---

### Task 4: Extract `betteroff` (The Lookback) Features (5 Standalone Features)

**Files:**
- Create: `features/surf-3d-ribbon/{meta.json,index.html,style.css,script.js}`
- Create: `features/timeline-inertia-drag/{meta.json,index.html,style.css,script.js}`
- Create: `features/conveyor-scroll-loop/{meta.json,index.html,style.css,script.js}`
- Create: `features/audio-jukebox-player/{meta.json,index.html,style.css,script.js}`
- Create: `features/article-slide-drawer/{meta.json,index.html,style.css,script.js}`
- Modify: `tests/verify-registry.js`

**Interfaces:**
- Consumes: Architecture and physics from `/home/edvins/features-for-web/betteroff/{index.html,styles.css,app.js}`
- Produces: 5 isolated, self-contained feature folders in `features/`:
  1. `surf-3d-ribbon`: 3D Z-depth perspective card ribbon (`translate3d`, `rotateZ`, `scale` depth curve) with wheel/drag physics and active story HUD bar.
  2. `timeline-inertia-drag`: Horizontal inertia-draggable timeline grouped by months with synchronized bottom tick ruler, month quick-jump pills, and Web Audio subtle tick synthesis on ruler crossings.
  3. `conveyor-scroll-loop`: Endless wrapping vertical conveyor belt (`wrap(pos, totalHeight)`) with editorial typography blocks and interactive floating image popovers.
  4. `audio-jukebox-player`: Self-contained Web Audio API synthesizer jukebox + Sound Gate modal with 4 procedural ambient/electronic tracks, live frequency/equalizer visualizer bars, track switcher, and UI SFX generator (zero external MP3 required).
  5. `article-slide-drawer`: Backdrop-blurred slide-over editorial reader drawer triggered from story cards, with progress bar, rich formatting, and `Esc` / backdrop close.

- [ ] **Step 1: Add verification assertions in `tests/verify-registry.js` for all 5 `betteroff` slugs**

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with missing `surf-3d-ribbon`

- [ ] **Step 3: Implement all 5 standalone feature bundles and sync registry**

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-registry.js`
Expected: PASS

---

### Task 5: Extract `vivmgmt` Features, `21st.dev` Signatures & Full Website Templates (13 Items)

**Files:**
- Create: `features/parallax-5col-gallery/{meta.json,index.html,style.css,script.js}`
- Create: `features/split-screen-entrance/{meta.json,index.html,style.css,script.js}`
- Create: `features/fullscreen-parallax-footer/{meta.json,index.html,style.css,script.js}`
- Create: `features/news-3col-masonry/{meta.json,index.html,style.css,script.js}`
- Create: `features/artist-portfolio-lightbox/{meta.json,index.html,style.css,script.js}`
- Create: `features/responsive-burger-menu/{meta.json,index.html,style.css,script.js}`
- Create: `features/oklch-ambient-glow-hero/{meta.json,index.html,style.css,script.js}`
- Create: `features/spotlight-bento-grid/{meta.json,index.html,style.css,script.js}`
- Create: `features/liquid-metal-shader-card/{meta.json,index.html,style.css,script.js}`
- Create: `features/kinetic-typography-strapline/{meta.json,index.html,style.css,script.js}`
- Create: `features/template-betteroff/{meta.json,index.html,style.css,script.js}`
- Create: `features/template-carousel-play/{meta.json,index.html,style.css,script.js}`
- Create: `features/template-vivmgmt/{meta.json,index.html,style.css,script.js}`
- Modify: `tests/verify-registry.js`

**Interfaces:**
- Consumes: `/home/edvins/features-for-web/vivmgmt/*`, `21st.dev` CSS/shader patterns, and template links to `../betteroff/`, `../carousel-gallery-play/`, and `../vivmgmt/`.
- Produces: All remaining 13 standalone features & full-site template launchers, bringing the total catalog to **26 items** across all sources.

- [ ] **Step 1: Add verification assertions in `tests/verify-registry.js` checking all 26 catalog items**

Verify that `syncRegistry()` outputs 26 valid items, every item has non-empty `files.combined`, `files.html`, `files.css`, `files.js`, and valid metadata.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with item count < 26

- [ ] **Step 3: Implement the 6 `vivmgmt` features, 4 `21st-crafted` features, and 3 full template bundles, then run `node scripts/sync-registry.js`**

- [ ] **Step 4: Run test to verify all 26 items pass**

Run: `node tests/verify-registry.js`
Expected: PASS (26 features verified and compiled into `registry.json` and `registry.js`).

---

### Task 6: Build the Main `21st.local` Web Application (Catalog Grid + IDE Workbench + Feature Studio)

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Modify: `tests/verify-registry.js`

**Interfaces:**
- Consumes: `window.FEATURE_REGISTRY` from `registry.js`
- Produces:
  - **Header Bar:** Brand logo (`21st.local`), collection tabs (`All (26)`, `Components & Physics (23)`, `Full Websites & CMS (3)`), Global Search input (`⌘K` shortcut), View Mode Switcher (**Grid View** vs **IDE Workbench View**), and **"+ Add Feature"** button.
  - **21st.dev Hero & Filter River (Grid View):** OKLCH radial aurora glow background, source project filter pills (`All Sources`, `photo-caroulsel`, `carousel-gallery-play`, `betteroff`, `vivmgmt`, `21st-crafted`, `Custom`), and category chip bar (`3D & Carousels`, `Scroll & Parallax`, `Cursors & Physics`, `Galleries & Grids`, `Navigation & UI`, `Audio & Shaders`, `Full Templates`).
  - **Interactive Card Grid:** Each card displays a live interactive preview iframe (lazy-mounted via `IntersectionObserver` with an interactive toggle / replay button), source badge, category tag, title, description, and quick actions: **Inspect & Code**, **Copy Combined HTML**, **Copy Folder Path**.
  - **Slide-Over Inspector Modal (Option A):** Full-height modal with:
    - Left/Top Live Preview Canvas + Viewport Sizer (`Desktop 100%`, `Tablet 768px`, `Mobile 375px`), Reload Preview button, Open Standalone Tab button (and `Open Admin CMS` button for full templates).
    - Right/Bottom Code & File Panel with tabs: `Combined (1-File)`, `index.html`, `style.css`, `script.js`, and `component.tsx` (when available), plus 1-click **Copy Active Tab**, **Copy Combined Single-File**, **Download `.html`**, and **Copy Local Folder Path**.
  - **IDE Split-Screen Workbench Mode (Option B):** 3-pane layout with collapsible left sidebar tree grouped by Source Folder or Category, center responsive live stage, and right multi-tab source code inspector.
  - **"+ Add Feature / Design" Studio Modal:** Allows pasting or editing `Title`, `Slug`, `Category`, `Source`, `HTML`, `CSS`, `JS`, live-previewing the combined result immediately, saving to `localStorage` (so it appears in the catalog right away), and downloading the ready-to-drop `features/<slug>/` files or CLI sync command.

- [ ] **Step 1: Add application DOM/logic verification tests in `tests/verify-registry.js`**

Verify `index.html`, `styles.css`, and `app.js` exist, load cleanly, and expose core controller functions (`filterRegistryItems`, `buildSingleFileCode`, `sanitizeSlug`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/verify-registry.js`
Expected: FAIL with missing `index.html` / `app.js`

- [ ] **Step 3: Implement `index.html`, `styles.css`, and `app.js`**

- [ ] **Step 4: Run `node tests/verify-registry.js` and verify live in headless/real browser**

Run: `node tests/verify-registry.js`
Expected: PASS all registry, feature, and application checks.
