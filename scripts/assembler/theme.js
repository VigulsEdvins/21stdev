/**
 * Theme data for the assembler: the preset themes, resolving a theme, light or dark, and the native-palette lookups.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
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
 * The opposite look of a theme, for the visitor's dark/light button: the preset the client chose (Other look), else the default
 * preset of the opposite polarity. Colours are never derived from the page's own.
 */
function altTheme(themeConfig, altId, colors) {
  const t = resolveTheme(themeConfig);
  const dark = isDarkTheme(t);
  const hex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  // the client's own colours (Other look: custom); only valid hex colours count, and the look must be the opposite of the page's
  if (altId === 'custom' && colors && hex(colors.bg) && hex(colors.text) && hex(colors.accent)) {
    const own = { id: 'custom-alt', name: 'Custom other look', bg: colors.bg, text: colors.text, accent: colors.accent };
    if (isDarkTheme(own) !== dark) return own;
  }
  // the client's pick (a preset of the opposite polarity); without a valid pick, the default preset of the opposite polarity
  const chosen = typeof altId === 'string' ? THEME_PRESETS[altId] : null;
  if (chosen && isDarkTheme(chosen) !== dark) return chosen;
  return THEME_PRESETS[NATIVE_PRESET_FOR_PAGE[dark ? 'dark' : 'light']];
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

const api = { THEME_PRESETS, resolveTheme, altTheme, isDarkHex, isDarkTheme, NATIVE_PRESET_FOR_PAGE, sectionNativeList, sectionThemeAttr };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmTheme = api;
})();
