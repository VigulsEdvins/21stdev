/**
 * Ready-made looks for the guided "Look" step (plan E6.5): colour sets, font pairs and roundness, plus the contrast guard.
 * Pure data and maths, no DOM, so tests/test-look-sets.js can hold every set to the contrast limits.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BuilderLookSets = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const TEXT_MIN = 4.5;   // body text on the background (WCAG AA)
  const ACCENT_MIN = 3;   // buttons, links and highlights (WCAG AA for large text and controls)
  const L = { bg: 'rgba(0, 0, 0, 0.04)', border: 'rgba(0, 0, 0, 0.12)' }, D = { bg: 'rgba(255, 255, 255, 0.06)', border: 'rgba(255, 255, 255, 0.16)' };
  const set = (id, label, bg, text, accent, dark) => ({ id, label, bg, text, accent, cardBg: (dark ? D : L).bg, border: (dark ? D : L).border });

  const COLOUR_SETS = [
    set('paper', 'Paper', '#F6EFE0', '#1D2A33', '#B8432B'),
    set('lake', 'Lake', '#EAF3F1', '#12302F', '#1F6F6B'),
    set('sun', 'Sunny', '#FFF7DC', '#2B2416', '#8F5200'),
    set('rose', 'Rose', '#FFF1F0', '#3A1A1F', '#B23A52'),
    set('forest', 'Forest', '#F0F4EA', '#1E2B1A', '#3F7A2A'),
    set('ink', 'Clean', '#FFFFFF', '#111111', '#2B4DD8'),
    set('night', 'Night', '#131A22', '#F4EFE4', '#F2B84B', true),
    set('slate', 'Slate', '#0F172A', '#E8EEF7', '#5BB6F2', true)
  ];
  const FONT_PAIRS = [
    { id: 'keep', label: 'Original', display: '', body: '' },
    { id: 'warm', label: 'Warm', display: 'Fraunces', body: 'DM Sans' },
    { id: 'clean', label: 'Clean', display: 'Inter', body: 'Inter' },
    { id: 'modern', label: 'Modern', display: 'Space Grotesk', body: 'Inter' },
    { id: 'elegant', label: 'Elegant', display: 'Instrument Serif', body: 'DM Sans' },
    { id: 'bold', label: 'Bold', display: 'Syne', body: 'Manrope' },
    { id: 'classic', label: 'Classic', display: 'Playfair Display', body: 'Lora' }
  ];
  const ROUNDNESS = [
    { id: 'keep', label: 'Original', value: '' },
    { id: 'square', label: 'Square', value: '0px' },
    { id: 'soft', label: 'Soft', value: '8px' },
    { id: 'round', label: 'Round', value: '16px' },
    { id: 'pill', label: 'Very round', value: '28px' }
  ];

  const hex = (h) => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, (c) => c + c); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null; };
  const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  /** WCAG contrast ratio of two #rrggbb colours, or null when either is not one */
  function contrast(a, b) {
    const x = hex(a), y = hex(b); if (!x || !y) return null;
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  }
  const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  /** the plainest text colour for a background: near-black or white, whichever reads better */
  const bestText = (bg) => (contrast(bg, '#111111') >= contrast(bg, '#FFFFFF') ? '#111111' : '#FFFFFF');
  /** nudge a colour towards black or white (whichever helps) until it reaches `min` against the background */
  function strengthen(color, bg, min) {
    const c = hex(color), b = hex(bg); if (!c || !b) return color;
    const target = lum(b) > 0.4 ? [0, 0, 0] : [255, 255, 255];
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const mixed = toHex(c.map((v, i) => v + (target[i] - v) * t));
      if (contrast(mixed, bg) >= min) return mixed;
    }
    return toHex(target);
  }
  /** what is wrong, if anything, with a set of colours */
  function check(colors) {
    const out = [];
    const t = contrast(colors.text, colors.bg), a = contrast(colors.accent, colors.bg);
    if (t != null && t < TEXT_MIN) out.push({ kind: 'text', ratio: t, fix: { text: strengthen(colors.text, colors.bg, TEXT_MIN) } });
    if (a != null && a < ACCENT_MIN) out.push({ kind: 'accent', ratio: a, fix: { accent: strengthen(colors.accent, colors.bg, ACCENT_MIN) } });
    return out;
  }
  return { COLOUR_SETS, FONT_PAIRS, ROUNDNESS, TEXT_MIN, ACCENT_MIN, contrast, check, bestText, strengthen };
});
