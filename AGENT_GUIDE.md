# 21st.local — Agent & Developer Feature Vault Guide

This directory (`/home/edvins/features-for-web/web-for-options`) is a self-contained **Feature, Component & Design Registry** modeled after **21st.dev**. Every item is pre-extracted into clean, standalone, 100% functional code so humans and AI coding agents can immediately copy or integrate any feature into a target project—or add new features to this vault.

---

## 1. How to Use a Feature from This Vault in Another Project

1. **Discover Available Features:**
   Read [`registry.json`](file:///home/edvins/features-for-web/web-for-options/registry.json) to search by `slug`, `category`, `source`, or `tags`.
2. **Read the Standalone Feature Files:**
   Every feature lives in `/home/edvins/features-for-web/web-for-options/features/<slug>/`:
   - `meta.json` — Title, category, tags, dependencies, and source details.
   - `index.html` — Complete, runnable standalone markup for the feature.
   - `style.css` — Scoped CSS for the feature (zero external stylesheet bloat).
   - `script.js` — Clean, self-contained JavaScript / physics / animation controller.
   - `component.tsx` *(optional)* — Original React / TypeScript component when applicable.
3. **Integrate into the Target Project:**
   - For **Vanilla HTML/CSS/JS** projects: Copy the markup from `features/<slug>/index.html`, styles from `style.css`, and logic from `script.js`.
   - For **React / Next.js / Vite** projects: If `component.tsx` exists, copy it directly; otherwise port the clean DOM structure and `script.js` `requestAnimationFrame`/event lifecycle into a `useEffect` hook with scoped styles.

---

## 2. How to Add a New Feature or Design to This Vault (Via Agent)

Whenever the user asks you to *"add this feature/design to `web-for-options`"*:

1. **Scaffold it** (creates a schema-valid folder, then syncs the registry):
   ```bash
   npm run new-feature -- my-slug --category "Heroes" --title "My Hero"
   ```
   Categories are a **fixed list** defined in `scripts/schema.js` (Heroes, Headers & Nav, Footers & Endings, Buttons & UI, Cards & Tiles, Galleries & Bento, 3D & Carousels, Scroll & Parallax, Interactions & Physics, Audio & Shaders, Preloaders & Shaders, Full Templates). Do not invent new ones; add to the list in `schema.js` first if one is truly missing.
2. **Fill in `features/<slug>/`**:
   - `meta.json` — validated by `scripts/schema.js`. Required: `slug`, `title`, `description` (20+ chars), `tags` (3+), `category`, `type`, `status` (`draft` until checked), `mood[]`, `industry[]`, `weight` (`light|medium|heavy`), `needsAssets`, `origin {source, license}`, `updatedAt`, `customizable[]`, `dependencies[]`. Mood/industry/weight drive the builder's filters, so set them honestly.
   - `index.html`, `style.css`, `script.js` — standalone and runnable; no external image links that can break.
   - `component.tsx` + `demo.tsx` *(React features)* — then run `npm run bundle-demo -- --slug <slug>` so `script.js` is built from the **demo** (real props), not the bare component.
   - Images/video/fonts: copy them into `assets/library/` (or run `node scripts/localize-assets.js`) and reference them as `/assets/library/<file>`. Never reference files outside this folder.
   - Use the standard design tokens in CSS: `var(--bg)`, `var(--text)`, `var(--accent)`, `var(--radius)`, `var(--font-display)`, `var(--font-body)` so themes and page fonts apply. `npm run lint-tokens` lists the worst offenders. Migrate existing components by hand, one at a time, and check them in a dark and a light theme: an automated colour swap was tried and rejected because light-designed components turned dark with unreadable card text.
3. **Sync, verify, check**:
   ```bash
   npm run sync              # rebuilds registry.json and registry.js
   npm run verify            # schema + registry checks
   npm run check-features -- --slug my-slug   # opens it in headless Chromium and reports errors
   npm run thumbs -- --slug my-slug           # renders thumbs/<slug>.jpg for the builder grid
   npm run sync              # picks up the thumbnail
   ```
   `npm run check-features -- --promote` marks clean `draft` features `stable`. The builder hides drafts unless "Drafts" is ticked.
4. **Optional: make it client-editable.** The Content tab auto-detects headings, paragraphs, images and links. To control labels or limit what clients can change, list fields in `meta.json`:
   ```json
   "customizable": [
     { "id": "headline", "label": "Headline", "type": "text", "selector": ":scope h1" },
     { "id": "photo", "label": "Hero image", "type": "image", "selector": ":scope img.hero" },
     { "id": "cta", "label": "Button link", "type": "link", "selector": ":scope a.cta" },
     { "id": "tint", "label": "Overlay colour", "type": "color", "selector": ":scope", "attr": "--overlay" }
   ]
   ```
   Selectors are resolved inside the section (`:scope`). Types: `text`, `image`, `link`, `color`.

## 3. Everyday Commands

| Command | What it does |
| --- | --- |
| `npm start` | Serves the vault at http://localhost:4173 (`VAULT_STRICT=1` serves only vault files) |
| `npm test` | All unit and structure tests (`tests/test-*.js`) |
| `npm run test:e2e` | Playwright end-to-end tests of builder.html (search, preview, content, projects, ZIP export) |
| `npm run sync` | Regenerate `registry.json` / `registry.js` from `features/*/meta.json` |
| `npm run new-feature -- <slug>` | Scaffold a new feature |
| `npm run check-blank` | Adds every feature alone in the builder and fails if a section renders nothing (4 known-empty features are listed in the script). `verify` also fails when `script.js` is a stub and the real code is inline in `index.html` |
| `npm run check-features` | Load every feature in headless Chromium; writes `reports/features.json` |
| `npm run thumbs` | Render `thumbs/<slug>.jpg` previews |
| `npm run bundle-demo -- --slug <slug>` | Rebuild a React feature from its `demo.tsx` |
| `npm run lint-tokens` | Design-token adoption report |

## 4. Builder Workflow for Client Sites

1. **Pick components** in the *Elements* tab: fuzzy search, mood/industry/weight filters, ★ favourites, 🕘 recents, ≈ "find similar". Hover a thumbnail for the live preview.
2. **Arrange** them in *Sections*, then set colours and **page settings** (title, description, favicon, Google fonts, language) in *Styling*.
3. **Edit client content** in the *Content* tab: text, images (upload or URL) and links. Edits are stored per section and re-applied in the preview and the export.
4. **Save the work** under *Projects*: one project per client with notes, up to 20 snapshots, and JSON export/import to move a project between machines.
5. **Export**: the ZIP contains `index.html`, `style.css`, `script.js`, a handoff `README.md` and an `assets/` folder; the single-file HTML inlines the images.

## 5. Where Things Live

- `builder.html`, `builder.js`, `builder.css` — the builder shell. Extracted modules are in `scripts/builder/` (categories, widget catalog, UI helpers, export asset bundling, in-place preview patching).
- `scripts/builder-extras.js` — projects modal, page settings, Content tab. `scripts/projects.js` — project store. `scripts/catalog-search.js` — search, filters, favourites.
- `registry.js` is **metadata only** (about 0.3 MB). Source files are fetched on demand by `scripts/feature-files.js` (catalogue) and `fetchFeatureFiles` (builder). Full-site templates keep their extra files in `features/<slug>/site/`.
- `scripts/assembler.js` — builds the preview document and the export bundle. `scripts/stack-manager.js` — page state.
- `assets/library/` — shared, content-hash-named images used by features. `thumbs/` — grid thumbnails. `reports/` — generated, git-ignored.

## 6. Theme Quality and Licences

- **Theme audit:** `npm run audit-themes` renders every component under a dark and a light theme and lists text below 3:1 contrast. It over-flags brand-coloured or decorative text, so a component someone has looked at and accepted carries `"themeReviewed": "<note>"` in `meta.json` and is listed apart. A component that is unreadable under only one page theme can declare `"nativeWhen": ["light"]` (or `"dark"`): under that page theme it keeps its own palette.
- **`ownPalette`:** a component whose own colours collide with the theme engine's blanket heading/paragraph rules declares `"ownPalette": true` and is exempt from them. Used by the 5 components below.
- **Tailwind:** 21st.dev components are written with Tailwind classes but ship no Tailwind CSS, so they render partly unstyled. `npm run build-tailwind -- --slug <slug>` compiles the utilities and Tailwind's preflight reset a component uses into its `style.css`. Run it for any imported component whose `component.tsx` has `className="flex …"`-style classes; it was run for 64 of them.
- **Formerly known theme issues (fixed with `ownPalette` and Tailwind):** `wirebound-inquiry` (dark text on blue in the light theme), `pixel-park-template` (hero text in the light theme), `bento-portfolio-template` (faint secondary text in the light theme), `torn-postcard-portfolio` (headline crowds the top edge), `exploded-assembly-scroll` (renders without its intended styling). 
- **Licences:** 173 components come from 21st.dev and are recorded as `unverified`. 21st.dev's Terms say community components stay the property of their authors, may be used only through the platform, and may not be redistributed. Check each component's page for an open licence (MIT etc.) or get the author's permission before using it for a client, then record it with `npm run set-license`. Exports list every unverified component in their README.
- **Content tab names:** `npm run suggest-customizable -- --slug <slug> --write` regenerates the named field list (Headline, Intro text, Button text, Hero photo, Menu item 2 …) from the rendered component. Edit `meta.json` by hand to rename or trim.
