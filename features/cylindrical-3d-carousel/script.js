/**
 * 3D Cylindrical Image Carousel — With Scroll Velocity & Drag-to-Spin Inertia
 * Extracted & adapted from carousel-gallery-play/app.js (with real default photography)
 */
(function () {
  const PROJECTS = [
    { title: '125 Years AFC Ajax', tag: 'Heritage Documentary', img: '/carousel-gallery-play/assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-115.webp' },
    { title: 'Belgian Red Devils', tag: 'National Campaign', img: '/carousel-gallery-play/assets/images/20260603_Pieter-Slembrouck_BRD-101-1.webp' },
    { title: 'BNXT League Media', tag: 'Arena Production', img: '/carousel-gallery-play/assets/images/20240903_Pieter-Slembrouck-Donar-101.webp' },
    { title: 'Como 1907 Lake', tag: 'Club Identity', img: '/carousel-gallery-play/assets/images/20250125_Pieter-Slembrouck-COMO1907-104.webp' },
    { title: 'Formula 1 Spa GP', tag: 'Motorsport Visuals', img: '/carousel-gallery-play/assets/images/20240726-Pieter-Slembrouck-SPA-GP-131.webp' },
    { title: 'PSG Champions League', tag: 'Matchday Visuals', img: '/carousel-gallery-play/assets/images/20250219_Pieter-Slembrouck-PSG-148.webp' },
    { title: 'Hamburger Derby HSV', tag: 'Endurance Series', img: '/carousel-gallery-play/assets/images/20240421_HSV-Pieter-Slembrouck-106.webp' },
    { title: 'Legia Warsaw', tag: 'Live Motion Kit', img: '/carousel-gallery-play/assets/images/20241103_Pieter-Slembrouck-LEGIA-131.webp' },
    { title: 'Al Qadsiah FC', tag: 'Global Launch', img: '/carousel-gallery-play/assets/images/20240609_pieter-Slembrouck-AL-QADSIAH-118.webp' },
    { title: 'Skechers Football', tag: 'Athlete Commercial', img: '/carousel-gallery-play/assets/images/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106.webp' },
    { title: 'VfL Wolfsburg', tag: 'Tunnel Lighting', img: '/carousel-gallery-play/assets/images/20250630_Pieter-Slembrouck-Sebastiaan-Bornauw-323.webp' },
    { title: 'LIMBXL Street', tag: 'Editorial Lookbook', img: '/carousel-gallery-play/assets/images/20251003_Pieter-Slembrouck-LIMBXL-106-scaled.jpg' },
    { title: 'Ibiza Off-Season', tag: 'Studio Reveal', img: '/carousel-gallery-play/assets/images/20240806-Pieter-Slembrouck-IBZ-Woodwork-110.webp' },
    { title: 'Tolu Arokodare', tag: 'Portrait Series', img: '/carousel-gallery-play/assets/images/20250226_Pieter-Slembrouck-Tolu-100.webp' },
    { title: 'Jouer – à L’aise', tag: 'Title Sequence', img: '/carousel-gallery-play/assets/images/20250226_Pieter-Slembrouck-JOUER-135.webp' },
    { title: 'Rosemary FC', tag: 'Editorial Archive', img: '/carousel-gallery-play/assets/images/20230318_Rosemary_Pieter.Slembrouck-56.webp' }
  ];

  const listEl = document.getElementById('carousel-3d-list');
  const wrapEl = document.getElementById('carousel-3d-wrap');
  const prevBtn = document.getElementById('carousel-prev');
  const toggleBtn = document.getElementById('carousel-toggle');
  const nextBtn = document.getElementById('carousel-next');
  const readoutEl = document.getElementById('cyl-speed-readout');

  if (!listEl || !wrapEl) return;

  const panelsData = [];
  let cursor = 0;
  let panelIdx = 0;
  while (cursor < PROJECTS.length) {
    const takeCount = panelIdx % 2 === 0 ? 2 : 1;
    panelsData.push(PROJECTS.slice(cursor, cursor + takeCount));
    cursor += takeCount;
    panelIdx++;
  }

  listEl.innerHTML = panelsData
    .map((group) => {
      const cards = group
        .map(
          (p) => `
        <div class="cyl-item" tabindex="0">
          <div class="cyl-card-bg" style="background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.78) 100%), url('${p.img}') center/cover no-repeat;"></div>
          <div class="cyl-card-info">
            <span class="cyl-card-tag">${p.tag}</span>
            <h3 class="cyl-card-name">${p.title}</h3>
          </div>
          <div class="cyl-overlay">VIEW CASE ↗</div>
        </div>`
        )
        .join('');
      return `<div class="cyl-panel">${cards}</div>`;
    })
    .join('');

  const panels = Array.from(listEl.querySelectorAll('.cyl-panel'));
  const items = Array.from(listEl.querySelectorAll('.cyl-item'));
  const numPanels = panels.length;

  let radius = Math.max(380, window.innerWidth * 0.44);
  let angleOffset = 0;
  let baseSpeed = 0.22;
  let currentDirection = -1;
  let timeScale = -1;
  let targetTimeScale = -1;
  let isManuallyPaused = false;
  let isHoverPaused = false;
  let isPointerDown = false;
  let lastX = 0;
  let lastTime = 0;
  let dragVel = 0;

  function updateRadius() {
    radius = Math.max(360, Math.min(680, window.innerWidth * 0.45));
    panels.forEach((panel) => {
      panel.style.transformOrigin = `50% 50% ${-radius}px`;
    });
  }

  updateRadius();
  window.addEventListener('resize', updateRadius);

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => { isHoverPaused = true; });
    item.addEventListener('mouseleave', () => { isHoverPaused = false; });
  });

  wrapEl.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    lastX = e.clientX;
    lastTime = performance.now();
    dragVel = 0;
    wrapEl.classList.add('is-dragging');
    wrapEl.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(10, now - lastTime);
    dragVel = dragVel * 0.65 + (dx / dt) * 0.35;
    lastX = e.clientX;
    lastTime = now;

    if (Math.abs(dx) > 1) {
      currentDirection = dx > 0 ? 1 : -1;
    }
    angleOffset += dx * 0.22;
  });

  function onPointerUp() {
    if (!isPointerDown) return;
    isPointerDown = false;
    wrapEl.classList.remove('is-dragging');
    const throwBoost = Math.max(-14, Math.min(14, dragVel * 18));
    if (Math.abs(throwBoost) > 0.5) {
      timeScale = throwBoost;
    }
    targetTimeScale = isManuallyPaused ? 0 : currentDirection;
  }

  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  window.addEventListener(
    'wheel',
    (e) => {
      if (isPointerDown || isManuallyPaused) return;
      const boost = Math.max(-12, Math.min(12, -e.deltaY * 0.08));
      if (Math.abs(boost) < 0.2) return;
      currentDirection = boost < 0 ? -1 : 1;
      timeScale = boost;
      targetTimeScale = currentDirection;
    },
    { passive: true }
  );

  prevBtn.addEventListener('click', () => {
    isManuallyPaused = false;
    toggleBtn.textContent = 'Pause';
    currentDirection = 1;
    timeScale = 8;
    targetTimeScale = 1;
  });

  nextBtn.addEventListener('click', () => {
    isManuallyPaused = false;
    toggleBtn.textContent = 'Pause';
    currentDirection = -1;
    timeScale = -8;
    targetTimeScale = -1;
  });

  toggleBtn.addEventListener('click', () => {
    isManuallyPaused = !isManuallyPaused;
    toggleBtn.textContent = isManuallyPaused ? 'Resume' : 'Pause';
    toggleBtn.setAttribute('aria-pressed', String(isManuallyPaused));
    targetTimeScale = isManuallyPaused ? 0 : currentDirection;
  });

  function tick() {
    requestAnimationFrame(tick);
    const effectiveTarget = isPointerDown || isHoverPaused || isManuallyPaused ? 0 : targetTimeScale;
    timeScale += (effectiveTarget - timeScale) * 0.06;

    if (!isPointerDown) {
      angleOffset += baseSpeed * timeScale;
    }

    panels.forEach((panel, i) => {
      const deg = (i * 360) / numPanels + angleOffset;
      panel.style.transform = `rotateY(${deg.toFixed(2)}deg)`;
    });

    if (readoutEl) {
      readoutEl.textContent = `Velocity: ${Math.abs(timeScale).toFixed(1)}x`;
    }
  }

  requestAnimationFrame(tick);
})();
