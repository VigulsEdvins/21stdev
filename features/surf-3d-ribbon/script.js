/**
 * Surf 3D Sine-Wave Ribbon & Physics Engine
 * Extracted from betteroff/app.js (with real Lookback cover photography)
 */
(function () {
  const ribbon = document.getElementById('surf-ribbon');
  const container = document.getElementById('surf-container');
  const infoEl = document.getElementById('surf-floating-info');
  const velReadout = document.getElementById('surf-vel-readout');

  if (!ribbon || !container) return;

  const COVERS = [
    { title: 'A$AP × Ray-Ban', img: '/assets/library/asap-x-rayban-b0252755.webp' },
    { title: '99 Cents Only Exhibition', img: '/assets/library/99-cents-only-store-gallery-exhibition-095f12c1.webp' },
    { title: 'Broncho Jams', img: '/assets/library/broncho-jams-1165a14b.webp' },
    { title: 'Ch. 11 Waves Hawaii', img: '/assets/library/ch-11-shit-waves-hawaii-f95e8577.webp' },
    { title: 'Converse × Works Studio', img: '/assets/library/converse-shoe-drop-by-works-studio-5e6ce881.webp' },
    { title: 'Defective Units Vol. 1', img: '/assets/library/defective-units-vol-1-ee41dd19.webp' },
    { title: 'Helge Tscharn Capsule', img: '/assets/library/helge-tscharn-capsule-69ab1fe5.webp' },
    { title: 'Kelly Slater Retires', img: '/assets/library/kelly-slater-retires-71a71a99.webp' },
    { title: 'Super Bowl Halftime', img: '/assets/library/kendrick-lamar-taps-willy-chavarria-for-super-bowl-halftime-collection-4ea2e98f.webp' },
    { title: 'New Balance 933', img: '/assets/library/new-balance-933-andrew-reynolds-5ef3de7f.webp' },
    { title: 'Nigo & Pharrell Advisors', img: '/assets/library/nigo-and-pharrell-williams-appointed-as-creative-advisors-for-not-a-hotel-fd8f5a4d.webp' },
    { title: 'Off-White Resistance', img: '/assets/library/off-white-state-of-resistance-d1387472.webp' },
    { title: 'Pocket Vol. 12', img: '/assets/library/pocket-vol-12-dc21015a.webp' },
    { title: 'Wild Horses Festival', img: '/assets/library/post-malone-at-wild-horses-festival-in-san-diego-0c0fefc0.webp', fallback: '/assets/library/mascot-book-fb049bad.webp' }
  ];

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const TAGS = ['INSPIRE', 'SHOWCASE', 'ARCHIVE', 'MOTION', 'SYSTEMS', 'CRAFT'];

  const TOTAL_CARDS = 28;
  const cardsData = Array.from({ length: TOTAL_CARDS }, (_, i) => {
    const cov = COVERS[i % COVERS.length];
    const imgUrl = cov.fallback || cov.img;
    return {
      index: i,
      title: cov.title,
      month: MONTHS[i % 12] + " '26",
      tag: TAGS[i % TAGS.length],
      bg: `linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.82) 100%), url('${imgUrl}') center/cover no-repeat`
    };
  });

  ribbon.innerHTML = cardsData
    .map(
      (c, i) => `
    <article class="surf-card" data-index="${i}">
      <div class="surf-card__inner" style="background: ${c.bg};">
        <div class="surf-card__num">#${String(i + 1).padStart(2, '0')} // ${c.month}</div>
        <div>
          <div class="surf-card__tag">${c.tag}</div>
          <h3 class="surf-card__title">${c.title}</h3>
        </div>
      </div>
    </article>`
    )
    .join('');

  const itemEls = Array.from(ribbon.querySelectorAll('.surf-card'));
  let surfCurrentScroll = 0;
  let surfTargetScroll = 0;
  let surfVelocity = 0;
  let surfWaveTime = 0;
  let surfHoveredIndex = -1;
  let surfItems = [];
  let surfTotalWidth = 0;
  let surfStepX = 80;
  let surfRestAmplitude = 16;

  function wrap(min, max, value) {
    const range = max - min;
    if (range <= 0) return min;
    return ((((value - min) % range) + range) % range) + min;
  }

  function measureSurf() {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const P = ww < 768 ? 7 : 15;
    surfStepX = ww / P;
    const surfStepY = wh / (P * 1.4);
    surfRestAmplitude = surfStepY * 0.42;
    const cardWidth = 240;

    surfItems = itemEls.map((el, idx) => {
      const left = surfStepX * idx;
      const end = left + cardWidth;
      const start = left - cardWidth - ww;
      const meta = cardsData[idx];

      el.onmouseenter = () => {
        surfHoveredIndex = idx;
        if (infoEl) infoEl.textContent = `(#${idx + 1}) ${meta.title} — ${meta.tag} / ${meta.month}`;
      };
      el.onmouseleave = () => {
        if (surfHoveredIndex === idx) {
          surfHoveredIndex = -1;
          if (infoEl) infoEl.textContent = 'HOVER OR DRAG STREAM';
        }
      };

      return { el, index: idx, left, width: cardWidth, start, end };
    });

    surfTotalWidth = Math.max(1, surfStepX * surfItems.length);
  }

  measureSurf();
  window.addEventListener('resize', measureSurf);

  let isDown = false;
  let startX = 0;
  let dragStartScroll = 0;
  let lastX = 0;
  let lastTime = 0;
  let dragVelocity = 0;

  container.addEventListener('pointerdown', (e) => {
    isDown = true;
    container.classList.add('is-dragging');
    startX = e.clientX;
    lastX = e.clientX;
    lastTime = performance.now();
    dragStartScroll = surfTargetScroll;
    dragVelocity = 0;
    container.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const now = performance.now();
    const dt = Math.max(10, now - lastTime);
    const dx = e.clientX - lastX;
    dragVelocity = dx / dt;
    lastX = e.clientX;
    lastTime = now;

    const totalDx = e.clientX - startX;
    surfTargetScroll = dragStartScroll - totalDx * 2.2;
  });

  window.addEventListener('pointerup', () => {
    if (!isDown) return;
    isDown = false;
    container.classList.remove('is-dragging');
    if (Math.abs(dragVelocity) > 0.15) {
      surfTargetScroll -= dragVelocity * 240;
    }
  });

  container.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        surfTargetScroll += e.deltaX * 1.5;
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') surfTargetScroll += surfStepX * 3;
    else if (e.key === 'ArrowLeft') surfTargetScroll -= surfStepX * 3;
  });

  function tick() {
    requestAnimationFrame(tick);
    const ww = window.innerWidth;
    const wh = window.innerHeight;

    const diff = surfTargetScroll - surfCurrentScroll;
    surfVelocity = diff * 0.12;
    surfCurrentScroll += surfVelocity;
    surfWaveTime += 0.025;

    const absVel = Math.abs(surfVelocity);
    if (velReadout) {
      velReadout.textContent = `WAVE AMPLITUDE: ${(1 + absVel * 0.02).toFixed(2)}x`;
    }

    surfItems.forEach((item) => {
      const minWrap = -(surfTotalWidth - item.end);
      const maxWrap = item.end;
      const n = wrap(minWrap, maxWrap, surfCurrentScroll);

      const inside = n > item.start && n < item.end;
      if (!inside) {
        item.el.style.visibility = 'hidden';
        return;
      }
      item.el.style.visibility = 'visible';

      const o = Math.max(0, Math.min(1, 1 + (n - item.left - item.width) / (ww + item.width)));
      const p = o;
      const x = p - 0.5;
      const wave = Math.sin(surfWaveTime + x * Math.PI * 2) * surfRestAmplitude * (1 + absVel * 0.015);
      const translateY = wh * 0.42 * x + wave;
      const translateX = item.left - n;
      const rotateY = -(15 * p) - 68;

      const zIndex = surfHoveredIndex === item.index ? 1000 : Math.round(p * 100) + 10;
      item.el.style.zIndex = String(zIndex);
      item.el.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0px) rotateY(${rotateY.toFixed(1)}deg)`;
    });
  }

  requestAnimationFrame(tick);
})();
