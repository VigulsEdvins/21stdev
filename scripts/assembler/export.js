/**
 * The download: the folder (index.html, style.css, script.js, README and the site files) and the single-file page.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { renderSectionOverlayHtml, OVERLAY_ELEMENT_CSS } = (typeof window !== 'undefined' && window.AsmOverlay) || require('./overlay.js');
const { mapPageLinks, anchorNames, menuItems, anchorSpan, ANCHOR_CSS, navLinker, collectOverrides } = (typeof window !== 'undefined' && window.AsmPages) || require('./pages.js');
const { assemblePreviewDocument } = (typeof window !== 'undefined' && window.AsmPreview) || require('./preview.js');
const { fillLangSlots, hasLangSlot, LANG_CSS, LANG_JS } = (typeof window !== 'undefined' && window.AsmLangSlot) || require('./lang-slot.js');
const { LAZY_SECTION_RUNTIME, OFFSCREEN_RUNTIME, REVIEW_RUNTIME, OVERRIDES_RUNTIME, PRELOADER_DISMISS_EXPORT } = (typeof window !== 'undefined' && window.AsmRuntimes) || require('./runtimes.js');
const { scopeSectionStyles, isolateSectionMarkup, isolateSectionScript, extractHeadLinks } = (typeof window !== 'undefined' && window.AsmIsolation) || require('./section-isolation.js');
const { sectionIdentity, pickSource, isPreloaderSection, nativeAttrFor, renderSectionTag } = (typeof window !== 'undefined' && window.AsmParts) || require('./section-parts.js');
const { renderCsp, formDelivery, renderDeployFiles, renderSiteFiles, renderPageHead } = (typeof window !== 'undefined' && window.AsmSiteFiles) || require('./site-files.js');
const { fitScaleCss, sectionSizingStyle, renderResponsiveCss } = (typeof window !== 'undefined' && window.AsmSizing) || require('./sizing.js');
const { generateUniversalThemeStyles, renderNativePaletteCss } = (typeof window !== 'undefined' && window.AsmThemeCss) || require('./theme-css.js');
const { resolveTheme, isDarkTheme, sectionNativeList } = (typeof window !== 'undefined' && window.AsmTheme) || require('./theme.js');
const { escapeHtml } = (typeof window !== 'undefined' && window.AsmUtil) || require('./util.js');

/** Walks the sections once and returns what the exported files are built from. */
function collectExportSections(safeSections, featuresData, options, isDark) {
  const headLinks = new Set();
  const scopedStyleBlocks = [];
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];
  let usesLazy = false;
  const sectionInfoList = [];
  const contentOverrides = collectOverrides(safeSections);
  const anchors = anchorNames(safeSections, featuresData, options.reservedAnchors);
  if (Object.keys(anchors).length) scopedStyleBlocks.push(ANCHOR_CSS);
  const autoNav = navLinker(anchors, options, menuItems(safeSections, anchors, featuresData));

  safeSections.forEach((section, index) => {
    const { id, slug } = sectionIdentity(section, index);
    const title = section.title || (featuresData[slug] && featuresData[slug].name) || slug;
    const rawHtml = pickSource(section, featuresData, slug, 'html');
    const rawCss = pickSource(section, featuresData, slug, 'css');
    const rawJs = pickSource(section, featuresData, slug, 'js');

    sectionInfoList.push({ id, slug, title });

    // Collect external head links
    extractHeadLinks(rawHtml).forEach(link => headLinks.add(link));

    // Scoped CSS
    const scopedCss = scopeSectionStyles(rawCss, id, !!(options.ownPalette || {})[slug], /preloader/i.test(slug));
    if (scopedCss.trim()) {
      scopedStyleBlocks.push(`/* Section: ${slug} */\n${scopedCss.trim()}`);
    }

    const fitCss = fitScaleCss(section, id);
    if (fitCss) scopedStyleBlocks.push(fitCss);

    // Isolated HTML
    const isPreloader = isPreloaderSection(slug, section);
    const preloaderClass = isPreloader ? ' is-preloader' : '';
    // the header's language button stays only on a page that has translations (options.langSwitch); otherwise its slot goes
    const isolatedHtml = fillLangSlots(autoNav(isolateSectionMarkup(rawHtml, id), section), !!options.langSwitch);
    const overlayHtml = renderSectionOverlayHtml(section.elements);
    const sizingStyle = isPreloader ? '' : sectionSizingStyle(section, (options.reserveMap || {})[slug]);
    const styleAttr = sizingStyle ? ` style="${sizingStyle}"` : '';
    const nativeList = sectionNativeList(section, options.nativeMap);
    const nativeAttr = nativeAttrFor(nativeList, slug, options);
    sectionHtmlBlocks.push(renderSectionTag({ slug, id, section, isDark, isPreloader, preloaderClass, nativeList, nativeAttr, styleAttr, anchor: anchorSpan(anchors[id], id), inner: `${isolatedHtml}${overlayHtml}` }));

    // Isolated JS wrapped safely with registering section ID
    const isolatedJs = isolateSectionScript(rawJs, id);
    if (isolatedJs.trim()) {
      const body = isolatedJs.trim().split('\n').map(l => '      ' + l).join('\n');
      if ((options.lazyMap || {})[slug] && !isPreloader) {
        // heavy one-screen section: start it when it is about to scroll into view
        usesLazy = true;
        scriptBlocks.push(`  // Section: ${slug} (starts when it is close to the screen)\n  window.__lazySection(${JSON.stringify(id)}, ${JSON.stringify(slug)}, function () {\n    (function () {\n${body}\n    })();\n  });`);
      } else {
        scriptBlocks.push(`  // Section: ${slug}\n  try {\n    window.__activeSectionRegisteringId = ${JSON.stringify(id)};\n    (function () {\n${body}\n    })();\n  } catch (err) {\n    console.error('Error executing ' + ${JSON.stringify(slug)} + ':', err);\n  } finally {\n    window.__activeSectionRegisteringId = null;\n  }`);
      }
    }
  });

  if (options.langSwitch && sectionHtmlBlocks.some(hasLangSlot)) {
    scopedStyleBlocks.push(`/* Language button */\n${LANG_CSS}`);
    scriptBlocks.push(`  // Language button\n${LANG_JS.split('\n').map(l => '  ' + l).join('\n')}`);
  }

  // Preloader auto-dismiss script for exported bundle
  scriptBlocks.push(PRELOADER_DISMISS_EXPORT);
  return { headLinks, scopedStyleBlocks, sectionHtmlBlocks, scriptBlocks, usesLazy, sectionInfoList, contentOverrides };
}

/** index.html: the page that links style.css and script.js. */
function renderExportIndex(c) {
  const { pageHead, isDark, externalLinksHtml, allHtml } = c;
  return `<!DOCTYPE html>
<html lang="${pageHead.lang}" data-theme="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${pageHead.headTags}
  ${externalLinksHtml ? externalLinksHtml + '\n  ' : ''}<link rel="stylesheet" href="style.css">
</head>
<body data-theme="${isDark ? 'dark' : 'light'}">
${allHtml}
  <script defer src="script.js"></script>
</body>
</html>\n`;
}

/** style.css: the theme, the section styles and the page fonts. */
function renderExportStyles(c) {
  const { pageHead, theme, safeSections, options, allScopedStyles } = c;
  return `/**
 * Assembled Page Styles
 * Bundled by Page Preview Builder
 * Theme: ${theme.name}
 *
 * BRAND VARIABLES: to re-colour the whole site edit --preview-bg, --preview-text and
 * --preview-accent in the :root block below. Every other colour token derives from them.
 */

${generateUniversalThemeStyles(theme)}

/* ==========================================================================
   Section Styles
   ========================================================================== */

${allScopedStyles || '/* No custom section styles */'}

${OVERLAY_ELEMENT_CSS}
${pageHead.css ? `\n/* Page fonts */\n${pageHead.css}\n` : ''}
${renderNativePaletteCss(safeSections, options.nativeMap)}`;
}

/** script.js: page-wide helpers, the section scripts and the optional form and review code. */
function renderExportScript(c, deliveryJs) {
  const { isDark, safeSections, options, allScripts } = c;
  return `/**
 * Assembled Page Scripts
 * Bundled by Page Preview Builder
 */

// Theme-Aware MatchMedia Polyfill for prefers-color-scheme
(function () {
  var origMatchMedia = window.matchMedia;
  window.matchMedia = function (query) {
    if (typeof query === 'string' && query.includes('prefers-color-scheme')) {
      var checkIsDark = function () {
        var attr = document.documentElement.getAttribute('data-theme');
        if (attr) return attr === 'dark';
        var cs = document.documentElement.style.colorScheme;
        if (cs) return cs === 'dark';
        return ${isDark ? 'true' : 'false'};
      };
      var isDarkQuery = query.includes('dark');
      var checkMatches = function () {
        return isDarkQuery ? checkIsDark() : !checkIsDark();
      };
      var listeners = [];
      var mql = {
        get matches() { return checkMatches(); },
        media: query,
        onchange: null,
        addListener: function (fn) { this.addEventListener('change', fn); },
        removeListener: function (fn) { this.removeEventListener('change', fn); },
        addEventListener: function (type, fn) {
          if (type === 'change' && typeof fn === 'function') listeners.push(fn);
        },
        removeEventListener: function (type, fn) {
          listeners = listeners.filter(function (l) { return l !== fn; });
        },
        dispatchEvent: function (e) {
          listeners.forEach(function (fn) { fn(e); });
          return true;
        }
      };
      window.addEventListener('themechange', function () {
        var e = { matches: checkMatches(), media: query };
        if (typeof mql.onchange === 'function') mql.onchange(e);
        listeners.forEach(function (fn) { fn(e); });
      });
      return mql;
    }
    return origMatchMedia ? origMatchMedia.call(window, query) : { matches: false };
  };
})();

// Skip WebGL drawing for canvases scrolled out of view
${OFFSCREEN_RUNTIME}

// Anti-Scroll-Trapping & Cross-Section Wheel Isolation Guard
// (a section's page-level wheel handler only runs while that section is the main one on screen, i.e. covers the middle of the viewport, wherever the pointer is)
(function () {
  var origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'wheel') {
      var target = this;
      var isGlobal = target === window || target === document || target === document.documentElement || target === document.body;
      var secId = window.__activeSectionRegisteringId || null;

      var safeWheel = function (e) {
        if (isGlobal && secId) {
          var sec = document.getElementById(secId);
          if (sec && !(function (box) { var m = window.innerHeight / 2; return box.top <= m && box.bottom >= m; })(sec.getBoundingClientRect())) {
            return;
          }
        }

        var safeEvent = new Proxy(e, {
          get: function (t, prop) {
            if (prop === 'preventDefault') {
              return function () {
                // a component that holds the page on purpose ([data-scroll-pin]) decides for itself when to let go
                var pinned = e.target && e.target.closest && e.target.closest('[data-scroll-pin]');
                if (pinned || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                  e.preventDefault();
                }
              };
            }
            var val = t[prop];
            return typeof val === 'function' ? val.bind(t) : val;
          }
        });

        return listener.call(this, safeEvent);
      };

      return origAdd.call(this, type, safeWheel, options);
    }
    return origAdd.call(this, type, listener, options);
  };
})();

document.addEventListener("DOMContentLoaded", function () {
${allScripts || '  // No section scripts'}
});

// Client content edits made in the builder (headlines, images, links). Change a value here and reload.
${OVERRIDES_RUNTIME}
window.__setOverrides(${JSON.stringify(collectOverrides(safeSections), null, 2)});
${deliveryJs ? '\n// Form messages: sends the form to the place chosen in the builder (see DEPLOY.md, "Contact forms")\n' + deliveryJs + '\n' : ''}${options.review ? '\n// Review copy: lets a reviewer leave comments on the page and send them back as a file\n' + REVIEW_RUNTIME + '\n' : ''}`;
}

/** README.md: what is in the folder and how to use it. */
function renderExportReadme(c) {
  const { pageHead, options, pageOpts, sectionInfoList, contentOverrides } = c;
  const unverifiedLicences = sectionInfoList.filter(sec => (options.licenseMap || {})[sec.slug] === 'unverified');
  return `# Assembled Web Page Project

This standalone web project was created with the **Page Preview Builder**.
It bundles your selected components into a clean, editable, and ready-to-run package with zero mandatory build tools.

## Included Sections (${sectionInfoList.length})

${sectionInfoList.map((s, idx) => `${idx + 1}. **${s.title}** (\`${s.slug}\`) — Container: \`#${s.id}\``).join('\n') || '- No sections assembled yet.'}

${unverifiedLicences.length ? `## Licences to check before delivery

These components were imported from third-party sources and their licence is not verified. Unless a component's own page shows an open licence such as MIT, get the author's written permission before shipping it to a client, or replace it:

${unverifiedLicences.map(s => `- ${s.title} (\`${s.slug}\`)`).join('\n')}

` : ''}## Page Settings

- **Title:** ${pageHead.title}
- **Language:** \`${pageHead.lang}\`
- **Fonts:** ${[pageOpts.fontDisplay && `${pageOpts.fontDisplay} (headings)`, pageOpts.fontBody && `${pageOpts.fontBody} (body)`].filter(Boolean).join(', ') || 'component defaults'}

Change the title, description and favicon in the \`<head>\` of \`index.html\`. Fonts load from Google Fonts via the \`<link>\` tag there and are applied by the \`/* Page fonts */\` rules at the end of \`style.css\`.

## Client Content Edits

${contentOverrides.length ? contentOverrides.map(o => `- \`#${o.section}\` → \`${o.selector}\` (${o.type}): ${o.value.length > 80 ? o.value.slice(0, 77) + '...' : o.value}`).join('\n') + '\n\nThese were edited in the builder and are applied by the `window.__setOverrides([...])` list at the bottom of `script.js`. Edit the values there, or change the markup in `index.html` and delete the matching entry.' : 'No content was overridden in the builder; edit text directly in `index.html`.'}

## Libraries

Some sections bundle GSAP (animation). Its licence (https://gsap.com/standard-license) allows normal website use; read it if you plan to resell the page as part of a design tool.

## Assets

Images, video and fonts used by the components are in \`assets/\`. Keep that folder next to \`index.html\` when you upload the site.

## How to Run

### Option 1: Direct File Access
Double-click \`index.html\` to look at the page. Most sections work this way, but browsers block images used as canvas or WebGL textures on \`file://\` pages, so a few effects stay blank until the site is served (Option 2, or any web host).

### Option 2: Local Static Server (Recommended)
Running through a local web server ensures all relative assets and features function smoothly:

\`\`\`bash
# Using Node.js (npx)
npx serve .

# Or using Python 3
python3 -m http.server 8000
\`\`\`

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Customization Guide

- **Theme Colors & Typography:**
  Open \`style.css\` and modify the CSS variables declared at the top under \`:root\`:
  - \`--preview-bg\`: Main page background color
  - \`--preview-text\`: Default typography and foreground color
  - \`--preview-accent\`: Brand and interactive element accent
  - \`--preview-card-bg\`: Container and card surface color
  - \`--preview-border\`: Subtle divider and outline color

- **Markup & Content:**
  Open \`index.html\`. Each feature is clearly labeled with HTML comments:
  \`\`\`html
  <!-- Section: <slug> -->
  <section class="page-section" id="...">
    ...
  </section>
  \`\`\`
  You can edit headlines, copy, links, and layout directly.

- **Component Scripts:**
  Open \`script.js\`. Each section's execution logic is encapsulated inside its own isolated runner function inside the \`DOMContentLoaded\` listener to prevent variable collision.

## Project Structure

\`\`\`
├── index.html   # Main assembled HTML5 structure
├── style.css    # Global theme variables, base resets & scoped component styles
├── script.js    # Modular JavaScript controllers
└── README.md    # Quickstart and customization documentation
\`\`\`
`;
}

/**
 * Generates an export bundle containing index.html, style.css, script.js, and README.md.
 */
function generateExportBundle(sections, themeConfig, featuresData = {}, options = {}) {
  if (Array.isArray(sections)) sections = mapPageLinks(sections.filter(s => !s.hidden), options.pageLinks);
  const pageHead = renderPageHead(options.page, undefined, { siteFiles: true });
  const theme = resolveTheme(themeConfig);
  const isDark = isDarkTheme(theme);
  const safeSections = Array.isArray(sections) ? sections : [];

  const pageOpts = options.page || {};
  const { headLinks, scopedStyleBlocks, sectionHtmlBlocks, scriptBlocks, usesLazy, sectionInfoList, contentOverrides } = collectExportSections(safeSections, featuresData, options, isDark);

  const externalLinksHtml = Array.from(headLinks).join('\n  ');
  const responsiveCss = renderResponsiveCss(safeSections);
  if (responsiveCss) scopedStyleBlocks.push(responsiveCss);
  const allScopedStyles = scopedStyleBlocks.join('\n\n');
  const allHtml = sectionHtmlBlocks.join('\n\n');
  if (usesLazy) scriptBlocks.unshift(LAZY_SECTION_RUNTIME);
  const allScripts = scriptBlocks.join('\n\n');

  const c = { pageHead, theme, isDark, safeSections, options, pageOpts, externalLinksHtml, allScopedStyles, allHtml, allScripts, sectionInfoList, contentOverrides, featuresData };
  const indexHtml = renderExportIndex(c);
  const styleCss = renderExportStyles(c);

  // Forms: the chosen route for form messages (page settings) is applied to the exported page only, never to the preview
  const fdMod = formDelivery();
  const deliveredIndex = fdMod ? fdMod.prepareHtml(indexHtml, pageOpts) : indexHtml;
  const deliveryJs = fdMod && deliveredIndex !== indexHtml ? fdMod.runtimeJs() : '';

  const scriptJs = renderExportScript(c, deliveryJs);
  const readmeMd = renderExportReadme(c);

  let finalIndex = deliveredIndex;
  let cspNote = '';
  if (options.csp) {
    const fdPage = fdMod ? fdMod.fromPage(pageOpts) : null;
    const customHost = fdPage && fdPage.ok && fdPage.method === 'custom' ? (/^https:\/\/[^/]+/.exec(fdPage.target) || [''])[0] : '';
    const csp = renderCsp(deliveredIndex, scriptJs, { runtimeJs: deliveryJs, formsReady: !!deliveryJs, customHost });
    finalIndex = deliveredIndex.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp.policy)}">`);
    cspNote = `\n## Security policy\n\nindex.html carries a Content-Security-Policy that only lets scripts run from this site${csp.strict ? '' : ' (relaxed because of: ' + csp.reasons.join(', ') + ')'} and from the CDNs this page uses.${csp.narrowConnect ? ' Connections are limited to this site and the form services (FormSubmit, Formspree, Web3Forms, and the own address chosen for the forms): if you later pick another own address for the forms, add its address to \`connect-src\`.' : ''} If you add a new third-party script, add its address to \`script-src\` in the \`<meta http-equiv="Content-Security-Policy">\` tag.\n`;
  }
  return Object.assign({
    'index.html': finalIndex,
    'style.css': styleCss,
    'script.js': scriptJs,
    'README.md': readmeMd + cspNote
  }, renderSiteFiles(pageOpts, options.pageFiles), renderDeployFiles(pageOpts));
}

/**
 * Generates an all-in-one standalone HTML file with inline CSS and JS.
 */
function generateSingleFileBundle(sections, themeConfig, featuresData = {}, options = {}) {
  const doc = assemblePreviewDocument(sections, themeConfig, featuresData, { page: Object.assign({ title: 'Assembled Web Page' }, options.page), nativeMap: options.nativeMap, reserveMap: options.reserveMap, lazyMap: options.lazyMap, ownPalette: options.ownPalette, pageLinks: options.pageLinks, anchors: { reserved: options.reservedAnchors }, keepUnlinkedNav: options.keepUnlinkedNav, langHost: options.langHost });
  const clean = doc.replace(/\s*<div class="section-resize-handle"[^>]*><\/div>/g, '');
  const fd = formDelivery();
  const delivered = fd ? fd.prepareHtml(clean, options.page) : clean;
  if (delivered === clean) return clean;
  return delivered.replace(/<\/body>/i, () => '<script>\n' + fd.runtimeJs() + '\n</script>\n</body>');
}

const api = { generateExportBundle, generateSingleFileBundle };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmExport = api;
})();
