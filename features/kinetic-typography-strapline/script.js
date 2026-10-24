(function () {
  const TOKENS = [
    { t: 'We', s: false }, { t: 'extract', s: false }, { t: 'tactile', s: true },
    { t: 'motion,', s: true }, { t: '3D', s: false }, { t: 'spatial', s: false },
    { t: 'carousels,', s: true }, { t: 'and', s: false }, { t: 'wide-gamut', s: false },
    { t: 'shaders', s: true }, { t: 'into', s: false }, { t: 'zero-dependency', s: false },
    { t: 'building', s: false }, { t: 'blocks', s: true }, { t: 'ready', s: false },
    { t: 'for', s: false }, { t: 'instant', s: true }, { t: 'production', s: false },
    { t: 'shipping.', s: true }
  ];

  const copyEl = document.getElementById('straplineCopy');
  const scrubber = document.getElementById('wordScrubber');
  const readout = document.getElementById('progressReadout');

  const spans = TOKENS.map((item) => {
    const span = document.createElement('span');
    span.className = 'k-word' + (item.s ? ' is-serif' : '');
    span.textContent = item.t;
    copyEl.appendChild(span);
    return span;
  });

  function updateProgress(pct) {
    const clamped = Math.max(0, Math.min(100, Number(pct)));
    scrubber.value = String(Math.round(clamped));
    readout.textContent = `${Math.round(clamped)}%`;
    const activeCount = Math.round((clamped / 100) * spans.length);
    spans.forEach((s, idx) => {
      s.classList.toggle('is-lit', idx < activeCount);
    });
  }

  scrubber.addEventListener('input', (e) => updateProgress(e.target.value));
  const kinStage = copyEl ? (copyEl.closest('.strapline-stage') || copyEl.parentElement) : null;
  if (kinStage) {
    kinStage.addEventListener('wheel', (e) => {
      const next = Number(scrubber.value) + (e.deltaY > 0 ? 6 : -6);
      updateProgress(next);
    }, { passive: true });
  }

  updateProgress(68);
})();
