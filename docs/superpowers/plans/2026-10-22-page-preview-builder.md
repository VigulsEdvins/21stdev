# Page Preview & Assemble Builder Implementation Plan

> **Status (2026-10-24): implemented.** This plan was carried out and the work is in git history; its checkboxes were not kept up to date. Open work now lives in `docs/BACKLOG.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a side-by-side Page Preview Builder allowing users to assemble features from the 200+ vault registry, apply prepared/custom color themes, view an instant live responsive preview, and export a ready-to-run, editable package for new projects.

**Architecture:** Pure client-side application living in `builder.html` backed by `builder.js`, `builder.css`, and a shared `scripts/assembler.js` engine. Left panel manages the active stack, theme selector, and component drawer; right panel renders a sandboxed iframe with dynamic CSS variable propagation and isolated section script execution; an export modal delivers copyable code, single-file bundles, and downloadable project ZIPs.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3 Variables, iframe sandboxing, JSZip (or client-side Blob packaging), Node.js for CLI verification tests.

**Spec:** [`docs/superpowers/specs/2026-10-22-page-preview-builder-design.md`](file:///home/edvins/features-for-web/web-for-options/docs/superpowers/specs/2026-10-22-page-preview-builder-design.md)

---

## Global Constraints

- **No Breakage to Existing Features:** Existing files in `features/`, `registry.json`, `index.html`, `styles.css`, and `app.js` must remain functional without breaking existing tests.
- **Client-Side Execution:** The builder must run directly in the browser via standard local static serving (e.g., `npx serve .` or direct file access) with zero external backend services.
- **Vanilla Compatibility:** Exported packages must be standard, unminified, clean HTML5/CSS3/ES6 code with clear comments, requiring no mandatory bundler or build step to run.
- **CSS Variable Contract:** Theme controls must inject `--preview-bg`, `--preview-text`, `--preview-accent`, `--preview-card-bg`, and `--preview-border` into section wrappers.

---

## Review Focus

1. **Empty Stack State:** When no sections are added, the preview frame must display a clean empty state prompt instead of a broken blank document.
2. **React `#root` Multi-Mounting:** When 2+ React features are stacked, the assembler must remount each into an isolated container (`#root-section-${id}`) so neither fails to mount or overwrites the other.
3. **Viewport-Lock Prevention:** Vault features containing `height: 100vh; overflow: hidden;` on `html, body` must have those rules scoped under `.page-section` so the combined page scrolls naturally.
4. **Theme Color Contrast:** Changing to light themes (e.g., Clean Minimal) must correctly update typography colors and card backdrops so dark-mode-default text remains legible.
5. **Zero-Section Export Guard:** Attempting to export an empty stack must display a helpful prompt to add at least one section rather than producing a corrupt or empty download.

---

## Tasks

### Task 1: Core Assembler Engine & Automated Test Suite

**Files:**
- Create: `scripts/assembler.js`
- Create: `tests/test-assembler.js`

**Interfaces:**
- Produces:
  - `assemblePreviewDocument(sections, themeConfig, featuresData)`: returns full HTML string for sandboxed iframe.
  - `generateExportBundle(sections, themeConfig, featuresData)`: returns `{ 'index.html': string, 'style.css': string, 'script.js': string, 'README.md': string }`.
  - `THEME_PRESETS`: object mapping preset names to color configurations.

- [ ] **Step 1: Write the failing unit tests for the assembler**

In `tests/test-assembler.js`:
```javascript
const assert = require('assert');
const { assemblePreviewDocument, generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');

// Test 1: Empty stack returns valid empty state HTML
const emptyDoc = assemblePreviewDocument([], THEME_PRESETS['midnight-dark'], {});
assert(emptyDoc.includes('Add sections to start previewing'), 'Should show empty state');

// Test 2: Assembling 2 mock sections generates isolated roots
const mockSections = [
  { id: 'sec-1', slug: 'feat-a', html: '<div id="root">A</div>', css: 'body { color: red; }', js: 'console.log("A");' },
  { id: 'sec-2', slug: 'feat-b', html: '<div id="root">B</div>', css: '#root { height: 100vh; }', js: 'console.log("B");' }
];
const fullDoc = assemblePreviewDocument(mockSections, THEME_PRESETS['cyber-glow'], {});
assert(fullDoc.includes('id="root-sec-1"'), 'Section 1 root should be isolated');
assert(fullDoc.includes('id="root-sec-2"'), 'Section 2 root should be isolated');
assert(fullDoc.includes('--preview-accent'), 'Theme variables should be present');

// Test 3: Export bundle contains all 4 files with clear section comments
const bundle = generateExportBundle(mockSections, THEME_PRESETS['midnight-dark'], {});
assert(bundle['index.html'] && bundle['style.css'] && bundle['script.js'] && bundle['README.md']);
assert(bundle['index.html'].includes('<!-- Section: feat-a -->'));
console.log('✅ All assembler unit tests passed!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-assembler.js`  
Expected: FAIL with "Cannot find module '../scripts/assembler.js'"

- [ ] **Step 3: Implement `scripts/assembler.js`**

Implement `scripts/assembler.js` with:
- `THEME_PRESETS`: Midnight Dark, Cyber Glow, Clean Minimal, Warm Editorial, Modern Slate.
- `scopeSectionStyles(css, sectionId)`: Transforms `body, html` rules into `.page-section#${sectionId}` and replaces viewport locking `100vh` with `min-height: auto`.
- `isolateSectionMarkup(html, sectionId)`: Rewrites `id="root"` to `id="root-${sectionId}"`.
- `assemblePreviewDocument(...)`: Assembles a complete HTML5 document with responsive meta, injected CSS variables, scoped stylesheets, structured `<section>` blocks, and safe DOMContentLoaded script wrappers.
- `generateExportBundle(...)`: Formats formatted `index.html` with comments, clean `style.css` with theme tokens, `script.js` with modular runners, and `README.md` project guide.
- CommonJS & Browser export compatibility (`if (typeof module !== 'undefined') module.exports = ...; else window.Assembler = ...;`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-assembler.js`  
Expected: PASS with "✅ All assembler unit tests passed!"

- [ ] **Step 5: Commit**

```bash
git add scripts/assembler.js tests/test-assembler.js
git commit -m "feat(assembler): add core page assembly and export bundling engine with tests"
```

---

### Task 2: Dedicated Builder UI Shell & Catalog Navigation

**Files:**
- Create: `builder.html`
- Create: `builder.css`
- Modify: `index.html:36-54`

**Interfaces:**
- Consumes: `styles.css` (for brand auroras and tokens), `registry.js` (for window.FEATURE_REGISTRY).
- Produces: Complete layout shell with top navigation bar, side-by-side workspace split, active stack panel, preview panel, and modal containers.

- [ ] **Step 1: Write a test verifying builder HTML structure and navigation link**

In `tests/test-builder-dom.js`:
```javascript
const fs = require('fs');
const assert = require('assert');

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('builder.html'), 'index.html must have a link to builder.html');

const builderHtml = fs.readFileSync('builder.html', 'utf8');
assert(builderHtml.includes('id="pageStackList"'), 'Must contain page stack container');
assert(builderHtml.includes('id="previewFrame"'), 'Must contain live preview iframe');
assert(builderHtml.includes('id="themePresetSelect"'), 'Must contain theme preset picker');
assert(builderHtml.includes('id="openDrawerBtn"'), 'Must contain add section button');
assert(builderHtml.includes('id="exportModal"'), 'Must contain export modal');
console.log('✅ Builder DOM validation passed!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-builder-dom.js`  
Expected: FAIL ("no such file or directory, open 'builder.html'")

- [ ] **Step 3: Implement `builder.html`, `builder.css`, and update `index.html` navigation**

- Add a "Page Builder" navigation link button inside `index.html` mode switcher:
  ```html
  <a href="builder.html" class="mode-btn" id="modeBuilderLink" title="Assemble & Preview Web Pages">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
    <span>Page Builder</span>
  </a>
  ```
- Create `builder.html`:
  - Ambient aurora background matching the 21st.local theme.
  - Header: Brand logo, navigation tabs (Catalog Grid, IDE Workbench, Page Builder [active]), Theme presets dropdown/chips, "Custom Theme" toggle with 3 color inputs (`#bgColor`, `#textColor`, `#accentColor`), Viewport mode pills (Desktop, Tablet, Mobile), "Open in Tab" button, and "Export Project" primary button.
  - Workspace: Split layout with `.builder-sidebar` (Stack Manager) and `.builder-viewport` (Live Preview iframe container).
  - Component Picker Drawer markup (`#componentDrawer`) with search input, category filter buttons, and feature grid.
  - Export Modal markup (`#exportModal`) with tabs (Download ZIP, Copy Code, Single HTML).
- Create `builder.css`:
  - Modern dark glassmorphic styling, flexbox split-screen, responsive viewport wrappers, smooth transitions, drag/drop or move button styles.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-builder-dom.js`  
Expected: PASS with "✅ Builder DOM validation passed!"

- [ ] **Step 5: Commit**

```bash
git add builder.html builder.css index.html tests/test-builder-dom.js
git commit -m "feat(ui): add builder.html workspace shell, styling, and catalog navigation link"
```

---

### Task 3: Active Stack Controller & Feature Drawer Component

**Files:**
- Create: `builder.js`
- Test: `tests/test-builder-state.js`

**Interfaces:**
- Consumes: `window.FEATURE_REGISTRY` (from `registry.js`), `scripts/assembler.js`.
- Produces:
  - `BuilderState`: `{ stack: [], theme: 'midnight-dark', customColors: {}, viewport: 'desktop' }`.
  - Methods: `addSection(slug)`, `removeSection(id)`, `moveSection(id, delta)`, `duplicateSection(id)`, `clearStack()`.

- [ ] **Step 1: Write tests for stack management logic**

In `tests/test-builder-state.js`:
```javascript
const assert = require('assert');

// Simulate the BuilderStateManager
const { createStackManager } = require('../scripts/stack-manager.js');
const manager = createStackManager();

manager.addSection('hero-gradient');
manager.addSection('navbar-glass');
assert.strictEqual(manager.getStack().length, 2);

// Reorder: move navbar to top
const navId = manager.getStack()[1].id;
manager.moveSection(navId, -1);
assert.strictEqual(manager.getStack()[0].slug, 'navbar-glass');

// Remove hero
const heroId = manager.getStack()[1].id;
manager.removeSection(heroId);
assert.strictEqual(manager.getStack().length, 1);

console.log('✅ Stack manager state tests passed!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test-builder-state.js`  
Expected: FAIL ("Cannot find module '../scripts/stack-manager.js'")

- [ ] **Step 3: Implement `scripts/stack-manager.js` and integrate into `builder.js`**

- Create `scripts/stack-manager.js` with clean pure state operations (add, remove, move up/down, duplicate, reorder).
- In `builder.js`:
  - Wire up the stack list rendering in `#pageStackList` with drag handles, order indicators, and quick action buttons.
  - Wire up the Component Drawer:
    - Load features from `window.FEATURE_REGISTRY`.
    - Group by categories: "Headers & Nav", "Heroes", "3D & Carousels", "Scroll & Parallax", "Galleries & Grids", "Buttons & UI".
    - Implement live search input filtering by title, slug, and tags.
    - Click "+ Add to Stack" adds item to active stack and triggers preview update.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test-builder-state.js`  
Expected: PASS with "✅ Stack manager state tests passed!"

- [ ] **Step 5: Commit**

```bash
git add scripts/stack-manager.js builder.js tests/test-builder-state.js
git commit -m "feat(builder): implement stack management and component picker drawer"
```

---

### Task 4: Sandboxed Live Preview & Dynamic Theming Engine

**Files:**
- Modify: `builder.js`
- Modify: `builder.css`

**Interfaces:**
- Consumes: `BuilderState`, `assemblePreviewDocument` (from `assembler.js`).
- Produces: Instant live rendering in `#previewFrame` iframe, smooth viewport switching, dynamic CSS variable updates.

- [ ] **Step 1: Write automated test for preview document generator and theme propagation**

In `tests/test-preview-generation.js`:
```javascript
const assert = require('assert');
const { assemblePreviewDocument, THEME_PRESETS } = require('../scripts/assembler.js');

const sections = [
  { id: '1', slug: 'nav', html: '<nav>Logo</nav>', css: 'nav { background: var(--preview-bg); }', js: '' },
  { id: '2', slug: 'hero', html: '<h1>Title</h1>', css: 'h1 { color: var(--preview-text); }', js: '' }
];

const doc = assemblePreviewDocument(sections, THEME_PRESETS['clean-minimal']);
assert(doc.includes('--preview-bg: #ffffff') || doc.includes('--preview-bg: #f8fafc'), 'Light theme background injected');
assert(doc.includes('<nav>Logo</nav>'));
assert(doc.includes('<h1>Title</h1>'));
console.log('✅ Preview generation and theme propagation test passed!');
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node tests/test-preview-generation.js`  
Expected: PASS

- [ ] **Step 3: Connect Live Preview in `builder.js`**

- Fetch feature source files (`features/<slug>/index.html`, `style.css`, `script.js`) using client-side cache to ensure instant assembly.
- Render assembled HTML via `previewFrame.srcdoc = assembledHtml`.
- Add Viewport controls:
  - Desktop: width 100%
  - Tablet: width 768px, centered with frame shadow
  - Mobile: width 375px, centered with frame shadow
- Wire up theme preset dropdown and custom color pickers:
  - Preset select immediately updates active theme variables.
  - When custom color pickers change, dynamically update iframe CSS variables via `postMessage` or `srcdoc` update.
- Implement "Open in New Tab" button: opens a new browser window rendering the assembled HTML via a Blob URL.

- [ ] **Step 4: Verify in terminal that files are valid JS/CSS**

Run: `node -c builder.js && node tests/test-preview-generation.js`  
Expected: Code compiles with zero syntax errors, test passes.

- [ ] **Step 5: Commit**

```bash
git add builder.js builder.css tests/test-preview-generation.js
git commit -m "feat(preview): connect live preview iframe, theme styling, and viewport modes"
```

---

### Task 5: Export Modal, Code Viewers & Project ZIP Generator

**Files:**
- Modify: `builder.js`
- Modify: `builder.html`
- Create: `tests/test-export-generation.js`

**Interfaces:**
- Consumes: `generateExportBundle` (from `assembler.js`), active stack state.
- Produces: Export modal with syntax copy tabs (HTML, CSS, JS), single-file bundle download, and downloadable project ZIP.

- [ ] **Step 1: Write test for export bundle validity and content completeness**

In `tests/test-export-generation.js`:
```javascript
const assert = require('assert');
const { generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');

const sections = [
  { id: 's1', slug: 'minimal-navbar', html: '<nav class="nav">Nav</nav>', css: '.nav { display: flex; }', js: 'console.log("nav");' },
  { id: 's2', slug: 'tilt-hero', html: '<header class="hero">Hero</header>', css: '.hero { padding: 40px; }', js: 'console.log("hero");' }
];

const bundle = generateExportBundle(sections, THEME_PRESETS['midnight-dark']);

// Check index.html
assert(bundle['index.html'].includes('<!DOCTYPE html>'));
assert(bundle['index.html'].includes('<!-- Section: minimal-navbar -->'));
assert(bundle['index.html'].includes('<!-- Section: tilt-hero -->'));
assert(bundle['index.html'].includes('<link rel="stylesheet" href="style.css">'));
assert(bundle['index.html'].includes('<script src="script.js"></script>'));

// Check style.css
assert(bundle['style.css'].includes(':root {'));
assert(bundle['style.css'].includes('--preview-bg'));
assert(bundle['style.css'].includes('.nav {'));

// Check script.js
assert(bundle['script.js'].includes('document.addEventListener("DOMContentLoaded"'));

// Check README.md
assert(bundle['README.md'].includes('minimal-navbar'));
assert(bundle['README.md'].includes('tilt-hero'));
assert(bundle['README.md'].includes('How to Run'));

console.log('✅ Export bundle validation test passed!');
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node tests/test-export-generation.js`  
Expected: PASS

- [ ] **Step 3: Implement Export Modal & ZIP Generator in `builder.js`**

- Include lightweight client-side zip creation (using standard client-side JSZip via local/CDN script or minimal pure-JS zip writer) to bundle `index.html`, `style.css`, `script.js`, and `README.md`.
- Implement Code Copy tabs:
  - Tab 1: `index.html` with syntax container and "Copy HTML" button.
  - Tab 2: `style.css` with syntax container and "Copy CSS" button.
  - Tab 3: `script.js` with syntax container and "Copy JS" button.
  - Tab 4: `Single File (.html)` all-in-one standalone file with "Copy Bundle" and "Download .html" buttons.
- Implement "Download ZIP" primary button triggering browser download of `my-assembled-page.zip`.
- Provide visual "Copied!" feedback tooltip on click.

- [ ] **Step 4: Test export modal logic**

Run: `node -c builder.js && node tests/test-export-generation.js`  
Expected: Zero syntax errors and test passes.

- [ ] **Step 5: Commit**

```bash
git add builder.js builder.html tests/test-export-generation.js
git commit -m "feat(export): add export modal with code copy, single-file bundle, and ZIP download"
```

---

### Task 6: Comprehensive Verification & Regression Testing

**Files:**
- Create: `tests/test-builder-integration.js`

**Interfaces:**
- Runs full suite: registry verification, DOM checks, assembler tests, stack manager tests, and export bundle validation.

- [ ] **Step 1: Write end-to-end integration test**

In `tests/test-builder-integration.js`:
```javascript
const { execSync } = require('child_process');
const assert = require('assert');

console.log('Running test suite...');
execSync('node tests/verify-registry.js', { stdio: 'inherit' });
execSync('node tests/test-assembler.js', { stdio: 'inherit' });
execSync('node tests/test-builder-dom.js', { stdio: 'inherit' });
execSync('node tests/test-builder-state.js', { stdio: 'inherit' });
execSync('node tests/test-export-generation.js', { stdio: 'inherit' });

console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
```

- [ ] **Step 2: Run all tests to verify green status**

Run: `node tests/test-builder-integration.js`  
Expected: PASS with "🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!"

- [ ] **Step 3: Commit**

```bash
git add tests/test-builder-integration.js
git commit -m "test: add master test runner verifying entire page builder system"
```
