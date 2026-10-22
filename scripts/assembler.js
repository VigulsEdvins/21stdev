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
 * Scopes section styles:
 * - Transforms html, body selectors into .page-section#${sectionId}
 * - Replaces viewport locking 100vh with min-height: auto
 * - Scopes #root selectors to #root-${sectionId}
 */
function scopeSectionStyles(css, sectionId) {
  if (!css || typeof css !== 'string') return '';
  let scoped = css;

  // 1. Replace html, body or body, html compound selectors
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])(html\s*,\s*body|body\s*,\s*html)(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);

  // 2. Replace standalone body or html selectors
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])body(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);
  scoped = scoped.replace(/(?<![a-zA-Z0-9_.-])html(?![a-zA-Z0-9_-])/gi, `.page-section#${sectionId}`);

  // 3. Rewrite #root to #root-${sectionId}
  scoped = scoped.replace(/(?<![a-zA-Z0-9_-])#root(?![a-zA-Z0-9_-])/g, `#root-${sectionId}`);

  // 4. Replace viewport locking 100vh on height with min-height: auto
  scoped = scoped.replace(/(?<![a-zA-Z0-9_-])height\s*:\s*100vh(\s*!important)?/gi, 'min-height: auto$1');

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

  // Replace getElementById("root") or getElementById('root')
  isolated = isolated.replace(/(getElementById\s*\(\s*["'])root(["']\s*\))/g, `$1root-${sectionId}$2`);

  // Replace querySelector("#root") or querySelector('#root')
  isolated = isolated.replace(/(querySelector(?:All)?\s*\(\s*["'])#root(["']\s*\))/g, `$1#root-${sectionId}$2`);

  return isolated;
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
  <style>
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
      if (event.data && event.data.type === 'UPDATE_THEME' && event.data.theme) {
        var t = event.data.theme;
        if (t.bg) document.documentElement.style.setProperty('--preview-bg', t.bg);
        if (t.text) document.documentElement.style.setProperty('--preview-text', t.text);
        if (t.accent) document.documentElement.style.setProperty('--preview-accent', t.accent);
        if (t.cardBg) document.documentElement.style.setProperty('--preview-card-bg', t.cardBg);
        if (t.border) document.documentElement.style.setProperty('--preview-border', t.border);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Assembles a complete HTML5 document string for rendering inside the preview iframe.
 */
function assemblePreviewDocument(sections, themeConfig, featuresData = {}) {
  const theme = resolveTheme(themeConfig);
  if (!Array.isArray(sections) || sections.length === 0) {
    return renderEmptyPreview(theme);
  }

  const headLinks = new Set();
  const scopedStyleBlocks = [];
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];

  sections.forEach((section, index) => {
    const id = section.id || `sec-${index + 1}`;
    const slug = section.slug || `section-${index + 1}`;
    const rawHtml = section.html !== undefined ? section.html : (featuresData[slug] && featuresData[slug].html) || '';
    const rawCss = section.css !== undefined ? section.css : (featuresData[slug] && featuresData[slug].css) || '';
    const rawJs = section.js !== undefined ? section.js : (featuresData[slug] && featuresData[slug].js) || '';

    // Collect external head links
    extractHeadLinks(rawHtml).forEach(link => headLinks.add(link));

    // Scoped CSS
    const scopedCss = scopeSectionStyles(rawCss, id);
    if (scopedCss.trim()) {
      scopedStyleBlocks.push(`    /* Section: ${slug} (${id}) */\n    ${scopedCss.trim()}`);
    }

    // Isolated HTML
    const isolatedHtml = isolateSectionMarkup(rawHtml, id);
    sectionHtmlBlocks.push(`  <!-- Section: ${slug} -->\n  <section class="page-section" id="${id}" data-section-slug="${slug}">\n    ${isolatedHtml}\n  </section>`);

    // Isolated JS wrapped safely
    const isolatedJs = isolateSectionScript(rawJs, id);
    if (isolatedJs.trim()) {
      scriptBlocks.push(`        // Section: ${slug} (${id})\n        try {\n          (function () {\n${isolatedJs.trim().split('\n').map(l => '            ' + l).join('\n')}\n          })();\n        } catch (err) {\n          console.error('Error in section "${slug}":', err);\n        }`);
    }
  });

  const externalLinksHtml = Array.from(headLinks).join('\n  ');
  const allScopedStyles = scopedStyleBlocks.join('\n\n');
  const allHtml = sectionHtmlBlocks.join('\n\n');
  const allScripts = scriptBlocks.join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Preview</title>
  ${externalLinksHtml ? externalLinksHtml + '\n  ' : ''}<style>
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

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--preview-bg);
      color: var(--preview-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
    }

    .page-section {
      position: relative;
      width: 100%;
    }

${allScopedStyles}
  </style>
</head>
<body>
${allHtml}
  <script>
    (function () {
      // Dynamic live theme updates via postMessage
      window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'UPDATE_THEME' && event.data.theme) {
          var t = event.data.theme;
          if (t.bg) document.documentElement.style.setProperty('--preview-bg', t.bg);
          if (t.text) document.documentElement.style.setProperty('--preview-text', t.text);
          if (t.accent) document.documentElement.style.setProperty('--preview-accent', t.accent);
          if (t.cardBg) document.documentElement.style.setProperty('--preview-card-bg', t.cardBg);
          if (t.border) document.documentElement.style.setProperty('--preview-border', t.border);
        }
      });

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
</body>
</html>`;
}

/**
 * Generates an export bundle containing index.html, style.css, script.js, and README.md.
 */
function generateExportBundle(sections, themeConfig, featuresData = {}) {
  const theme = resolveTheme(themeConfig);
  const safeSections = Array.isArray(sections) ? sections : [];

  const headLinks = new Set();
  const scopedStyleBlocks = [];
  const sectionHtmlBlocks = [];
  const scriptBlocks = [];
  const sectionInfoList = [];

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
    const scopedCss = scopeSectionStyles(rawCss, id);
    if (scopedCss.trim()) {
      scopedStyleBlocks.push(`/* Section: ${slug} */\n${scopedCss.trim()}`);
    }

    // Isolated HTML
    const isolatedHtml = isolateSectionMarkup(rawHtml, id);
    sectionHtmlBlocks.push(`  <!-- Section: ${slug} -->\n  <section class="page-section" id="${id}" data-section-slug="${slug}">\n    ${isolatedHtml}\n  </section>`);

    // Isolated JS wrapped safely
    const isolatedJs = isolateSectionScript(rawJs, id);
    if (isolatedJs.trim()) {
      scriptBlocks.push(`  // Section: ${slug}\n  try {\n    (function () {\n${isolatedJs.trim().split('\n').map(l => '      ' + l).join('\n')}\n    })();\n  } catch (err) {\n    console.error('Error executing ${slug}:', err);\n  }`);
    }
  });

  const externalLinksHtml = Array.from(headLinks).join('\n  ');
  const allScopedStyles = scopedStyleBlocks.join('\n\n');
  const allHtml = sectionHtmlBlocks.join('\n\n');
  const allScripts = scriptBlocks.join('\n\n');

  // 1. index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assembled Web Page</title>
  ${externalLinksHtml ? externalLinksHtml + '\n  ' : ''}<link rel="stylesheet" href="style.css">
</head>
<body>
${allHtml}
  <script src="script.js"></script>
</body>
</html>\n`;

  // 2. style.css
  const styleCss = `/**
 * Assembled Page Styles
 * Bundled by Page Preview Builder
 * Theme: ${theme.name}
 */

:root {
  --preview-bg: ${theme.bg};
  --preview-text: ${theme.text};
  --preview-accent: ${theme.accent};
  --preview-card-bg: ${theme.cardBg};
  --preview-border: ${theme.border};
}

/* Base Resets */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--preview-bg);
  color: var(--preview-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

.page-section {
  position: relative;
  width: 100%;
}

/* ==========================================================================
   Section Styles
   ========================================================================== */

${allScopedStyles || '/* No custom section styles */'}
`;

  // 3. script.js
  const scriptJs = `/**
 * Assembled Page Scripts
 * Bundled by Page Preview Builder
 */

document.addEventListener("DOMContentLoaded", function () {
${allScripts || '  // No section scripts'}
});
`;

  // 4. README.md
  const readmeMd = `# Assembled Web Page Project

This standalone web project was created with the **Page Preview Builder**.
It bundles your selected components into a clean, editable, and ready-to-run package with zero mandatory build tools.

## Included Sections (${sectionInfoList.length})

${sectionInfoList.map((s, idx) => `${idx + 1}. **${s.title}** (\`${s.slug}\`) — Container: \`#${s.id}\``).join('\n') || '- No sections assembled yet.'}

## How to Run

### Option 1: Direct File Access
Simply double-click \`index.html\` or open it directly in any modern web browser.

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

  return {
    'index.html': indexHtml,
    'style.css': styleCss,
    'script.js': scriptJs,
    'README.md': readmeMd
  };
}

// Module export compatibility (Node.js & Browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    THEME_PRESETS,
    resolveTheme,
    scopeSectionStyles,
    isolateSectionMarkup,
    isolateSectionScript,
    extractHeadLinks,
    assemblePreviewDocument,
    generateExportBundle
  };
}

if (typeof window !== 'undefined') {
  window.Assembler = {
    THEME_PRESETS,
    resolveTheme,
    scopeSectionStyles,
    isolateSectionMarkup,
    isolateSectionScript,
    extractHeadLinks,
    assemblePreviewDocument,
    generateExportBundle
  };
}
