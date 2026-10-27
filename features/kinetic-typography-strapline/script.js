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

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  if (kinStage) pinRunway(kinStage, 3, function (v) { updateProgress(v * 100); });
})();
