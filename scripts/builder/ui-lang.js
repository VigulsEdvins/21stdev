/* The builder's screen language (plan 2026-10-31-latvian-builder.md). When <html lang="lv"> this replaces the English words on the screen with the Latvian ones
   from scripts/builder/ui-lang-lv.js, once at the start and again for everything the builder adds later (it watches the page). Why one translator and not a
   call around every string: the builder is some forty scripts that build screens everywhere; this catches fixed and generated text alike and touches none of their logic.
   What it changes: text nodes and the attributes title, aria-label, placeholder, alt, and the value of button inputs; link addresses named in the dictionary's "links".
   What it never changes: the preview (another document), anything typed or editable (inputs, textareas, contenteditable), code, and anything inside [data-no-i18n].
   A text with no entry stays English. Entries are the exact English sentence (spaces and line breaks counted as one space); an entry with {name} stands for any text there:
   'Page {n} of {total}' matches 'Page 2 of 5' and gives the Latvian text with the same numbers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else { root.BuilderUiLang = api; api.autostart(root); }
})(typeof self !== 'undefined' ? self : this, function () {
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const SKIP = 'script,style,textarea,code,pre,iframe,[contenteditable],[data-no-i18n]';
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** { texts: { english: latvian }, links: { from: to } } -> a lookup with exact entries and template entries. */
  function compile(dict) {
    const exact = new Map(), templates = [];
    Object.keys((dict && dict.texts) || {}).forEach((en) => {
      const key = norm(en), lv = dict.texts[en];
      if (/\{\w+\}/.test(key)) {
        const names = [];
        const re = new RegExp('^' + key.split(/(\{\w+\})/).map((p) => { const m = /^\{(\w+)\}$/.exec(p); if (m) { names.push(m[1]); return '(.+?)'; } return esc(p); }).join('') + '$');
        templates.push({ re, names, lv, size: key.replace(/\{\w+\}/g, '').length });
      } else exact.set(key, lv);
    });
    templates.sort((a, b) => b.size - a.size); // the most specific template first: “Add the editor ({price})” before “Add {name}”
    return { exact, templates, links: (dict && dict.links) || {} };
  }

  /** Latvian plural form for a number: ends in 1 (not 11) -> first, 0 or 11-19 -> third, otherwise second. */
  const form = (n, one, other, zero) => { const k = Number(n); return k % 10 === 1 && k % 100 !== 11 ? one : (k % 10 === 0 || (k % 100 >= 11 && k % 100 <= 19) ? zero : other); };
  /** Fills {name} from get(name); {name:bloks|bloki|bloku} picks the form that goes with the number in name. */
  function fill(text, get) {
    return text.replace(/\{(\w+):([^}|]*)\|([^}|]*)\|([^}|]*)\}/g, (all, n, a, b, z) => { const v = get(n); return v === null ? all : form(v, a, b, z); })
      .replace(/\{(\w+)\}/g, (all, n) => { const v = get(n); return v === null ? all : v; });
  }

  /** The Latvian for one piece of text, or null when there is none. Keeps the spaces around it. */
  function lookup(c, text) {
    const key = norm(text);
    if (!key) return null;
    let lv = c.exact.get(key);
    if (lv === undefined) {
      for (const t of c.templates) {
        const m = t.re.exec(key);
        if (m) { lv = fill(t.lv, (n) => { const i = t.names.indexOf(n); return i >= 0 ? m[i + 1] : null; }); break; }
      }
    }
    if (lv === undefined) return null;
    const lead = /^\s*/.exec(text)[0], tail = /\s*$/.exec(text)[0];
    return lead + lv + tail;
  }

  const skipped = (el) => !!(el && el.closest && el.closest(SKIP));

  function fixAttributes(c, el) {
    if (!el || el.nodeType !== 1 || skipped(el)) return;
    ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v) { const t = lookup(c, v); if (t !== null && t !== v) el.setAttribute(a, t); } });
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/.test(el.type)) { const t = lookup(c, el.value); if (t !== null && t !== el.value) el.value = t; }
    if (el.tagName === 'A') { const h = el.getAttribute('href'); if (h && Object.prototype.hasOwnProperty.call(c.links, h)) el.setAttribute('href', c.links[h]); }
  }
  function fixText(c, node) {
    if (skipped(node.parentNode)) return;
    const t = lookup(c, node.nodeValue);
    if (t !== null && t !== node.nodeValue) node.nodeValue = t;
  }
  /** Translates a node and everything under it. */
  function translate(c, node) {
    if (!node) return;
    if (node.nodeType === 3) return fixText(c, node);
    if (node.nodeType !== 1 || skipped(node)) return;
    fixAttributes(c, node);
    const doc = node.ownerDocument;
    const w = doc.createTreeWalker(node, 1 | 4);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) fixText(c, n); else if (!skipped(n)) fixAttributes(c, n);
    }
  }

  /** Translate the page now and watch it; returns a function that stops. */
  function start(win, c) {
    const doc = win.document;
    const run = () => { translate(c, doc.body); const t = lookup(c, doc.title); if (t !== null && t !== doc.title) doc.title = t; };
    run();
    const mo = new win.MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => translate(c, n));
        else if (m.type === 'characterData') fixText(c, m.target);
        else if (m.type === 'attributes') fixAttributes(c, m.target);
      }
    });
    mo.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value', 'href']) });
    const tm = doc.querySelector('title'); if (tm) mo.observe(tm, { childList: true });
    return () => mo.disconnect();
  }

  /** In the browser: only a Latvian page, and only once the dictionary file has loaded. */
  function autostart(win) {
    if (!win || !win.document || !/^lv/i.test(win.document.documentElement.getAttribute('lang') || '')) return;
    const go = () => { if (win.BuilderUiLangLv) start(win, compile(win.BuilderUiLangLv)); };
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', go); else go();
  }

  return { compile, lookup, translate, start, autostart, norm };
});
