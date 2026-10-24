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

  const api = { patchPreview, SECTION_SIZING_PROPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.PreviewPatch = api;
})();
