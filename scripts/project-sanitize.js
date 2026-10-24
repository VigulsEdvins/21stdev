/**
 * Cleans a project state that came from outside (an imported project file): keeps only the fields the builder
 * writes itself, in the shapes it writes them, and drops anything that could carry code (custom html/css/js on a
 * section, javascript: links, ids with quotes). Pure; returns { state, removed } where `removed` counts what was dropped.
 *   ProjectSanitize.sanitizeState(state)
 */
(function (root) {
  'use strict';

  const MAX_SECTIONS = 200;
  const MAX_ELEMENTS = 100;
  const MAX_TEXT = 5000;
  const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
  const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/i;
  const PAGE_KEYS = ['title', 'description', 'favicon', 'fontDisplay', 'fontBody', 'lang', 'shareImage', 'canonical', 'robots', 'bizType', 'bizName', 'bizPhone', 'bizAddress'];
  const URL_KEYS = /^(link|ctaLink|imageUrl|href|src|url)$/i;

  function newCounter() { return { n: 0 }; }

  /** javascript:, vbscript: and non-image data: addresses are replaced; spaces and control characters inside the scheme do not hide it. */
  function safeUrl(value, counter) {
    const s = String(value);
    const probe = s.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
    if (/^(javascript|vbscript):/.test(probe) || (/^data:/.test(probe) && !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/.test(probe))) { counter.n++; return '#'; }
    return s;
  }

  function text(v, max, counter) {
    if (typeof v !== 'string') return '';
    if (v.length > max) counter.n++;
    return v.slice(0, max);
  }

  function cleanValue(key, v, counter, depth) {
    if (typeof v === 'string') return URL_KEYS.test(key) ? safeUrl(text(v, MAX_TEXT, counter), counter) : text(v, MAX_TEXT, counter);
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'boolean') return v;
    if (Array.isArray(v) && depth < 3) {
      return v.slice(0, 200).map(x => cleanValue('', x, counter, depth + 1)).filter(x => x !== undefined);
    }
    counter.n++;
    return undefined;
  }

  function cleanElement(el, counter) {
    if (!el || typeof el !== 'object' || Array.isArray(el)) { counter.n++; return null; }
    const out = {};
    Object.keys(el).forEach(k => {
      if (!/^[A-Za-z][A-Za-z0-9]{0,30}$/.test(k)) { counter.n++; return; }
      const v = el[k];
      if (k === 'id') { if (typeof v === 'string' && ID_RE.test(v)) out.id = v; else counter.n++; return; }
      if (k === 'x' || k === 'y') { if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.min(100, v)); return; }
      if (k === 'width' || k === 'height') {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.min(5000, v));
        else if (typeof v === 'string' && /^\d+(\.\d+)?(px|%)?$/.test(v)) out[k] = v;
        else counter.n++;
        return;
      }
      const c = cleanValue(k, v, counter, 0);
      if (c !== undefined) out[k] = c;
    });
    if (!out.id) { counter.n++; return null; }
    return out;
  }

  function cleanOverrides(map, counter) {
    const out = {};
    if (!map || typeof map !== 'object' || Array.isArray(map)) return out;
    Object.keys(map).slice(0, 500).forEach(fieldId => {
      const o = map[fieldId];
      if (!/^[\w.:-]{1,80}$/.test(fieldId) || !o || typeof o !== 'object' || typeof o.selector !== 'string' || o.selector.length > 300) { counter.n++; return; }
      const type = ['text', 'image', 'link', 'color', 'alt'].includes(o.type) ? o.type : 'text';
      let value = text(String(o.value === undefined ? '' : o.value), MAX_TEXT, counter);
      if (type === 'link' || type === 'image') value = safeUrl(value, counter);
      const entry = { selector: o.selector, type, value };
      if (typeof o.attr === 'string' && /^[a-z-]{1,60}$|^--[\w-]{1,60}$/i.test(o.attr)) entry.attr = o.attr;
      out[fieldId] = entry;
    });
    return out;
  }

  function cleanSection(s, counter) {
    if (!s || typeof s !== 'object' || typeof s.slug !== 'string' || !SLUG_RE.test(s.slug)) { counter.n++; return null; }
    ['html', 'css', 'js'].forEach(k => { if (k in s) counter.n++; }); // custom code on a section is never accepted
    const out = { id: typeof s.id === 'string' && ID_RE.test(s.id) ? s.id : 'sec-' + Math.random().toString(36).slice(2, 10), slug: s.slug };
    if (typeof s.title === 'string') out.title = text(s.title, 200, counter);
    if (typeof s.category === 'string') out.category = text(s.category, 100, counter);
    const z = s.sizing && typeof s.sizing === 'object' ? s.sizing : {};
    out.sizing = {
      heightMode: ['auto', 'screen', 'custom'].includes(z.heightMode) ? z.heightMode : 'auto',
      customHeight: typeof z.customHeight === 'number' && Number.isFinite(z.customHeight) ? Math.max(100, Math.min(5000, z.customHeight)) : 600,
      paddingY: ['none', 'compact', 'medium', 'large'].includes(z.paddingY) ? z.paddingY : 'none'
    };
    const ov = cleanOverrides(s.overrides, counter);
    if (Object.keys(ov).length) out.overrides = ov;
    if (Array.isArray(s.elements)) {
      const els = s.elements.slice(0, MAX_ELEMENTS).map(e => cleanElement(e, counter)).filter(Boolean);
      if (els.length) out.elements = els;
    }
    if (s.locked === true) out.locked = true;
    if (s.hidden === true) out.hidden = true;
    return out;
  }

  function sanitizeState(state) {
    const counter = newCounter();
    const src = state && typeof state === 'object' ? state : {};
    if (Array.isArray(src.stack) && src.stack.length > MAX_SECTIONS) counter.n += src.stack.length - MAX_SECTIONS;
    const out = {
      stack: (Array.isArray(src.stack) ? src.stack.slice(0, MAX_SECTIONS) : []).map(s => cleanSection(s, counter)).filter(Boolean),
      theme: typeof src.theme === 'string' && /^[\w -]{1,60}$/.test(src.theme) ? src.theme : 'midnight-dark'
    };
    if (src.customColors && typeof src.customColors === 'object') {
      out.customColors = {};
      Object.keys(src.customColors).slice(0, 20).forEach(k => {
        const v = src.customColors[k];
        if (/^[\w-]{1,30}$/.test(k) && typeof v === 'string' && /^[#\w(),.%\s-]{1,40}$/.test(v)) out.customColors[k] = v; else counter.n++;
      });
    }
    if (typeof src.viewport === 'string' && /^[\w-]{1,20}$/.test(src.viewport)) out.viewport = src.viewport;
    out.page = {};
    const page = src.page && typeof src.page === 'object' ? src.page : {};
    PAGE_KEYS.forEach(k => { if (typeof page[k] === 'string') out.page[k] = text(page[k], 1000, counter); });
    ['shareImage', 'canonical'].forEach(k => { if (out.page[k]) out.page[k] = /^https?:\/\//i.test(out.page[k]) ? out.page[k] : (counter.n++, ''); });
    if (out.page.favicon) out.page.favicon = safeUrl(out.page.favicon, counter);
    return { state: out, removed: counter.n };
  }

  const api = { sanitizeState, safeUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ProjectSanitize = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
