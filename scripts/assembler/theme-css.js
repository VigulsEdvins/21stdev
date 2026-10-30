/**
 * Theme CSS for the assembler: the variables and rules that carry a theme into every section, applying a theme to a live document, and the native-palette rules.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
const { THEME_PRESETS, resolveTheme, altTheme, isDarkTheme, NATIVE_PRESET_FOR_PAGE, sectionNativeList } = (typeof window !== 'undefined' && window.AsmTheme) || require('./theme.js');

/**
 * The CSS variables written into :root for a theme, in groups (the comment is printed above its group).
 * A value is a key of the theme values (see themeValues), a plain string, or a function of them.
 * The same name may appear in more than one group (two component families read it); both lines are kept.
 */
const TOKEN_GROUPS = [
  { vars: [
    ['--preview-bg', 'bg'],
    ['--preview-text', 'text'],
    ['--preview-accent', 'accent'],
    ['--preview-card-bg', 'cardBg'],
    ['--preview-border', 'border']
  ] },
  { comment: "Universal design system tokens (Tailwind, shadcn)", vars: [
    ['--background', 'bg'],
    ['--foreground', 'text'],
    ['--color-background', 'bg'],
    ['--color-foreground', 'text'],
    ['--bg', 'bg'],
    ['--text', 'text'],
    ['--accent', 'accent'],
    ['--card', 'cardBg'],
    ['--card-foreground', 'text'],
    ['--border', 'border'],
    ['--input', 'border'],
    ['--ring', 'accent'],
    ['--primary', 'accent'],
    ['--primary-foreground', v => v.isDark ? '#000000' : '#ffffff'],
    ['--secondary', 'cardBg'],
    ['--secondary-foreground', 'text'],
    ['--muted', 'cardBg'],
    ['--muted-foreground', 'muted'],
    ['--popover', 'cardBg'],
    ['--popover-foreground', 'text']
  ] },
  { comment: "Standard design tokens for new components (see AGENT_GUIDE.md)", vars: [
    ['--radius', '12px'],
    ['--font-display', 'inherit'],
    ['--font-body', 'inherit']
  ] },
  { comment: "Component-specific variables mapped universally", vars: [
    ['--bg-color', 'bg'],
    ['--text-color', 'text'],
    ['--text-main', 'text'],
    ['--text-muted', 'muted'],
    ['--muted-text', 'muted'],
    ['--card-bg', 'cardBg'],
    ['--card-border', 'border'],
    ['--card-hover', v => v.isDark ? 'color-mix(in srgb, ' + v.text + ' 12%, ' + v.bg + ')' : 'color-mix(in srgb, ' + v.text + ' 6%, ' + v.bg + ')'],
    ['--active-border', 'accent'],
    ['--active-color', 'accent'],
    ['--header-bg', v => `color-mix(in srgb, ${v.bg} 85%, transparent)`],
    ['--header-border', 'border'],
    ['--rail-bg', v => `color-mix(in srgb, ${v.text} 12%, transparent)`],
    ['--fg', 'text'],
    ['--soft', 'soft'],
    ['--line', 'border']
  ] },
  { comment: "Polaroid & Wordmark footers", vars: [
    ['--pl-bg', 'bg'],
    ['--pl-ink', 'text'],
    ['--pl-muted', 'muted'],
    ['--pl-line', 'border'],
    ['--bwf-bg', 'bg'],
    ['--bwf-ink', 'text'],
    ['--bwf-muted', 'muted'],
    ['--hwf-bg', 'bg'],
    ['--hwf-ink', 'text']
  ] },
  { comment: "Ink-Orbit SaaS family", vars: [
    ['--ib-page', 'bg'],
    ['--ib-paper', 'cardBg'],
    ['--ib-card', 'cardBg'],
    ['--ib-raise', 'soft'],
    ['--ib-ink', 'text'],
    ['--ib-soft', 'muted'],
    ['--ib-muted', 'subtle'],
    ['--ib-line', 'border'],
    ['--ip-page', 'bg'],
    ['--ip-paper', 'cardBg'],
    ['--ip-card', 'cardBg'],
    ['--ip-raise', 'soft'],
    ['--ip-ink', 'text'],
    ['--ip-soft', 'muted'],
    ['--ip-muted', 'subtle'],
    ['--ip-line', 'border']
  ] },
  { comment: "Postmark CTA", vars: [
    ['--pl-ground', 'bg'],
    ['--pd-ground', 'bg'],
    ['--pl-ink', 'text'],
    ['--pd-ink', 'text'],
    ['--pl-muted', 'muted'],
    ['--pd-muted', 'muted'],
    ['--pl-accent', 'accent'],
    ['--pd-accent', 'accent'],
    ['--pl-highlight', 'accent'],
    ['--pd-highlight', 'accent'],
    ['--g', 'bg'],
    ['--k', 'text'],
    ['--mu', 'muted'],
    ['--a', 'accent'],
    ['--pm-paper', 'cardBg']
  ] },
  { comment: "Audio / Shaders / Into-the-ether", vars: [
    ['--bg-core', 'bg'],
    ['--bg-card', 'cardBg'],
    ['--bg-card-border', 'border']
  ] }
];

/** The colours a theme resolves to (with the fallbacks for a theme that leaves some out). */
function themeValues(theme) {
  const isDark = isDarkTheme(theme);
  return {
    isDark,
    bg: theme.bg,
    text: theme.text,
    accent: theme.accent || '#6366f1',
    cardBg: theme.cardBg || (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
    border: theme.border || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
    muted: `color-mix(in srgb, ${theme.text} 65%, transparent)`,
    subtle: `color-mix(in srgb, ${theme.text} 45%, transparent)`,
    soft: isDark
      ? `color-mix(in srgb, ${theme.text} 6%, ${theme.bg})`
      : `color-mix(in srgb, ${theme.text} 3%, ${theme.bg})`
  };
}

/** The lines inside :root { } */
function rootVariables(v) {
  return TOKEN_GROUPS.map(g =>
    (g.comment ? `      /* ${g.comment} */\n` : '') +
    g.vars.map(([name, value]) => `      ${name}: ${typeof value === 'function' ? value(v) : (value in v ? v[value] : value)};`).join('\n')
  ).join('\n\n');
}

/**
 * Generates universal CSS rules ensuring the active theme propagates
 * to all sections, component containers, and utilities on the page.
 */
function generateUniversalThemeStyles(theme) {
  const v = themeValues(theme);
  const { isDark, cardBg, border } = v;
  const { muted: textMuted, subtle: textSubtle, soft: bgSoft } = v;

  return `    :root {
${rootVariables(v)}
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

/** Splits a selector list at the commas that are not inside brackets. */
function splitSelectors(list) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/** Puts every rule of `css` under `prefix` (:root, html and body become the prefix itself); rules for `*` and at-rules other than @media are dropped. */
function scopeCss(css, prefix, keepStar = false) {
  const text = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  const readBlock = (from) => { // index of the brace that closes the block opened at `from`
    let depth = 0;
    for (let k = from; k < text.length; k++) { if (text[k] === '{') depth++; else if (text[k] === '}' && --depth === 0) return k; }
    return text.length - 1;
  };
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    const close = readBlock(open);
    const body = text.slice(open + 1, close);
    if (head.startsWith('@media')) out.push(`${head} {\n${scopeCss(body, prefix, keepStar)}\n}`);
    else if (!head.startsWith('@')) {
      if (keepStar && /^\*/.test(head)) { out.push(`${head} {${body}}`); i = close + 1; continue; }
      const sels = splitSelectors(head).filter(s => !/^\*/.test(s)).map(s => {
        if (s === ':root' || s === 'html') return prefix;
        if (/^(html|:root)\s/.test(s)) return prefix + s.replace(/^(html|:root)/, '');
        return `${prefix} ${s}`;
      });
      if (sels.length) out.push(`${sels.join(',\n')} {${body}}`);
    }
    i = close + 1;
  }
  return out.join('\n');
}

/**
 * The page styles for a page with the dark/light button: the colour variables (:root) stay as they are, every other rule of the page's own
 * look applies only while <html data-mode="alt"> is NOT set, and the styles of the other look apply only while it is set. So a rule written
 * for one polarity (light-theme fixes for dark-designed components, and the other way round) never lingers in the other look.
 */
function generateModeThemeStyles(themeConfig, altId, altColors) {
  const base = generateUniversalThemeStyles(resolveTheme(themeConfig));
  const end = base.indexOf('\n    }\n');
  const root = end < 0 ? base : base.slice(0, end + 7);
  const rest = end < 0 ? '' : base.slice(end + 7);
  return `${root}\n${scopeCss(rest, 'html:not([data-mode="alt"])', true)}\n${generateAltThemeStyles(themeConfig, altId, altColors)}`;
}

/** The styles of the opposite look, active while <html data-mode="alt"> is set (the visitor's dark/light button). */
function generateAltThemeStyles(themeConfig, altId, altColors) {
  return `/* Other look (dark/light button) */\n${scopeCss(generateUniversalThemeStyles(altTheme(themeConfig, altId, altColors)), 'html[data-mode="alt"]')}\n`;
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
      '--pd-ink': theme.text,
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

const api = { generateUniversalThemeStyles, generateAltThemeStyles, generateModeThemeStyles, scopeCss, applyThemeToDocument, renderNativePaletteCss };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmThemeCss = api;
})();
