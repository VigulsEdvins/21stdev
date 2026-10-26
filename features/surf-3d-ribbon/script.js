/**
 * Surf 3D Sine-Wave Ribbon & Physics Engine
 * Infinite 3D card ribbon with placeholder artwork
 */
(function () {
  const ribbon = document.getElementById('surf-ribbon');
  const container = document.getElementById('surf-container');
  const infoEl = document.getElementById('surf-floating-info');
  const velReadout = document.getElementById('surf-vel-readout');

  if (!ribbon || !container) return;

  const COVERS = [
    { title: 'Harbour Campaign', img: '/assets/library/edv-art-01.svg' },
    { title: 'Studio Notes 01', img: '/assets/library/edv-art-02.svg' },
    { title: 'Coastline Edition', img: '/assets/library/edv-art-03.svg' },
    { title: 'Wave Study 04', img: '/assets/library/edv-art-04.svg' },
    { title: 'Capsule Drop 02', img: '/assets/library/edv-art-05.svg' },
    { title: 'Archive Vol. 1', img: '/assets/library/edv-art-06.svg' },
    { title: 'Northport Capsule', img: '/assets/library/edv-art-07.svg' },
    { title: 'Season Retrospective', img: '/assets/library/edv-art-08.svg' },
    { title: 'Winter Collection', img: '/assets/library/edv-art-09.svg' },
    { title: 'Runner Series 933', img: '/assets/library/edv-art-10.svg' },
    { title: 'Creative Advisors Brief', img: '/assets/library/edv-art-11.svg' },
    { title: 'Open Studio Day', img: '/assets/library/edv-art-12.svg' },
    { title: 'Pocket Vol. 12', img: '/assets/library/edv-art-13.svg' },
    { title: 'Festival Weekend', img: '/assets/library/edv-art-14.svg' }
  ];

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const TAGS = ['INSPIRE', 'SHOWCASE', 'ARCHIVE', 'MOTION', 'SYSTEMS', 'CRAFT'];

  const TOTAL_CARDS = 28;
  const cardsData = Array.from({ length: TOTAL_CARDS }, (_, i) => {
    const cov = COVERS[i % COVERS.length];
    const imgUrl = cov.img;
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
