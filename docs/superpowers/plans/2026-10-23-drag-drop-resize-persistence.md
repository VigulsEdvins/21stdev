# Drag-and-Drop, Sizing Controls, Individual Cards & State Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement sidebar drag-and-drop onto canvas sections, live corner/edge element resize handles with custom width/height inputs, standalone individual File and Glass Folder Cards, redesigned dark frosted-glass search bar, full Undo/Redo history, and automated LocalStorage persistence.

**Architecture:** Extend `stackManager` with custom element dimensions and positional section insertion; enhance `assembler.js` with overlay element dimension rendering and individual card visual templates; integrate cross-iframe HTML5 drag-and-drop and live corner resize interaction in `builder.js`; restyle the search bar in `builder.css`; and add an in-memory history stack with `localStorage` persistence in `builder.js`.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Drag and Drop API, CSS3 Glassmorphism (`backdrop-filter`), LocalStorage, Node.js unit tests.

**Spec:** [`docs/superpowers/specs/2026-10-23-drag-drop-resize-persistence-design.md`](file:///home/edvins/features-for-web/web-for-options/docs/superpowers/specs/2026-10-23-drag-drop-resize-persistence-design.md)

## Global Constraints

- Must maintain vanilla JS/CSS architecture without heavy runtime dependencies.
- Must preserve existing 209-component registry assertion (`registry.json` items count remains 209).
- Must preserve full export generation bundle functionality (`generateExportBundle`).
- Must pass all existing integration and assembler tests (`npm test`).
- Must support keyboard shortcuts: `Ctrl+Z` (Undo), `Ctrl+Y` / `Ctrl+Shift+Z` (Redo).

## Review Focus

- Cross-iframe drag-and-drop coordinate translation: mouse coordinates over iframe must correctly map to section-relative percentages.
- Edge handle resizing: dragging corners/edges must not jump unexpectedly when mouse moves outside the iframe.
- History stack debouncing: dragging and resizing continuously must record only one undo step on mouse release (`mouseup`).
- LocalStorage schema versioning: gracefully handles corrupted, partial, or legacy storage states without crashing the builder.
- Text editing synchronization: updates to title, labels, or content in the toolbar must propagate to both preview DOM and `stackManager` immediately.

---

### Task 1: Individual File & Glass Folder Cards Model & Assembler Rendering

**Files:**
- Modify: `scripts/assembler.js:310-440` (add card renderers for file and folder cards)
- Modify: `scripts/assembler.js:720-760` (add CSS for individual file and folder cards in `OVERLAY_ELEMENT_CSS`)
- Modify: `builder.js:1537-1727` (register the 8 individual card items in `WIDGET_CATALOG_ITEMS`)
- Test: `tests/test-individual-cards.js`

**Interfaces:**
- Produces:
  - `card-file-pdf`, `card-file-code`, `card-file-doc`, `card-file-media`, `card-file-zip`
  - `card-folder-aurora`, `card-folder-archive`, `card-folder-ember`
  - Registered in `WIDGET_CATALOG_ITEMS` with `isWidget: true` and rendered in `renderSectionOverlayHtml`.

- [ ] **Step 1: Write failing test in `tests/test-individual-cards.js`**
  - Assert that `renderSectionOverlayHtml` renders `element-card-file` with badge and filename.
  - Assert that `renderSectionOverlayHtml` renders `element-card-folder` with frosted glass styling and art preview.
  - Assert that `generateExportBundle` includes individual cards in exported HTML/CSS.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node tests/test-individual-cards.js`
  - Expected: FAIL
- [ ] **Step 3: Implement individual card rendering in `scripts/assembler.js`**
  - In `renderSectionOverlayHtml`: handle `el.type === 'file-card'` and `el.type === 'folder-card'`.
  - In `OVERLAY_ELEMENT_CSS`: add modern glassmorphic styles for `.element-card-file` (file type badges, filename, size, subtle borders) and `.element-card-folder` (frosted tabs, glass reflection, art gradient backdrop).
- [ ] **Step 4: Register individual card items in `builder.js`**
  - Add 5 individual file cards and 3 individual glass folder cards to `WIDGET_CATALOG_ITEMS` under category `'Cards & Tiles'`.
- [ ] **Step 5: Run test to verify it passes**
  - Run: `node tests/test-individual-cards.js`
  - Expected: PASS
- [ ] **Step 6: Commit**
  - Commit with message: `feat(catalog): add individual file cards and glass folder card widgets`

---

### Task 2: Universal Custom Width & Height Sizing Controls & Corner/Edge Live Handles

**Files:**
- Modify: `scripts/stack-manager.js:180-218` (support `width` and `height` on overlay elements)
- Modify: `scripts/assembler.js:310-330` (render inline/scoped `width` and `height` on `.canvas-element`)
- Modify: `builder.html:762-800` (add Width and Height numeric inputs to floating toolbar)
- Modify: `builder.css:1280-1360` (toolbar sizing styles and `.el-resize-handle` cursor styles)
- Modify: `builder.js:800-860, 1030-1120, 1286-1352` (wire toolbar inputs and corner/edge resize handles)
- Test: `tests/test-element-sizing.js`

**Interfaces:**
- Consumes: `stackManager.updateElement(sectionId, elementId, { width, height })`
- Produces: Dynamic element resizing via canvas handles and toolbar pixel inputs.

- [ ] **Step 1: Write failing test in `tests/test-element-sizing.js`**
  - Test `stackManager.addElement` and `stackManager.updateElement` saving custom `width` and `height`.
  - Test `renderSectionOverlayHtml` outputting `width: 280px; height: 160px;` in style attributes.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node tests/test-element-sizing.js`
  - Expected: FAIL
- [ ] **Step 3: Update `scripts/stack-manager.js` and `scripts/assembler.js`**
  - In `scripts/stack-manager.js`: support `width` and `height` properties on element data models.
  - In `scripts/assembler.js`: inject `width` and `height` into element style attributes when present.
- [ ] **Step 4: Add Width & Height inputs in `builder.html` and `builder.css`**
  - Add `toolbarBtnWidth`, `toolbarBtnHeight`, `toolbarImgWidth`, `toolbarImgHeight`, `toolbarCardWidth`, `toolbarCardHeight` inputs.
- [ ] **Step 5: Implement live corner & edge resize handles in `builder.js`**
  - When `.canvas-element` is selected, inject 4 corner handles (`nw`, `ne`, `se`, `sw`) and 4 edge handles (`n`, `s`, `e`, `w`).
  - Wire mousedown on handles: compute mouse delta against iframe coordinates and update `width` and `height` in real-time, calling `stackManager.updateElement(..., silent=true)` during drag and `silent=false` on `mouseup`.
  - Add context menu option "📐 Resize Dimensions" to trigger sizing focus.
- [ ] **Step 6: Run test to verify it passes**
  - Run: `node tests/test-element-sizing.js`
  - Expected: PASS
- [ ] **Step 7: Commit**
  - Commit with message: `feat(sizing): implement custom width/height controls and interactive corner resize handles`

---

### Task 3: Drag-and-Drop from Sidebar onto Canvas & Positional Section Dropping

**Files:**
- Modify: `scripts/stack-manager.js:47-78` (add `insertSection(index, slugOrSection, extraProps)`)
- Modify: `builder.js:1820-1950` (make sidebar cards draggable with dataTransfer payloads)
- Modify: `builder.js:1200-1360` (handle dragover, dragenter, dragleave, drop in preview iframe)
- Modify: `builder.css:1400-1450` (styles for drop target guides and highlight states)
- Test: `tests/test-drag-drop-canvas.js`

**Interfaces:**
- Produces: `stackManager.insertSection(targetIndex, slug, extraProps)`
- Produces: Dragging items from sidebar directly onto preview sections.

- [ ] **Step 1: Write failing test in `tests/test-drag-drop-canvas.js`**
  - Test `stackManager.insertSection` correctly inserting a section at a specific index.
  - Verify section order transitions when inserting before or after an existing section.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node tests/test-drag-drop-canvas.js`
  - Expected: FAIL
- [ ] **Step 3: Implement `insertSection` in `scripts/stack-manager.js`**
  - Add `insertSection(index, slugOrSection, extraProps)` that splices into `state.stack` and calls `notify()`.
- [ ] **Step 4: Make sidebar cards draggable in `builder.js`**
  - Set `draggable="true"` on `.element-feature-card` and attach `dragstart` setting JSON payload with item type, slug, and element data.
- [ ] **Step 5: Implement cross-iframe drop handling in `builder.js`**
  - On preview iframe document: attach `dragover`, `dragenter`, `dragleave`, `drop`.
  - For widget drops: calculate `(x, y)` percentage inside the target `.page-section` and call `stackManager.addElement(sectionId, { ...widgetData, x, y })`.
  - For section drops: detect `y < 50%` (insert before) vs `y >= 50%` (insert after) and show a glowing horizontal line indicator `.drop-guide-line`. Call `stackManager.insertSection(...)`.
- [ ] **Step 6: Run test to verify it passes**
  - Run: `node tests/test-drag-drop-canvas.js`
  - Expected: PASS
- [ ] **Step 7: Commit**
  - Commit with message: `feat(dnd): enable sidebar-to-canvas drag and drop with positional section insertion`

---

### Task 4: Double-Click / Right-Click Text Editing & Redesigned Dark Frosted Search Bar

**Files:**
- Modify: `builder.html:243-260` (search box markup enhancements)
- Modify: `builder.css:1710-1765` (add styles for `.elements-search-box`, `.elements-search-input`, clear button, active focus glow)
- Modify: `builder.js:1260-1310` (double click & right-click text editing listeners)
- Test: `tests/test-search-and-editing.js`

**Interfaces:**
- Produces: Sleek dark search bar design and immediate text editing trigger on double-click / right-click.

- [ ] **Step 1: Write failing test in `tests/test-search-and-editing.js`**
  - Test that `.elements-search-box` and `.elements-search-input` classes are styled without default unstyled white background.
  - Test that double-clicking a canvas element opens the edit toolbar and sets focus to the text field.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node tests/test-search-and-editing.js`
  - Expected: FAIL
- [ ] **Step 3: Implement search bar styles in `builder.css`**
  - Style `.elements-search-box` with `background: rgba(255, 255, 255, 0.05)`, `border: 1px solid rgba(255, 255, 255, 0.12)`, `border-radius: 8px`, `backdrop-filter: blur(12px)`.
  - Add glowing focus border `border-color: #a855f7; box-shadow: 0 0 12px rgba(168, 85, 247, 0.25)`.
  - Style `.elements-search-input` with `#fafafa` text and `#71717a` placeholder.
  - Add smooth clear button behavior.
- [ ] **Step 4: Implement text editing triggers in `builder.js`**
  - On `dblclick` on `.canvas-element`: call `openEditToolbar(sectionId, elementId)` and automatically focus and select text in the primary text input (`toolbarBtnText`, `toolbarCardTitle`, etc.).
  - In canvas context menu: add "✏️ Edit Text / Content" action.
- [ ] **Step 5: Run test to verify it passes**
  - Run: `node tests/test-search-and-editing.js`
  - Expected: PASS
- [ ] **Step 6: Commit**
  - Commit with message: `feat(ui): redesign dark frosted search bar and add double-click/right-click text editing`

---

### Task 5: Undo / Redo History Stack & Continuous LocalStorage Persistence

**Files:**
- Modify: `builder.html:130-155` (add Undo and Redo buttons in header)
- Modify: `builder.css:200-240` (styling for header undo/redo buttons and disabled state)
- Modify: `builder.js:158-200, 2050-2100` (undo/redo history manager & localStorage persistence)
- Test: `tests/test-undo-persistence.js`

**Interfaces:**
- Produces:
  - `undoAction()`, `redoAction()`
  - Automated save and restore from `localStorage.getItem('web_builder_state_v2')`
  - Shortcuts: `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`

- [ ] **Step 1: Write failing test in `tests/test-undo-persistence.js`**
  - Test history stack: push states, execute `undo`, verify previous state restored, execute `redo`, verify re-applied.
  - Test `localStorage` serialization & deserialization preserving all section and element sizing.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node tests/test-undo-persistence.js`
  - Expected: FAIL
- [ ] **Step 3: Add Undo & Redo buttons to `builder.html` and `builder.css`**
  - Insert Undo (`#undoBtn`) and Redo (`#redoBtn`) buttons into `.header-center` or `.header-right`.
  - Style them with subtle hover effects and `opacity: 0.4; pointer-events: none;` when disabled.
- [ ] **Step 4: Implement Undo/Redo history engine in `builder.js`**
  - Maintain `historyStack` and `historyIndex`.
  - Push snapshot `{ stack, theme, customColors, viewport }` before mutating actions.
  - Attach click listeners to `#undoBtn` and `#redoBtn`, plus keyboard event listener for `Ctrl+Z` and `Ctrl+Y` / `Ctrl+Shift+Z`.
- [ ] **Step 5: Implement LocalStorage persistence in `builder.js`**
  - Auto-save state to `localStorage.setItem('web_builder_state_v2', ...)` debounced by 200ms on all mutations.
  - In `initBuilder()`: check for saved state; if found, restore it into `stackManager` instead of calling `loadStarterTemplate()`.
  - Add a "Reset Canvas" button in the sections drawer or menu allowing users to reset to starter anytime.
- [ ] **Step 6: Run test to verify it passes**
  - Run: `node tests/test-undo-persistence.js`
  - Expected: PASS
- [ ] **Step 7: Commit**
  - Commit with message: `feat(history): implement undo/redo history system and automated localstorage persistence`

---

### Task 6: Full Integration & End-to-End Verification

**Files:**
- Modify: `tests/test-builder-integration.js` (include new test suites)
- Run: `npm test`

- [ ] **Step 1: Wire new test suites into `tests/test-builder-integration.js`**
  - Import and run `test-individual-cards.js`, `test-element-sizing.js`, `test-drag-drop-canvas.js`, `test-search-and-editing.js`, and `test-undo-persistence.js`.
- [ ] **Step 2: Run full integration suite**
  - Run: `npm test`
  - Expected: All unit and integration tests pass cleanly with 0 failures.
- [ ] **Step 3: Commit integration test suite updates**
  - Commit with message: `test(integration): verify all builder drag-drop, sizing, individual cards, and persistence features`
