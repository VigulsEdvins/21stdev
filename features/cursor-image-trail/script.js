/**
 * Interactive Velocity Cursor Image Trail
 * Extracted from carousel-gallery-play/app.js (with real photography & idle preview demo)
 */
(function () {
  const container = document.getElementById('main-container');
  if (!container) return;

  const TRAIL_CARDS = [
    { label: '01 // AJAX 125', img: '/assets/library/20250328_Pieter-Slembrouck-AJAX-Dolberg-115-01265321.webp' },
    { label: '02 // RED DEVILS', img: '/assets/library/20260603_Pieter-Slembrouck_BRD-101-1-26f0b7ca.webp' },
    { label: '03 // COMO 1907', img: '/assets/library/20250125_Pieter-Slembrouck-COMO1907-104-ff37252c.webp' },
    { label: '04 // SPA GP F1', img: '/assets/library/20240726-Pieter-Slembrouck-SPA-GP-131-39be5b71.webp' },
    { label: '05 // PSG UCL', img: '/assets/library/20250219_Pieter-Slembrouck-PSG-148-1c72f705.webp' },
    { label: '06 // LIMBXL CAMPAIGN', img: '/assets/library/20251003_Pieter-Slembrouck-LIMBXL-106-scaled-346c180d.jpg' },
    { label: '07 // BNXT ARENA', img: '/assets/library/20240903_Pieter-Slembrouck-Donar-101-fc0c2249.webp' },
    { label: '08 // HSV DERBY', img: '/assets/library/20240421_HSV-Pieter-Slembrouck-106-bd8cd58b.webp' },
    { label: '09 // AL QADSIAH', img: '/assets/library/20240609_pieter-Slembrouck-AL-QADSIAH-118-39bee346.webp' },
    { label: '10 // LEGIA WARSAW', img: '/assets/library/20241103_Pieter-Slembrouck-LEGIA-131-a11d1f17.webp' }
  ];

  const images = TRAIL_CARDS.map((card) => {
    const el = document.createElement('div');
    el.className = 'image-trail';
    el.style.background = `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.75)), url('${card.img}') center/cover no-repeat`;
    el.innerHTML = `<span>${card.label}</span>`;
    container.appendChild(el);
    return el;
  });

  let currentIndex = 0;
  let zCounter = 10;
  let lastPos = null;
  let lastMoveAt = 0;
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
        duration: 1150,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );
  }

  container.addEventListener(
    'pointermove',
    (e) => {
      lastMoveAt = performance.now();
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

  // Automatic figure-8 demo trail when pointer is idle so the preview is always alive with photos
  let demoAngle = 0;
  setInterval(() => {
    if (performance.now() - lastMoveAt < 1600) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.52;
    const prevX = cx + Math.sin(demoAngle) * (rect.width * 0.26);
    const prevY = cy + Math.sin(demoAngle * 2) * (rect.height * 0.2);
    demoAngle += 0.55;
    const nextX = cx + Math.sin(demoAngle) * (rect.width * 0.26);
    const nextY = cy + Math.sin(demoAngle * 2) * (rect.height * 0.2);
    spawnTrailImage(nextX, nextY, nextX - prevX, nextY - prevY);
  }, 420);
})();
