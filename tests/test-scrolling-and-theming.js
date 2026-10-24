const assert = require('assert');
const fs = require('fs');
const {
  assemblePreviewDocument,
  generateExportBundle,
  scopeSectionStyles,
  applyThemeToDocument,
  resolveTheme,
  isDarkTheme,
  THEME_PRESETS
} = require('../scripts/assembler.js');

console.log('Testing Scrolling Isolation & Universal Color Theming...');

// ---------------------------------------------------------------------------
// 1. Wheel and Scroll Hijacking Protections
// ---------------------------------------------------------------------------
console.log('  1. Testing wheel and scrolling protections in preview and export...');

// Mock section that tries to steal wheel and call preventDefault()
const hijackingSections = [
  {
    id: 'sec-trap-1',
    slug: 'conveyor-scroll-loop',
    html: '<div id="about-content" class="conv-stage"><div class="conv-block">Conveyor Block</div></div>',
    css: '.conv-stage { height: 100vh; overflow: hidden; } .conv-orb { position: absolute; }',
    js: `
      window.addEventListener('wheel', (e) => {
        e.preventDefault();
      }, { passive: false });
    `
  },
  {
    id: 'sec-normal-2',
    slug: 'standard-content',
    html: '<div class="content-stage"><h2>Standard Content</h2></div>',
    css: '.content-stage { padding: 40px; }',
    js: 'console.log("Section 2 active");'
  }
];

const previewDoc = assemblePreviewDocument(hijackingSections, THEME_PRESETS['midnight-dark']);

// Verify Anti-Scroll-Trapping Guard is present in preview
assert(
  previewDoc.includes('Anti-Scroll-Trapping & Cross-Section Wheel Isolation Guard'),
  'Preview document must inject Anti-Scroll-Trapping & Cross-Section Wheel Isolation Guard'
);

// Verify activeSectionRegisteringId tagging is present in preview
assert(
  previewDoc.includes('window.__activeSectionRegisteringId = "sec-trap-1";'),
  'Preview script runner must set __activeSectionRegisteringId for section 1'
);
assert(
  previewDoc.includes('window.__activeSectionRegisteringId = "sec-normal-2";'),
  'Preview script runner must set __activeSectionRegisteringId for section 2'
);

// Verify exported bundle also includes the guard in script.js
const exportBundle = generateExportBundle(hijackingSections, THEME_PRESETS['midnight-dark']);
const exportedScript = exportBundle['script.js'];
assert(
  exportedScript.includes('Anti-Scroll-Trapping & Cross-Section Wheel Isolation Guard'),
  'Exported script.js must include Anti-Scroll-Trapping Guard'
);
assert(
  exportedScript.includes('window.__activeSectionRegisteringId = "sec-trap-1";'),
  'Exported script.js must isolate wheel events by registering section ID'
);

// Verify individual feature fixes
const convOrbCss = fs.readFileSync('features/conveyor-scroll-loop/style.css', 'utf8');
assert(
  !convOrbCss.includes('position: fixed;') && convOrbCss.includes('position: absolute;'),
  'conveyor-scroll-loop .conv-orb must be position: absolute, not position: fixed'
);

const vivHudCss = fs.readFileSync('features/parallax-5col-gallery/style.css', 'utf8');
assert(
  !vivHudCss.includes('position: fixed;') && vivHudCss.includes('position: absolute;'),
  'parallax-5col-gallery .viv-hud must be position: absolute, not position: fixed'
);

const convJs = fs.readFileSync('features/conveyor-scroll-loop/script.js', 'utf8');
assert(
  !convJs.includes("window.addEventListener(\n    'wheel'") && !convJs.includes("window.addEventListener('wheel'"),
  'conveyor-scroll-loop script.js must not bind wheel to window'
);

const timelineJs = fs.readFileSync('features/timeline-inertia-drag/script.js', 'utf8');
assert(
  !timelineJs.includes("window.addEventListener(\n    'wheel'") && !timelineJs.includes("window.addEventListener('wheel'"),
  'timeline-inertia-drag script.js must not bind wheel to window'
);

// ---------------------------------------------------------------------------
// 2. Universal Color Theming & Dynamic Light/Dark Adaptation
// ---------------------------------------------------------------------------
console.log('  2. Testing universal color theming & dynamic adaptation...');

const lightTheme = resolveTheme('clean-light');
assert.strictEqual(isDarkTheme(lightTheme), false, 'clean-light must be detected as light theme');

const darkTheme = resolveTheme('midnight-dark');
assert.strictEqual(isDarkTheme(darkTheme), true, 'midnight-dark must be detected as dark theme');

// Test scopeSectionStyles conversion of hardcoded white/black text
const darkDesignedCss = `
  .hero-title { color: #ffffff; }
  .hero-sub { color: #fafafa; }
  .faint-text { color: rgba(255, 255, 255, 0.6); }
  .card-box { background-color: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.1); }
`;
const scopedResult = scopeSectionStyles(darkDesignedCss, 'test-sec');

assert(
  scopedResult.includes('.hero-title { color: var(--preview-text); }'),
  'Hardcoded #ffffff must be replaced with var(--preview-text)'
);
assert(
  scopedResult.includes('.hero-sub { color: var(--preview-text); }'),
  'Hardcoded #fafafa must be replaced with var(--preview-text)'
);
assert(
  scopedResult.includes('color-mix(in srgb, var(--preview-text) calc(0.6 * 100%), transparent)'),
  'Translucent white text must be replaced with dynamic color-mix'
);
assert(
  scopedResult.includes('background-color: var(--preview-bg)'),
  'Dark background #0b0f19 must be replaced with var(--preview-bg)'
);

// Test preview document theming metadata
const lightPreview = assemblePreviewDocument(hijackingSections, lightTheme);
assert(
  lightPreview.includes('data-theme="light"'),
  'Light theme preview must set data-theme="light" on html and body'
);
assert(
  lightPreview.includes('<style id="universal-theme-styles">'),
  'Preview document must have an identifiable <style id="universal-theme-styles"> tag'
);
assert(
  lightPreview.includes('color-scheme: light'),
  'Light theme must set color-scheme: light'
);

const darkPreview = assemblePreviewDocument(hijackingSections, darkTheme);
assert(
  darkPreview.includes('data-theme="dark"'),
  'Dark theme preview must set data-theme="dark"'
);
assert(
  darkPreview.includes('color-scheme: dark'),
  'Dark theme must set color-scheme: dark'
);

// ---------------------------------------------------------------------------
// 3. Testing applyThemeToDocument runtime execution
// ---------------------------------------------------------------------------
console.log('  3. Testing applyThemeToDocument DOM mutation engine...');

// Create mock document
const mockStyleEl = { textContent: '', id: 'universal-theme-styles' };
const mockRoot = {
  style: {
    properties: {},
    setProperty(k, v) { this.properties[k] = v; },
    colorScheme: ''
  },
  attributes: {},
  setAttribute(k, v) { this.attributes[k] = v; }
};
const mockBody = {
  attributes: {},
  setAttribute(k, v) { this.attributes[k] = v; }
};
const mockSections = [
  { style: { backgroundColor: '', color: '' } },
  { style: { backgroundColor: '', color: '' } }
];

const mockDoc = {
  head: {
    firstChild: mockStyleEl,
    insertBefore() {}
  },
  getElementById(id) {
    if (id === 'universal-theme-styles') return mockStyleEl;
    return null;
  },
  documentElement: mockRoot,
  body: mockBody,
  querySelectorAll(sel) {
    if (sel.includes('.page-section')) return mockSections;
    return [];
  }
};

// Apply light theme
applyThemeToDocument(mockDoc, lightTheme);

assert.strictEqual(mockRoot.attributes['data-theme'], 'light', 'documentElement must have data-theme="light"');
assert.strictEqual(mockBody.attributes['data-theme'], 'light', 'body must have data-theme="light"');
assert.strictEqual(mockRoot.style.colorScheme, 'light', 'root colorScheme must be light');
assert.strictEqual(mockRoot.style.properties['--preview-bg'], lightTheme.bg, '--preview-bg must match light theme bg');
assert.strictEqual(mockRoot.style.properties['--preview-text'], lightTheme.text, '--preview-text must match light theme text');
assert.strictEqual(mockRoot.style.properties['--background'], lightTheme.bg, '--background token must be updated');
assert.strictEqual(mockRoot.style.properties['--foreground'], lightTheme.text, '--foreground token must be updated');
assert.strictEqual(mockRoot.style.properties['--card-bg'], lightTheme.cardBg, '--card-bg token must be updated');
assert(mockStyleEl.textContent.includes('--preview-bg: ' + lightTheme.bg), 'Universal theme styles element must be updated');

// Verify section background mutation
mockSections.forEach((sec, idx) => {
  assert.strictEqual(sec.style.backgroundColor, lightTheme.bg, `Section ${idx + 1} background must update to lightTheme.bg`);
  assert.strictEqual(sec.style.color, lightTheme.text, `Section ${idx + 1} text color must update to lightTheme.text`);
});

// Apply dark theme
applyThemeToDocument(mockDoc, darkTheme);
assert.strictEqual(mockRoot.attributes['data-theme'], 'dark', 'documentElement must switch to data-theme="dark"');
assert.strictEqual(mockRoot.style.colorScheme, 'dark', 'root colorScheme must switch to dark');
assert.strictEqual(mockRoot.style.properties['--preview-bg'], darkTheme.bg, '--preview-bg must match dark theme bg');

console.log('✅ ALL SCROLLING ISOLATION & UNIVERSAL COLOR THEMING TESTS PASSED!');
