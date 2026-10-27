/**
 * Interactive Velocity Cursor Image Trail
 * edvlabs component with placeholder art
 */
(function () {
  const container = document.getElementById('main-container');
  if (!container) return;

  const TRAIL_CARDS = [
    { label: '01 // CLIENT 01', img: '/assets/library/edv-art-03.svg' },
    { label: '02 // CLUB A', img: '/assets/library/edv-art-04.svg' },
    { label: '03 // CLUB B', img: '/assets/library/edv-art-05.svg' },
    { label: '04 // GRAND PRIX', img: '/assets/library/edv-art-06.svg' },
    { label: '05 // CHAMPIONS NIGHT', img: '/assets/library/edv-art-07.svg' },
    { label: '06 // BACKSTREET CAMPAIGN', img: '/assets/library/edv-art-08.svg' },
    { label: '07 // LEAGUE 01', img: '/assets/library/edv-art-09.svg' },
    { label: '08 // CITY DERBY', img: '/assets/library/edv-art-10.svg' },
    { label: '09 // DESERT LAUNCH', img: '/assets/library/edv-art-11.svg' },
    { label: '10 // CLUB C', img: '/assets/library/edv-art-12.svg' }
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
