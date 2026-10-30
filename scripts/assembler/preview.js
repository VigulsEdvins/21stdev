/**
 * The live preview document: the empty state, the embedded full-site card and the page the builder shows in its preview frame.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { renderSectionOverlayHtml, OVERLAY_ELEMENT_CSS } = (typeof window !== 'undefined' && window.AsmOverlay) || require('./overlay.js');
const { mapPageLinks, anchorNames, menuItems, anchorSpan, ANCHOR_CSS, navLinker, collectOverrides } = (typeof window !== 'undefined' && window.AsmPages) || require('./pages.js');
const { OFFSCREEN_RUNTIME, OVERRIDES_RUNTIME, PRELOADER_DISMISS_PREVIEW, previewPageScript } = (typeof window !== 'undefined' && window.AsmRuntimes) || require('./runtimes.js');
const { scopeSectionStyles, isolateSectionMarkup, isolateSectionScript, previewSectionScript, extractHeadLinks } = (typeof window !== 'undefined' && window.AsmIsolation) || require('./section-isolation.js');
const { sectionIdentity, pickSource, isPreloaderSection, nativeAttrFor, renderSectionTag } = (typeof window !== 'undefined' && window.AsmParts) || require('./section-parts.js');
const { formDelivery, renderPageHead } = (typeof window !== 'undefined' && window.AsmSiteFiles) || require('./site-files.js');
const { fitScaleCss, sectionSizingStyle, renderResponsiveCss } = (typeof window !== 'undefined' && window.AsmSizing) || require('./sizing.js');
const { generateUniversalThemeStyles, renderNativePaletteCss } = (typeof window !== 'undefined' && window.AsmThemeCss) || require('./theme-css.js');
const { resolveTheme, isDarkTheme, sectionNativeList } = (typeof window !== 'undefined' && window.AsmTheme) || require('./theme.js');

/**
 * Renders the clean empty stack state when no sections are added.
 */
function renderEmptyPreview(theme) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Preview - Empty</title>
  <style id="universal-theme-styles">
    :root {
      --preview-bg: ${theme.bg};
      --preview-text: ${theme.text};
      --preview-accent: ${theme.accent};
      --preview-card-bg: ${theme.cardBg};
      --preview-border: ${theme.border};
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--preview-bg);
      color: var(--preview-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-x: hidden;
    }
    .empty-state {
      text-align: center;
      padding: 48px 32px;
      max-width: 440px;
      margin: 20px;
      background: var(--preview-card-bg);
      border: 1px dashed var(--preview-border);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .empty-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 20px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--preview-accent) 15%, transparent);
      color: var(--preview-accent);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .empty-icon svg {
      width: 28px;
      height: 28px;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 20px;
      font-weight: 600;
      color: var(--preview-text);
      letter-spacing: -0.01em;
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      opacity: 0.75;
      color: var(--preview-text);
    }
  </style>
</head>
<body>
  <div class="empty-state">
    <div class="empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </div>
    <h2>Your Page Stack is Empty</h2>
    <p>Add sections to start previewing your assembled page in real time.</p>
  </div>
  <script>
    window.addEventListener('message', function (event) {
      if (event.source !== window.parent) return; // only the builder that framed this preview may restyle it
      if (event.data && event.data.type === 'UPDATE_THEME' && event.data.theme) {
        var t = event.data.theme;
        var okColour = function (v) { return typeof v === 'string' && /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\\([0-9\\s.,%\\/-]+\\)|[a-zA-Z]{3,20})$/.test(v.trim()) ? v.trim() : ''; };
        t = { bg: okColour(t.bg), text: okColour(t.text), accent: okColour(t.accent), cardBg: okColour(t.cardBg), border: okColour(t.border) };
        if (t.bg) document.documentElement.style.setProperty('--preview-bg', t.bg);
        if (t.text) document.documentElement.style.setProperty('--preview-text', t.text);
        if (t.accent) document.documentElement.style.setProperty('--preview-accent', t.accent);
        if (t.cardBg) document.documentElement.style.setProperty('--preview-card-bg', t.cardBg);
        if (t.border) document.documentElement.style.setProperty('--preview-border', t.border);
        var isDark = t.bg ? (function(hex) {
          hex = String(hex).replace('#', '');
          if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
          var r = parseInt(hex.slice(0, 2), 16) || 0;
          var g = parseInt(hex.slice(2, 4), 16) || 0;
          var b = parseInt(hex.slice(4, 6), 16) || 0;
          return (r * 0.299 + g * 0.587 + b * 0.114) < 70;
        })(t.bg) : true;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
        if (document.body) document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    });
  </script>
</body>
</html>`;
}

/**
 * A full website lives in its own project (served at its `liveSiteUrl`); the vault holds a showcase card for it.
 * In the builder's live preview (options.embedSites) the section shows the real site in a frame instead of the card,
 * so what you see is what that URL serves. The frame is a window of fixed height that scrolls on its own: sites lay
 * themselves out in viewport units, so a frame sized to its content would never settle. Exports keep the card,
 * because the site's files are not part of the page.
 */
function siteEmbedFor(slug, options) {
  if (!options || !options.embedSites) return null;
  let list = options.embedMap;
  if (!list && typeof window !== 'undefined' && Array.isArray(window.FEATURE_REGISTRY)) {
    list = {};
    window.FEATURE_REGISTRY.forEach(f => { if (f.liveSiteUrl && f.category === 'Full Websites') list[f.slug] = { url: f.liveSiteUrl, admin: f.adminUrl || '', title: f.title || f.name || f.slug }; });
  }
  const info = list && list[slug];
  if (!info || !/^\/[A-Za-z0-9._\/-]+$/.test(info.url || '')) return null;
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const admin = info.admin && /^\/[A-Za-z0-9._\/-]+$/.test(info.admin) ? `<a class="fullsite-link" data-href="${esc(info.admin)}" target="_blank" rel="noopener">CMS ↗</a>` : '';
  return {
    html: `<div class="fullsite"><div class="fullsite-bar"><span class="fullsite-name">Full website · ${esc(info.title)}</span><span class="fullsite-links"><a class="fullsite-link" data-href="${esc(info.url)}" target="_blank" rel="noopener">Open live site ↗</a>${admin}</span></div><iframe class="fullsite-frame" data-src="${esc(info.url)}" title="${esc(info.title)}" loading="lazy"></iframe></div>`,
    css: `.fullsite{display:block;width:100%;background:#0b0b0f}.fullsite-bar{display:flex;gap:12px;justify-content:space-between;align-items:center;padding:8px 14px;font:600 12px/1.2 system-ui,sans-serif;color:#d4d4d8 !important;background:#17171d !important;border-bottom:1px solid #2a2a33}.fullsite-name{color:#d4d4d8 !important}.fullsite-links{display:flex;gap:14px}.fullsite-link{color:#a5b4fc !important;text-decoration:none}.fullsite-link:hover{text-decoration:underline}.fullsite-frame{display:block;width:100%;height:88vh;min-height:560px;border:0;background:#fff}`,
    js: `(function(){var origin=window.origin&&window.origin!=='null'?window.origin:'';if(!origin){try{origin=new URL(document.baseURI).origin;}catch(e){}}document.querySelectorAll('.fullsite-link[data-href]').forEach(function(a){a.href=new URL(a.getAttribute('data-href'),origin).href;});document.querySelectorAll('.fullsite-frame[data-src]').forEach(function(f){f.src=new URL(f.getAttribute('data-src'),origin).href;});})();`
  };
}

/** Anchor names, the extra rules the nav needs and the menu filler for the live preview. */
function previewNav(sections, featuresData, options) {
  // the live preview has no anchors; the single-file export does (options.anchors = { reserved: [names that are page keys] })
  const navNames = options.anchors || options.navPreview ? anchorNames(sections, featuresData, options.anchors && options.anchors.reserved) : {};
  const anchors = options.anchors ? navNames : {};
  const styleBlocks = [];
  if (Object.keys(anchors).length) styleBlocks.push('    ' + ANCHOR_CSS);
  // the builder preview shows menu items that go nowhere dimmed instead of leaving them out, and links the ones a section names like the export does
  if (options.navPreview) styleBlocks.push('    .page-section a[data-edv-nav][href="#"], .page-section a[data-edv-nav][href=""] { opacity: .4 !important; text-decoration: line-through !important; }');
  const autoNav = navLinker(navNames, options.navPreview ? Object.assign({}, options, { keepUnlinkedNav: true }) : options, menuItems(sections, navNames, featuresData));

  return { anchors, styleBlocks, autoNav };
}

/** Walks the sections once and returns the head links, style blocks, section markup and scripts of the live preview. */
function collectPreviewSections(sections, featuresData, options, isDark, nav) {
  const { anchors, autoNav } = nav;
  const headLinks = new Set();
  const scopedStyleBlocks = nav.styleBlocks.slice();
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];

  sections.forEach((section, index) => {
    const { id, slug } = sectionIdentity(section, index);
    const embed = section.html === undefined ? siteEmbedFor(slug, options) : null;
    const rawHtml = embed ? embed.html : pickSource(section, featuresData, slug, 'html');
    const rawCss = embed ? embed.css : pickSource(section, featuresData, slug, 'css');
    const rawJs = embed ? embed.js : pickSource(section, featuresData, slug, 'js');

    // Collect external head links
    extractHeadLinks(rawHtml).forEach(link => headLinks.add(link));

    // Scoped CSS
    const scopedCss = scopeSectionStyles(rawCss, id, !!(options.ownPalette || {})[slug], /preloader/i.test(slug));
    if (scopedCss.trim()) {
      scopedStyleBlocks.push(`    /* Section: ${slug} (${id}) */\n    ${scopedCss.trim()}`);
    }

    const fitCss = fitScaleCss(section, id);
    if (fitCss) scopedStyleBlocks.push(`    /* Section: ${slug} (${id}) fit */\n    ${fitCss}`);

    // Isolated HTML
    const isPreloader = isPreloaderSection(slug, section);
    const isSuppressed = isPreloader && (options.suppressPreloader === true || section.suppressPreloader === true);
    const preloaderClass = isPreloader ? (' is-preloader' + (isSuppressed ? ' is-dismissed is-suppressed' : '')) : '';
    const isolatedHtml = autoNav(isolateSectionMarkup(rawHtml, id), section);
    const overlayHtml = renderSectionOverlayHtml(section.elements);
    const sizingStyle = isPreloader ? '' : sectionSizingStyle(section, (options.reserveMap || {})[slug]);
    let styleAttr = sizingStyle ? ` style="${sizingStyle}"` : '';
    if (isPreloader && isSuppressed) {
      styleAttr = ' style="display: none !important; pointer-events: none !important;"';
    }
    const resizeHandleHtml = isPreloader ? '' : `\n    <div class="section-resize-handle" data-resize-section="${id}" title="Drag to adjust height"></div>`;
    const nativeList = sectionNativeList(section, options.nativeMap);
    const nativeAttr = nativeAttrFor(nativeList, slug, options);
    sectionHtmlBlocks.push(renderSectionTag({ slug, id, section, isDark, isPreloader, preloaderClass, nativeList, nativeAttr, styleAttr, anchor: anchorSpan(anchors[id], id), inner: `${isolatedHtml}${overlayHtml}${resizeHandleHtml}` }));

    // Isolated JS wrapped safely with section registering ID
    const isolatedJs = isolateSectionScript(rawJs, id);
    if (isolatedJs.trim()) {
      scriptBlocks.push(previewSectionScript(slug, id, isolatedJs, isPreloader && isSuppressed));
    }
  });

  // Preloader auto-dismiss script (only needed when a preloader is active and not suppressed)
  const hasActivePreloader = sections.some(s => {
    const slug = s.slug || '';
    const cat = s.category || '';
    const isP = slug.includes('preloader') || cat.toLowerCase().includes('preloader');
    return isP && !options.suppressPreloader && !s.suppressPreloader;
  });

  if (hasActivePreloader) {
    scriptBlocks.push(PRELOADER_DISMISS_PREVIEW);
  }
  return { headLinks, scopedStyleBlocks, sectionHtmlBlocks, scriptBlocks };
}

/** The preview document: head, styles, sections and the scripts that start them. */
function renderPreviewDocument(sections, options, theme, isDark, pageHead, parts) {
  const { headLinks, scopedStyleBlocks, sectionHtmlBlocks, scriptBlocks } = parts;
  const externalLinksHtml = Array.from(headLinks).join('\n  ');
  const responsiveCss = renderResponsiveCss(sections);
  if (responsiveCss) scopedStyleBlocks.push(responsiveCss);
  const allScopedStyles = scopedStyleBlocks.join('\n\n');
  const allHtml = sectionHtmlBlocks.join('\n\n');
  const allScripts = scriptBlocks.join('\n\n');

  return `<!DOCTYPE html>
<html lang="${pageHead.lang}" data-theme="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>${OFFSCREEN_RUNTIME}</script>
  ${pageHead.headTags}
  ${externalLinksHtml ? externalLinksHtml + '\n  ' : ''}<style id="universal-theme-styles">
${generateUniversalThemeStyles(theme)}
  </style>
  <style>
${allScopedStyles}

${OVERLAY_ELEMENT_CSS}
${pageHead.css}
${renderNativePaletteCss(sections, options.nativeMap)}
  </style>
</head>
<body data-theme="${isDark ? 'dark' : 'light'}">
${allHtml}
  <script>
${previewPageScript(isDark)}      function initAllSections() {
${allScripts}
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllSections);
      } else {
        initAllSections();
      }
    })();
  </script>
  <script>
${OVERRIDES_RUNTIME}
window.__setOverrides(${JSON.stringify(collectOverrides(sections)).replace(/</g, '\\u003c')});
  </script>${options.formNote && formDelivery() && formDelivery().previewJs(options.page) ? '\n  <script>\n' + formDelivery().previewJs(options.page) + '\n  </script>' : ''}
</body>
</html>`;
}

/**
 * Assembles a complete HTML5 document string for rendering inside the preview iframe.
 */
function assemblePreviewDocument(sections, themeConfig, featuresData = {}, options = {}) {
  if (Array.isArray(sections)) sections = mapPageLinks(sections.filter(s => !s.hidden), options.pageLinks);
  const pageHead = renderPageHead(options.page, 'Page Preview');
  const theme = resolveTheme(themeConfig);
  const isDark = isDarkTheme(theme);
  if (!Array.isArray(sections) || sections.length === 0) {
    return renderEmptyPreview(theme);
  }

  const nav = previewNav(sections, featuresData, options);
  const parts = collectPreviewSections(sections, featuresData, options, isDark, nav);
  return renderPreviewDocument(sections, options, theme, isDark, pageHead, parts);
}

const api = { assemblePreviewDocument };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmPreview = api;
})();
