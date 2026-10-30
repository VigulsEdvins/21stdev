/**
 * Core Assembler Engine
 * Handles sandboxed live preview document generation and clean export bundle packaging.
 * Compatible with Node.js (CommonJS) and browser (window.Assembler).
 */

// Parts of the assembler live in scripts/assembler/*.js (loaded first by builder.html; required in Node).
const { computeSectionSizingStyles, renderResponsiveCss } = (typeof window !== 'undefined' && window.AsmSizing) || require('./assembler/sizing.js');
const { findLocalAssetUrls, rewriteLocalAssetUrls, createZipArchive } = (typeof window !== 'undefined' && window.AsmZip) || require('./assembler/zip.js');
const { THEME_PRESETS, resolveTheme, isDarkTheme } = (typeof window !== 'undefined' && window.AsmTheme) || require('./assembler/theme.js');
const { resolvePageLink, mapPageLinks, anchorNames, menuItems, collectOverrides } = (typeof window !== 'undefined' && window.AsmPages) || require('./assembler/pages.js');
const { renderJsonLd, renderCsp, render404, renderSecurityTxt, SITE_EXTRA_FILES, renderDeployFiles, renderSiteFiles, renderPageHead } = (typeof window !== 'undefined' && window.AsmSiteFiles) || require('./assembler/site-files.js');
const { generateUniversalThemeStyles, applyThemeToDocument, renderNativePaletteCss } = (typeof window !== 'undefined' && window.AsmThemeCss) || require('./assembler/theme-css.js');
const { scopeSectionStyles, isolateSectionMarkup, isolateSectionScript, renderPreviewSectionScripts, extractHeadLinks } = (typeof window !== 'undefined' && window.AsmIsolation) || require('./assembler/section-isolation.js');
const { renderSectionOverlayHtml, OVERLAY_ELEMENT_CSS } = (typeof window !== 'undefined' && window.AsmOverlay) || require('./assembler/overlay.js');
const { REVIEW_RUNTIME } = (typeof window !== 'undefined' && window.AsmRuntimes) || require('./assembler/runtimes.js');
const { assemblePreviewDocument } = (typeof window !== 'undefined' && window.AsmPreview) || require('./assembler/preview.js');
const { generateExportBundle, generateSingleFileBundle } = (typeof window !== 'undefined' && window.AsmExport) || require('./assembler/export.js');

// Module export compatibility (Node.js & Browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    THEME_PRESETS,
    resolveTheme,
    isDarkTheme,
    generateUniversalThemeStyles,
    applyThemeToDocument,
    scopeSectionStyles,
    isolateSectionMarkup,
    isolateSectionScript,
    extractHeadLinks,
    renderSectionOverlayHtml,
    OVERLAY_ELEMENT_CSS,
    assemblePreviewDocument,
    generateExportBundle,
    generateSingleFileBundle,
    renderPageHead,
    renderJsonLd,
    renderSiteFiles,
    renderPreviewSectionScripts,
    renderDeployFiles,
    render404,
    renderSecurityTxt,
    SITE_EXTRA_FILES,
    resolvePageLink,
    mapPageLinks,
    renderCsp,
    renderNativePaletteCss,
    collectOverrides,
    REVIEW_RUNTIME,
    computeSectionSizingStyles,
    renderResponsiveCss,
    findLocalAssetUrls,
    rewriteLocalAssetUrls,
    createZipArchive,
    anchorNames,
    menuItems
  };
}

if (typeof window !== 'undefined') {
  window.Assembler = {
    THEME_PRESETS,
    resolveTheme,
    isDarkTheme,
    generateUniversalThemeStyles,
    applyThemeToDocument,
    scopeSectionStyles,
    isolateSectionMarkup,
    isolateSectionScript,
    extractHeadLinks,
    renderSectionOverlayHtml,
    OVERLAY_ELEMENT_CSS,
    assemblePreviewDocument,
    generateExportBundle,
    generateSingleFileBundle,
    renderPageHead,
    renderJsonLd,
    renderSiteFiles,
    renderDeployFiles,
    SITE_EXTRA_FILES,
    renderPreviewSectionScripts,
    renderNativePaletteCss,
    collectOverrides,
    computeSectionSizingStyles,
    renderResponsiveCss,
    findLocalAssetUrls,
    rewriteLocalAssetUrls,
    createZipArchive,
    anchorNames,
    menuItems
  };
}
