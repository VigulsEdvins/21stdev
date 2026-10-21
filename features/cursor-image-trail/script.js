/**
 * Interactive Velocity Cursor Image Trail
 * Extracted from carousel-gallery-play/app.js (initImageTrail)
 */
(function () {
  const container = document.getElementById('main-container');
  if (!container) return;

  const TRAIL_CARDS = [
    { label: '01 // AJAX 125', bg: 'linear-gradient(135deg, #dc2626, #7f1d1d)' },
    { label: '02 // RED DEVILS', bg: 'linear-gradient(135deg, #ea580c, #431407)' },
    { label: '03 // COMO 1907', bg: 'linear-gradient(135deg, #0284c7, #0c4a6e)' },
    { label: '04 // ADIDAS X TZOLIS', bg: 'linear-gradient(135deg, #10b981, #064e3b)' },
    { label: '05 // HOKA SPEED', bg: 'linear-gradient(135deg, #3b82f6, #172554)' },
    { label: '06 // LIMBXL CAMPAIGN', bg: 'linear-gradient(135deg, #a855f7, #3b0764)' },
    { label: '07 // BNXT ARENA', bg: 'linear-gradient(135deg, #6366f1, #1e1b4b)' },
    { label: '08 // ROYAL ANTWERP', bg: 'linear-gradient(135deg, #f43f5e, #4c0519)' },
    { label: '09 // AL QADSIAH', bg: 'linear-gradient(135deg, #eab308, #422006)' },
    { label: '10 // DAZN STUDIO', bg: 'linear-gradient(135deg, #14b8a6, #042f2e)' }
  ];

  const images = TRAIL_CARDS.map((card) => {
    const el = document.createElement('div');
    el.className = 'image-trail';
    el.style.background = card.bg;
    el.innerHTML = `<span>${card.label}</span>`;
    container.appendChild(el);
    return el;
  });

  let currentIndex = 0;
  let zCounter = 10;
  let lastPos = null;
  const minDistance = 80;

  function getLocalCoords(e) {
    const rect = container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function spawnTrailImage(x, y, dx, dy) {
    const img = images[currentIndex];
    currentIndex = (currentIndex + 1) % images.length;

    const offsetX = 105;
    const offsetY = 75;
    const driftFactor = 0.65;
    const rot = (Math.random() * 16 - 8).toFixed(2);

    img.getAnimations().forEach((anim) => anim.cancel());
    img.style.zIndex = String(zCounter++);

    img.animate(
      [
        {
          transform: `translate3d(${x - offsetX}px, ${y - offsetY}px, 0) scale(0.85) rotate(${rot}deg)`,
          opacity: 1,
          offset: 0
        },
        {
          transform: `translate3d(${x - offsetX + dx * driftFactor}px, ${y - offsetY + dy * driftFactor}px, 0) scale(1.02) rotate(${rot}deg)`,
          opacity: 1,
          offset: 0.48
        },
        {
          transform: `translate3d(${x - offsetX + dx * driftFactor * 1.2}px, ${y - offsetY + dy * driftFactor * 1.2 + 16}px, 0) scale(0.4) rotate(${rot}deg)`,
          opacity: 0,
          offset: 1
        }
      ],
      {
        duration: 1050,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );
  }

  container.addEventListener(
    'pointermove',
    (e) => {
      const pos = getLocalCoords(e);
      if (!lastPos) {
        lastPos = pos;
        spawnTrailImage(pos.x, pos.y, 18, -12);
        return;
      }
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist >= minDistance) {
        spawnTrailImage(pos.x, pos.y, dx, dy);
        lastPos = pos;
      }
    },
    { passive: true }
  );
})();
