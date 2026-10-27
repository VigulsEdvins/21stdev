/**
 * Design token import: reads a client's brand from a JSON file (colours, fonts, corner radius) into the page theme.
 * Understands a plain shape ({ colors: { background, text, accent }, fonts: { heading, body }, radius }) and the
 * W3C / Tokens Studio style ({ "color": { "primary": { "$value": "#..." } } }); names are matched loosely.
 *   BuilderTokenImport.parseTokens(json) -> { colors, fontDisplay, fontBody, radius, found, notes }
 *   BuilderTokenImport.init({ stackManager, showToast })  wires the "Import design tokens" button
 */
(function () {
  'use strict';

  /** Every leaf of the tree as { path: 'color.brand.primary', value }; a { $value } / { value } object is one leaf. */
  function flatten(node, path = [], out = [], depth = 0) {
    if (depth > 8 || node === null || node === undefined) return out;
    if (typeof node === 'string' || typeof node === 'number') {
      out.push({ path: path.join('.').toLowerCase(), value: node });
    } else if (Array.isArray(node)) {
      if (node.length && node.every(x => typeof x === 'string')) out.push({ path: path.join('.').toLowerCase(), value: node.join(', ') });
    } else if (typeof node === 'object') {
      const own = node.$value !== undefined ? node.$value : node.value;
      if (typeof own === 'string' || typeof own === 'number') out.push({ path: path.join('.').toLowerCase(), value: own });
      else Object.keys(node).slice(0, 400).forEach(k => { if (!k.startsWith('$')) flatten(node[k], path.concat(k), out, depth + 1); });
    }
    return out;
  }

  /** '#abc', '#aabbcc', '#aabbccdd', 'rgb(1,2,3)' or 'rgba(1 2 3 / .5)' -> '#rrggbb', or '' when it is not a plain colour. */
  function toHex(value) {
    const s = String(value).trim().toLowerCase();
    let m = /^#([0-9a-f]{3})$/.exec(s);
    if (m) return '#' + m[1].split('').map(c => c + c).join('');
    m = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(s);
    if (m) return '#' + m[1];
    m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(s);
    if (m && [m[1], m[2], m[3]].every(n => Number(n) <= 255)) return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
    return '';
  }

  /** The leaf whose path best matches `include` (highest score wins, shorter path breaks ties); `exclude` rejects a leaf. */
  function pick(leaves, rules, exclude) {
    let best = null;
    leaves.forEach(leaf => {
      if (exclude && exclude.test(leaf.path)) return;
      const rank = rules.findIndex(re => re.test(leaf.path));
      if (rank < 0) return;
      const score = (rules.length - rank) * 100 - leaf.path.length;
      if (!best || score > best.score) best = { leaf, score };
    });
    return best ? best.leaf : null;
  }

  function firstFamily(value) {
    const first = String(value).split(',')[0].replace(/["']/g, '').trim();
    return /^[\w .-]{1,60}$/.test(first) && !/^(inherit|initial|unset|system-ui|sans-serif|serif|monospace)$/i.test(first) ? first : '';
  }

  /** '8', 8, '8px', '0.5rem' -> '8px' / '0.5rem'; anything else (percent, 'full', mixed values) -> ''. */
  function toRadius(value) {
    const s = String(value).trim();
    if (/^\d{1,3}(\.\d{1,2})?$/.test(s)) return s + 'px';
    return /^\d{1,3}(\.\d{1,2})?(px|rem|em)$/.test(s) ? s : '';
  }

  function parseTokens(input) {
    const result = { colors: {}, fontDisplay: '', fontBody: '', radius: '', found: [], notes: [] };
    if (!input || typeof input !== 'object') { result.notes.push('That file does not hold a JSON object.'); return result; }
    const leaves = flatten(input);

    const colorLeaves = leaves.map(l => ({ path: l.path, value: toHex(l.value) })).filter(l => l.value);
    const colorRules = {
      bg: [/(^|\.)(background|bg|canvas|page)(\.|$)/, /(^|\.)surface(\.|$)/],
      text: [/(^|\.)(foreground|text|ink|body)(\.(default|base|primary))?$/, /(^|\.)(foreground|text|ink)(\.|$)/],
      accent: [/(^|\.)(accent|brand)(\.(default|base|500))?$/, /(^|\.)primary(\.(default|base|500))?$/, /(accent|brand|primary)/]
    };
    const notMuted = /(muted|secondary|subtle|disabled|inverse|on-|border|hover)/;
    ['bg', 'text', 'accent'].forEach(key => {
      const hit = pick(colorLeaves, colorRules[key], notMuted);
      if (hit) { result.colors[key] = hit.value; result.found.push(`${key === 'bg' ? 'Background' : key === 'text' ? 'Text' : 'Accent'} ${hit.value} (${hit.path})`); }
    });

    const fontLeaves = leaves.filter(l => /(font|typography|typeface|famil)/.test(l.path) && typeof l.value === 'string' && !/(size|weight|height|spacing|style)/.test(l.path));
    const display = pick(fontLeaves, [/(heading|display|headline|title)/]);
    const body = pick(fontLeaves, [/(body|paragraph|text)/, /(base|sans|primary)/], /(heading|display|headline|title)/);
    const displayName = display && firstFamily(display.value);
    const bodyName = body && firstFamily(body.value);
    if (displayName) { result.fontDisplay = displayName; result.found.push(`Heading font ${displayName}`); }
    if (bodyName) { result.fontBody = bodyName; result.found.push(`Body font ${bodyName}`); }
    if (displayName || bodyName) result.notes.push('Fonts are loaded from Google Fonts by name; a font that is not on Google Fonts falls back to the component default.');

    const radiusLeaves = leaves.filter(l => /(radius|rounded|corner)/.test(l.path));
    const radius = pick(radiusLeaves, [/(^|\.)(md|medium|default|base|DEFAULT)$/i, /(^|\.)(lg|large)$/, /./], /(full|pill|circle)/);
    const radiusValue = radius && toRadius(radius.value);
    if (radiusValue) { result.radius = radiusValue; result.found.push(`Corner radius ${radiusValue}`); }

    if (!result.found.length) result.notes.push('No colours, fonts or corner radius were recognised. Name them like "background", "text", "accent", "font.heading", "font.body" and "radius".');
    return result;
  }

  /** Puts a parsed result into the project: custom colours (missing ones keep the current theme's), fonts and radius. */
  function applyTokens(sm, tokens, resolveCurrent) {
    if (Object.keys(tokens.colors).length) {
      const st = sm.getState();
      const current = resolveCurrent ? resolveCurrent(st.theme === 'custom' ? st.customColors : st.theme) : {};
      sm.setCustomColors({ bg: current.bg, text: current.text, accent: current.accent, ...tokens.colors });
      sm.setTheme('custom');
    }
    const page = {};
    if (tokens.fontDisplay) page.fontDisplay = tokens.fontDisplay;
    if (tokens.fontBody) page.fontBody = tokens.fontBody;
    if (tokens.radius) page.radius = tokens.radius;
    if (Object.keys(page).length) sm.setPage(page);
  }

  function init({ stackManager: sm, showToast = () => {}, doc = document, win = window }) {
    const btn = doc.getElementById('importTokensBtn');
    const fileInput = doc.getElementById('importTokensFile');
    if (!btn || !fileInput) return null;
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 512 * 1024) { showToast('That file is too big for a token file (limit 512 KB).', 5000); return; }
      let json;
      try { json = JSON.parse(await file.text()); } catch (_) { showToast('That file is not valid JSON.', 5000); return; }
      const tokens = parseTokens(json);
      if (!tokens.found.length) { showToast(tokens.notes[0], 7000); return; }
      applyTokens(sm, tokens, win.Assembler && win.Assembler.resolveTheme);
      showToast(`Imported: ${tokens.found.length} setting${tokens.found.length === 1 ? '' : 's'}. Undo brings the old look back.`, 5000);
    });
    return { parseTokens, applyTokens };
  }

  const api = { parseTokens, applyTokens, init, toHex, toRadius };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderTokenImport = api;
})();
