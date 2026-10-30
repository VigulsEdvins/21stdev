/**
 * Section isolation for the assembler: scopes a section's CSS, markup and script to its own id so sections cannot affect each other, and picks the head links out of a section.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { isDarkHex } = (typeof window !== 'undefined' && window.AsmTheme) || require('./theme.js');

/**
 * Scopes section styles:
 * - Transforms html, body selectors into .page-section#${sectionId}
 * - Replaces viewport locking 100vh with min-height: auto
 * - Scopes #root selectors to #root-${sectionId}
 */
function scopeSectionStyles(css, sectionId, keepPalette, keepViewport) {
  if (!css || typeof css !== 'string') return '';
  let scoped = css;

  // 1. Rewrite :root selector to section container so component root variables don't pollute global document
  scoped = scoped.replace(/(?<![a-zA-Z0-9_-]):root(?![a-zA-Z0-9_-])/g, `.page-section#${sectionId}`);

  // 2. Rewrite universal * selectors so margin/padding resets do not bleed across the entire page,
  // (only a `*` that starts a selector: not `calc(a * b)` and not `.card > *`, where it already sits inside a selector)
  // using :where() to preserve (0, 0, 0) specificity so component class styles (padding, margin) are never overridden!
  scoped = scoped.replace(/(?<=(?:^|[,{}])\s*)\*(?=\s*[,{:])/g, `:where(.page-section#${sectionId}) *`);

  // 3. Replace html, body or body, html compound selectors
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])(html\s*,\s*body|body\s*,\s*html)(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);

  // 4. Replace standalone body, html, or main selectors
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])body(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])html(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])main(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);

  // 5. Rewrite #root to #root-${sectionId}
  scoped = scoped.replace(/(?<![a-zA-Z0-9_-])#root(?![a-zA-Z0-9_-])/g, `#root-${sectionId}`);

  // 6. Replace viewport locking 100vh on height with responsive section height that never collapses
  // (a preloader overlay is meant to fill the whole viewport, so its 100vh rules stay as they are)
  // (a pinned or fixed element, such as the stage of a scroll-driven section, is meant to be exactly one screen tall: it keeps its 100vh)
  if (!keepViewport) {
  scoped = scoped.replace(/\{([^{}]*)\}/g, (match, body) => {
    if (/position\s*:\s*(?:sticky|fixed)/i.test(body)) return match;
    const next = body
      .replace(/(?<![a-zA-Z0-9_-])height\s*:\s*(?:100vh|100svh|100dvh)(\s*!important)?/gi, 'min-height: auto$1; min-height: clamp(680px, 90vh, 1000px)$1; height: auto$1')
      .replace(/(?<![a-zA-Z0-9_-])min-height\s*:\s*(?:100vh|100svh|100dvh)(\s*!important)?/gi, 'min-height: clamp(680px, 90vh, 1000px)$1');
    return '{' + next + '}';
  });
  }

  // 7. Clean up viewport-locking rules on .page-section container inherited from html, body
  scoped = scoped.replace(new RegExp(`(\\.page-section#${sectionId}[^{]*\\{[^}]*?\\b)height\\s*:\\s*(?:100%|100vh|100svh|100dvh)(?![a-zA-Z0-9_-])`, 'gi'), '$1min-height: auto; height: auto');

  // A component with its own fixed palette keeps every colour it declares: the normalizer below would turn its
  // inks and dark backgrounds into the page theme's text and background colours and make its text unreadable.
  if (keepPalette) return scoped;

  // 8. Universal color normalizer: replace hardcoded dark backgrounds on container with var(--preview-bg)
  scoped = scoped.replace(
    new RegExp(`(\\.page-section#${sectionId}[^{]*\\{[^}]*?\\bbackground(?:-color)?\\s*:\\s*)(#[0-9a-fA-F]{3,8}|black)\\b`, 'gi'),
    (match, prop, hex) => hex === 'black' || isDarkHex(hex) ? `${prop}var(--preview-bg)` : match
  );

  // Replace background: black / #000 / #050505 etc with var(--preview-bg) on root-like selectors
  scoped = scoped.replace(
    /(background(?:-color)?\s*:\s*)(#[0-9a-fA-F]{3,8})\b/gi,
    (match, prop, hex) => isDarkHex(hex) ? `${prop}var(--preview-bg)` : match
  );
  scoped = scoped.replace(
    /(?<![a-zA-Z0-9_-])background(?:-color)?\s*:\s*(?:black|#000|#000000|#050505|#08080a|#09090b|#0a0a0c|#0b0f19|#0d0e12|#0f172a|#141413|#18181b|#111111|#111|#121212|#1a1a1a)\b/gi,
    'background-color: var(--preview-bg)'
  );

  // Replace CSS variable dark backgrounds (e.g. --pl-bg, --bg-color, --g, --ib-page)
  scoped = scoped.replace(
    /(--[a-zA-Z0-9_-]*(?:bg|background|ground|page)\s*:\s*)(#[0-9a-fA-F]{3,8})\b/gi,
    (match, prop, hex) => isDarkHex(hex) ? `${prop}var(--preview-bg)` : match
  );

  // Replace hardcoded light text colors with var(--preview-text) so they adapt to light themes
  scoped = scoped.replace(
    /(?<![a-zA-Z0-9_-])color\s*:\s*(?:#ffffff|#fff|#fafafa|#f4f4f5|#f8fafc|#ececf1|#e4e4e7|#eeeeee|#eee|#f4f1ea)\b/gi,
    'color: var(--preview-text)'
  );

  // Replace translucent light text colors with dynamic color-mix so text remains legible in both themes
  scoped = scoped.replace(
    /(?<![a-zA-Z0-9_-])color\s*:\s*rgba\(\s*(?:255|250|244)\s*,\s*(?:255|250|241|244)\s*,\s*(?:255|250|234|245)\s*,\s*(0?\.[0-9]+)\)/gi,
    'color: color-mix(in srgb, var(--preview-text) calc($1 * 100%), transparent)'
  );

  // Replace CSS variable text colors with var(--preview-text)
  scoped = scoped.replace(
    /(--[a-zA-Z0-9_-]*(?:text|ink|fg|foreground)\s*:\s*)(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\b/gi,
    '$1var(--preview-text)'
  );

  // Replace hardcoded light text colors on section container with var(--preview-text)
  scoped = scoped.replace(
    new RegExp(`(\\.page-section#${sectionId}[^{]*\\{[^}]*?\\bcolor\\s*:\\s*)(?:#ffffff|#fff|#fafafa|#f3f4f6|#e4e4e7|#eeeeee|#eee|#f4f1ea)\\b`, 'gi'),
    '$1var(--preview-text)'
  );

  return scoped;
}

/**
 * Isolates section markup:
 * - Extracts inner body content if full HTML document is provided
 * - Removes local style.css and script.js references
 * - Rewrites id="root" into id="root-${sectionId}"
 */
function isolateSectionMarkup(html, sectionId) {
  if (!html || typeof html !== 'string') return '';
  let content = html;

  // Extract body content if present
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  } else {
    // Strip doctype and html/head tags
    content = content
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '');
  }

  // Remove local style.css and script.js references
  content = content
    .replace(/<link[^>]*href=["'](?:\.\/)?style\.css["'][^>]*>/gi, '')
    .replace(/<script[^>]*src=["'](?:\.\/)?script\.js["'][^>]*>\s*<\/script>/gi, '');

  // Rewrite id="root" to id="root-${sectionId}"
  content = content.replace(/\bid\s*=\s*(["'])root\1/gi, `id="root-${sectionId}"`);
  content = content.replace(/\bid\s*=\s*root(?=[\s>])/gi, `id="root-${sectionId}"`);

  return content.trim();
}

/**
 * Scopes JavaScript execution for React root mounting:
 * Rewrites document.getElementById('root') / querySelector('#root') to root-${sectionId}
 */
function isolateSectionScript(js, sectionId) {
  if (!js || typeof js !== 'string') return '';
  let isolated = js;

  // Replace getElementById("root"), getElementById('root'), or getElementById(`root`)
  isolated = isolated.replace(/(getElementById\s*\(\s*["'`])root(["'`]\s*\))/g, `$1root-${sectionId}$2`);

  // Replace querySelector("#root"), querySelector('#root'), or querySelector(`#root`)
  isolated = isolated.replace(/(querySelector(?:All)?\s*\(\s*["'`])#root(["'`]\s*\))/g, `$1#root-${sectionId}$2`);

  return isolated;
}

/** One section's script as the preview runs it (also used to start a section added to a loaded preview). */
function previewSectionScript(slug, id, isolatedJs, suppressed) {
  if (suppressed) return `        // Section: ${slug} (${id}) [PRELOADER SUPPRESSED IN PREVIEW - WILL RUN ON REPLAY OR EXPORT]`;
  return `        // Section: ${slug} (${id})
        try {
          window.__activeSectionRegisteringId = ${JSON.stringify(id)};
          (function () {
${isolatedJs.trim().split('\n').map(l => '            ' + l).join('\n')}
          })();
        } catch (err) {
          console.error('Error in section ' + ${JSON.stringify(slug)} + ':', err);
        } finally {
          window.__activeSectionRegisteringId = null;
        }`;
}

/** Scripts for the given sections only, ready to run in an already loaded preview. */
function renderPreviewSectionScripts(sections, featuresData = {}) {
  return sections.map((section) => {
    const slug = section.slug;
    const rawJs = section.js !== undefined ? section.js : (featuresData[slug] && featuresData[slug].js) || '';
    const js = isolateSectionScript(rawJs, section.id);
    return js.trim() ? previewSectionScript(slug, section.id, js, false) : '';
  }).filter(Boolean).join('\n\n');
}

/**
 * Extracts non-local head links (e.g., Google Fonts, external CDN stylesheets).
 */
function extractHeadLinks(html) {
  if (!html || typeof html !== 'string') return [];
  const matches = [];
  const linkRegex = /<link\b[^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    if (/href=["'](?:\.\/)?style\.css["']/i.test(tag)) continue;
    matches.push(tag);
  }
  return matches;
}

const api = { scopeSectionStyles, isolateSectionMarkup, isolateSectionScript, previewSectionScript, renderPreviewSectionScripts, extractHeadLinks };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmIsolation = api;
})();
