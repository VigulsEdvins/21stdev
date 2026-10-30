/**
 * Core Assembler Engine
 * Handles sandboxed live preview document generation and clean export bundle packaging.
 * Compatible with Node.js (CommonJS) and browser (window.Assembler).
 */

const THEME_PRESETS = {
  'midnight-dark': {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    bg: '#0b0f19',
    text: '#f3f4f6',
    accent: '#6366f1',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  'cyber-glow': {
    id: 'cyber-glow',
    name: 'Cyber Glow',
    bg: '#050508',
    text: '#e0f2fe',
    accent: '#06b6d4',
    cardBg: 'rgba(6, 182, 212, 0.05)',
    border: 'rgba(6, 182, 212, 0.2)'
  },
  'clean-minimal': {
    id: 'clean-minimal',
    name: 'Clean Minimal',
    bg: '#ffffff',
    text: '#0f172a',
    accent: '#2563eb',
    cardBg: '#f8fafc',
    border: '#e2e8f0'
  },
  'warm-editorial': {
    id: 'warm-editorial',
    name: 'Warm Editorial',
    bg: '#fbf8f3',
    text: '#292524',
    accent: '#ea580c',
    cardBg: '#f5efe6',
    border: '#e7ded1'
  },
  'modern-slate': {
    id: 'modern-slate',
    name: 'Modern Slate',
    bg: '#0f172a',
    text: '#f8fafc',
    accent: '#38bdf8',
    cardBg: '#1e293b',
    border: '#334155'
  }
};

/**
 * Normalizes theme configuration from preset name or custom color object.
 */
function resolveTheme(themeConfig) {
  if (typeof themeConfig === 'string') {
    if (themeConfig === 'clean-light' || themeConfig === 'light') return THEME_PRESETS['clean-minimal'];
    return THEME_PRESETS[themeConfig] || THEME_PRESETS['midnight-dark'];
  }
  if (themeConfig && typeof themeConfig === 'object') {
    return {
      id: themeConfig.id || 'custom',
      name: themeConfig.name || 'Custom Theme',
      bg: themeConfig.bg || themeConfig['--preview-bg'] || '#0b0f19',
      text: themeConfig.text || themeConfig['--preview-text'] || '#f3f4f6',
      accent: themeConfig.accent || themeConfig['--preview-accent'] || '#6366f1',
      cardBg: themeConfig.cardBg || themeConfig['--preview-card-bg'] || 'rgba(255, 255, 255, 0.04)',
      border: themeConfig.border || themeConfig['--preview-border'] || 'rgba(255, 255, 255, 0.1)'
    };
  }
  return THEME_PRESETS['midnight-dark'];
}

/**
 * Checks whether a hex color string represents a dark color (luminance < 70).
 */
function isDarkHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length >= 6) {
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    return (r * 0.299 + g * 0.587 + b * 0.114) < 70;
  }
  return false;
}

/**
 * Checks whether a theme represents a dark theme.
 */
function isDarkTheme(theme) {
  if (!theme || !theme.bg) return true;
  return isDarkHex(theme.bg);
}

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the draggable overlay elements for a section.
 */
function renderSectionOverlayHtml(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '';

  const elementHtmls = elements.map(el => {
    const id = escapeHtml(String(el.id || 'el'));
    const left = typeof el.x === 'number' ? `${el.x}%` : '50%';
    const top = typeof el.y === 'number' ? `${el.y}%` : '50%';
    let styleAttr = `left: ${left}; top: ${top};`;
    if (el.width !== undefined && el.width !== null && el.width !== '') {
      styleAttr += ` width: ${typeof el.width === 'number' ? el.width + 'px' : escapeHtml(String(el.width))};`;
    }
    if (el.height !== undefined && el.height !== null && el.height !== '') {
      styleAttr += ` height: ${typeof el.height === 'number' ? el.height + 'px' : escapeHtml(String(el.height))};`;
    }

    if (el.type === 'table') {
      const tableType = el.tableType || 'pricing';
      const title = el.title || 'Pro Plan';
      const price = el.price || '$29/mo';
      const features = Array.isArray(el.features) ? el.features : ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'];
      const ctaText = el.ctaText || 'Get Started';
      const ctaLink = el.ctaLink || '#';

      if (tableType === 'comparison') {
        const headers = Array.isArray(el.headers) ? el.headers : ['Feature', 'Free', 'Pro'];
        const rows = Array.isArray(el.rows) ? el.rows : [
          ['Storage', '5 GB', '500 GB'],
          ['Bandwidth', '10 GB/mo', 'Unlimited'],
          ['Support', 'Community', '24/7 Priority']
        ];
        return `      <div class="canvas-element element-table element-table-comparison" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <table class="canvas-matrix-table">
          <thead>
            <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map((cell, idx) => `<td>${idx === 0 ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>`;
      }

      // Default: pricing table card
      return `      <div class="canvas-element element-table element-table-pricing" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="pricing-card-header">
          <div class="pricing-card-title">${escapeHtml(title)}</div>
          <div class="pricing-card-price">${escapeHtml(price)}</div>
        </div>
        <ul class="pricing-card-features">
          ${features.map(f => `<li><span class="feature-check">✓</span> ${escapeHtml(f)}</li>`).join('\n          ')}
        </ul>
        <a href="${escapeHtml(ctaLink)}" class="pricing-card-cta">${escapeHtml(ctaText)}</a>
      </div>`;
    }

    if (el.type === 'file-card' || el.cardType === 'file') {
      const fileType = el.fileType || 'pdf';
      const fileName = el.fileName || el.name || el.title || 'Document.pdf';
      const fileSize = el.fileSize || el.size || el.meta || '240 KB';
      const badge = el.badge || fileType.toUpperCase();
      let iconSvg = '';
      if (fileType === 'pdf') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>';
      } else if (fileType === 'code') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      } else if (fileType === 'doc') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
      } else if (fileType === 'media' || fileType === 'img') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
      } else {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>';
      }

      return `      <div class="canvas-element element-card element-card-file file-type-${escapeHtml(fileType)}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="file-card-content">
          <div class="file-card-icon-wrap">
            ${iconSvg}
          </div>
          <div class="file-card-meta">
            <div class="file-card-name" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>
            <div class="file-card-sub">
              <span class="file-card-size">${escapeHtml(fileSize)}</span>
            </div>
          </div>
          <span class="file-badge file-badge-${escapeHtml(fileType)}">${escapeHtml(badge)}</span>
        </div>
      </div>`;
    }

    if (el.type === 'folder-card' || el.cardType === 'folder') {
      const art = el.art || 'aurora';
      const label = el.label || el.title || 'Project Folder';
      const badge = el.badge || art.toUpperCase();
      const itemCount = el.itemCount || el.meta || '12 items';

      return `      <div class="canvas-element element-card element-card-folder folder-art-${escapeHtml(art)}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="folder-glass-tab">
          <span class="folder-tab-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="folder-art-header folder-art-${escapeHtml(art)}">
          <div class="folder-art-glow"></div>
        </div>
        <div class="folder-body">
          <div class="folder-label">${escapeHtml(label)}</div>
          <div class="folder-meta-row">
            <span class="folder-item-count">${escapeHtml(itemCount)}</span>
            <span class="folder-arrow">→</span>
          </div>
        </div>
      </div>`;
    }

    if (el.type === 'card') {
      const cardType = el.cardType || 'feature';
      const title = el.title || 'Real-time Analytics';
      const subtitle = el.subtitle || '';
      const description = el.description || 'Track conversion rates and user telemetry with sub-millisecond precision.';
      const badgeText = el.badgeText || (cardType === 'feature' ? 'HOT' : '');
      const link = el.link || '#';
      const ctaText = el.ctaText || 'Learn More →';

      if (cardType === 'testimonial') {
        const author = el.author || 'Sarah Jenkins';
        const role = el.role || 'VP of Product, Apex Digital';
        const avatar = el.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80';
        const rating = el.rating || 5;
        const stars = '★'.repeat(rating);
        return `      <div class="canvas-element element-card element-card-testimonial" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="testimonial-stars">${stars}</div>
        <p class="testimonial-quote">"${escapeHtml(description)}"${badgeText ? ` <span class="card-badge">${escapeHtml(badgeText)}</span>` : ''}</p>
        <div class="testimonial-author-row">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" class="testimonial-avatar" loading="lazy" />
          <div class="testimonial-meta">
            <div class="testimonial-name">${escapeHtml(author)}</div>
            <div class="testimonial-role">${escapeHtml(role)}</div>
          </div>
        </div>
      </div>`;
      }

      // Default: feature card
      return `      <div class="canvas-element element-card element-card-feature" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <div class="feature-card-header">
          <div class="feature-card-title">${escapeHtml(title)}</div>
          ${badgeText ? `<span class="card-badge">${escapeHtml(badgeText)}</span>` : ''}
        </div>
        ${subtitle ? `<div class="feature-card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        <p class="feature-card-desc">${escapeHtml(description)}</p>
        <a href="${escapeHtml(link)}" class="feature-card-link">${escapeHtml(ctaText)}</a>
      </div>`;
    }

    if (el.type === 'image') {
      const url = el.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80';
      const sizeClass = el.imageSize ? `img-size-${el.imageSize}` : 'img-size-medium';
      return `      <div class="canvas-element element-image ${sizeClass}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <img src="${escapeHtml(url)}" alt="Custom overlay image" loading="lazy" />
      </div>`;
    }

    if (el.type === 'badge') {
      const text = el.text || 'FEATURED';
      const badgeStyle = el.badgeStyle || el.style || 'pulse';
      return `      <div class="canvas-element element-badge badge-style-${badgeStyle}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <span class="badge-dot"></span>
        <span class="badge-text">${escapeHtml(text)}</span>
      </div>`;
    }

    // Default: button
    const text = el.text || 'Click Me →';
    const link = el.link || '#';
    const btnStyle = el.style || 'solid';
    return `      <div class="canvas-element element-button btn-style-${btnStyle}" id="${id}" data-element-id="${id}" style="${styleAttr}" tabindex="0">
        <a href="${escapeHtml(link)}" class="canvas-btn-link"><span class="btn-shine-effect"></span><span class="btn-label">${escapeHtml(text)}</span></a>
      </div>`;
  });

  return `\n    <div class="section-overlay-layer">\n${elementHtmls.join('\n')}\n    </div>`;
}

const OVERLAY_ELEMENT_CSS = `
    /* ==========================================================================
       Freeform Canvas Overlay Elements
       ========================================================================== */
    .section-overlay-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 25;
      overflow: visible;
    }

    .canvas-element {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.15s ease;
    }

    .canvas-element:active {
      cursor: grabbing;
    }

    .canvas-element.is-selected {
      outline: 2px dashed var(--preview-accent, #6366f1);
      outline-offset: 4px;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
    }

    /* Resize Handles for Canvas Elements */
    .el-resize-handle {
      display: none;
      position: absolute;
      width: 10px;
      height: 10px;
      background: #ffffff;
      border: 2px solid var(--preview-accent, #a855f7);
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      z-index: 100;
      box-sizing: border-box;
      pointer-events: auto;
    }
    .el-resize-handle::after {
      content: '';
      position: absolute;
      inset: -6px;
    }
    .canvas-element.is-selected .el-resize-handle {
      display: block;
    }
    .el-resize-handle.handle-nw, .el-resize-handle.handle-top-left {
      top: -5px;
      left: -5px;
      cursor: nwse-resize;
    }
    .el-resize-handle.handle-ne, .el-resize-handle.handle-top-right {
      top: -5px;
      right: -5px;
      cursor: nesw-resize;
    }
    .el-resize-handle.handle-se, .el-resize-handle.handle-bottom-right {
      bottom: -5px;
      right: -5px;
      cursor: nwse-resize;
    }
    .el-resize-handle.handle-sw, .el-resize-handle.handle-bottom-left {
      bottom: -5px;
      left: -5px;
      cursor: nesw-resize;
    }
    .el-resize-handle.handle-n, .el-resize-handle.handle-top {
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
    .el-resize-handle.handle-s, .el-resize-handle.handle-bottom {
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      cursor: ns-resize;
    }
    .el-resize-handle.handle-w, .el-resize-handle.handle-left {
      top: 50%;
      left: -5px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }
    .el-resize-handle.handle-e, .el-resize-handle.handle-right {
      top: 50%;
      right: -5px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }

    /* Button Variants */
    .element-button .canvas-btn-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      text-decoration: none;
      border-radius: 9999px;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .element-button[style*="width"] .canvas-btn-link,
    .element-button[style*="height"] .canvas-btn-link {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .btn-style-solid .canvas-btn-link {
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      border: 1px solid transparent;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn-style-solid .canvas-btn-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }

    .btn-style-glass .canvas-btn-link {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: var(--preview-text, #ffffff);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .btn-style-glass .canvas-btn-link:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-2px);
    }

    .btn-style-neon .canvas-btn-link {
      background: #09090b;
      color: #a855f7;
      border: 1.5px solid #a855f7;
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.4), inset 0 0 8px rgba(168, 85, 247, 0.2);
    }
    .btn-style-neon .canvas-btn-link:hover {
      box-shadow: 0 0 24px rgba(168, 85, 247, 0.7), inset 0 0 12px rgba(168, 85, 247, 0.4);
      transform: translateY(-2px);
    }

    .btn-style-outline .canvas-btn-link {
      background: transparent;
      color: var(--preview-text, #ffffff);
      border: 1.5px solid var(--preview-text, #ffffff);
    }
    .btn-style-outline .canvas-btn-link:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .btn-style-shine .canvas-btn-link {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 18px rgba(168, 85, 247, 0.4);
    }
    .btn-style-shine .btn-shine-effect {
      position: absolute;
      top: -50%;
      left: -60%;
      width: 40%;
      height: 200%;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
      transform: rotate(25deg);
      transition: all 0.75s ease;
      pointer-events: none;
    }
    .btn-style-shine:hover .btn-shine-effect {
      left: 120%;
    }
    .btn-style-shine .canvas-btn-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(168, 85, 247, 0.6);
    }

    /* Table Widgets */
    .element-table {
      min-width: 280px;
      max-width: 420px;
      border-radius: 16px;
      padding: 24px;
      background: var(--preview-card-bg, rgba(24, 24, 27, 0.9));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      color: var(--preview-text, #fafafa);
    }

    .element-table-pricing .pricing-card-header {
      margin-bottom: 20px;
      border-bottom: 1px solid var(--preview-border, rgba(255, 255, 255, 0.1));
      padding-bottom: 16px;
    }
    .element-table-pricing .pricing-card-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .element-table-pricing .pricing-card-price {
      font-size: 32px;
      font-weight: 800;
      color: var(--preview-accent, #6366f1);
    }
    .element-table-pricing .pricing-card-features {
      list-style: none;
      padding: 0;
      margin: 0 0 24px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    .element-table-pricing .pricing-card-features li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .element-table-pricing .feature-check {
      color: #10b981;
      font-weight: 700;
    }
    .element-table-pricing .pricing-card-cta {
      display: block;
      text-align: center;
      padding: 12px 20px;
      border-radius: 10px;
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .element-table-pricing .pricing-card-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }

    .element-table-comparison .canvas-matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .element-table-comparison th {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid var(--preview-border, rgba(255, 255, 255, 0.15));
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--preview-accent, #6366f1);
    }
    .element-table-comparison td {
      padding: 10px;
      border-bottom: 1px solid var(--preview-border, rgba(255, 255, 255, 0.08));
    }

    /* Card Widgets */
    .element-card {
      min-width: 260px;
      max-width: 360px;
      padding: 22px;
      border-radius: 16px;
      background: var(--preview-card-bg, rgba(24, 24, 27, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      color: var(--preview-text, #fafafa);
    }
    .element-card-feature .feature-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .element-card-feature .feature-card-title {
      font-size: 16px;
      font-weight: 700;
    }
    .element-card-feature .card-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .element-card-feature .feature-card-subtitle {
      font-size: 12px;
      color: var(--preview-accent, #6366f1);
      margin-bottom: 6px;
    }
    .element-card-feature .feature-card-desc {
      font-size: 13px;
      line-height: 1.5;
      opacity: 0.85;
      margin: 0 0 16px 0;
    }
    .element-card-feature .feature-card-link {
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--preview-accent, #6366f1);
      text-decoration: none;
      transition: gap 0.2s ease;
    }
    .element-card-feature .feature-card-link:hover {
      text-decoration: underline;
    }

    /* Testimonial Card */
    .element-card-testimonial .testimonial-stars {
      color: #fbbf24;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .element-card-testimonial .testimonial-quote {
      font-size: 13px;
      font-style: italic;
      line-height: 1.6;
      margin: 0 0 14px 0;
      opacity: 0.9;
    }
    .element-card-testimonial .testimonial-author-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .element-card-testimonial .testimonial-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--preview-accent, #6366f1);
    }
    .element-card-testimonial .testimonial-name {
      font-size: 13px;
      font-weight: 700;
    }
    .element-card-testimonial .testimonial-role {
      font-size: 11px;
      opacity: 0.65;
    }

    /* File Card Widget */
    .element-card-file {
      min-width: 260px;
      padding: 14px 18px;
      border-radius: 14px;
      background: var(--preview-card-bg, rgba(20, 20, 26, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.12));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      color: var(--preview-text, #fafafa);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .element-card-file:hover {
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    }
    .file-card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-card-icon-wrap {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
      color: var(--preview-accent, #6366f1);
    }
    .file-card-meta {
      flex: 1;
      min-width: 0;
    }
    .file-card-name {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--preview-text, #fafafa);
    }
    .file-card-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #a1a1aa;
      margin-top: 2px;
    }
    .file-card-size {
      font-weight: 500;
    }
    .file-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .file-badge-pdf {
      background: rgba(239, 68, 68, 0.18);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .file-badge-code {
      background: rgba(59, 130, 246, 0.18);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    .file-badge-doc {
      background: rgba(99, 102, 241, 0.18);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.35);
    }
    .file-badge-media {
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .file-badge-zip {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    /* Glass Folder Card Widget */
    .element-card-folder {
      position: relative;
      min-width: 240px;
      padding: 0;
      border-radius: 16px;
      background: var(--preview-card-bg, rgba(20, 20, 26, 0.85));
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.14));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
      color: var(--preview-text, #fafafa);
      overflow: visible;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .element-card-folder:hover {
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 24px 54px rgba(0, 0, 0, 0.5);
    }
    .folder-glass-tab {
      position: absolute;
      top: -14px;
      left: 16px;
      padding: 3px 12px;
      border-radius: 8px 8px 0 0;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-bottom: none;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fafafa;
      z-index: 2;
    }
    .folder-tab-badge {
      display: inline-block;
      text-transform: uppercase;
    }
    .folder-art-header {
      height: 90px;
      border-radius: 15px 15px 0 0;
      position: relative;
      overflow: hidden;
    }
    .folder-art-aurora {
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
    }
    .folder-art-dusk {
      background: linear-gradient(135deg, #1e1b4b 0%, #3b82f6 50%, #6366f1 100%);
    }
    .folder-art-ember {
      background: linear-gradient(135deg, #18181b 0%, #f97316 60%, #ef4444 100%);
    }
    .folder-art-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.25), transparent 70%);
      mix-blend-mode: overlay;
    }
    .folder-body {
      padding: 14px 18px 16px 18px;
    }
    .folder-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--preview-text, #fafafa);
      margin-bottom: 4px;
    }
    .folder-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #a1a1aa;
    }
    .folder-item-count {
      font-weight: 500;
    }
    .folder-arrow {
      color: var(--preview-accent, #6366f1);
      font-weight: 700;
      transition: transform 0.2s ease;
    }
    .element-card-folder:hover .folder-arrow {
      transform: translateX(3px);
    }

    /* Image Sizes */
    .element-image img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.1));
    }

    .element-image.img-size-small { width: 140px; height: 140px; }
    .element-image.img-size-medium { width: 240px; height: 240px; }
    .element-image.img-size-large { width: 360px; height: 360px; }

    .element-image[style*="width"] img,
    .element-image[style*="height"] img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Badge */
    .element-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
      white-space: nowrap;
    }
    .badge-style-pulse {
      background: rgba(99, 102, 241, 0.15);
      color: var(--preview-accent, #6366f1);
      border: 1px solid var(--preview-accent, #6366f1);
    }
    .badge-style-pulse .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--preview-accent, #6366f1);
      box-shadow: 0 0 8px var(--preview-accent, #6366f1);
      animation: badgePulse 1.8s infinite;
    }
    @keyframes badgePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
    .badge-style-pill {
      background: var(--preview-card-bg, rgba(255, 255, 255, 0.1));
      color: var(--preview-text, #fafafa);
      border: 1px solid var(--preview-border, rgba(255, 255, 255, 0.2));
    }
    .badge-style-accent {
      background: var(--preview-accent, #6366f1);
      color: #ffffff;
      border: 1px solid transparent;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
    }

    /* Section Resize Handle */
    .section-resize-handle {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 14px;
      cursor: ns-resize;
      background: transparent;
      z-index: 40;
      transition: background-color 0.15s ease;
      touch-action: none;
    }
    .section-resize-handle::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 56px;
      height: 5px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.35);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      transition: all 0.15s ease;
      opacity: 0;
    }
    .page-section:hover .section-resize-handle::after,
    .section-resize-handle:hover::after,
    .section-resize-handle.is-resizing::after {
      opacity: 1;
      background: var(--preview-accent, #a855f7);
      width: 72px;
      height: 6px;
      box-shadow: 0 0 14px var(--preview-accent, #a855f7);
    }
    .section-resize-handle:hover,
    .section-resize-handle.is-resizing {
      background: rgba(168, 85, 247, 0.15);
    }

    /* Drag and Drop Canvas Indicators */
    .page-section.is-drop-target {
      outline: 2px dashed rgba(168, 85, 247, 0.8) !important;
      outline-offset: -3px;
      background-color: rgba(168, 85, 247, 0.05) !important;
      transition: outline 0.15s ease;
    }

    .section-drop-indicator {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: #a855f7;
      box-shadow: 0 0 12px #a855f7;
      z-index: 9999;
      pointer-events: none;
    }

    .section-drop-indicator.drop-above {
      top: 0;
    }

    .section-drop-indicator.drop-below {
      bottom: 0;
    }
`;

/**
 * Computes inline CSS styles for section height and vertical padding.
 */
function computeSectionSizingStyles(sizing) {
  if (!sizing) return '';
  const styles = [];
  if (sizing.heightMode === 'screen') {
    styles.push('min-height: 100vh');
    styles.push('height: 100vh');
  } else if (sizing.heightMode === 'custom' && sizing.customHeight) {
    styles.push(`min-height: ${sizing.customHeight}px`);
    styles.push(`height: ${sizing.customHeight}px`);
    styles.push('overflow: hidden');
  }

  if (sizing.paddingY === 'compact') {
    styles.push('padding-top: 32px');
    styles.push('padding-bottom: 32px');
  } else if (sizing.paddingY === 'medium') {
    styles.push('padding-top: 64px');
    styles.push('padding-bottom: 64px');
  } else if (sizing.paddingY === 'large') {
    styles.push('padding-top: 120px');
    styles.push('padding-bottom: 120px');
  }

  return styles.length > 0 ? styles.join('; ') + ';' : '';
}

/**
 * CSS that shrinks a section's content when the section was made shorter than it needs (`sizing.fitScale`, set by the
 * builder's resize handle and never below the component's minimum), so the text scales instead of being cropped.
 */
function fitScaleCss(section, id) {
  const z = section && section.sizing;
  const f = z && z.heightMode === 'custom' ? Number(z.fitScale) : 0;
  if (!(f >= 0.3 && f < 1)) return '';
  return `#${id} > :first-child:not(.section-overlay-layer):not(.section-resize-handle) { zoom: ${f}; }`;
}

/**
 * Sizing plus the space a script-rendered section will fill (`reserveHeight` in meta.json, measured by
 * scripts/measure-reserve.js). Reserving it before the script runs stops the sections below from jumping down.
 */
function sectionSizingStyle(section, reserveHeight) {
  let style = computeSectionSizingStyles(section.sizing);
  const reserve = Number(reserveHeight) || 0;
  const mode = section.sizing && section.sizing.heightMode;
  if (reserve > 0 && mode !== 'screen' && mode !== 'custom') style += `min-height: min(${reserve}px, 100svh);`;
  return style;
}

/**
 * Runtime for sections that start late: `__lazySection(id, slug, run)` runs a section's script when the section is
 * within one screen of the viewport. Listeners for DOMContentLoaded / load that the script adds after the page has
 * loaded are called straight away, so scripts written for page load still start.
 */
const LAZY_SECTION_RUNTIME = `  // Lazy start for heavy sections
  window.__lazySection = function (id, slug, run) {
    var el = document.getElementById(id);
    var start = function () {
      var addDoc = document.addEventListener, addWin = window.addEventListener;
      var late = function (add, target) {
        return function (type, fn) {
          if ((type === 'DOMContentLoaded' || type === 'load') && document.readyState === 'complete' && typeof fn === 'function') {
            setTimeout(function () { try { fn.call(target, new Event(type)); } catch (err) { console.error(err); } }, 0);
            return;
          }
          return add.apply(this, arguments);
        };
      };
      document.addEventListener = late(addDoc, document);
      window.addEventListener = late(addWin, window);
      window.__activeSectionRegisteringId = id;
      try { run(); } catch (err) { console.error('Error executing ' + slug + ':', err); }
      finally {
        window.__activeSectionRegisteringId = null;
        document.addEventListener = addDoc;
        window.addEventListener = addWin;
      }
    };
    if (!el || !('IntersectionObserver' in window)) { start(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: '100% 0px' });
    io.observe(el);
  };`;

const BREAKPOINT_QUERIES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)'
};
const PADDING_PX = { none: 0, compact: 32, medium: 64, large: 120 };

/**
 * Per-breakpoint rules for sections: "hide on mobile / tablet / desktop" and a different top/bottom padding on tablet
 * and phone (`sizing.paddingYTablet`, `sizing.paddingYMobile`). Written as media queries so the preview (whose
 * Tablet/Mobile buttons resize the frame) and the export behave the same.
 */
function renderResponsiveCss(sections) {
  const rules = { mobile: [], tablet: [], desktop: [] };
  (Array.isArray(sections) ? sections : []).forEach(sec => {
    const id = String(sec.id || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (!id) return;
    (Array.isArray(sec.hideOn) ? sec.hideOn : []).forEach(bp => {
      if (rules[bp]) rules[bp].push(`#${id} { display: none !important; }`);
    });
    const z = sec.sizing || {};
    [['tablet', z.paddingYTablet], ['mobile', z.paddingYMobile]].forEach(([bp, pad]) => {
      if (pad in PADDING_PX) rules[bp].push(`#${id} { padding-top: ${PADDING_PX[pad]}px !important; padding-bottom: ${PADDING_PX[pad]}px !important; }`);
    });
  });
  const blocks = Object.keys(rules).filter(bp => rules[bp].length).map(bp => `@media ${BREAKPOINT_QUERIES[bp]} {\n  ${rules[bp].join('\n  ')}\n}`);
  return blocks.length ? `/* Responsive section settings */\n${blocks.join('\n')}` : '';
}

/**
 * Generates universal CSS rules ensuring the active theme propagates
 * to all sections, component containers, and utilities on the page.
 */
function generateUniversalThemeStyles(theme) {
  const isDark = isDarkTheme(theme);
  const textMuted = `color-mix(in srgb, ${theme.text} 65%, transparent)`;
  const textSubtle = `color-mix(in srgb, ${theme.text} 45%, transparent)`;
  const bgSoft = isDark
    ? `color-mix(in srgb, ${theme.text} 6%, ${theme.bg})`
    : `color-mix(in srgb, ${theme.text} 3%, ${theme.bg})`;
  const cardBg = theme.cardBg || (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)');
  const border = theme.border || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
  const accent = theme.accent || '#6366f1';

  return `    :root {
      --preview-bg: ${theme.bg};
      --preview-text: ${theme.text};
      --preview-accent: ${accent};
      --preview-card-bg: ${cardBg};
      --preview-border: ${border};

      /* Universal design system tokens (Tailwind, shadcn) */
      --background: ${theme.bg};
      --foreground: ${theme.text};
      --color-background: ${theme.bg};
      --color-foreground: ${theme.text};
      --bg: ${theme.bg};
      --text: ${theme.text};
      --accent: ${accent};
      --card: ${cardBg};
      --card-foreground: ${theme.text};
      --border: ${border};
      --input: ${border};
      --ring: ${accent};
      --primary: ${accent};
      --primary-foreground: ${isDark ? '#000000' : '#ffffff'};
      --secondary: ${cardBg};
      --secondary-foreground: ${theme.text};
      --muted: ${cardBg};
      --muted-foreground: ${textMuted};
      --popover: ${cardBg};
      --popover-foreground: ${theme.text};

      /* Standard design tokens for new components (see AGENT_GUIDE.md) */
      --radius: 12px;
      --font-display: inherit;
      --font-body: inherit;

      /* Component-specific variables mapped universally */
      --bg-color: ${theme.bg};
      --text-color: ${theme.text};
      --text-main: ${theme.text};
      --text-muted: ${textMuted};
      --muted-text: ${textMuted};
      --card-bg: ${cardBg};
      --card-border: ${border};
      --card-hover: ${isDark ? 'color-mix(in srgb, ' + theme.text + ' 12%, ' + theme.bg + ')' : 'color-mix(in srgb, ' + theme.text + ' 6%, ' + theme.bg + ')'};
      --active-border: ${accent};
      --active-color: ${accent};
      --header-bg: color-mix(in srgb, ${theme.bg} 85%, transparent);
      --header-border: ${border};
      --rail-bg: color-mix(in srgb, ${theme.text} 12%, transparent);
      --fg: ${theme.text};
      --soft: ${bgSoft};
      --line: ${border};

      /* Polaroid & Wordmark footers */
      --pl-bg: ${theme.bg};
      --pl-ink: ${theme.text};
      --pl-muted: ${textMuted};
      --pl-line: ${border};
      --bwf-bg: ${theme.bg};
      --bwf-ink: ${theme.text};
      --bwf-muted: ${textMuted};
      --hwf-bg: ${theme.bg};
      --hwf-ink: ${theme.text};

      /* Ink-Orbit SaaS family */
      --ib-page: ${theme.bg};
      --ib-paper: ${cardBg};
      --ib-card: ${cardBg};
      --ib-raise: ${bgSoft};
      --ib-ink: ${theme.text};
      --ib-soft: ${textMuted};
      --ib-muted: ${textSubtle};
      --ib-line: ${border};
      --ip-page: ${theme.bg};
      --ip-paper: ${cardBg};
      --ip-card: ${cardBg};
      --ip-raise: ${bgSoft};
      --ip-ink: ${theme.text};
      --ip-soft: ${textMuted};
      --ip-muted: ${textSubtle};
      --ip-line: ${border};

      /* Postmark CTA */
      --pl-ground: ${theme.bg};
      --pd-ground: ${theme.bg};
      --pl-ink: ${theme.text};
      --pd-ink: ${theme.text};
      --pl-muted: ${textMuted};
      --pd-muted: ${textMuted};
      --pl-accent: ${accent};
      --pd-accent: ${accent};
      --pl-highlight: ${accent};
      --pd-highlight: ${accent};
      --g: ${theme.bg};
      --k: ${theme.text};
      --mu: ${textMuted};
      --a: ${accent};
      --pm-paper: ${cardBg};

      /* Audio / Shaders / Into-the-ether */
      --bg-core: ${theme.bg};
      --bg-card: ${cardBg};
      --bg-card-border: ${border};
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
      background-color: var(--preview-bg);
      color: var(--preview-text);
      color-scheme: ${isDark ? 'dark' : 'light'};
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--preview-bg);
      color: var(--preview-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .page-section {
      position: relative;
      width: 100%;
      clear: both;
      background-color: var(--preview-bg);
      color: var(--preview-text);
      display: block;
      box-sizing: border-box;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    /* a header the client keeps at the top: the section itself sticks, because it is the only element with the whole page as its parent */
    .page-section.is-sticky {
      position: sticky;
      top: 0;
      z-index: 50;
    }

    /* Seamless document flow: React roots match container width without forcing flex overrides */
    .page-section > div[id^="root-"] {
      width: 100%;
      box-sizing: border-box;
      background-color: transparent;
      color: inherit;
    }

    /* Preloader Overlay Mode: floats full-screen over the page without pushing headers down */
    .page-section.is-preloader,
    .page-section[data-section-slug*="preloader"] {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      z-index: 99999 !important;
      pointer-events: auto;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      transition: opacity 0.5s ease;
    }

    .page-section[data-section-slug*="preloader"] .section-resize-handle {
      display: none !important;
    }

    /* Auto-dismiss or suppress preloader container when completed to reveal the website underneath */
    .page-section.is-preloader.is-suppressed,
    .page-section[data-section-slug*="preloader"].is-suppressed,
    .page-section[data-section-slug*="preloader"].is-dismissed,
    .page-section[data-section-slug*="preloader"]:has([data-phase="done"]),
    .page-section[data-section-slug*="preloader"]:has(.amr-root[data-phase="done"]),
    .page-section[data-section-slug*="preloader"]:has(.scp-gate[data-phase="done"]),
    .page-section[data-section-slug*="preloader"]:has([data-completed="true"]) {
      display: none !important;
      pointer-events: none !important;
    }

    /* Universal component container background and text color propagation (excluding preloaders) */
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .pl-root,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .bwf,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .pm,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .ib-root,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .ip-root,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .aurora-hero,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .stagger-stage,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .faq-wrap,
    .page-section:not([data-section-slug*="preloader"]):not(.is-preloader) .marquee-section {
      --pl-bg: var(--preview-bg) !important;
      --pl-ink: var(--preview-text) !important;
      --pl-muted: ${textMuted} !important;
      --pl-line: ${border} !important;
      --bwf-bg: var(--preview-bg) !important;
      --bwf-ink: var(--preview-text) !important;
      --bwf-muted: ${textMuted} !important;
      background-color: var(--preview-bg) !important;
      color: var(--preview-text) !important;
    }

    .page-section:not([data-section-slug*="preloader"]) .pl-title,
    .page-section:not([data-section-slug*="preloader"]) .pl-count,
    .page-section:not([data-section-slug*="preloader"]) .pl-count b {
      color: var(--preview-text) !important;
    }

    .page-section .bwf-foot {
      background: linear-gradient(180deg, transparent, var(--preview-bg)) !important;
    }

    /* FAQ accordion styles adaptation */
    .page-section .faq-trigger {
      color: var(--preview-text) !important;
    }
    .page-section .faq-panel__inner p {
      color: ${textMuted} !important;
    }
    .page-section .faq-list,
    .page-section .faq-item {
      border-color: var(--preview-border) !important;
    }

    /* Client Logo Marquee adaptation */
    .page-section .marquee-label {
      color: ${textMuted} !important;
    }
    .page-section .marquee-btn {
      background-color: ${cardBg} !important;
      color: var(--preview-text) !important;
      border-color: var(--preview-border) !important;
    }
    .page-section .clients-marquee__item {
      background-color: ${cardBg} !important;
      color: var(--preview-text) !important;
      border-color: var(--preview-border) !important;
    }

    /* Hero Headline & Desc adaptation */
    .page-section .hero-title {
      color: var(--preview-text) !important;
    }
    .page-section .hero-desc {
      color: ${textMuted} !important;
    }
    .page-section .hero-tag {
      background-color: ${cardBg} !important;
      color: var(--preview-text) !important;
      border-color: var(--preview-border) !important;
    }

    /* Testimonials & Cards adaptation */
    .page-section .stagger-card {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }
    .page-section .stagger-title,
    .page-section .stagger-author {
      color: var(--preview-text) !important;
    }
    .page-section .stagger-company {
      color: ${textMuted} !important;
    }
    .page-section .theme-btn,
    .page-section .filter-btn {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }

    /* Ink-Orbit SaaS Pricing & Bento adaptation */
    .page-section .ip-root,
    .page-section .ib-root {
      --ip-page: var(--preview-bg) !important;
      --ip-paper: var(--preview-bg) !important;
      --ip-card: var(--preview-card-bg) !important;
      --ip-raise: ${bgSoft} !important;
      --ip-ink: var(--preview-text) !important;
      --ip-soft: ${textMuted} !important;
      --ip-muted: ${textSubtle} !important;
      --ip-faint: ${textSubtle} !important;
      --ip-line: var(--preview-border) !important;
      --ip-line-strong: var(--preview-border) !important;
      --ip-inv: ${isDark ? '#f1f5f9' : '#0f172a'} !important;
      --ip-inv-ink: ${isDark ? '#0f172a' : '#f8fafc'} !important;
      --ip-inv-muted: ${isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.7)'} !important;
      --ib-page: var(--preview-bg) !important;
      --ib-paper: var(--preview-bg) !important;
      --ib-card: var(--preview-card-bg) !important;
      --ib-raise: ${bgSoft} !important;
      --ib-ink: var(--preview-text) !important;
      --ib-soft: ${textMuted} !important;
      --ib-muted: ${textSubtle} !important;
      --ib-faint: ${textSubtle} !important;
      --ib-line: var(--preview-border) !important;
      --ib-line-strong: var(--preview-border) !important;
      --ib-inv: ${isDark ? '#f1f5f9' : '#0f172a'} !important;
      --ib-inv-ink: ${isDark ? '#0f172a' : '#f8fafc'} !important;
    }

    .page-section .ib-sec,
    .page-section .ip-sec {
      background-color: transparent !important;
      border-color: var(--preview-border) !important;
    }
    .page-section .ib-h2,
    .page-section .ip-h2 {
      color: var(--preview-text) !important;
    }
    .page-section .ip-plan {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }
    .page-section .ip-plan-hot {
      background-color: ${isDark ? '#f1f5f9' : '#0f172a'} !important;
      color: ${isDark ? '#0f172a' : '#f8fafc'} !important;
      border-color: ${isDark ? '#f1f5f9' : '#0f172a'} !important;
    }
    .page-section .ip-plan-hot .ip-plan-desc,
    .page-section .ip-plan-hot .ip-per,
    .page-section .ip-plan-hot .ip-saving {
      color: ${isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.7)'} !important;
    }
    .page-section .ip-toggle {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
    }
    .page-section .ip-toggle-pill {
      background-color: ${isDark ? '#f1f5f9' : '#0f172a'} !important;
    }
    .page-section .ip-toggle button[aria-pressed="true"] {
      color: ${isDark ? '#0f172a' : '#f8fafc'} !important;
    }
    .page-section .ip-toggle button[aria-pressed="false"] {
      color: ${textMuted} !important;
    }
    .page-section .ip-tag {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }
    .page-section .ip-btn-ghost {
      background-color: ${bgSoft} !important;
      color: var(--preview-text) !important;
      border-color: var(--preview-border) !important;
    }
    .page-section .ip-plan-hot .ip-btn-dark {
      background-color: ${isDark ? '#0f172a' : '#f8fafc'} !important;
      color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
    }
    .page-section .ib-card {
      background: ${isDark ? 'linear-gradient(180deg, color-mix(in srgb, var(--preview-card-bg) 80%, white 5%), var(--preview-card-bg))' : 'linear-gradient(180deg, #ffffff, var(--preview-card-bg))'} !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }
    .page-section .ib-card h3 {
      color: var(--preview-text) !important;
    }
    .page-section .ib-card p {
      color: ${textMuted} !important;
    }
    .page-section .ib-node {
      fill: ${isDark ? 'var(--preview-card-bg)' : '#ffffff'} !important;
      stroke: var(--preview-border) !important;
    }
    .page-section .ib-tag {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
      color: var(--preview-text) !important;
    }

    /* Navigation & Menu adaptation */
    .page-section .nav-demo-shell,
    .page-section .nav-demo-shell .brand,
    .page-section .nav-demo-shell .burger-btn {
      color: var(--preview-text) !important;
    }

    /* Postmark CTA adaptation */
    .page-section .pm {
      background-color: var(--preview-bg) !important;
      color: var(--preview-text) !important;
    }
    .page-section .pm-h {
      color: var(--preview-text) !important;
    }
    .page-section .pm-p {
      color: ${textMuted} !important;
    }
    .page-section .pm-paper {
      fill: var(--preview-card-bg) !important;
      stroke: var(--preview-border) !important;
    }

    /* Document and glass preview cards */
    .page-section .doc-preview-card {
      background-color: var(--preview-card-bg) !important;
      border-color: var(--preview-border) !important;
    }

    /* Tailwind / utility dark backgrounds adapt to active theme */
    .page-section .bg-black,
    .page-section .bg-zinc-950,
    .page-section .bg-zinc-900,
    .page-section .bg-neutral-950,
    .page-section .bg-neutral-900,
    .page-section .bg-slate-950,
    .page-section .bg-slate-900,
    .page-section .bg-gray-950,
    .page-section .bg-gray-900,
    .page-section .bg-background {
      background-color: var(--preview-bg) !important;
    }
${!isDark ? `
    /* Light Theme Adjustments for dark-designed elements */
    .page-section .text-white,
    .page-section .text-zinc-100,
    .page-section .text-zinc-200,
    .page-section .text-neutral-100,
    .page-section .text-neutral-200,
    .page-section .text-slate-100,
    .page-section .text-slate-200,
    .page-section .text-gray-100,
    .page-section .text-gray-200 {
      color: var(--preview-text) !important;
    }
    .page-section .text-zinc-400,
    .page-section .text-zinc-500,
    .page-section .text-neutral-400,
    .page-section .text-slate-400,
    .page-section .text-gray-400 {
      color: ${textMuted} !important;
    }
    .page-section .border-zinc-800,
    .page-section .border-zinc-900,
    .page-section .border-neutral-800,
    .page-section .border-slate-800 {
      border-color: var(--preview-border) !important;
    }

    .page-section:not(.is-preloader):not([data-own-palette]) h1:not([class*="gradient"]),
    .page-section:not(.is-preloader):not([data-own-palette]) h2:not([class*="gradient"]),
    .page-section:not(.is-preloader):not([data-own-palette]) h3:not([class*="gradient"]),
    .page-section:not(.is-preloader):not([data-own-palette]) h4,
    .page-section:not(.is-preloader):not([data-own-palette]) h5,
    .page-section:not(.is-preloader):not([data-own-palette]) h6,
    .page-section:not(.is-preloader):not([data-own-palette]) p:not([class*="gradient"]),
    .page-section:not(.is-preloader):not([data-own-palette]) .cyl-title,
    .page-section:not(.is-preloader):not([data-own-palette]) .cyl-footer,
    .page-section:not(.is-preloader):not([data-own-palette]) .strapline-copy,
    .page-section:not(.is-preloader):not([data-own-palette]) .conv-h2,
    .page-section:not(.is-preloader):not([data-own-palette]) .timeline-card__title,
    .page-section:not(.is-preloader):not([data-own-palette]) .viv-artist-name,
    .page-section:not(.is-preloader):not([data-own-palette]) .card-title,
    .page-section:not(.is-preloader):not([data-own-palette]) .pricing-title,
    .page-section:not(.is-preloader):not([data-own-palette]) .pricing-price {
      color: var(--preview-text) !important;
    }

    .page-section:not(.is-preloader):not([data-own-palette]) .strapline-meta,
    .page-section:not(.is-preloader):not([data-own-palette]) .conv-p,
    .page-section:not(.is-preloader):not([data-own-palette]) .hero-sub,
    .page-section:not(.is-preloader):not([data-own-palette]) .viv-artist-role,
    .page-section:not(.is-preloader):not([data-own-palette]) .card-desc,
    .page-section:not(.is-preloader):not([data-own-palette]) .pricing-feature,
    .page-section:not(.is-preloader):not([data-own-palette]) .testimonial-quote {
      color: ${textMuted} !important;
    }

    .page-section:not(.is-preloader):not([data-own-palette]) .hero-pill,
    .page-section:not(.is-preloader):not([data-own-palette]) .cyl-btn,
    .page-section:not(.is-preloader):not([data-own-palette]) .ruler-month-btn,
    .page-section:not(.is-preloader):not([data-own-palette]) .chip,
    .page-section:not(.is-preloader):not([data-own-palette]) .btn-secondary {
      background-color: ${cardBg} !important;
      color: var(--preview-text) !important;
      border-color: var(--preview-border) !important;
    }` : `
    /* Dark Theme Adjustments for light-designed elements */
    .page-section .text-black,
    .page-section .text-zinc-900,
    .page-section .text-neutral-900,
    .page-section .text-slate-900 {
      color: var(--preview-text) !important;
    }`}`;
}

/**
 * Synchronously applies all dynamic theme variables, color-scheme, data-theme,
 * universal styles, and section backgrounds directly to a target document (e.g. iframe).
 */
function applyThemeToDocument(doc, themeConfig) {
  if (!doc) return;
  const theme = resolveTheme(themeConfig);
  const isDark = isDarkTheme(theme);
  const textMuted = `color-mix(in srgb, ${theme.text} 65%, transparent)`;
  const textSubtle = `color-mix(in srgb, ${theme.text} 45%, transparent)`;
  const bgSoft = isDark
    ? `color-mix(in srgb, ${theme.text} 6%, ${theme.bg})`
    : `color-mix(in srgb, ${theme.text} 3%, ${theme.bg})`;
  const cardBg = theme.cardBg || (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)');
  const border = theme.border || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
  const accent = theme.accent || '#6366f1';

  // 1. Update stylesheet in head
  let styleEl = doc.getElementById('universal-theme-styles');
  if (!styleEl && doc.head) {
    styleEl = doc.createElement('style');
    styleEl.id = 'universal-theme-styles';
    doc.head.insertBefore(styleEl, doc.head.firstChild);
  }
  if (styleEl) {
    styleEl.textContent = generateUniversalThemeStyles(theme);
  }

  // 2. Set root CSS variables
  const root = doc.documentElement;
  if (root && root.style) {
    const vars = {
      '--preview-bg': theme.bg,
      '--preview-text': theme.text,
      '--preview-accent': accent,
      '--preview-card-bg': cardBg,
      '--preview-border': border,
      '--background': theme.bg,
      '--foreground': theme.text,
      '--color-background': theme.bg,
      '--color-foreground': theme.text,
      '--bg': theme.bg,
      '--text': theme.text,
      '--accent': accent,
      '--card': cardBg,
      '--card-foreground': theme.text,
      '--border': border,
      '--input': border,
      '--ring': accent,
      '--primary': accent,
      '--primary-foreground': isDark ? '#000000' : '#ffffff',
      '--secondary': cardBg,
      '--secondary-foreground': theme.text,
      '--muted': cardBg,
      '--muted-foreground': textMuted,
      '--popover': cardBg,
      '--popover-foreground': theme.text,
      '--bg-color': theme.bg,
      '--text-color': theme.text,
      '--text-main': theme.text,
      '--text-muted': textMuted,
      '--muted-text': textMuted,
      '--card-bg': cardBg,
      '--card-border': border,
      '--card-hover': isDark ? `color-mix(in srgb, ${theme.text} 12%, ${theme.bg})` : `color-mix(in srgb, ${theme.text} 6%, ${theme.bg})`,
      '--active-border': accent,
      '--active-color': accent,
      '--header-bg': `color-mix(in srgb, ${theme.bg} 85%, transparent)`,
      '--header-border': border,
      '--rail-bg': `color-mix(in srgb, ${theme.text} 12%, transparent)`,
      '--fg': theme.text,
      '--soft': bgSoft,
      '--line': border,
      '--pl-bg': theme.bg,
      '--pl-ink': theme.text,
      '--pl-muted': textMuted,
      '--pl-line': border,
      '--bwf-bg': theme.bg,
      '--bwf-ink': theme.text,
      '--bwf-muted': textMuted,
      '--hwf-bg': theme.bg,
      '--hwf-ink': theme.text,
      '--ib-page': theme.bg,
      '--ib-paper': cardBg,
      '--ib-card': cardBg,
      '--ib-raise': bgSoft,
      '--ib-ink': theme.text,
      '--ib-soft': textMuted,
      '--ib-muted': textSubtle,
      '--ib-line': border,
      '--ip-page': theme.bg,
      '--ip-paper': cardBg,
      '--ip-card': cardBg,
      '--ip-raise': bgSoft,
      '--ip-ink': theme.text,
      '--ip-soft': textMuted,
      '--ip-muted': textSubtle,
      '--ip-line': border,
      '--pl-ground': theme.bg,
      '--pd-ground': theme.bg,
      '--pl-ink': theme.text,
      '--pd-ink': theme.text,
      '--pl-muted': textMuted,
      '--pd-muted': textMuted,
      '--pl-accent': accent,
      '--pd-accent': accent,
      '--pl-highlight': accent,
      '--pd-highlight': accent,
      '--g': theme.bg,
      '--k': theme.text,
      '--mu': textMuted,
      '--a': accent,
      '--pm-paper': cardBg,
      '--bg-core': theme.bg,
      '--bg-card': cardBg,
      '--bg-card-border': border
    };
    for (const k in vars) {
      root.style.setProperty(k, vars[k]);
    }
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (doc.body) {
      doc.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }

  // 3. Update normal page sections
  const sections = doc.querySelectorAll('.page-section:not(.is-preloader)');
  const pagePol = isDark ? 'dark' : 'light';
  const isNativeEl = (el) => {
    const host = el && typeof el.closest === 'function' ? el.closest('.page-section[data-native-for]') : null;
    return !!host && (host.getAttribute('data-native-for') || '').split(' ').includes(pagePol);
  };
  sections.forEach(s => {
    const native = isNativeEl(s);
    // Native sections keep their own palette (set by the scoped CSS), so no inline theme colours
    s.style.backgroundColor = native ? '' : theme.bg;
    s.style.color = native ? '' : theme.text;
    if (typeof s.setAttribute === 'function') {
      s.setAttribute('data-theme', native ? (isDark ? 'light' : 'dark') : pagePol);
      // `.dark` on the section is what shadcn-style components with theme="auto" follow
      if (s.classList && typeof s.classList.toggle === 'function') s.classList.toggle('dark', (native ? (isDark ? 'light' : 'dark') : pagePol) === 'dark');
    }
  });

  // 4. Synchronize all nested component theme attributes with active theme
  const themeMode = isDark ? 'dark' : 'light';
  const themedElements = doc.querySelectorAll('[data-theme]');
  themedElements.forEach(el => {
    if (typeof el.setAttribute === 'function') {
      el.setAttribute('data-theme', isNativeEl(el) ? (isDark ? 'light' : 'dark') : themeMode);
    }
  });

  try {
    if (doc.defaultView) {
      doc.defaultView.dispatchEvent(new CustomEvent('themechange', { detail: { isDark, theme } }));
    }
  } catch (e) {}
}

/**
 * Assembles a complete HTML5 document string for rendering inside the preview iframe.
 */
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

function assemblePreviewDocument(sections, themeConfig, featuresData = {}, options = {}) {
  if (Array.isArray(sections)) sections = mapPageLinks(sections.filter(s => !s.hidden), options.pageLinks);
  const pageHead = renderPageHead(options.page, 'Page Preview');
  const theme = resolveTheme(themeConfig);
  const isDark = isDarkTheme(theme);
  if (!Array.isArray(sections) || sections.length === 0) {
    return renderEmptyPreview(theme);
  }

  const headLinks = new Set();
  const scopedStyleBlocks = [];
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];
  let usesLazy = false;
  // the live preview has no anchors; the single-file export does (options.anchors = { reserved: [names that are page keys] })
  const navNames = options.anchors || options.navPreview ? anchorNames(sections, featuresData, options.anchors && options.anchors.reserved) : {};
  const anchors = options.anchors ? navNames : {};
  if (Object.keys(anchors).length) scopedStyleBlocks.push('    ' + ANCHOR_CSS);
  // the builder preview shows menu items that go nowhere dimmed instead of leaving them out, and links the ones a section names like the export does
  if (options.navPreview) scopedStyleBlocks.push('    .page-section a[data-edv-nav][href="#"], .page-section a[data-edv-nav][href=""] { opacity: .4 !important; text-decoration: line-through !important; }');
  const autoNav = navLinker(navNames, options.navPreview ? Object.assign({}, options, { keepUnlinkedNav: true }) : options, menuItems(sections, navNames, featuresData));

  sections.forEach((section, index) => {
    const id = section.id || `sec-${index + 1}`;
    const slug = section.slug || `section-${index + 1}`;
    const embed = section.html === undefined ? siteEmbedFor(slug, options) : null;
    const rawHtml = embed ? embed.html : (section.html !== undefined ? section.html : (featuresData[slug] && featuresData[slug].html) || '');
    const rawCss = embed ? embed.css : (section.css !== undefined ? section.css : (featuresData[slug] && featuresData[slug].css) || '');
    const rawJs = embed ? embed.js : (section.js !== undefined ? section.js : (featuresData[slug] && featuresData[slug].js) || '');

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
    const isPreloader = slug.includes('preloader') || (section.category && section.category.toLowerCase().includes('preloader'));
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
    const nativeAttr = (nativeList.length ? ` data-native-for="${nativeList.join(' ')}"` : '') + ((options.ownPalette || {})[slug] ? ' data-own-palette="true"' : '');
    sectionHtmlBlocks.push(`  <!-- Section: ${slug} -->\n${anchorSpan(anchors[id], id)}  <section class="page-section${preloaderClass}${section.sticky === true ? ' is-sticky' : ''}${!isPreloader && sectionThemeAttr(isDark, nativeList) === 'dark' ? ' dark' : ''}" id="${id}" data-section-slug="${slug}" data-theme="${sectionThemeAttr(isDark, nativeList)}"${nativeAttr}${styleAttr}>\n    ${isolatedHtml}${overlayHtml}${resizeHandleHtml}\n  </section>`);

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
    scriptBlocks.push(`        // Preloader Auto-Dismiss Handler
        try {
          (function() {
            function initPreloaderWatch() {
              const sec = document.querySelector('.page-section.is-preloader:not(.is-suppressed), .page-section[data-section-slug*="preloader"]:not(.is-suppressed)');
              if (!sec) return;
              function dismiss() {
                sec.classList.add('is-dismissed');
                sec.style.opacity = '0';
                sec.style.pointerEvents = 'none';
                setTimeout(() => { sec.style.display = 'none'; }, 500);
              }
              const checkDone = () => {
                const root = sec.querySelector('[data-phase="done"], [data-completed="true"], [data-state="done"]');
                const gate = sec.querySelector('.amr-gate, .scp-gate, [class*="-gate"]');
                if (root || (gate && window.getComputedStyle(gate).display === 'none')) {
                  dismiss();
                  return true;
                }
                return false;
              };
              const obs = new MutationObserver(() => {
                if (checkDone()) obs.disconnect();
              });
              obs.observe(sec, { attributes: true, subtree: true, attributeFilter: ['data-phase', 'data-completed', 'class', 'style'] });
              sec.addEventListener('click', () => { setTimeout(dismiss, 1000); });
              setTimeout(() => { if (sec.style.display !== 'none') dismiss(); }, 5000);
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initPreloaderWatch);
            } else {
              initPreloaderWatch();
            }
          })();
        } catch (e) {}`);
  }

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
    (function () {
      // Dynamic live theme updates via postMessage
      window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return; // only the builder that framed this preview may restyle it
        if (event.data && event.data.type === 'UPDATE_THEME' && event.data.theme) {
          var t = event.data.theme;
          var okColour = function (v) { return typeof v === 'string' && /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\\([0-9\\s.,%\\/-]+\\)|[a-zA-Z]{3,20})$/.test(v.trim()) ? v.trim() : ''; };
          t = { bg: okColour(t.bg), text: okColour(t.text), accent: okColour(t.accent), cardBg: okColour(t.cardBg), border: okColour(t.border) };
          var isDark = t.bg ? (function(hex) {
            hex = String(hex).replace('#', '');
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            var r = parseInt(hex.slice(0, 2), 16) || 0;
            var g = parseInt(hex.slice(2, 4), 16) || 0;
            var b = parseInt(hex.slice(4, 6), 16) || 0;
            return (r * 0.299 + g * 0.587 + b * 0.114) < 70;
          })(t.bg) : true;

          var textMuted = 'color-mix(in srgb, ' + t.text + ' 65%, transparent)';
          var cardBg = t.cardBg || (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)');
          var border = t.border || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
          var accent = t.accent || '#6366f1';

          var vars = {
            '--preview-bg': t.bg,
            '--preview-text': t.text,
            '--preview-accent': accent,
            '--preview-card-bg': cardBg,
            '--preview-border': border,
            '--background': t.bg,
            '--foreground': t.text,
            '--bg': t.bg,
            '--text': t.text,
            '--accent': accent,
            '--card': cardBg,
            '--card-foreground': t.text,
            '--border': border,
            '--primary': accent,
            '--muted': cardBg,
            '--muted-foreground': textMuted,
            '--bg-color': t.bg,
            '--text-color': t.text,
            '--text-main': t.text,
            '--text-muted': textMuted,
            '--card-bg': cardBg,
            '--card-border': border,
            '--pl-bg': t.bg,
            '--pl-ink': t.text,
            '--pl-muted': textMuted,
            '--bwf-bg': t.bg,
            '--bwf-ink': t.text,
            '--bwf-muted': textMuted,
            '--ib-page': t.bg,
            '--ib-paper': cardBg,
            '--ib-card': cardBg,
            '--ib-ink': t.text,
            '--ib-soft': textMuted,
            '--ib-line': border,
            '--ip-page': t.bg,
            '--ip-paper': cardBg,
            '--ip-card': cardBg,
            '--ip-ink': t.text,
            '--ip-soft': textMuted,
            '--ip-line': border
          };
          for (var k in vars) {
            if (vars[k]) document.documentElement.style.setProperty(k, vars[k]);
          }
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
          document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
          if (document.body) document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
          var pagePol = isDark ? 'dark' : 'light';
          var isNativeEl = function (el) {
            var host = el.closest ? el.closest('.page-section[data-native-for]') : null;
            return !!host && (host.getAttribute('data-native-for') || '').split(' ').indexOf(pagePol) !== -1;
          };
          document.querySelectorAll('.page-section:not(.is-preloader)').forEach(function (s) {
            var native = isNativeEl(s);
            s.style.backgroundColor = native ? '' : (t.bg || '');
            s.style.color = native ? '' : (t.text || '');
            s.setAttribute('data-theme', native ? (isDark ? 'light' : 'dark') : pagePol);
            if (s.classList && typeof s.classList.toggle === 'function') s.classList.toggle('dark', (native ? (isDark ? 'light' : 'dark') : pagePol) === 'dark');
          });
          document.querySelectorAll('[data-theme]').forEach(function (el) {
            el.setAttribute('data-theme', isNativeEl(el) ? (isDark ? 'light' : 'dark') : pagePol);
          });
          try {
            window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: isDark, theme: t } }));
          } catch (_) {}
        }
      });

      // Theme-Aware MatchMedia Polyfill for prefers-color-scheme in live preview
      (function () {
        var origMatchMedia = window.matchMedia;
        window.matchMedia = function (query) {
          if (typeof query === 'string' && query.includes('prefers-color-scheme')) {
            var checkIsDark = function () {
              var attr = document.documentElement.getAttribute('data-theme');
              if (attr) return attr === 'dark';
              var cs = document.documentElement.style.colorScheme;
              if (cs) return cs === 'dark';
              return true;
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

      // Preview is a static mock-up: links and form buttons stay clickable but never navigate the frame away
      // (a navigation replaces the preview with a blank page until the builder is reloaded).
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href], area[href]');
        if (!a) return;
        e.preventDefault();
        var href = a.getAttribute('href') || '';
        if (href.charAt(0) === '#' && href.length > 1) {
          try {
            var t = document.getElementById(decodeURIComponent(href.slice(1)));
            if (t) t.scrollIntoView({ behavior: 'smooth' });
          } catch (_) {}
        }
      }, true);
      document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

      // Notify parent builder when a section is clicked in preview
      document.addEventListener('click', function (e) {
        var sec = e.target.closest('.page-section');
        if (sec && sec.id && window.parent) {
          window.parent.postMessage({ type: 'SECTION_CLICKED', sectionId: sec.id }, '*'); // postmessage-ok: only a section id, and the preview's origin can be opaque
        }
      });

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

      function initAllSections() {
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
 * "Native palette" sections. Some components are designed for one polarity (a dark footer, a cream
 * editorial grid). Forcing the page theme onto them leaves unreadable text, so a component can declare
 * `nativeWhen: ["light"]` in meta.json: when the page theme is light, that section keeps rendering with
 * the dark preset (and vice versa) instead of following the page.
 * `nativeMap` is { slug: ['light'] | ['dark'] | ['light','dark'] }.
 */
const NATIVE_PRESET_FOR_PAGE = { light: 'midnight-dark', dark: 'clean-minimal' };

function nativePolarities(nativeMap, slug) {
  const v = nativeMap && nativeMap[slug];
  return Array.isArray(v) ? v.filter(p => p === 'light' || p === 'dark') : [];
}

/**
 * The page polarities under which a section keeps its own palette. A section can override the component's default:
 * `themeMode: 'match'` follows every page theme, `themeMode: 'keep'` keeps the colours it was designed in
 * (`designPolarity`) under the opposite page theme.
 */
function sectionNativeList(section, nativeMap) {
  if (section && section.themeMode === 'match') return [];
  if (section && section.themeMode === 'keep') return [section.designPolarity === 'light' ? 'dark' : 'light'];
  return nativePolarities(nativeMap, section && section.slug);
}

/** Value for a section's data-theme attribute: the opposite polarity when it is native under the page theme. */
function sectionThemeAttr(pageIsDark, nativeList) {
  const pagePol = pageIsDark ? 'dark' : 'light';
  if (nativeList.includes(pagePol)) return pageIsDark ? 'light' : 'dark';
  return pagePol;
}

/** CSS that re-scopes the theme variables of native sections to their own palette. */
function renderNativePaletteCss(sections, nativeMap) {
  const blocks = [];
  (Array.isArray(sections) ? sections : []).forEach((sec, index) => {
    const id = sec.id || `sec-${index + 1}`;
    sectionNativeList(sec, nativeMap).forEach(pol => {
      const local = THEME_PRESETS[NATIVE_PRESET_FOR_PAGE[pol]];
      const m = generateUniversalThemeStyles(local).match(/:root\s*\{([\s\S]*?)\n    \}/);
      if (!m) return;
      blocks.push(`:root[data-theme="${pol}"] .page-section#${id}[data-native-for~="${pol}"] {${m[1]}\n      background-color: ${local.bg};\n      color: ${local.text};\n      color-scheme: ${pol === 'light' ? 'dark' : 'light'};\n    }`);
    });
  });
  return blocks.length ? `/* Native-palette sections */\n${blocks.join('\n')}\n` : '';
}

/**
 * Page-level settings (title, description, favicon, fonts) -> head tags and CSS.
 * @param {object} [page]
 * @param {string} [fallbackTitle]
 */
/** Organization / LocalBusiness data for search engines; '' when the page has no business type or name. */
function renderJsonLd(page = {}, title = '') {
  if (page.bizType !== 'Organization' && page.bizType !== 'LocalBusiness') return '';
  const name = String(page.bizName || '').trim();
  if (!name) return '';
  const absolute = (v) => { const s = String(v || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ''; };
  const data = { '@context': 'https://schema.org', '@type': page.bizType, name };
  if (absolute(page.canonical)) data.url = absolute(page.canonical);
  if (absolute(page.shareImage)) data.image = absolute(page.shareImage);
  if (String(page.description || '').trim()) data.description = String(page.description).trim();
  if (String(page.bizPhone || '').trim()) data.telephone = String(page.bizPhone).trim();
  if (validEmail(page.bizEmail)) data.email = String(page.bizEmail).trim();
  if (String(page.bizAddress || '').trim()) data.address = String(page.bizAddress).trim();
  // '<' is escaped so no value can close the script tag
  return '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
}

/**
 * Content-Security-Policy for the ZIP export. Scripts may only come from the page itself and the CDNs the page really
 * uses; inline event handlers, inline scripts or eval need a weaker rule and are named in `reasons` so the README can say so.
 */
function renderCsp(indexHtml = '', scriptJs = '', opts = {}) {
  const reasons = [];
  const hosts = new Set();
  const scriptSrcRe = /<script\b[^>]{0,500}\bsrc\s*=\s*["'](?:https?:)?\/\/([^/"']+)/gi;
  let m;
  while ((m = scriptSrcRe.exec(indexHtml))) hosts.add(m[1].toLowerCase());
  const importRe = /\bimport\s*\(\s*["'`]https?:\/\/([^/"'`]+)/g;
  while ((m = importRe.exec(scriptJs))) hosts.add(m[1].toLowerCase());
  const body = String(indexHtml).replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const scriptSrc = ["'self'", ...hosts];
  if (/\son[a-z]+\s*=\s*["']/i.test(body) || /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(body)) {
    scriptSrc.push("'unsafe-inline'");
    reasons.push('inline scripts or event handlers in a section');
  }
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(scriptJs)) {
    scriptSrc.push("'unsafe-eval'");
    reasons.push('eval() in a section script');
  }
  // Connections: when the page has message forms and no section script makes network calls of its own, only this site and the known
  // form services (plus the own address chosen for the forms) are allowed, so a script that slips in cannot send data anywhere else.
  const ownScript = opts.runtimeJs ? String(scriptJs).split(opts.runtimeJs).join('') : String(scriptJs);
  const networkRe = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/;
  const narrowConnect = !!opts.formsReady && !networkRe.test(ownScript) && !networkRe.test(body);
  const connectSrc = narrowConnect
    ? ["'self'", 'https://formsubmit.co', 'https://formspree.io', 'https://api.web3forms.com'].concat(opts.customHost ? [opts.customHost] : [])
    : ["'self'", 'https:', 'data:', 'blob:'];
  const policy = [
    "default-src 'self'",
    'script-src ' + scriptSrc.join(' '),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' data: blob: https:",
    'connect-src ' + connectSrc.join(' '),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:"
  ].join('; ');
  return { policy, strict: reasons.length === 0, reasons, narrowConnect };
}

/**
 * Links to other pages of a multi-page site are stored as "page:<id>". `links` maps a page id to its file name
 * ("about.html"); without a match (the preview, or a deleted page) the link becomes "#".
 */
function resolvePageLink(value, links = {}) {
  const m = /^page:([A-Za-z0-9_-]+)$/.exec(String(value || '').trim());
  return m ? (links[m[1]] || '#') : value;
}

/** A copy of the sections with every "page:<id>" link (Content-tab links and widget buttons) resolved. */
function mapPageLinks(sections, links = {}) {
  const LINK_KEYS = ['link', 'ctaLink'];
  return (Array.isArray(sections) ? sections : []).map(sec => {
    let changed = false;
    const out = { ...sec };
    if (sec.overrides) {
      out.overrides = {};
      Object.entries(sec.overrides).forEach(([k, o]) => {
        if (o && o.type === 'link' && /^page:/.test(String(o.value || ''))) { out.overrides[k] = { ...o, value: resolvePageLink(o.value, links) }; changed = true; }
        else out.overrides[k] = o;
      });
    }
    if (Array.isArray(sec.elements)) {
      out.elements = sec.elements.map(el => {
        const fix = {};
        LINK_KEYS.forEach(k => { if (typeof el[k] === 'string' && /^page:/.test(el[k])) { fix[k] = resolvePageLink(el[k], links); changed = true; } });
        return Object.keys(fix).length ? { ...el, ...fix } : el;
      });
    }
    return changed ? out : sec;
  });
}

/** How a section's title and category are found when the stack item does not carry them (the builder's registry, or the loaded feature files). */
function sectionLookups(featuresData) {
  const registry = typeof window !== 'undefined' && Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY : [];
  const bySlug = {};
  registry.forEach(f => { bySlug[f.slug] = f; });
  return {
    titleOf: s => s.title || (featuresData[s.slug] && (featuresData[s.slug].title || featuresData[s.slug].name)) || (bySlug[s.slug] && bySlug[s.slug].title) || s.slug,
    categoryOf: s => (featuresData[s.slug] && featuresData[s.slug].category) || (bySlug[s.slug] && bySlug[s.slug].category) || ''
  };
}

/** Anchor names for the sections (scripts/builder/anchors.js); {} when that file is not loaded. */
function anchorNames(sections, featuresData, reserved) {
  const A = (typeof module !== 'undefined' && module.exports) ? require('./builder/anchors.js') : (typeof window !== 'undefined' ? window.BuilderAnchors : null);
  if (!A) return {};
  return A.assign(sections, Object.assign({ reserved }, sectionLookups(featuresData)));
}

/** The items an automatic menu lists (scripts/builder/menu.js): [{ id, label, anchor }]; [] when that file is not loaded. */
function menuItems(sections, names, featuresData) {
  const M = (typeof module !== 'undefined' && module.exports) ? require('./builder/menu.js') : (typeof window !== 'undefined' ? window.BuilderMenu : null);
  return M ? M.items(sections, names, sectionLookups(featuresData || {})) : [];
}

/** The invisible target that "#name" scrolls to: just before its section, which keeps its own id. */
function anchorSpan(name, sectionId) {
  return name ? `  <span class="edv-anchor" id="${name}" data-for="${sectionId}"></span>\n` : '';
}

/** Keeps a sticky header from covering the title of the section a menu link scrolls to. */
const ANCHOR_CSS = '.edv-anchor{display:block;height:0;scroll-margin-top:80px}';

/** Fills in the menu items that go nowhere with the section their text names (scripts/builder/anchors.js); a function that changes nothing without anchors. */
function navLinker(anchors, options, menuList) {
  const A = (typeof module !== 'undefined' && module.exports) ? require('./builder/anchors.js') : (typeof window !== 'undefined' ? window.BuilderAnchors : null);
  const M = (typeof module !== 'undefined' && module.exports) ? require('./builder/menu.js') : (typeof window !== 'undefined' ? window.BuilderMenu : null);
  const names = Object.values(anchors || {});
  if (!A || !names.length) return (html) => html;
  const o = options || {};
  return (html, section) => {
    let note = '';
    // a header set to list the page's sections writes its items first; they are links already, so the steps below leave them alone
    if (M && section && section.menuMode === 'auto' && /\sdata-edv-menu\b/.test(html)) {
      const r = M.fill(html, menuList || []);
      html = r.html;
      if (r.overflow.length) note = '\n' + A.overflowNote(r.overflow);
    }
    const linked = A.linkNav(html, names);
    if (o.keepUnlinkedNav) return linked + note;
    // an export leaves out the menu items that still go nowhere (counting the addresses set in the admin panel); a note tells the page checks
    const r = A.hideUnlinked(linked, A.linkedItems(section && section.overrides));
    return (r.hidden.length ? r.html + '\n' + A.hiddenNote(r.hidden) : r.html) + note;
  };
}

/** The shared guide text (scripts/deploy-guide.js): a require in Node, a script tag in the builder. */
/** Where form messages go (scripts/form-delivery.js); null when that file is not loaded. */
function formDelivery() {
  return (typeof module !== 'undefined' && module.exports) ? require('./form-delivery.js') : (typeof window !== 'undefined' ? window.FormDelivery : null) || null;
}

function deployGuide() {
  return (typeof module !== 'undefined' && module.exports) ? require('./deploy-guide.js') : window.DeployGuide;
}

/** Web address of the live page when it is a plain https:// or http:// address, else ''. */
function originOf(canonical) {
  const c = String(canonical || '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(c) ? c.replace(/^(https?:\/\/[^/]+).*$/i, '$1') : '';
}

function validEmail(v) {
  return /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]+$/.test(String(v || '').trim()) && !/[\r\n]/.test(String(v));
}

/** A "page not found" page the host shows for unknown addresses. Absolute links, because it is served at any path. */
function render404(page = {}) {
  const name = escapeHtml((page.title || '').trim() || 'This site');
  const lang = escapeHtml((page.lang || 'en').trim() || 'en');
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <meta name="robots" content="noindex">\n  <title>Page not found | ${name}</title>\n  <link rel="stylesheet" href="/style.css">\n</head>\n<body>\n  <main style="max-width:36rem;margin:15vh auto;padding:0 1rem;text-align:center">\n    <h1>Page not found</h1>\n    <p>The page you were looking for is not here. It may have moved.</p>\n    <p><a href="/">Go to the home page</a></p>\n  </main>\n</body>\n</html>\n`;
}

/** RFC 9116 contact file. Needs a valid email; expires one year after the export so it never goes stale unnoticed. */
function renderSecurityTxt(page = {}, now = new Date()) {
  const d = new Date(now); d.setUTCFullYear(d.getUTCFullYear() + 1);
  const origin = originOf(page.canonical);
  return `Contact: mailto:${String(page.bizEmail).trim()}\nExpires: ${d.toISOString().replace(/\.\d+Z$/, 'Z')}\nPreferred-Languages: ${String(page.lang || 'en').trim() || 'en'}\n` + (origin ? `Canonical: ${origin}/.well-known/security.txt\n` : '');
}

/** Names of the helper files that ride along with index.html in every download (the ZIP code copies whichever exist). */
const SITE_EXTRA_FILES = ['robots.txt', 'sitemap.xml', 'favicon.svg', 'site.webmanifest', '_headers', 'DEPLOY.md', 'DEPLOY.html', '404.html', '.well-known/security.txt'];

/** Host helper files: cache and security headers for Netlify / Cloudflare Pages, and plain deploy steps. */
function renderDeployFiles(page = {}, opts = {}) {
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`;
  const guide = deployGuide();
  const addr = originOf(page.canonical);
  const files = {
    '_headers': headers,
    'DEPLOY.md': guide.markdown({ address: addr }),
    'DEPLOY.html': guide.html({ address: addr }),
    '404.html': render404(page)
  };
  if (validEmail(page.bizEmail)) files['.well-known/security.txt'] = renderSecurityTxt(page, opts.now);
  return files;
}

/** robots.txt and sitemap.xml for a single-page export. The sitemap needs the live address, so it is skipped without one. */
function renderSiteFiles(page = {}, pageFiles = null) {
  const canonical = String(page.canonical || '').trim();
  const url = /^https?:\/\/[^\s"'<>]+$/i.test(canonical) ? canonical : '';
  const files = {};
  const icon = emojiFavicon(page);
  if (icon) {
    const name = (page.title || '').trim() || 'My site';
    files['favicon.svg'] = icon + '\n';
    files['site.webmanifest'] = JSON.stringify({ name, short_name: name.slice(0, 12), icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }], display: 'browser' }, null, 2) + '\n';
  }
  if (page.robots === 'noindex') {
    files['robots.txt'] = 'User-agent: *\nDisallow: /\n';
    return files;
  }
  const origin = url ? url.replace(/^(https?:\/\/[^/]+).*$/i, '$1') : '';
  files['robots.txt'] = 'User-agent: *\nAllow: /\n' + (origin ? `\nSitemap: ${origin}/sitemap.xml\n` : '');
  if (url) {
    // one address per page: the home page is the live address itself, the others sit next to it
    const dir = url.replace(/[^/]*$/, '');
    const locs = Array.isArray(pageFiles) && pageFiles.length > 1
      ? pageFiles.map(f => (f === 'index.html' ? (/\.html?$/i.test(url) ? url : dir) : dir + f))
      : [url];
    files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map(l => `  <url><loc>${escapeHtml(l)}</loc></url>`).join('\n')}\n</urlset>\n`;
  }
  return files;
}

/** An emoji favicon becomes a real favicon.svg (and a web manifest) in an export; an image URL stays as it is. */
function emojiFavicon(page = {}) {
  const fav = (page.favicon || '').trim();
  if (!fav || /^(https?:|data:|\/|\.\/|[\w-]+\/)/i.test(fav) && !/^\p{Extended_Pictographic}/u.test(fav)) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${escapeHtml(fav)}</text></svg>`;
}

function renderPageHead(page = {}, fallbackTitle = 'Assembled Web Page', opts = {}) {
  const title = (page.title || '').trim() || fallbackTitle;
  const tags = [`<title>${escapeHtml(title)}</title>`];
  if ((page.description || '').trim()) {
    tags.push(`<meta name="description" content="${escapeHtml(page.description.trim())}">`);
  }

  // Sharing and search tags. Only absolute https:// (or http://) addresses are written: a relative share image
  // or canonical link is ignored by every crawler.
  const absolute = (v) => { const s = String(v || '').trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ''; };
  const description = (page.description || '').trim();
  tags.push(`<meta property="og:type" content="website">`, `<meta property="og:title" content="${escapeHtml(title)}">`);
  if (description) tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  const shareImage = absolute(page.shareImage);
  if (shareImage) tags.push(`<meta property="og:image" content="${escapeHtml(shareImage)}">`, '<meta name="twitter:card" content="summary_large_image">');
  const canonical = absolute(page.canonical);
  if (canonical) tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`, `<meta property="og:url" content="${escapeHtml(canonical)}">`);
  // translations: every page of a group lists all of them (and the original as x-default); hreflang needs full addresses
  (Array.isArray(page.alternates) ? page.alternates : []).slice(0, 40).forEach(a => {
    const href = absolute(a && a.href);
    if (href && a && (a.lang === 'x-default' || /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(a.lang || ''))) tags.push(`<link rel="alternate" hreflang="${escapeHtml(a.lang)}" href="${escapeHtml(href)}">`);
  });
  if (page.robots === 'noindex') tags.push('<meta name="robots" content="noindex, nofollow">');
  const jsonLd = renderJsonLd(page, title);
  if (jsonLd) tags.push(jsonLd);

  const fav = (page.favicon || '').trim();
  if (fav) {
    const isUrl = /^(https?:|data:|\/|\.\/|[\w-]+\/)/i.test(fav) && !/^\p{Extended_Pictographic}/u.test(fav);
    const href = isUrl
      ? fav
      : 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${escapeHtml(fav)}</text></svg>`);
    if (opts.siteFiles && emojiFavicon(page)) {
      tags.push('<link rel="icon" href="favicon.svg" type="image/svg+xml">', '<link rel="apple-touch-icon" href="apple-touch-icon.png">', '<link rel="manifest" href="site.webmanifest">');
    } else {
      tags.push(`<link rel="icon" href="${escapeHtml(href)}">`);
    }
  } else if (opts.siteFiles) {
    // no favicon chosen: an empty icon keeps browsers from requesting /favicon.ico and logging a 404
    tags.push('<link rel="icon" href="data:,">');
  }

  const families = [];
  const cssFamily = name => `'${String(name).replace(/['"\\<>;{}]/g, '')}'`;
  const cleanName = name => String(name || '').replace(/['"\\<>;{}]/g, '').trim();
  const display = cleanName(page.fontDisplay);
  const body = cleanName(page.fontBody);
  [display, body].filter(Boolean).forEach(n => {
    if (!families.includes(n)) families.push(n);
  });
  if (families.length) {
    const query = families.map(n => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&');
    tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    tags.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&display=swap">`);
  }

  const css = [];
  if (display) css.push(`:root { --font-display: ${cssFamily(display)}, system-ui, sans-serif; }`);
  if (body) css.push(`:root { --font-body: ${cssFamily(body)}, system-ui, sans-serif; }`);
  const radius = /^\d{1,3}(\.\d{1,2})?(px|rem|em)$/.test(String(page.radius || '').trim()) ? String(page.radius).trim() : '';
  if (radius) css.push(`:root { --radius: ${radius}; }`);
  if (display) css.push(`.page-section :is(h1, h2, h3, h4, h5, h6) { font-family: var(--font-display) !important; }`);
  if (body) css.push(`.page-section :is(p, li, a, span, button, label, input, textarea, blockquote, td, th, figcaption):not(code):not(pre) { font-family: var(--font-body) !important; }`);

  return { title, lang: /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(page.lang || '') ? page.lang : 'en', headTags: tags.join('\n  '), css: css.join('\n') };
}

/**
 * Client-content overrides: sections carry { fieldId: { selector, type, value, attr? } }.
 * Returns a flat list the runtime below applies inside each section.
 */
function collectOverrides(sections) {
  const out = [];
  // javascript:, vbscript: and non-image data: addresses never reach a link or an image, whoever typed them
  // (an imported project is cleaned the same way by scripts/project-sanitize.js)
  const safeUrl = (v) => {
    const probe = v.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
    return /^(javascript|vbscript):/.test(probe) || (/^data:/.test(probe) && !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/.test(probe)) ? '#' : v;
  };
  (Array.isArray(sections) ? sections : []).forEach(sec => {
    Object.entries(sec.overrides || {}).forEach(([fieldId, o]) => {
      if (o && typeof o === 'object' && o.selector && o.value !== undefined && o.value !== '') {
        const type = o.type || 'text';
        const value = type === 'link' || type === 'image' ? safeUrl(String(o.value)) : String(o.value);
        out.push({ section: sec.id, field: fieldId, selector: o.selector, type, attr: o.attr || '', value });
      }
    });
  });
  return out;
}


/**
 * Runtime shared by preview and export: WebGL canvases that are on the page but scrolled out of view skip their
 * draw calls. A page with many WebGL sections otherwise paints all of them every frame (3 fps with six on a
 * software renderer). Canvases that are hidden or have no size keep drawing, because they may be used as a texture.
 */
const OFFSCREEN_RUNTIME = `(function () {
  if (typeof IntersectionObserver === 'undefined') return;
  var visible = new WeakMap();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
  }, { rootMargin: '300px 0px' });
  // A section's canvas is judged by its section: a full-screen position:fixed background belongs to the section
  // it came from, so it pauses while that section is out of view.
  function skip(canvas) {
    if (!canvas || !canvas.isConnected) return false;
    var target = (canvas.closest && canvas.closest('.page-section')) || canvas;
    if (!visible.has(target)) { visible.set(target, true); io.observe(target); return false; }
    if (visible.get(target) !== false) return false;
    var r = target.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  ['WebGLRenderingContext', 'WebGL2RenderingContext'].forEach(function (name) {
    var proto = window[name] && window[name].prototype;
    if (!proto) return;
    ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements'].forEach(function (fn) {
      var orig = proto[fn];
      if (typeof orig !== 'function') return;
      proto[fn] = function () { if (skip(this.canvas)) return; return orig.apply(this, arguments); };
    });
  });
})();`;


/**
 * Review overlay for "review copies": a client opens the exported page, switches on Review, clicks anything to
 * leave a comment, and downloads the comments as a JSON file to send back. No server: comments live in the
 * browser (localStorage) until downloaded. The builder loads that file to jump to each comment.
 */
const REVIEW_RUNTIME = `(function () {
  if (window.__reviewOverlay) return;
  window.__reviewOverlay = true;
  var KEY = 'review-comments:' + location.pathname;
  var NAME_KEY = 'review-author';
  var comments = [];
  var on = false;
  var hovered = null;

  function store(read, value) {
    try { if (read) return localStorage.getItem(KEY); localStorage.setItem(KEY, value); } catch (e) { return null; }
  }
  try { comments = JSON.parse(store(true) || '[]') || []; } catch (e) { comments = []; }

  var css = document.createElement('style');
  css.textContent = '#rv-root,#rv-root *{box-sizing:border-box;font-family:system-ui,sans-serif}'
    + '#rv-root{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483000}'
    + '.rv-fab{position:fixed;left:16px;bottom:16px;display:flex;gap:8px;align-items:center;padding:10px 16px;border:0;border-radius:999px;background:#111;color:#fff;font:600 14px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer}'
    + '.rv-fab[aria-pressed=true]{background:#2563eb}'
    + '.rv-fab b{background:#fff;color:#111;border-radius:999px;padding:0 7px;font-size:12px}'
    + '.rv-hover{outline:2px solid #2563eb!important;outline-offset:2px;cursor:crosshair!important}'
    + '.rv-pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#2563eb;color:#fff;font:700 12px system-ui;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.4);cursor:pointer;padding:0}'
    + '.rv-pop,.rv-list{position:fixed;background:#fff;color:#111;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:14px;font-size:14px}'
    + '.rv-pop{width:300px}.rv-pop textarea,.rv-pop input{width:100%;margin:6px 0;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;color:#111;background:#fff}'
    + '.rv-pop textarea{min-height:84px;resize:vertical}'
    + '.rv-row{display:flex;gap:8px;justify-content:flex-end}.rv-btn{padding:8px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;font:600 13px system-ui;cursor:pointer}.rv-btn.rv-ghost{background:#e2e8f0;color:#111}'
    + '.rv-list{left:16px;bottom:68px;width:340px;max-height:60vh;overflow:auto}.rv-list h2{margin:0 0 8px;font-size:15px}.rv-list ol{margin:0;padding:0;list-style:none}'
    + '.rv-item{border-top:1px solid #e2e8f0;padding:8px 0;display:grid;gap:4px}.rv-item small{color:#64748b}.rv-item button{justify-self:start;border:0;background:none;color:#2563eb;font:600 12px system-ui;cursor:pointer;padding:0}'
    + '.rv-empty{color:#64748b;margin:6px 0 10px}';
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'rv-root';
  document.body.appendChild(root);
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'rv-fab'; fab.setAttribute('aria-pressed', 'false');
  root.appendChild(fab);
  var pins = [];
  var pop = null;
  var list = null;

  function inRoot(el) { return !!(el && el.closest && el.closest('#rv-root')); }
  function sectionOf(el) { return el && el.closest ? el.closest('.page-section') : null; }
  function pathWithin(section, el) {
    var parts = [];
    while (el && el !== section && parts.length < 10) {
      var tag = el.tagName.toLowerCase();
      var idx = 1, sib = el;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === el.tagName) idx++;
      parts.unshift(tag + ':nth-of-type(' + idx + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function findEl(c) {
    var s = document.getElementById(c.section.id);
    if (!s) return null;
    if (!c.path) return s;
    try { return s.querySelector(':scope > ' + c.path) || s; } catch (e) { return s; }
  }
  function save() { store(false, JSON.stringify(comments)); }
  function label() { fab.innerHTML = (on ? 'Reviewing' : 'Review') + ' <b>' + comments.length + '</b>'; fab.setAttribute('aria-pressed', String(on)); }

  function placePins() {
    pins.forEach(function (p) { p.remove(); });
    pins = [];
    comments.forEach(function (c, i) {
      var el = findEl(c);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rv-pin'; b.textContent = String(i + 1);
      b.title = c.comment;
      b.style.left = Math.round(r.right + window.pageXOffset - 6) + 'px';
      b.style.top = Math.round(r.top + window.pageYOffset + 6) + 'px';
      b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); openList(); });
      root.appendChild(b);
      pins.push(b);
    });
  }
  var raf = 0;
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; placePins(); }); }
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  setInterval(schedule, 1500);

  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(el, x, y) {
    closePop();
    var section = sectionOf(el);
    if (!section) return;
    pop = document.createElement('div');
    pop.className = 'rv-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Add a comment');
    pop.innerHTML = '<strong>Comment</strong><textarea placeholder="What should change here?" aria-label="Comment"></textarea><input type="text" placeholder="Your name" aria-label="Your name"><div class="rv-row"><button type="button" class="rv-btn rv-ghost">Cancel</button><button type="button" class="rv-btn">Save</button></div>';
    pop.style.left = Math.max(8, Math.min(x, window.innerWidth - 316)) + 'px';
    pop.style.top = Math.max(8, Math.min(y, window.innerHeight - 250)) + 'px';
    root.appendChild(pop);
    var ta = pop.querySelector('textarea'), nm = pop.querySelector('input'), btns = pop.querySelectorAll('button');
    try { nm.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
    ta.focus();
    btns[0].addEventListener('click', closePop);
    btns[1].addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      try { localStorage.setItem(NAME_KEY, nm.value.trim()); } catch (e) {}
      comments.push({
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        section: { id: section.id, slug: section.getAttribute('data-section-slug') || '' },
        path: pathWithin(section, el),
        text: (el.innerText || el.alt || '').trim().slice(0, 80),
        comment: text, author: nm.value.trim(), at: new Date().toISOString()
      });
      save(); label(); closePop(); placePins();
    });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closePop(); } });
  }

  function exportJson() {
    return JSON.stringify({ format: 'web-builder-review', version: 1, page: document.title, url: location.href.split('#')[0], exportedAt: new Date().toISOString(), comments: comments }, null, 2);
  }
  function exportText() {
    return document.title + ' - review comments\\n\\n' + comments.map(function (c, i) { return (i + 1) + '. [' + (c.section.slug || 'page') + '] ' + c.comment + (c.author ? ' (' + c.author + ')' : '') + (c.text ? '\\n   on: "' + c.text + '"' : ''); }).join('\\n');
  }
  function closeList() { if (list) { list.remove(); list = null; } }
  function openList() {
    closeList();
    list = document.createElement('div');
    list.className = 'rv-list';
    list.setAttribute('role', 'dialog'); list.setAttribute('aria-label', 'Comments');
    var html = '<h2>Comments (' + comments.length + ')</h2>' + (comments.length ? '<ol>' : '<p class="rv-empty">Switch on Review, then click anything on the page to comment on it.</p>');
    comments.forEach(function (c, i) {
      html += '<li class="rv-item"><span><b>' + (i + 1) + '.</b> <span data-t></span></span><small data-s></small><button type="button" data-del="' + i + '">Delete</button></li>';
    });
    html += comments.length ? '</ol>' : '';
    html += '<div class="rv-row" style="margin-top:10px"><button type="button" class="rv-btn rv-ghost" data-act="copy">Copy text</button><button type="button" class="rv-btn" data-act="download">Download comments</button></div>';
    html += '<p class="rv-note" style="margin:8px 0 0;font-size:11px;opacity:.7">Comments are saved only in this browser until you download them. Nothing is sent anywhere.</p>';
    list.innerHTML = html;
    var spans = list.querySelectorAll('[data-t]');
    var metas = list.querySelectorAll('[data-s]');
    comments.forEach(function (c, i) { spans[i].textContent = c.comment; metas[i].textContent = (c.section.slug || 'page') + (c.author ? ' \u00b7 ' + c.author : ''); });
    list.addEventListener('click', function (e) {
      var d = e.target.getAttribute && e.target.getAttribute('data-del');
      if (d !== null && d !== undefined) { comments.splice(Number(d), 1); save(); label(); placePins(); openList(); return; }
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'download') {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }));
        a.download = 'review-comments.json'; document.body.appendChild(a); a.click(); a.remove();
      } else if (act === 'copy') {
        var text = exportText();
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
      }
    });
    list.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeList(); });
    root.appendChild(list);
  }

  function setOn(v) {
    on = v; label();
    document.body.classList.toggle('rv-on', on);
    if (!on) { if (hovered) hovered.classList.remove('rv-hover'); hovered = null; closePop(); }
  }
  fab.addEventListener('click', function () { if (list) { closeList(); } else { openList(); } });
  fab.addEventListener('dblclick', function () { setOn(!on); });
  fab.addEventListener('keydown', function (e) { if (e.key === 'r' || e.key === 'R') setOn(!on); });
  document.addEventListener('mouseover', function (e) {
    if (!on || inRoot(e.target) || !sectionOf(e.target)) return;
    if (hovered) hovered.classList.remove('rv-hover');
    hovered = e.target; hovered.classList.add('rv-hover');
  });
  document.addEventListener('click', function (e) {
    if (!on || inRoot(e.target) || !sectionOf(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    openPop(e.target, e.clientX + 12, e.clientY + 12);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); closeList(); if (on) setOn(false); } });
  label();
  // a first-time hint: the button toggles the list, and a toggle for review mode sits next to it
  var toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'rv-fab'; toggle.style.left = '130px'; toggle.textContent = 'Comment mode';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', function () { setOn(!on); toggle.setAttribute('aria-pressed', String(on)); toggle.textContent = on ? 'Stop commenting' : 'Comment mode'; });
  root.appendChild(toggle);
  placePins();
})();`;

/** Runtime shared by preview and export: defines window.__setOverrides(list). */
const OVERRIDES_RUNTIME = `(function () {
  var list = [];
  // What each element held before an override touched it, so removing the override (Reset, undo) puts it back.
  var originals = [];
  function original(el) {
    for (var i = 0; i < originals.length; i++) if (originals[i].el === el) return originals[i];
    var rec = { el: el, saved: {} };
    originals.push(rec);
    return rec;
  }
  function remember(el, key, read) {
    var rec = original(el);
    if (!(key in rec.saved)) rec.saved[key] = read();
    return key;
  }
  function restore(el, key, value) {
    if (key === 'html') el.innerHTML = value;
    else if (key === 'src') { if (value === null) el.removeAttribute('src'); else el.setAttribute('src', value); }
    else if (key === 'alt' || key === 'aria-label' || key === 'role') { if (value === null) el.removeAttribute(key); else el.setAttribute(key, value); }
    else if (key === 'srcset') { if (value === null) el.removeAttribute('srcset'); else el.setAttribute('srcset', value); }
    else if (key === 'href') { if (value === null) el.removeAttribute('href'); else el.setAttribute('href', value); }
    else if (key === 'svgpic') { if (value && value.parentNode) value.parentNode.removeChild(value); el.__cmsPic = null; }
    else if (key.indexOf('style:') === 0) { if (value) el.style.setProperty(key.slice(6), value); else el.style.removeProperty(key.slice(6)); }
  }
  var STYLED = /^(SPAN|B|I|EM|STRONG|SMALL|MARK|U|SUB|SUP)$/;
  // A child whose words belong to the field: a plain styled run (the gradient half of a headline), nothing inside it
  // but more of the same and line breaks. Decorative runs (an icon font glyph) are not words; links, buttons, icons
  // and pictures stay as they are too.
  function styledRun(c) {
    if (!STYLED.test(c.tagName) || c.getAttribute('aria-hidden') === 'true' || /icon|glyph/i.test(c.getAttribute('class') || '')) return false;
    for (var k = c.firstElementChild; k; k = k.nextElementSibling) if (k.tagName !== 'BR' && !styledRun(k)) return false;
    return true;
  }
  // What an element says in reading order, in lines that a <br> ends. A part is a text node we may change, or
  // { fixed: words } for an element that keeps its own words (a link): it counts as text but is never changed.
  function textLines(el, lines) {
    lines = lines || [[]];
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) lines[lines.length - 1].push(n);
      else if (n.nodeType === 1 && n.tagName === 'BR') lines.push([]);
      else if (n.nodeType === 1 && styledRun(n)) textLines(n, lines);
      else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) lines[lines.length - 1].push({ fixed: n.textContent, node: n });
    }
    return lines;
  }
  function wordsOf(part) { return part.fixed !== undefined ? part.fixed : part.nodeValue; }
  // Puts newText where the old words were: what the old and new text share at the start and end stays where it was
  // (so a bold word nobody touched stays bold, a link stays), the part in between goes into the text node it starts in.
  function patchParts(parts, newText) {
    var old = parts.map(wordsOf).join('');
    if (old === newText) return;
    var p = 0, max = Math.min(old.length, newText.length);
    while (p < max && old.charAt(p) === newText.charAt(p)) p++;
    var s = 0;
    while (s < max - p && old.charAt(old.length - 1 - s) === newText.charAt(newText.length - 1 - s)) s++;
    var cutFrom = p, cutTo = old.length - s, insert = newText.slice(p, newText.length - s);
    var spans = [], at = 0;
    parts.forEach(function (t) { var w = wordsOf(t); spans.push({ t: t, from: at, to: at + w.length }); at += w.length; });
    var editable = spans.filter(function (x) { return x.t.fixed === undefined; });
    var target = null;
    // words replaced: the run the old words started in; words only added: the run they follow
    editable.forEach(function (x) { if (!target && x.from <= cutFrom && (cutFrom < x.to || (cutTo === cutFrom && cutFrom === x.to))) target = x; });
    if (!target) editable.forEach(function (x) { if (!target && x.from >= cutFrom) target = x; });
    if (!target) target = editable[editable.length - 1];
    editable.forEach(function (x) {
      var v = x.t.nodeValue, a = Math.min(Math.max(cutFrom, x.from) - x.from, v.length), b = Math.max(Math.min(cutTo, x.to) - x.from, 0);
      if (x === target) x.t.nodeValue = v.slice(0, a) + insert + v.slice(Math.max(a, b));
      else if (b > a) x.t.nodeValue = v.slice(0, a) + v.slice(b);
    });
  }
  // The line breaks and lines that an earlier edit added are ours to remove before the next edit.
  function dropMade(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.__cmsMade) el.removeChild(n);
      else if (n.nodeType === 1) dropMade(n);
    });
  }
  // Adds each line after the node "after" (or at the end of "parent" when there is none), a <br> before every one.
  function addLines(parent, after, rows) {
    var at = after ? after.nextSibling : null, box = after ? after.parentNode : parent;
    rows.forEach(function (row, i) {
      var nodes = [];
      if (after || i) nodes.push(document.createElement('br'));
      nodes.push(document.createTextNode(row));
      nodes.forEach(function (n) { n.__cmsMade = true; box.insertBefore(n, at); });
    });
  }
  // Replaces the words of an element without destroying elements inside it (a link, an icon, another editable field):
  // when it has child elements, the words in its own text and in plain styled runs (a gradient <span>) change.
  // A line break in the value goes to the next part of the text, the way the field shows it (one line per <br>).
  function setText(el, value) {
    dropMade(el);
    if (!el.children.length) {
      // no element inside: a new line in the value is a line break on the page
      var rows = String(value).split(/\\r?\\n/);
      if (rows.length === 1) { el.textContent = value; return; }
      el.textContent = '';
      addLines(el, null, rows);
      return;
    }
    // every edit starts from the words the page came with, not from the previous edit (the field is applied again
    // on each keystroke, and the changes of two edits would otherwise pile up)
    textLines(el).forEach(function (parts) {
      parts.forEach(function (t) {
        if (t.fixed !== undefined) return;
        if (t.__cmsWords === undefined) t.__cmsWords = t.nodeValue; else t.nodeValue = t.__cmsWords;
      });
    });
    // the blank source indentation at the ends of a line is not words; spaces between two parts are
    var lines = [];
    textLines(el).forEach(function (parts) {
      var from = 0, to = parts.length;
      while (from < to && !wordsOf(parts[from]).trim()) from++;
      while (to > from && !wordsOf(parts[to - 1]).trim()) to--;
      if (to > from) lines.push(parts.slice(from, to));
    });
    var editable = lines.filter(function (parts) { return parts.some(function (t) { return t.fixed === undefined; }); });
    if (!editable.length) {
      // the words live in a child (a button whose label is a <span>): change those, not add a second set next to them
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (c.textContent.trim()) { setText(c, value); return; }
      }
      el.insertBefore(document.createTextNode(value), el.firstChild);
      return;
    }
    var said = String(value).split(/\\r?\\n/);
    // more lines than the heading has: each extra one becomes a new line after the last, with a line break
    var extra = said.slice(lines.length);
    lines.forEach(function (parts, i) {
      if (parts.every(function (t) { return t.fixed !== undefined; })) return;
      var text = (i < said.length ? said[i] : '').replace(/\\s+/g, ' ').trim();
      if (parts.map(wordsOf).join('').replace(/\\s+/g, ' ').trim() === text) return;
      // work on the words alone: collapse the whitespace the way the page shows it, then patch
      var first = parts[0], last = parts[parts.length - 1];
      var lead = first.fixed === undefined && /^\\s/.test(first.nodeValue), tail = last.fixed === undefined && /\\s$/.test(last.nodeValue);
      parts.forEach(function (t) { if (t.fixed === undefined) t.nodeValue = t.nodeValue.replace(/\\s+/g, ' '); });
      if (first.fixed === undefined) first.nodeValue = first.nodeValue.replace(/^ /, '');
      if (last.fixed === undefined) last.nodeValue = last.nodeValue.replace(/ $/, '');
      patchParts(parts, text);
      if (lead) first.nodeValue = ' ' + first.nodeValue;
      if (tail) last.nodeValue = last.nodeValue + ' ';
    });
    if (extra.length) {
      var end = lines[lines.length - 1];
      end = end[end.length - 1];
      addLines(null, end.fixed !== undefined ? end.node : end, extra);
    }
  }
  // A picture's fit, from "cover", "contain" or "cover|50|20|150" (mode, focus x %, focus y %, zoom %).
  // The older words top, bottom, left, right and center still work as the focus.
  function fitFor(o) {
    var parts = String(o.value || '').split('|');
    var words = { center: [50, 50], top: [50, 0], bottom: [50, 100], left: [0, 50], right: [100, 50] };
    var x = 50, y = 50, z = 100;
    if (words[parts[1]]) { x = words[parts[1]][0]; y = words[parts[1]][1]; }
    else if (parts.length > 2) {
      x = Math.max(0, Math.min(100, Number(parts[1]))); y = Math.max(0, Math.min(100, Number(parts[2]))); z = Math.max(100, Math.min(400, Number(parts[3]) || 100));
      if (x !== x) x = 50; if (y !== y) y = 50;
    }
    return { mode: parts[0] === 'contain' ? 'contain' : 'cover', x: x, y: y, z: z };
  }
  // <img> (or the photo that replaced an SVG drawing): crop or fit, move the focus, zoom
  function fitImg(img, fit, track, keys) {
    var props = { 'object-fit': fit.mode, 'object-position': fit.x + '% ' + fit.y + '%' };
    if (fit.z > 100 && fit.mode === 'cover') { props['transform'] = 'scale(' + fit.z / 100 + ')'; props['transform-origin'] = fit.x + '% ' + fit.y + '%'; props['clip-path'] = 'inset(0)'; }
    else if (track) { props['transform'] = ''; props['transform-origin'] = ''; props['clip-path'] = ''; }
    Object.keys(props).forEach(function (prop) {
      if (track) { remember(img, 'style:' + prop, function () { return img.style.getPropertyValue(prop); }); keys.push([img, 'style:' + prop]); }
      if (props[prop]) img.style.setProperty(prop, props[prop]); else img.style.removeProperty(prop);
    });
  }
  // top-level comma split of a computed background-image
  function bgLayers(value) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < value.length; i++) {
      var c = value.charAt(i);
      if (c === '(') depth++; else if (c === ')') depth--;
      if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter(function (l) { return l && l !== 'none'; });
  }
  var painted = [];
  // An element painted with a background image: set or keep its picture, keep the dark overlay a card has on top
  // of its photo, then crop or fit it, move the focus and zoom.
  function paintBg(el, url, fit, keys) {
    if (!el.__cmsBg) el.__cmsBg = bgLayers(el.ownerDocument.defaultView.getComputedStyle(el).backgroundImage || '');
    var layers = el.__cmsBg;
    var photo = url ? 'url("' + url.replace(/"/g, '%22') + '")' : layers.filter(function (l) { return l.indexOf('url(') === 0; })[0];
    if (!photo) return;
    var hasPhoto = layers.some(function (l) { return l.indexOf('url(') === 0; });
    var overlays = url && !hasPhoto ? [] : layers.filter(function (l) { return l.indexOf('url(') !== 0; });
    if (!hasPhoto) overlays = [];
    ['background-image', 'background-size', 'background-position', 'background-repeat'].forEach(function (prop) {
      remember(el, 'style:' + prop, function () { return el.style.getPropertyValue(prop); });
      keys.push([el, 'style:' + prop]);
    });
    function put(sizeText) {
      el.style.setProperty('background-image', overlays.concat(photo).join(', '));
      el.style.setProperty('background-size', overlays.map(function () { return 'auto'; }).concat(sizeText).join(', '));
      el.style.setProperty('background-position', overlays.map(function () { return '0 0'; }).concat(fit.x + '% ' + fit.y + '%').join(', '));
      el.style.setProperty('background-repeat', overlays.map(function () { return 'repeat'; }).concat('no-repeat').join(', '));
    }
    var addr = photo.slice(4, -1);
    if (addr.charAt(0) === '"' || addr.charAt(0) === "'") addr = addr.slice(1, -1);
    el.__cmsRefresh = null;
    if (fit.mode === 'contain') put('contain');
    else if (fit.z <= 100) put('cover');
    else {
      put('cover');
      var im = new Image();
      var size = function () {
        if (!im.naturalWidth) return;
        var box = el.getBoundingClientRect();
        var k = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight) * fit.z / 100;
        put(Math.round(im.naturalWidth * k) + 'px ' + Math.round(im.naturalHeight * k) + 'px');
      };
      im.onload = size;
      im.src = addr.replace(/%22/g, '"');
      if (im.complete) size();
      el.__cmsRefresh = size;
      painted.push(el);
    }
  }
  window.addEventListener('resize', function () { painted.forEach(function (el) { if (el.__cmsRefresh) el.__cmsRefresh(); }); });
  // the fit chosen for a picture field, if any
  function fitOverride(o, field) {
    var found = null;
    list.forEach(function (a) { if (a.section === o.section && a.field === field + '__fit') found = a; });
    return fitFor(found || { value: '' });
  }
  function apply() {
    var active = [];
    painted = [];
    list.forEach(function (o) {
      var root = document.getElementById(o.section);
      if (!root) return;
      var el;
      try { el = root.querySelector(o.selector); } catch (e) { return; }
      if (!el) return;
      var key;
      if (o.type === 'image') {
        if (el.tagName === 'IMG') {
          remember(el, 'srcset', function () { return el.getAttribute('srcset'); });
          remember(el, 'src', function () { return el.getAttribute('src'); });
          active.push([el, 'srcset'], [el, 'src']);
          el.removeAttribute('srcset'); el.src = o.value;
          if (list.some(function (a) { return a.section === o.section && a.field === o.field + '__fit'; })) fitImg(el, fitOverride(o, o.field), true, active);
        } else if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
          // an inline SVG drawing: hide it and show the photo in its place, at the drawing's size
          var pic = el.__cmsPic;
          if (!pic) {
            var box = el.getBoundingClientRect();
            pic = document.createElement('img');
            pic.className = 'cms-svg-pic';
            pic.style.cssText = 'display:block;width:100%;max-width:' + Math.round(box.width) + 'px;aspect-ratio:' + Math.round(box.width) + '/' + Math.round(box.height) + ';object-fit:cover;margin:0 auto';
            el.parentNode.insertBefore(pic, el.nextSibling);
            el.__cmsPic = pic;
          }
          remember(el, 'svgpic', function () { return pic; });
          key = remember(el, 'style:display', function () { return el.style.getPropertyValue('display'); });
          active.push([el, 'svgpic'], [el, key]);
          el.style.setProperty('display', 'none');
          pic.src = o.value;
          pic.alt = '';
          list.forEach(function (a) { if (a.section === o.section && a.field === o.field + '__alt') pic.alt = a.value; });
          fitImg(pic, fitOverride(o, o.field), false);
        } else {
          paintBg(el, o.value, fitOverride(o, o.field), active);
        }
      } else if (o.type === 'fit') {
        // how a picture fills its frame (see fitFor); a picture that is also replaced is painted by its image override
        var replaced = list.some(function (a) { return a.section === o.section && a.field + '__fit' === o.field && a.type === 'image'; });
        if (el.tagName === 'IMG') fitImg(el, fitFor(o), true, active);
        else if (el.namespaceURI !== 'http://www.w3.org/2000/svg' && !replaced) paintBg(el, '', fitFor(o), active);
      } else if (o.type === 'alt') {
        // the picture's description: alt on an <img>, aria-label on anything painted with a background image
        if (el.tagName === 'IMG') {
          remember(el, 'alt', function () { return el.getAttribute('alt'); });
          active.push([el, 'alt']);
          el.setAttribute('alt', o.value);
        } else {
          remember(el, 'aria-label', function () { return el.getAttribute('aria-label'); });
          remember(el, 'role', function () { return el.getAttribute('role'); });
          active.push([el, 'aria-label'], [el, 'role']);
          el.setAttribute('aria-label', o.value); el.setAttribute('role', 'img');
        }
      } else if (o.type === 'link') {
        key = remember(el, 'href', function () { return el.getAttribute('href'); });
        active.push([el, key]);
        el.setAttribute('href', o.value);
      } else if (o.type === 'color') {
        key = remember(el, 'style:' + (o.attr || 'color'), function () { return el.style.getPropertyValue(o.attr || 'color'); });
        active.push([el, key]);
        el.style.setProperty(o.attr || 'color', o.value);
      } else {
        key = remember(el, 'html', function () { return el.innerHTML; });
        active.push([el, key]);
        setText(el, o.value);
      }
    });
    // anything an override changed earlier but no longer asks for goes back to what it was
    originals = originals.filter(function (rec) {
      Object.keys(rec.saved).forEach(function (key) {
        var still = active.some(function (a) { return a[0] === rec.el && a[1] === key; });
        if (!still) { restore(rec.el, key, rec.saved[key]); delete rec.saved[key]; }
      });
      return Object.keys(rec.saved).length > 0;
    });
  }
  window.__setOverrides = function (next) { list = next || []; apply(); };
  window.__getOverrides = function () { return list.slice(); };
  window.__applyOverrides = apply;
  document.addEventListener('DOMContentLoaded', function () { apply(); setTimeout(apply, 400); setTimeout(apply, 1500); });
  window.addEventListener('load', apply);
})();`;

/**
 * Generates an export bundle containing index.html, style.css, script.js, and README.md.
 */
function generateExportBundle(sections, themeConfig, featuresData = {}, options = {}) {
  if (Array.isArray(sections)) sections = mapPageLinks(sections.filter(s => !s.hidden), options.pageLinks);
  const pageHead = renderPageHead(options.page, undefined, { siteFiles: true });
  const theme = resolveTheme(themeConfig);
  const isDark = isDarkTheme(theme);
  const safeSections = Array.isArray(sections) ? sections : [];

  const headLinks = new Set();
  const scopedStyleBlocks = [];
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];
  let usesLazy = false;
  const sectionInfoList = [];
  const contentOverrides = collectOverrides(safeSections);
  const pageOpts = options.page || {};
  const anchors = anchorNames(safeSections, featuresData, options.reservedAnchors);
  if (Object.keys(anchors).length) scopedStyleBlocks.push(ANCHOR_CSS);
  const autoNav = navLinker(anchors, options, menuItems(safeSections, anchors, featuresData));

  safeSections.forEach((section, index) => {
    const id = section.id || `sec-${index + 1}`;
    const slug = section.slug || `section-${index + 1}`;
    const title = section.title || (featuresData[slug] && featuresData[slug].name) || slug;
    const rawHtml = section.html !== undefined ? section.html : (featuresData[slug] && featuresData[slug].html) || '';
    const rawCss = section.css !== undefined ? section.css : (featuresData[slug] && featuresData[slug].css) || '';
    const rawJs = section.js !== undefined ? section.js : (featuresData[slug] && featuresData[slug].js) || '';

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
    const isPreloader = slug.includes('preloader') || (section.category && section.category.toLowerCase().includes('preloader'));
    const preloaderClass = isPreloader ? ' is-preloader' : '';
    const isolatedHtml = autoNav(isolateSectionMarkup(rawHtml, id), section);
    const overlayHtml = renderSectionOverlayHtml(section.elements);
    const sizingStyle = isPreloader ? '' : sectionSizingStyle(section, (options.reserveMap || {})[slug]);
    const styleAttr = sizingStyle ? ` style="${sizingStyle}"` : '';
    const nativeList = sectionNativeList(section, options.nativeMap);
    const nativeAttr = (nativeList.length ? ` data-native-for="${nativeList.join(' ')}"` : '') + ((options.ownPalette || {})[slug] ? ' data-own-palette="true"' : '');
    sectionHtmlBlocks.push(`  <!-- Section: ${slug} -->\n${anchorSpan(anchors[id], id)}  <section class="page-section${preloaderClass}${section.sticky === true ? ' is-sticky' : ''}${!isPreloader && sectionThemeAttr(isDark, nativeList) === 'dark' ? ' dark' : ''}" id="${id}" data-section-slug="${slug}" data-theme="${sectionThemeAttr(isDark, nativeList)}"${nativeAttr}${styleAttr}>\n    ${isolatedHtml}${overlayHtml}\n  </section>`);

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

  // Preloader auto-dismiss script for exported bundle
  scriptBlocks.push(`  // Preloader Auto-Dismiss Handler
  try {
    (function() {
      function initPreloaderWatch() {
        const sec = document.querySelector('.page-section.is-preloader, .page-section[data-section-slug*="preloader"]');
        if (!sec) return;
        function dismiss() {
          sec.classList.add('is-dismissed');
          sec.style.opacity = '0';
          sec.style.pointerEvents = 'none';
          setTimeout(() => { sec.style.display = 'none'; }, 500);
        }
        const checkDone = () => {
          const root = sec.querySelector('[data-phase="done"], [data-completed="true"], [data-state="done"]');
          const gate = sec.querySelector('.amr-gate, .scp-gate, [class*="-gate"]');
          if (root || (gate && window.getComputedStyle(gate).display === 'none')) {
            dismiss();
            return true;
          }
          return false;
        };
        const obs = new MutationObserver(() => {
          if (checkDone()) obs.disconnect();
        });
        obs.observe(sec, { attributes: true, subtree: true, attributeFilter: ['data-phase', 'data-completed', 'class', 'style'] });
        sec.addEventListener('click', () => { setTimeout(dismiss, 1000); });
        setTimeout(() => { if (sec.style.display !== 'none') dismiss(); }, 5000);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPreloaderWatch);
      } else {
        initPreloaderWatch();
      }
    })();
  } catch (e) {}`);

  const externalLinksHtml = Array.from(headLinks).join('\n  ');
  const responsiveCss = renderResponsiveCss(safeSections);
  if (responsiveCss) scopedStyleBlocks.push(responsiveCss);
  const allScopedStyles = scopedStyleBlocks.join('\n\n');
  const allHtml = sectionHtmlBlocks.join('\n\n');
  if (usesLazy) scriptBlocks.unshift(LAZY_SECTION_RUNTIME);
  const allScripts = scriptBlocks.join('\n\n');

  // 1. index.html
  const indexHtml = `<!DOCTYPE html>
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

  // 2. style.css
  const styleCss = `/**
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

  // Forms: the chosen route for form messages (page settings) is applied to the exported page only, never to the preview
  const fdMod = formDelivery();
  const deliveredIndex = fdMod ? fdMod.prepareHtml(indexHtml, pageOpts) : indexHtml;
  const deliveryJs = fdMod && deliveredIndex !== indexHtml ? fdMod.runtimeJs() : '';

  // 3. script.js
  const scriptJs = `/**
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

  // 4. README.md
  const unverifiedLicences = sectionInfoList.filter(sec => (options.licenseMap || {})[sec.slug] === 'unverified');
  const readmeMd = `# Assembled Web Page Project

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
  const doc = assemblePreviewDocument(sections, themeConfig, featuresData, { page: Object.assign({ title: 'Assembled Web Page' }, options.page), nativeMap: options.nativeMap, reserveMap: options.reserveMap, lazyMap: options.lazyMap, ownPalette: options.ownPalette, pageLinks: options.pageLinks, anchors: { reserved: options.reservedAnchors }, keepUnlinkedNav: options.keepUnlinkedNav });
  const clean = doc.replace(/\s*<div class="section-resize-handle"[^>]*><\/div>/g, '');
  const fd = formDelivery();
  const delivered = fd ? fd.prepareHtml(clean, options.page) : clean;
  if (delivered === clean) return clean;
  return delivered.replace(/<\/body>/i, () => '<script>\n' + fd.runtimeJs() + '\n</script>\n</body>');
}

/**
 * Precomputed CRC-32 lookup table for fast ZIP checksum calculations.
 */
const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[n] = c;
}

function calculateCrc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function stringToUint8(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8');
  }
  const utf8 = unescape(encodeURIComponent(str));
  const result = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    result[i] = utf8.charCodeAt(i);
  }
  return result;
}

function putU16(buffer, offset, val) {
  buffer[offset] = val & 0xff;
  buffer[offset + 1] = (val >> 8) & 0xff;
}

function putU32(buffer, offset, val) {
  buffer[offset] = val & 0xff;
  buffer[offset + 1] = (val >> 8) & 0xff;
  buffer[offset + 2] = (val >> 16) & 0xff;
  buffer[offset + 3] = (val >> 24) & 0xff;
}

/**
 * Root-relative local asset references (e.g. "/site-b/assets/images/a.jpg") only resolve on the
 * builder's dev server. These helpers find them so export can bundle or inline the files.
 */
const LOCAL_ASSET_RE = /(["'(=,\s])(\/(?!\/)[A-Za-z0-9_\-.%~@+\/]+\.(?:png|jpe?g|webp|gif|svg|avif|ico|mp4|webm|mp3|wav|ogg|woff2?|ttf|otf|css))(?=[?#"')\s>,]|$)/gi;

function findLocalAssetUrls(text) {
  const found = new Set();
  if (typeof text !== 'string') return [];
  for (const m of text.matchAll(LOCAL_ASSET_RE)) found.add(m[2]);
  return Array.from(found);
}

function rewriteLocalAssetUrls(text, urlMap) {
  if (typeof text !== 'string' || !urlMap) return text;
  return text.replace(LOCAL_ASSET_RE, (full, pre, url) =>
    Object.prototype.hasOwnProperty.call(urlMap, url) ? pre + urlMap[url] : full);
}

/**
 * Pure JavaScript ZIP archive generator (standard PKZIP 2.0 uncompressed STORE format).
 * Bundles files into a clean valid zip archive with zero third-party dependencies.
 * @param {Record<string, string|Uint8Array>} files - Map of filename to text or binary content
 * @returns {Buffer|Uint8Array} Binary archive buffer
 */
function createZipArchive(files) {
  const entries = Object.entries(files).map(([name, content]) => {
    const nameBytes = stringToUint8(name);
    let contentBytes;
    if (typeof content === 'string') {
      contentBytes = stringToUint8(content);
    } else if (content instanceof Uint8Array) {
      contentBytes = content;
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
      contentBytes = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
    } else {
      contentBytes = stringToUint8(String(content));
    }
    return {
      name,
      nameBytes,
      contentBytes,
      crc: calculateCrc32(contentBytes)
    };
  });

  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const localParts = [];
  const cdParts = [];
  let currentOffset = 0;

  for (const entry of entries) {
    // 1. Local File Header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + entry.nameBytes.length);
    putU32(localHeader, 0, 0x04034b50); // Local header signature: PK\x03\x04
    putU16(localHeader, 4, 20);         // Version needed: 2.0
    putU16(localHeader, 6, 0x0800);     // General purpose flags: UTF-8 (bit 11)
    putU16(localHeader, 8, 0);          // Compression method: 0 (STORE)
    putU16(localHeader, 10, dosTime);
    putU16(localHeader, 12, dosDate);
    putU32(localHeader, 14, entry.crc);
    putU32(localHeader, 18, entry.contentBytes.length); // Compressed size
    putU32(localHeader, 22, entry.contentBytes.length); // Uncompressed size
    putU16(localHeader, 26, entry.nameBytes.length);
    putU16(localHeader, 28, 0);         // Extra field length
    localHeader.set(entry.nameBytes, 30);

    // 2. Central Directory Header (46 bytes + name length)
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    putU32(cdHeader, 0, 0x02014b50);    // Central dir signature: PK\x01\x02
    putU16(cdHeader, 4, 20);            // Version made by: 2.0
    putU16(cdHeader, 6, 20);            // Version needed: 2.0
    putU16(cdHeader, 8, 0x0800);        // General purpose flags: UTF-8
    putU16(cdHeader, 10, 0);            // Compression: STORE
    putU16(cdHeader, 12, dosTime);
    putU16(cdHeader, 14, dosDate);
    putU32(cdHeader, 16, entry.crc);
    putU32(cdHeader, 20, entry.contentBytes.length);
    putU32(cdHeader, 24, entry.contentBytes.length);
    putU16(cdHeader, 28, entry.nameBytes.length);
    putU16(cdHeader, 30, 0);            // Extra field length
    putU16(cdHeader, 32, 0);            // Comment length
    putU16(cdHeader, 34, 0);            // Disk number start
    putU16(cdHeader, 36, 0);            // Internal file attributes
    putU32(cdHeader, 38, 0);            // External file attributes
    putU32(cdHeader, 42, currentOffset);// Relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    localParts.push(localHeader, entry.contentBytes);
    cdParts.push(cdHeader);
    currentOffset += localHeader.length + entry.contentBytes.length;
  }

  const cdOffset = currentOffset;
  let cdSize = 0;
  for (const part of cdParts) {
    cdSize += part.length;
  }

  // 3. End of Central Directory (EOCD) record (22 bytes)
  const eocd = new Uint8Array(22);
  putU32(eocd, 0, 0x06054b50);         // EOCD signature: PK\x05\x06
  putU16(eocd, 4, 0);                  // Disk number
  putU16(eocd, 6, 0);                  // Disk with start of CD
  putU16(eocd, 8, entries.length);     // Entries on this disk
  putU16(eocd, 10, entries.length);    // Total entries
  putU32(eocd, 12, cdSize);            // Size of CD
  putU32(eocd, 16, cdOffset);          // Offset of CD
  putU16(eocd, 20, 0);                 // Comment length

  const totalLength = currentOffset + cdSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of localParts) {
    result.set(part, pos);
    pos += part.length;
  }
  for (const part of cdParts) {
    result.set(part, pos);
    pos += part.length;
  }
  result.set(eocd, pos);

  if (typeof Buffer !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
    return Buffer.from(result.buffer, result.byteOffset, result.byteLength);
  }
  return result;
}

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
