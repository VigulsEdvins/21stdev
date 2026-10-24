# Drag-and-Drop, Sizing Controls, Individual Cards & State Persistence Design

**Date:** 2026-10-23  
**Status:** In Review / Design  
**Target:** Web Builder (`builder.html`, `builder.js`, `builder.css`, `scripts/stack-manager.js`, `scripts/assembler.js`)

---

## 1. Intent & The Why

The 21st.local Page Builder enables users to visually compose modern websites from full-row section templates and in-section overlay widgets (buttons, cards, tables, badges, images). However, several key creator workflows were restricted:
1. **Adding Elements:** Elements could only be added by clicking an "+ Add" button, lacking intuitive drag-and-drop from the sidebar catalog directly onto the preview canvas.
2. **Card Collections:** Components like *File Card Collections* and *Glass Folder Cards* could only be added as entire pre-bundled multi-card rows, preventing users from adding a single standalone card or folder where needed.
3. **Element Sizing:** Buttons and images were limited to rigid presets (`small`, `medium`, `large`) without custom width/height adjustments or direct canvas resize handles.
4. **Search Bar Aesthetics:** The elements search input in the sidebar lacked proper styling and defaulted to a plain white input that clashed with the sleek dark glass UI.
5. **Undo / Redo & Session Retention:** Any reload or accidental refresh wiped out the user's canvas and reset the page back to the starter template, and there was no undo/redo capability to revert changes.

This project delivers a complete upgrade addressing all these aspects.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Drag & Drop:** Enable dragging any widget, card, or section directly from the sidebar catalog and dropping it onto the preview canvas at the cursor location.
- **Edge & Corner Resize Handles:** Provide interactive drag handles on the canvas for selected elements to freely stretch width and height, plus a right-click context menu "Resize Dimensions" option and numeric Width/Height (px) inputs in the floating toolbar.
- **Editable Text:** Support direct editing of text, titles, descriptions, and labels on elements via the toolbar and double-click interaction.
- **Individual Cards:** Disaggregate *File Card Collections* and *Glass Folder Cards* into discrete, one-by-one insertable components (e.g. PDF Card, Code Card, Document Card, Aurora Glass Folder, Archive Glass Folder, Smoked Ember Glass Folder).
- **Dark Glass Search Bar:** Restyle the elements search bar into a premium dark frosted-glass interface with smooth focus aura, clear button, and category filtering.
- **Undo / Redo System:** Add top-level Undo and Redo buttons with full keyboard shortcut support (`Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`) and action history stack.
- **LocalStorage State Persistence:** Automatically persist canvas sections, elements, sizing, custom styling, theme, and viewport to `localStorage` continuously so reloading never discards changes.

### Non-Goals
- Full rich-text WYSIWYG formatting engine (bold/italic markdown inside every paragraph element); text edits update the plain-text properties cleanly.
- Cloud database synchronization across devices (persists locally in browser `localStorage`).

### Anti-Goals
- Do not break existing export generation (`export.html`, `style.css`, `script.js` ZIP bundle).
- Do not introduce external heavy dependencies (maintain pure vanilla JS/CSS architecture).
- Do not break existing unit tests and integration suites (`npm test`).

---

## 3. Architecture & Detailed Specifications

### 3.1. Drag-and-Drop from Sidebar onto Canvas
- **Source:** Sidebar cards in `#elementsCardsGrid` get `draggable="true"` and `dragstart` event listeners passing serialized item data via `dataTransfer.setData('application/json', ...)`.
- **Target (Preview Iframe):** The preview frame's `document` listens for `dragover`, `dragenter`, `dragleave`, and `drop`.
  - While dragging over a `.page-section`, the section highlights with a subtle glowing border (`is-drop-target`).
  - On `drop`, compute relative coordinates `(x, y)` as percentages within the section.
  - If a widget is dropped, call `stackManager.addElement(sectionId, { ...widgetData, x, y })`.
  - If a section is dropped, call `stackManager.addSection(slug, extraProps)` and place it relative to the hovered section.
- **Existing in-canvas dragging:** Preserved and refined so elements can be dragged to reposition seamlessly.

### 3.2. Sizing Controls (Corner/Edge Resize + Right-Click + Toolbar)
- **Direct Canvas Resize:** When an element is selected in the preview iframe, render 4 corner resize handles and edge handles (`.el-resize-handle`). Dragging a handle dynamically updates the element's `width` and `height` in pixels and updates `stackManager.updateElement(sectionId, elementId, { width, height })`.
- **Right-Click Context Menu:** When right-clicking an element on canvas, the context menu includes:
  - 📐 **Resize Dimensions** (focuses width/height inputs in the toolbar)
  - ✏️ **Edit Text / Content** (focuses text input in the toolbar)
  - 📋 **Duplicate Element**
  - 🗑️ **Delete Element**
- **Floating Toolbar Inputs:**
  - Replace the old small/medium/large pills for images and buttons with:
    - **Width (px):** Numeric input with step, min 20, max 1200.
    - **Height (px):** Numeric input with step, min 20, max 1200 (or "auto").
  - In `scripts/assembler.js`: apply inline or scoped CSS `width` and `height` to `.canvas-element.element-button` and `.canvas-element.element-image`.

### 3.3. Disaggregated Individual File & Folder Cards
- **Single File Cards:**
  - `card-file-pdf`: PDF Document Card (red badge, filename, file size, icon)
  - `card-file-code`: Code Source Card (blue badge, filename, tech stack, icon)
  - `card-file-doc`: Word/Doc Card (indigo badge, filename, meta, icon)
  - `card-file-media`: Image/Video Media Card (emerald badge, preview thumbnail, dimensions)
  - `card-file-zip`: Archive/Zip Card (amber badge, filename, archive size)
- **Single Glass Folder Cards:**
  - `card-folder-aurora`: Aurora liquid art frosted glass folder with single card stack
  - `card-folder-archive`: Archive frosted glass folder with folder tabs & action menu
  - `card-folder-ember`: Smoked dark ember glass folder with red ink art
- These items are available in the **Elements** catalog under "Cards & Tiles" with live visual previews and can be dragged or clicked to add individually.

### 3.4. Redesigned Dark Frosted-Glass Search Bar
- Restyle `.elements-search-box` and `.elements-search-input` in `builder.css`:
  - Background: `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(12px)`.
  - Border: `1px solid rgba(255, 255, 255, 0.12)`.
  - Focus state: Border color changes to `var(--accent-glow, #a855f7)` with subtle box-shadow `0 0 12px rgba(168, 85, 247, 0.25)`.
  - Text color: `#fafafa` with `#71717a` placeholder.
  - Clear button (`&times;`) that appears when text is entered and clears search on click.

### 3.5. Undo & Redo History System
- **State History:** Implement an undo/redo manager in `builder.js`:
  - `historyStack = []`, `historyIndex = -1`, `maxHistory = 50`.
  - Record snapshot of `{ stack, theme, customColors, viewport }` before state-modifying actions (add section, remove section, reorder, add element, update element, resize, theme change).
  - Debounce rapid drag/resize mutations so continuous dragging creates a single history entry on mouse release (`mouseup`).
- **UI & Shortcuts:**
  - Add Undo and Redo icon buttons in the top header adjacent to viewport or theme controls.
  - Dynamic `disabled` state when `historyIndex <= 0` (undo) or `historyIndex >= historyStack.length - 1` (redo).
  - Global keyboard listener: `Ctrl+Z` (or `Cmd+Z`) for Undo, `Ctrl+Y` or `Ctrl+Shift+Z` (or `Cmd+Shift+Z`) for Redo.

### 3.6. LocalStorage Persistence
- **Key:** `web_builder_state_v2`.
- **Save Trigger:** Listen to `stackManager.subscribe(state => saveStateDebounced(state))`.
- **Load on Boot:**
  - In `initBuilder()`, check `localStorage.getItem('web_builder_state_v2')`.
  - If valid saved state with sections exists, restore `stack`, `theme`, `customColors`, and `viewport` directly into `stackManager`.
  - If no saved state is found (first visit), load `STARTER_SECTIONS`.
- **Clear / Reset Canvas:** Provide a clean option in the sidebar or menu to "Reset to Starter" or "Clear All" with confirmation toast.

---

## 4. What's Left to the Builder
- Detailed DOM event listeners and cross-iframe coordinate translation for dragging and corner handles.
- Visual CSS for the 4 corner resize handles (`nwse`, `nesw`, etc.) in the iframe overlay.
- Unit and integration tests in `tests/test-builder-drag-resize.js` covering undo/redo history, individual card registration, custom width/height application, and localStorage persistence.

---

## 5. Builder Review Resolutions & Explicit Decisions

Following builder check review, the following architectural decisions are locked:

1. **Catalog Architecture for Individual File & Folder Cards:**
   - **Decision:** Implemented as in-section draggable overlay widgets (`isWidget: true` in `WIDGET_CATALOG_ITEMS`). This allows users to drop them into any section and resize them via canvas handles, while preserving `registry.json` intact (maintaining the strict 209-component test assertion).
   - **Runtime Fidelity:** Built with high-fidelity vanilla HTML5, CSS frosted glass (`backdrop-filter: blur`), gradient mesh SVG backgrounds, and interactive hover states.

2. **Universal vs. Dedicated Sizing Controls:**
   - **Decision:** Interactive corner/edge resize handles apply universally on canvas to all overlay elements (stretching their `.canvas-element` container `width` and `height`).
   - The floating toolbar provides dedicated numeric Width/Height (px) inputs for Buttons, Images, Cards, and Tables, with sensible `min-width: 60px` and `min-height: 32px` to prevent collapse.

3. **Text Editing Interaction:**
   - **Decision:** Double-clicking any element on the preview canvas opens the floating toolbar and auto-focuses the primary text input (with instant live keystroke sync to preview and `stackManager`). Right-click menu also provides the "✏️ Edit Text / Content" shortcut.

4. **Section Drag Placement:**
   - **Decision:** `stackManager.addSection` is extended with an optional `targetIndex` parameter (`insertSection(targetIndex, slug, extraProps)`). When dropping a section onto the canvas, `y < 50%` inserts before the hovered section and `y >= 50%` inserts after, with a glowing drop guide line indicator.

