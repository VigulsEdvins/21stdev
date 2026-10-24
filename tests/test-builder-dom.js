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
assert(builderHtml.includes('id="componentDrawer"'), 'Must contain component picker drawer');
assert(builderHtml.includes('id="bgColor"'), 'Must contain bg color input');
assert(builderHtml.includes('id="textColor"'), 'Must contain text color input');
assert(builderHtml.includes('id="accentColor"'), 'Must contain accent color input');
assert(builderHtml.includes('data-viewport="desktop"'), 'Must contain desktop viewport toggle');
assert(builderHtml.includes('data-viewport="tablet"'), 'Must contain tablet viewport toggle');
assert(builderHtml.includes('data-viewport="mobile"'), 'Must contain mobile viewport toggle');

assert(builderHtml.includes('id="loadStarterBtn"'), 'Must contain load starter template button');
assert(builderHtml.includes('id="viewVisualBtn"'), 'Must contain visual view mode toggle button');
assert(builderHtml.includes('id="viewCompactBtn"'), 'Must contain compact view mode toggle button');
assert(builderHtml.includes('data-category="Footers"'), 'Must contain Footers category button');
assert(builderHtml.includes('id="canvasContextMenu"'), 'Must contain canvas context menu');
assert(builderHtml.includes('id="elementEditToolbar"'), 'Must contain element edit toolbar');

const builderCss = fs.readFileSync('builder.css', 'utf8');
assert(builderCss.includes('.clear-search-btn'), 'builder.css must style .clear-search-btn');
assert(builderCss.includes('.drawer-card-preview-box'), 'builder.css must style drawer card previews');
assert(builderCss.includes('.drawer-feature-grid.is-compact'), 'builder.css must style compact drawer mode');
assert(builderCss.includes('.canvas-context-menu'), 'builder.css must style .canvas-context-menu');
assert(builderCss.includes('.element-edit-toolbar'), 'builder.css must style .element-edit-toolbar');

const builderJs = require('./helpers/builder-source.js').readBuilderSource();
assert(builderJs.includes('originalHtml'), 'builder.js must cache originalHtml on addBtn');
assert(builderJs.includes('_restoreTimer'), 'builder.js must manage _restoreTimer on addBtn');
assert(builderJs.includes('loadStarterTemplate'), 'builder.js must contain loadStarterTemplate');
assert(builderJs.includes('STARTER_SECTIONS'), 'builder.js must define STARTER_SECTIONS');
assert(builderJs.includes('drawerPreviewObserver'), 'builder.js must declare lazy drawer preview observer');

const appJs = fs.readFileSync('app.js', 'utf8');
assert(appJs.includes('mode') && appJs.includes('workbench') && appJs.includes('URLSearchParams'), 'app.js must handle ?mode=workbench query parameter');

console.log('✅ Builder DOM validation passed!');
