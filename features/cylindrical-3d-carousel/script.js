/**
 * 3D Cylindrical Image Carousel — With Scroll Velocity & Drag-to-Spin Inertia
 * Extracted & adapted from carousel-gallery-play/app.js (zero external dependencies)
 */
(function () {
  const PROJECTS = [
    { title: '125 Years AFC Ajax', tag: 'Heritage Documentary', c1: '#7f1d1d', c2: '#dc2626' },
    { title: 'Belgian Red Devils', tag: 'National Campaign', c1: '#450a0a', c2: '#ea580c' },
    { title: 'BNXT League Media', tag: 'Arena Production', c1: '#1e1b4b', c2: '#4f46e5' },
    { title: 'Como 1907 Lake', tag: 'Club Identity', c1: '#0c4a6e', c2: '#0284c7' },
    { title: 'Adidas × Tzolis', tag: 'Athlete Commercial', c1: '#064e3b', c2: '#10b981' },
    { title: 'Royal Antwerp FC', tag: 'Matchday Visuals', c1: '#4c0519', c2: '#e11d48' },
    { title: 'HOKA Speed Run', tag: 'Endurance Series', c1: '#172554', c2: '#3b82f6' },
    { title: 'DAZN Broadcast', tag: 'Live Motion Kit', c1: '#27272a', c2: '#71717a' },
    { title: 'Al Qadsiah FC', tag: 'Global Launch', c1: '#422006', c2: '#eab308' },
    { title: 'Club Brugge UCL', tag: 'Champions Anthem', c1: '#0f172a', c2: '#2563eb' },
    { title: 'VfL Wolfsburg', tag: 'Tunnel Lighting', c1: '#052e16', c2: '#22c55e' },
    { title: 'LIMBXL Street', tag: 'Editorial Lookbook', c1: '#3b0764', c2: '#a855f7' },
    { title: 'OH Leuven Kit', tag: 'Studio Reveal', c1: '#1f2937', c2: '#f97316' },
    { title: 'Standard Liège', tag: 'Red Inferno', c1: '#450a0a', c2: '#ef4444' },
    { title: 'Play Sports 3D', tag: 'Title Sequence', c1: '#042f2e', c2: '#14b8a6' },
    { title: 'Red Bull Arena', tag: 'Drone Cinematography', c1: '#1e1b4b', c2: '#ec4899' }
  ];

  const listEl = document.getElementById('carousel-3d-list');
  const wrapEl = document.getElementById('carousel-3d-wrap');
  const prevBtn = document.getElementById('carousel-prev');
  const toggleBtn = document.getElementById('carousel-toggle');
  const nextBtn = document.getElementById('carousel-next');
  const readoutEl = document.getElementById('cyl-speed-readout');

  if (!listEl || !wrapEl) return;

  // Group into alternating 2-item and 1-item panels around the cylinder
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
          <div class="cyl-card-bg" style="background: linear-gradient(135deg, ${p.c1}, ${p.c2});"></div>
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
  let baseSpeed = 0.22; // deg per frame
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

  // Hover pause on individual cards
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      isHoverPaused = true;
    });
    item.addEventListener('mouseleave', () => {
      isHoverPaused = false;
    });
  });

  // Pointer drag-to-spin
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

  // Wheel velocity boost
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
