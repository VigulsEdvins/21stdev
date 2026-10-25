# Creative Elements Visual Builder, Section Sizing & Universal Theming Plan

> **Status (2026-10-24): implemented.** This plan was carried out and the work is in git history; its checkboxes were not kept up to date. Open work now lives in `docs/BACKLOG.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan upgrades the edvlabs Page Preview Builder into an Elementor / Creative Elements visual site-building workflow, solves universal color theming across all 209 vault sections, adds section height/padding sizing controls with live drag handles, and introduces a rich widget library (Tables, Stylized Buttons, Media Cards, Badges, Vault Sub-Components).

---

## Architecture & Subsystems

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 edvlabs Page Builder                                │
├───────────────────────────────────────────────────────────┬────────────────────────────┤
│ Left Sidebar: Creative Elements Panel (Tabs)              │ Live Preview Stage (Iframe)│
│                                                           │                            │
│  [🧱 Elements]   [📑 Sections]   [🎨 Styling]             │ ┌────────────────────────┐ │
│ ───────────────────────────────────────────────           │ │ Section 1 (Hero)       │ │
│  Search Widgets: [ e.g. "pricing", "button" ]             │ │ ├─ Rich Draggable Elem │ │
│                                                           │ │ └─ Bottom Resize Handle│ │
│  ▼ BUTTONS & ACTIONS                                      │ ├────────────────────────┤ │
│    [Gradient CTA] [Glass Pill] [Neon] [Shimmer]           │ │ Section 2 (Pricing)    │ │
│  ▼ TABLES & PRICING                                       │ │ ├─ Comparison Table    │ │
│    [Pricing Tier] [Feature Matrix] [KPI Stats]            │ │ └─ Bottom Resize Handle│ │
│  ▼ MEDIA & CARDS                                          │ ├────────────────────────┤ │
│    [Polaroid Frame] [Glass Tilt Card] [Media Box]         │ │ Section 3 (Footer)     │ │
│  ▼ BADGES & ACCENTS                                       │ │ └─ Bottom Resize Handle│ │
│    [Live Pulse Badge] [Gradient Tag] [Rating Stars]       │ └────────────────────────┘ │
└───────────────────────────────────────────────────────────┴────────────────────────────┘
```

---

## File Structure & Responsibilities

1. **`scripts/assembler.js`**:
   - Universal theme color normalization: maps hardcoded dark/light backgrounds and text colors in section CSS to `var(--preview-bg)` and `var(--preview-text)`.
   - Section sizing application: injects `min-height`, `height`, and `padding` rules into `.page-section` elements based on section sizing settings.
   - Rich overlay widgets renderer: renders Tables, Buttons, Media Cards, Badges, and Vault Sub-Components with responsive percentage placement.
   - Section resize handles: injects interactive resize affordance into live preview sections.

2. **`scripts/stack-manager.js`**:
   - Section sizing state: `updateSectionSizing(sectionId, { heightMode, customHeight, paddingY })`.
   - Rich element model: `addElement(sectionId, widgetData)` supporting `type: 'table'`, `type: 'button'`, `type: 'card'`, `type: 'badge'`.

3. **`builder.html` & `builder.css`**:
   - Sidebar tab switcher: `[🧱 Elements]`, `[📑 Sections]`, `[🎨 Styling]`.
   - Creative Elements widget catalog: categorized widget cards with icons and preview badges.
   - Section sizing controls in sidebar and live section resize bar in preview.
   - Enhanced floating element edit toolbar for Tables, Buttons, Cards, and Badges.

4. **`builder.js`**:
   - Tab switching coordinator (`elements`, `sections`, `styling`).
   - Widget insertion handler (click widget to add to active section, or right-click canvas).
   - Live section height resizer (drag handle at section bottom).
   - Dynamic zero-flicker theme and color updates across all sections.

5. **Test Suites**:
   - `tests/test-universal-theming.js`: automated tests verifying color cascading across sections.
   - `tests/test-section-sizing.js`: automated tests verifying sizing state, CSS injection, and export.
   - `tests/test-creative-widgets.js`: automated tests for tables, stylized buttons, cards, and export bundles.

---

## Implementation Tasks

### Task 1: Universal Color Theming Engine & Color Cascade Fix
**Deliverable:** Fix hardcoded color conflicts so Theme Presets and Custom Colors apply across all sections.

- [ ] **Step 1: Write failing test in `tests/test-universal-theming.js`**
  - Verify `assemblePreviewDocument` replaces hardcoded backgrounds (`#09090b`, `#000`, etc.) with `var(--preview-bg)` on section wrappers.
  - Verify `assemblePreviewDocument` injects universal theme normalization stylesheet.
  - Run `node tests/test-universal-theming.js` to confirm failure.
- [ ] **Step 2: Implement color normalizer in `scripts/assembler.js`**
  - In `scopeSectionStyles(css, sectionId)`: replace hardcoded container backgrounds with `var(--preview-bg)` and container colors with `var(--preview-text)`.
  - In `assemblePreviewDocument`: inject global theme normalization CSS ensuring `.page-section` inherits and enforces `var(--preview-bg)` and `var(--preview-text)`.
  - In `generateExportBundle`: ensure `style.css` includes the same theme cascade rules.
- [ ] **Step 3: Update `applyDynamicTheme` in `builder.js`**
  - Ensure dynamic color updates propagate instantly to all section root containers without reload flicker.
- [ ] **Step 4: Run test suite**
  - Run `node tests/test-universal-theming.js` to verify it passes.
- [ ] **Step 5: Commit changes**
  - Commit with message: `fix(theming): enforce universal color cascading across all sections and eliminate hardcoded color overrides`

---

### Task 2: Section Sizing Controls & Interactive Resize Handle
**Deliverable:** Configurable section heights (`Auto`, `Screen 100vh`, `Custom Height`), vertical padding, and interactive bottom drag handles.

- [ ] **Step 1: Write failing test in `tests/test-section-sizing.js`**
  - Test `stackManager.updateSectionSizing(sectionId, sizing)`.
  - Test `assemblePreviewDocument` applying `min-height` and padding to `.page-section`.
  - Test `generateExportBundle` preserving section heights in exported CSS/HTML.
  - Run `node tests/test-section-sizing.js` to confirm failure.
- [ ] **Step 2: Implement sizing data model in `scripts/stack-manager.js`**
  - Add `sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'medium' }` to section model.
  - Implement `updateSectionSizing(sectionId, sizingUpdates)`.
- [ ] **Step 3: Update `scripts/assembler.js` for section sizing**
  - Inject sizing inline styles or scoped rules on `.page-section`:
    - `screen`: `min-height: 100vh;`
    - `custom`: `min-height: ${customHeight}px;`
    - `auto`: `min-height: auto;`
    - Padding presets: `none` (0px), `compact` (32px), `medium` (64px), `large` (120px).
  - In preview document, inject `.section-resize-handle` at the bottom of each section.
- [ ] **Step 4: Implement section sizing UI in `builder.html`, `builder.css`, and `builder.js`**
  - Add Sizing pill/dropdown to each stack item card in sidebar.
  - Attach pointer drag listener to `.section-resize-handle` inside the preview iframe to adjust section height in real time.
- [ ] **Step 5: Run tests and verify**
  - Run `node tests/test-section-sizing.js` to verify all tests pass.
- [ ] **Step 6: Commit changes**
  - Commit with message: `feat(builder): add section sizing controls, padding presets, and interactive bottom resize handle`

---

### Task 3: Creative Elements Widget Library & Left Sidebar Tabs
**Deliverable:** Elementor-style switchable sidebar (`Elements | Sections | Styling`) and rich widget catalog (Tables, Stylized Buttons, Media Cards, Badges).

- [ ] **Step 1: Write failing test in `tests/test-creative-widgets.js`**
  - Test rendering of Table widget, Stylized Button widget, Media Card widget, and Badge widget in `scripts/assembler.js`.
  - Test export bundle containing the widget HTML, CSS, and interactive state.
  - Run `node tests/test-creative-widgets.js` to confirm failure.
- [ ] **Step 2: Add sidebar tabs & widget catalog markup in `builder.html` & `builder.css`**
  - Add tab bar: `[Elements]`, `[Sections]`, `[Styling]`.
  - Create `#tabContentElements`: widget categories with searchable cards:
    - **Buttons:** Gradient Glow, Glass Pill, Cyberpunk Neon, Shimmer CTA, Magnetic Action.
    - **Tables & Pricing:** Pricing Tier Card, Feature Comparison Matrix, KPI Stat Metric.
    - **Cards & Media:** Polaroid Photo Card, Glass Tilt Card, Aspect Media Box.
    - **Badges & UI:** Pulse Status Badge, Gradient Category Pill, Rating Stars.
  - Create `#tabContentSections` (current stack list & sizing).
  - Create `#tabContentStyling` (theme presets & custom palette controls).
- [ ] **Step 3: Implement rich widget HTML & CSS in `scripts/assembler.js`**
  - Implement `renderSectionOverlayHtml` for:
    - `type: 'table'`: customizable comparison table / pricing card.
    - `type: 'button'`: multiple modern button styles.
    - `type: 'card'`: rich media card with title, image, and description.
    - `type: 'badge'`: pulse status indicator and category pills.
  - Add responsive CSS for all widgets in `OVERLAY_ELEMENT_CSS`.
- [ ] **Step 4: Wire sidebar tabs and widget insertion in `builder.js`**
  - Tab switching logic with smooth transitions.
  - Click any widget in Elements tab to insert into active or first section.
  - Update right-click canvas context menu to include the new widget categories.
- [ ] **Step 5: Run tests and verify**
  - Run `node tests/test-creative-widgets.js` to verify it passes.
- [ ] **Step 6: Commit changes**
  - Commit with message: `feat(builder): implement Creative Elements widget panel with tables, rich buttons, media cards, and sidebar tabs`

---

### Task 4: Interactive Floating Edit Toolbar & Full System Verification
**Deliverable:** Specialized editing controls for Tables, Buttons, Cards, and Badges, plus master integration testing.

- [ ] **Step 1: Enhance `#elementEditToolbar` in `builder.html` and `builder.css`**
  - Add Table editing fields (Price, Plan Name, Features list).
  - Add Card editing fields (Title, Description, Image URL).
  - Add Button editing fields (Text, Link, Button Style picker).
  - Add Badge editing fields (Label, Pulse toggle).
- [ ] **Step 2: Wire toolbar inputs in `builder.js`**
  - Real-time live updating of table rows, prices, button styles, and card text in the preview without iframe reload.
- [ ] **Step 3: Run full integration test suite (`npm test`)**
  - Verify all 7 test suites pass cleanly.
- [ ] **Step 4: Verify in browser with Chrome DevTools MCP**
  - Verify switching themes properly recolors all sections.
  - Verify dragging section resize handle updates section height.
  - Verify dropping a pricing table and gradient button into a section.
- [ ] **Step 5: Commit changes & push to remote**
  - Commit with message: `feat(builder): add multi-widget edit toolbar and verify Creative Elements workflow`
  - Push branch to `origin main`.
