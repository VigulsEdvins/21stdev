const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createStackManager } = require('../scripts/stack-manager.js');
const { renderSectionOverlayHtml, assemblePreviewDocument, generateExportBundle, THEME_PRESETS } = require('../scripts/assembler.js');
const { WIDGET_CATALOG_ITEMS } = require('../builder.js');

console.log('Testing Individual File & Glass Folder Cards Model & Rendering...');

// -------------------------------------------------------------
// 1. Test renderSectionOverlayHtml with 5 File Cards
// -------------------------------------------------------------
const fileElements = [
  {
    id: 'f-pdf',
    type: 'file-card',
    fileType: 'pdf',
    badge: 'PDF',
    fileName: 'Contract-2026.pdf',
    fileSize: '320 KB',
    x: 20,
    y: 30
  },
  {
    id: 'f-code',
    type: 'file-card',
    fileType: 'code',
    badge: 'CODE',
    fileName: 'app.tsx',
    fileSize: '14 KB',
    x: 40,
    y: 30
  },
  {
    id: 'f-doc',
    type: 'file-card',
    fileType: 'doc',
    badge: 'DOC',
    fileName: 'Project-Brief.docx',
    fileSize: '85 KB',
    x: 60,
    y: 30
  },
  {
    id: 'f-media',
    type: 'card',
    cardType: 'file',
    fileType: 'media',
    badge: 'IMG',
    fileName: 'Hero-Visual.png',
    fileSize: '2.4 MB',
    x: 30,
    y: 60
  },
  {
    id: 'f-zip',
    type: 'file-card',
    fileType: 'zip',
    badge: 'ZIP',
    fileName: 'Source-Bundle.zip',
    fileSize: '48 MB',
    x: 70,
    y: 60
  }
];

const fileHtml = renderSectionOverlayHtml(fileElements);
assert(fileHtml.includes('element-card-file'), 'Must render .element-card-file class');
assert(fileHtml.includes('Contract-2026.pdf'), 'Must render PDF filename');
assert(fileHtml.includes('320 KB'), 'Must render PDF size');
assert(fileHtml.includes('PDF'), 'Must render PDF badge');
assert(fileHtml.includes('app.tsx'), 'Must render Code filename');
assert(fileHtml.includes('14 KB'), 'Must render Code size');
assert(fileHtml.includes('CODE'), 'Must render CODE badge');
assert(fileHtml.includes('Project-Brief.docx'), 'Must render Word doc filename');
assert(fileHtml.includes('Hero-Visual.png'), 'Must render media filename');
assert(fileHtml.includes('Source-Bundle.zip'), 'Must render zip filename');

// -------------------------------------------------------------
// 2. Test renderSectionOverlayHtml with 3 Glass Folder Cards
// -------------------------------------------------------------
const folderElements = [
  {
    id: 'fld-aurora',
    type: 'folder-card',
    art: 'aurora',
    label: 'Aurora Project',
    badge: 'AURORA',
    itemCount: '12 items',
    x: 25,
    y: 40
  },
  {
    id: 'fld-archive',
    type: 'card',
    cardType: 'folder',
    art: 'dusk',
    label: 'Production Archives',
    badge: 'ARCHIVE',
    itemCount: '48 items',
    x: 50,
    y: 40
  },
  {
    id: 'fld-ember',
    type: 'folder-card',
    art: 'ember',
    label: 'Creative Vault',
    badge: 'EMBER',
    itemCount: '24 items',
    x: 75,
    y: 40
  }
];

const folderHtml = renderSectionOverlayHtml(folderElements);
assert(folderHtml.includes('element-card-folder'), 'Must render .element-card-folder class');
assert(folderHtml.includes('Aurora Project'), 'Must render Aurora Project label');
assert(folderHtml.includes('folder-art-aurora') || folderHtml.includes('aurora'), 'Must render aurora art theme');
assert(folderHtml.includes('AURORA'), 'Must render AURORA badge');
assert(folderHtml.includes('Production Archives'), 'Must render Production Archives label');
assert(folderHtml.includes('ARCHIVE'), 'Must render ARCHIVE badge');
assert(folderHtml.includes('Creative Vault'), 'Must render Creative Vault label');
assert(folderHtml.includes('EMBER'), 'Must render EMBER badge');

// -------------------------------------------------------------
// 3. Test generateExportBundle & Preview Document
// -------------------------------------------------------------
const sm = createStackManager();
const sec = sm.addSection('hero-section');
sm.addElement(sec.id, fileElements[0]);
sm.addElement(sec.id, folderElements[0]);

const previewDoc = assemblePreviewDocument(sm.getStack(), THEME_PRESETS['midnight-dark']);
assert(previewDoc.includes('element-card-file'), 'Preview document must contain element-card-file');
assert(previewDoc.includes('element-card-folder'), 'Preview document must contain element-card-folder');

const bundle = generateExportBundle(sm.getStack(), THEME_PRESETS['midnight-dark']);
const indexHtml = bundle['index.html'];
const styleCss = bundle['style.css'];

assert(indexHtml.includes('element-card-file'), 'Export index.html must retain element-card-file');
assert(indexHtml.includes('element-card-folder'), 'Export index.html must retain element-card-folder');
assert(styleCss.includes('.element-card-file'), 'Export style.css must style .element-card-file');
assert(styleCss.includes('.element-card-folder'), 'Export style.css must style .element-card-folder');

// -------------------------------------------------------------
// 4. Test builder.js WIDGET_CATALOG_ITEMS Registration
// -------------------------------------------------------------
assert(Array.isArray(WIDGET_CATALOG_ITEMS), 'WIDGET_CATALOG_ITEMS must be an array');

const expectedCardIds = [
  'card-file-pdf',
  'card-file-code',
  'card-file-doc',
  'card-file-media',
  'card-file-zip',
  'card-folder-aurora',
  'card-folder-archive',
  'card-folder-ember'
];

for (const id of expectedCardIds) {
  const item = WIDGET_CATALOG_ITEMS.find(w => w.id === id);
  assert(item, `Widget item ${id} must be registered in WIDGET_CATALOG_ITEMS`);
  assert.strictEqual(item.isWidget, true, `${id} must have isWidget: true`);
  assert.strictEqual(item.category, 'Cards & Tiles', `${id} must belong to category 'Cards & Tiles'`);
  assert(item.previewHtml && item.previewHtml.length > 0, `${id} must have previewHtml`);
  assert(item.elData && typeof item.elData === 'object', `${id} must have elData object`);
  assert(Array.isArray(item.tags) && item.tags.length > 0, `${id} must have tags array`);
}

console.log('✅ All individual file & glass folder card tests passed successfully!');
