const assert = require('assert');
const {
  assemblePreviewDocument,
  generateExportBundle,
  THEME_PRESETS
} = require('../scripts/assembler.js');

console.log('Testing Universal Color Theming Engine...');

const sampleSections = [
  {
    id: 'sec-hero-1',
    slug: 'oklch-ambient-glow-hero',
    html: '<div class="aurora-hero"><h1>Sample Headline</h1><p>Description text</p></div>',
    css: `
      body, html {
        background: #09090b;
        color: #fafafa;
        overflow: hidden;
      }
      .aurora-hero {
        background-color: #000000;
        color: #ffffff;
      }
    `,
    js: ''
  },
  {
    id: 'sec-footer-1',
    slug: 'beam-wordmark-footer',
    html: '<div class="footer-wrap"><h2>Footer Title</h2></div>',
    css: `
      body {
        background: #0b0f19;
        color: #f3f4f6;
      }
    `,
    js: ''
  }
];

const lightTheme = THEME_PRESETS['clean-light'] || {
  id: 'clean-light',
  name: 'Clean Light',
  bg: '#ffffff',
  text: '#09090b',
  accent: '#6366f1',
  cardBg: '#f4f4f5',
  border: '#e4e4e7'
};

// 1. Preview Document Theme Normalization
const previewDoc = assemblePreviewDocument(sampleSections, lightTheme);

// Check CSS variable values in preview document
assert(previewDoc.includes('--preview-bg: #ffffff'), 'Preview must define light theme --preview-bg');
assert(previewDoc.includes('--preview-text: #09090b'), 'Preview must define light theme --preview-text');

// Ensure section wrapper does NOT keep hardcoded background locking it to dark mode
assert(
  !previewDoc.includes('.page-section#sec-hero-1 {\n        background: #09090b;'),
  'Scoped section style must not retain hardcoded #09090b background'
);

// Ensure universal normalization CSS rule exists in head style
assert(
  previewDoc.includes('.page-section {') &&
  previewDoc.includes('background-color: var(--preview-bg)'),
  'Preview document must inject universal theme normalization for .page-section'
);

// 2. Export Bundle Theme Normalization
const bundle = generateExportBundle(sampleSections, lightTheme);
const styleCss = bundle['style.css'];

assert(styleCss.includes('--preview-bg: #ffffff'), 'Exported style.css must define light theme --preview-bg');
assert(
  styleCss.includes('.page-section') &&
  styleCss.includes('background-color: var(--preview-bg)'),
  'Exported style.css must include universal theme normalization'
);

console.log('✅ Universal Color Theming tests passed!');
