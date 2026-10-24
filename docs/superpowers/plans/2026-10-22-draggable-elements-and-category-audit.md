# Implementation Plan: Category Reclassification & Draggable Element Overlay System

> **Status (2026-10-24): implemented.** This plan was carried out and the work is in git history; its checkboxes were not kept up to date. Open work now lives in `docs/BACKLOG.md`.

## 1. Overview
This plan implements two requested features for the Page Preview Builder:
1. **Audit & Reclassify Component Categories:** Clean up the 200+ vault registry so Footers, Headers, Heroes, and UI elements are accurately placed, eliminating footers appearing in headers and misclassified items.
2. **Freeform Draggable Element Layer:** Enable users to right-click anywhere within a section to add Buttons, Images, or Badges, freely drag and position them, customize text/styles via a floating toolbar, and export them into the final project package.

---

## 2. Part 1: Category Audit & Reclassification

### Key Problems in Current Registry
- Footers like `beam-wordmark-footer`, `halftone-wordmark-footer`, `kiln-wordmark-footer`, `shutter-glyph-footer`, `ticket-stub-footer` were categorized under `Navigation & Headers`.
- `hover-footer` was under `Navigation & UI`.
- Heroes like `astro-bubble-hero`, `glass-headline-hero`, `gradient-bar-hero-section`, `waitlist-hero` were in navigation categories.
- Preloaders were scattered across scroll and card categories.
- The drawer in `builder.html` was missing an explicit **Footers** filter pill.

### Plan
1. **Update `meta.json` across `features/`:**
   - Set `category: "Footers & Endings"` for all 8 footers.
   - Set `category: "Heroes"` for all 15 hero sections.
   - Reclassify mislabeled navigation items.
2. **Re-sync Registry:**
   - Run `node scripts/sync-registry.js` to regenerate `registry.json` and `registry.js`.
3. **Drawer Filter Bar in `builder.html`:**
   - Add `<button type="button" class="drawer-cat-pill" data-category="Footers">Footers</button>`.
4. **Harden `matchesCategory` in `builder.js`:**
   - `Headers & Nav`: strictly match headers, navbars, and menus; explicitly exclude any footers (`!slug.includes('footer') && !title.includes('footer')`).
   - `Footers`: match all footers, wordmarks, and endings.
   - `Heroes`: match hero sections and entrance banners.

---

## 3. Part 2: Draggable Buttons, Images & Elements

### Architecture
```
                                 Right-Click on Section
                                          │
                                          ▼
                            Floating Context Menu:
                       [+ Add Button] [+ Add Image] [+ Add Badge]
                                          │
                                          ▼
                         Drop Element at Relative (X%, Y%)
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                 ▼
                 Mouse Drag Movement               Click / Select
                         │                                 │
                         ▼                                 ▼
               Update (X%, Y%) in State           Inline Micro-Toolbar
                         │                        - Text / Image URL
                         ▼                        - Style / Size presets
                 Live Preview Sync                - 🗑️ Delete Button
                         │
                         ▼
             Export Bundle Generation
             (index.html, style.css)
```

### Components to Update
1. **`scripts/stack-manager.js`:**
   - Add `addElement(sectionId, elementData)`
   - Add `updateElement(sectionId, elementId, updates)`
   - Add `removeElement(sectionId, elementId)`
   - Include `elements` array in `getState()` and section duplication/cloning.
2. **`scripts/assembler.js`:**
   - In `assemblePreviewDocument` and `generateExportBundle`:
     Render `.section-overlay-layer` inside `.page-section` containing placed elements.
   - Inject CSS classes for `.overlay-element`, `.overlay-btn`, `.overlay-img`, `.overlay-badge` with preset styles (Solid Accent, Glass Pill, Neon Glow, Outline).
3. **`builder.html` & `builder.css`:**
   - Add context menu container `#canvasContextMenu`.
   - Add inline floating toolbar `#elementEditToolbar` (Text input, URL input, Style picker, Delete button).
   - Add styling for selection handles, drag state, and dashed guide boundaries.
4. **`builder.js`:**
   - Listen for `contextmenu` inside the preview iframe to open `#canvasContextMenu` at click coordinates.
   - Implement mouse/pointer drag controller on overlay elements within the section bounds, converting pixel offsets to responsive percentages.
   - Connect inline toolbar to update element text, style, image URL, and handle deletion.
   - Persist elements across section reordering and exports.

---

## 4. Test & Verification Plan
- Unit test in `tests/test-builder-elements.js`:
  - Verify adding, moving (updating x/y), styling, and deleting elements in `stackManager`.
  - Verify `assembler.js` compiles elements and responsive percentage coordinates into `index.html` and `style.css`.
- Audit verification:
  - Run `tests/verify-registry.js` to ensure zero regressions across all 209 vault features.
  - Test drawer category filtering in browser (verifying Footers show only footers and Headers show only headers).
- Integration test in Chrome via DevTools:
  - Right click in preview section $\rightarrow$ Add Button $\rightarrow$ Drag across section $\rightarrow$ Verify responsive positioning $\rightarrow$ Export package.
