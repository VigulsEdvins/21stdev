/**
 * Section sizing for the assembler: inline height and padding styles, the zoom that keeps a shortened section's content
 * whole, and the per-breakpoint rules (hide on a screen size, other padding on tablet and phone).
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 */
(function () {
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

  const api = { computeSectionSizingStyles, fitScaleCss, sectionSizingStyle, renderResponsiveCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AsmSizing = api;
})();
