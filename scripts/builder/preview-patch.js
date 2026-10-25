/**
 * Applies sizing, overlay-element and content-override changes to an already loaded preview
 * document, so section scripts, animations and scroll position survive an edit.
 * Returns false when the document is not ready or out of sync; the caller then reloads fully.
 */
(function () {
  'use strict';

  const SECTION_SIZING_PROPS = ['min-height', 'height', 'overflow', 'padding-top', 'padding-bottom'];

  /**
   * @param {{ doc: Document, win: Window, stack: object[], assembler: object }} args
   * @returns {boolean} true when the preview was patched in place
   */
  function patchPreview({ doc, win, stack, assembler }) {
    if (!doc || doc.readyState !== 'complete' || !Array.isArray(stack) || stack.length === 0) return false;

    const sectionEls = stack.map(sec => doc.getElementById(sec.id));
    if (sectionEls.some(el => !el || !el.classList.contains('page-section'))) return false;

    stack.forEach((sec, i) => {
      const secEl = sectionEls[i];
      if (!secEl.classList.contains('is-preloader')) {
        SECTION_SIZING_PROPS.forEach(prop => secEl.style.removeProperty(prop));
        assembler.computeSectionSizingStyles(sec.sizing).split(';').forEach(decl => {
          const idx = decl.indexOf(':');
          if (idx > 0) secEl.style.setProperty(decl.slice(0, idx).trim(), decl.slice(idx + 1).trim());
        });
      }

      const overlayHtml = assembler.renderSectionOverlayHtml(sec.elements);
      const layer = secEl.querySelector(':scope > .section-overlay-layer');
      if (!overlayHtml) {
        if (layer) layer.remove();
      } else {
        const tpl = doc.createElement('template');
        tpl.innerHTML = overlayHtml.trim();
        const fresh = tpl.content.firstElementChild;
        if (layer) layer.replaceWith(fresh);
        else secEl.insertBefore(fresh, secEl.querySelector(':scope > .section-resize-handle'));
      }
    });

    // Client-content overrides are applied by the runtime inside the preview document
    if (win && typeof win.__setOverrides === 'function') {
      win.__setOverrides(assembler.collectOverrides(stack));
    }
    return true;
  }

  /**
   * True when `stack` is `prevStack` with sections inserted: every earlier section is still there, unchanged and in order.
   * Only the parts that decide how a section is built are compared (not sizing, overlay elements or overrides).
   */
  function isInsertionOnly(prevStack, stack) {
    if (!Array.isArray(prevStack) || !Array.isArray(stack) || stack.length <= prevStack.length || prevStack.length === 0) return false;
    const core = ({ elements, sizing, overrides, ...rest }) => JSON.stringify(rest);
    const known = new Map(prevStack.map(s => [s.id, core(s)]));
    const kept = stack.filter(s => known.has(s.id));
    return kept.length === prevStack.length && kept.every((s, i) => s.id === prevStack[i].id && core(s) === known.get(s.id));
  }

  const isPreloader = s => /preloader/i.test((s.slug || '') + ' ' + (s.category || ''));

  /**
   * Adds the new sections of `stack` to a loaded preview without reloading it, so the sections already on the page
   * keep their scripts, animations and scroll position. `html` is the freshly assembled preview document for the
   * whole stack; only its markup and styles are used, and `scripts` starts the new sections.
   * Returns false when the preview cannot take it (the caller then reloads fully).
   */
  function addSections({ doc, win, prevStack, stack, html, scripts, assembler }) {
    if (!doc || !win || doc.readyState !== 'complete' || !isInsertionOnly(prevStack, stack)) return false;
    const known = new Set(prevStack.map(s => s.id));
    const added = stack.filter(s => !known.has(s.id));
    if (added.some(isPreloader)) return false;
    if (prevStack.some(s => !doc.getElementById(s.id))) return false;

    const next = new DOMParser().parseFromString(html, 'text/html');
    const fresh = added.map(s => next.getElementById(s.id));
    if (fresh.some(el => !el || !el.classList.contains('page-section'))) return false;

    // page styles (the scoped block for every section) and any new font / library links
    const liveStyles = Array.from(doc.head.querySelectorAll('style:not(#universal-theme-styles)'));
    const nextStyles = Array.from(next.head.querySelectorAll('style:not(#universal-theme-styles)'));
    if (liveStyles.length !== nextStyles.length || !liveStyles.length) return false;
    const have = new Set(Array.from(doc.head.querySelectorAll('link')).map(l => l.outerHTML));
    Array.from(next.head.querySelectorAll('link')).filter(l => !have.has(l.outerHTML)).forEach(l => doc.head.appendChild(doc.importNode(l, true)));
    liveStyles.forEach((el, i) => { if (el.textContent !== nextStyles[i].textContent) el.textContent = nextStyles[i].textContent; });

    // markup, in page order
    const anchorScript = doc.body.querySelector(':scope > script');
    stack.forEach((sec, i) => {
      if (known.has(sec.id)) return;
      let after = null;
      for (let j = i + 1; j < stack.length && !after; j++) after = known.has(stack[j].id) ? doc.getElementById(stack[j].id) : null;
      doc.body.insertBefore(doc.importNode(fresh[added.indexOf(sec)], true), after || anchorScript);
    });

    // start the new sections; page-load listeners they add are called straight away because the page has loaded
    if (scripts) {
      const el = doc.createElement('script');
      el.textContent = `(function () {
        var addDoc = document.addEventListener, addWin = window.addEventListener;
        var late = function (add, target) {
          return function (type, fn) {
            if ((type === 'DOMContentLoaded' || type === 'load') && typeof fn === 'function') {
              setTimeout(function () { try { fn.call(target, new Event(type)); } catch (err) { console.error(err); } }, 0);
              return;
            }
            return add.apply(this, arguments);
          };
        };
        document.addEventListener = late(addDoc, document);
        window.addEventListener = late(addWin, window);
        try {
${scripts}
        } finally {
          document.addEventListener = addDoc;
          window.addEventListener = addWin;
        }
      })();`;
      doc.body.appendChild(el);
      el.remove();
    }
    return true;
  }

  const api = { patchPreview, addSections, isInsertionOnly, SECTION_SIZING_PROPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.PreviewPatch = api;
})();
