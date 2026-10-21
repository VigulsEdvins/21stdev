/**
 * Infinite Vertical Conveyor Scroll & 3D Trajectory Loop
 * Extracted from betteroff/app.js (measureAboutBlocks, updateAboutFrame, wrap)
 */
(function () {
  const content = document.getElementById('about-content');
  const globeMedia = document.getElementById('about-globe-media');
  if (!content) return;

  function wrap(min, max, value) {
    const range = max - min;
    if (range <= 0) return min;
    return ((((value - min) % range) + range) % range) + min;
  }

  let aboutBlocks = [];
  let aboutTotalHeight = 0;
  let targetY = 0;
  let currentY = 0;

  function measureBlocks() {
    const blockEls = Array.from(content.querySelectorAll('[data-smooth]'));
    blockEls.forEach((b) => (b.style.transform = 'translate3d(0,0,0)'));
    const contentRect = content.getBoundingClientRect();
    const wh = window.innerHeight;

    aboutBlocks = blockEls.map((el, idx) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - contentRect.top;
      const height = rect.height;
      const bottom = top + height;
      return { el, index: idx, top, height, bottom, start: top - wh, end: bottom };
    });

    const last = aboutBlocks[aboutBlocks.length - 1];
    aboutTotalHeight = Math.max(wh * 1.35, last ? last.bottom + 80 : wh);
  }

  measureBlocks();
  window.addEventListener('resize', measureBlocks);

  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      targetY += e.deltaY * 1.1;
    },
    { passive: false }
  );

  let dragY = null;
  window.addEventListener('pointerdown', (e) => {
    dragY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (dragY === null) return;
    targetY += (dragY - e.clientY) * 1.8;
    dragY = e.clientY;
  });
  window.addEventListener('pointerup', () => {
    dragY = null;
  });

  function tick() {
    requestAnimationFrame(tick);
    targetY += 0.35; // gentle ambient drift
    currentY += (targetY - currentY) * 0.12;

    const wh = window.innerHeight;
    const ww = window.innerWidth;

    aboutBlocks.forEach((item) => {
      const minWrap = -(aboutTotalHeight - item.end);
      const maxWrap = item.end;
      const o = wrap(minWrap, maxWrap, currentY);
      item.el.style.transform = `translate3d(0px, ${(-o).toFixed(1)}px, 0px)`;
    });

    if (globeMedia && aboutTotalHeight > 0) {
      const cycleScroll = wrap(0, aboutTotalHeight, currentY);
      const p = cycleScroll / aboutTotalHeight;
      const x = Math.sin(p * Math.PI * 2) * (ww * 0.24);
      const y = Math.cos(p * Math.PI * 2) * (wh * 0.16);
      const scale = 0.75 + Math.sin(p * Math.PI) * 0.35;
      globeMedia.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0px) scale(${scale.toFixed(3)})`;
    }
  }

  requestAnimationFrame(tick);
})();
