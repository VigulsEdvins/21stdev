/**
 * Section fit: when a section is made shorter than its content, the content shrinks with it (text, images and spacing
 * scale together through CSS `zoom`) instead of being cropped. Each component has a smallest scale (`minScale` in
 * meta.json, default 0.6); below that the section cannot get any shorter.
 */
(function (root) {
  const DEFAULT_MIN_SCALE = 0.6;
  const ABSOLUTE_MIN_HEIGHT = 48;

  function clampMinScale(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0.3 && n <= 1 ? n : DEFAULT_MIN_SCALE;
  }

  /** Scale and height for a requested height: scale never goes above 1 or below minScale, and height stops at the minimum. */
  function fit(requestedHeight, naturalHeight, minScale) {
    const min = clampMinScale(minScale);
    const natural = Math.max(1, Number(naturalHeight) || 1);
    const minHeight = Math.max(ABSOLUTE_MIN_HEIGHT, Math.ceil(natural * min));
    const height = Math.max(minHeight, Math.round(requestedHeight));
    const scale = Math.max(min, Math.min(1, Math.round((height / natural) * 1000) / 1000));
    return { height, scale, minHeight, atMinimum: height <= minHeight && requestedHeight <= minHeight };
  }

  /** The element that holds a section's content (same lookup the resize handle has always used). */
  function contentOf(sectionEl) {
    return sectionEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
  }

  /** Height the content needs at full size. Measured with zoom and stretching removed, then put back. */
  function measureNatural(sectionEl) {
    const contentEl = contentOf(sectionEl);
    if (!contentEl) return sectionEl.getBoundingClientRect().height;
    const targets = [contentEl, contentEl.firstElementChild].filter(Boolean);
    const saved = targets.map(t => [t.style.zoom, t.style.height, t.style.minHeight, t.style.flex]);
    targets.forEach(t => { t.style.zoom = ''; t.style.height = 'auto'; t.style.minHeight = '0'; t.style.flex = '0 0 auto'; });
    const natural = Math.max(contentEl.scrollHeight, contentEl.getBoundingClientRect().height);
    targets.forEach((t, i) => { t.style.zoom = saved[i][0]; t.style.height = saved[i][1]; t.style.minHeight = saved[i][2]; t.style.flex = saved[i][3]; });
    return natural;
  }

  function minScaleFor(slug) {
    const list = root.FEATURE_REGISTRY || (root.parent && root.parent.FEATURE_REGISTRY) || [];
    const f = Array.isArray(list) ? list.find(x => x.slug === slug) : null;
    return clampMinScale(f && f.minScale);
  }

  /** Puts a section at `height`, scaling its content. Returns the result of fit(). */
  function apply(sectionEl, requestedHeight, natural, minScale) {
    const r = fit(requestedHeight, natural, minScale);
    sectionEl.style.display = 'flex';
    sectionEl.style.flexDirection = 'column';
    sectionEl.style.height = `${r.height}px`;
    sectionEl.style.minHeight = `${r.height}px`;
    sectionEl.style.overflow = 'hidden';
    const contentEl = contentOf(sectionEl);
    if (contentEl) {
      // zoom shrinks the element's own box too, so ask for r.height / scale of layout height to fill the section
      const inner = `${Math.round(r.height / r.scale)}px`;
      [contentEl, contentEl.firstElementChild].filter(Boolean).forEach((t, i) => {
        t.style.flex = '1 1 auto';
        t.style.height = inner;
        t.style.minHeight = inner;
        if (i === 0) t.style.zoom = r.scale < 1 ? String(r.scale) : '';
      });
    }
    return r;
  }

  const api = { DEFAULT_MIN_SCALE, fit, contentOf, measureNatural, minScaleFor, apply, clampMinScale };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SectionFit = api;
})(typeof window !== 'undefined' ? window : globalThis);
