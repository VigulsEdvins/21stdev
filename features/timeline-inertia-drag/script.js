/**
 * Horizontal Inertia Drag Timeline & Mechanical Tick Ruler
 * edvlabs component with placeholder art
 */
(function () {
  const ITEMS = [
    { title: 'Harbour Campaign', group: "OCTOBER '26", tag: 'SHOWCASE', aspect: 1.15, img: '/assets/library/edv-art-01.svg' },
    { title: 'Northport Lookbook', group: "OCTOBER '26", tag: 'INSPIRE', aspect: 1.35, img: '/assets/library/edv-art-04.svg' },
    { title: 'Gallery Pop-up', group: "OCTOBER '26", tag: 'EXPERIMENT', aspect: 1.0, img: '/assets/library/edv-art-07.svg' },
    { title: 'Studio Collab Drop', group: "SEPTEMBER '26", tag: 'ARCHIVE', aspect: 1.25, img: '/assets/library/edv-art-10.svg' },
    { title: 'Coastal Waves', group: "SEPTEMBER '26", tag: 'SHOWCASE', aspect: 1.1, img: '/assets/library/edv-art-13.svg' },
    { title: 'Night Session', group: "SEPTEMBER '26", tag: 'INSPIRE', aspect: 1.3, img: '/assets/library/edv-art-16.svg' },
    { title: 'Print Capsule', group: "AUGUST '26", tag: 'PRINT', aspect: 1.2, img: '/assets/library/edv-art-03.svg' },
    { title: 'Final Heat', group: "AUGUST '26", tag: 'SHOWCASE', aspect: 1.05, img: '/assets/library/edv-art-06.svg' },
    { title: 'Craft Release 03', group: "JULY '26", tag: 'CRAFT', aspect: 1.3, img: '/assets/library/edv-art-09.svg' },
    { title: 'Resistance Series', group: "JULY '26", tag: 'EXPERIMENT', aspect: 1.15, img: '/assets/library/edv-art-12.svg' },
    { title: 'Pocket Vol. 12', group: "JUNE '26", tag: 'INSPIRE', aspect: 1.25, img: '/assets/library/edv-art-15.svg' },
    { title: 'Early Days', group: "JUNE '26", tag: 'SHOWCASE', aspect: 1.1, img: '/assets/library/edv-art-02.svg' }
  ];

  const viewport = document.getElementById('timeline-viewport');
  const track = document.getElementById('timeline-track');
  const rulerTicks = document.getElementById('timeline-ruler-ticks');
  const rulerMonths = document.getElementById('timeline-ruler-months');
  const brandRow3 = document.getElementById('brand-row-3');

  if (!viewport || !track) return;

  let prevGroup = '';
  track.innerHTML = ITEMS.map((item, idx) => {
    const isNew = item.group !== prevGroup;
    prevGroup = item.group;
    return `
      <article class="timeline-card" data-group="${item.group}" data-index="${idx}">
        ${isNew ? `<div class="timeline-month-flag">${item.group}</div>` : ''}
        <span class="timeline-card__badge-top">#${String(idx + 1).padStart(2, '0')}</span>
        <div class="timeline-card__media" style="aspect-ratio: ${item.aspect}; background: linear-gradient(180deg, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.82) 100%), url('${item.img}') center/cover no-repeat;">
          <h3 class="timeline-card__title">${item.title}</h3>
        </div>
        <span class="timeline-card__badge-bottom">${item.tag} (${item.group})</span>
      </article>`;
  }).join('');

  let ticksHtml = '';
  for (let i = 0; i < 140; i++) {
    ticksHtml += `<div class="ruler-tick ${i % 5 === 0 ? 'ruler-tick--major' : ''}"></div>`;
  }
  rulerTicks.innerHTML = ticksHtml;

  const uniqueGroups = [...new Set(ITEMS.map((i) => i.group))];
  rulerMonths.innerHTML = uniqueGroups
    .map(
      (g, i) =>
        `<button type="button" class="ruler-month-btn ${i === 0 ? 'is-active' : ''}" data-group="${g}">${g}</button>`
    )
    .join('');

  const cards = Array.from(track.querySelectorAll('.timeline-card'));
  const mediaEls = Array.from(track.querySelectorAll('.timeline-card__media'));
  let targetX = 0;
  let currentX = 0;
  let maxX = 0;
  let animId = null;
  let activeGroup = uniqueGroups[0];

  function clampTarget() {
    maxX = Math.max(0, track.scrollWidth - viewport.clientWidth);
    targetX = Math.max(0, Math.min(targetX, maxX));
  }

  function checkActiveMonth() {
    const focal = currentX + 180;
    let closest = cards[0];
    let minD = Infinity;
    cards.forEach((c) => {
      const d = Math.abs(c.offsetLeft - focal);
      if (d < minD) {
        minD = d;
        closest = c;
      }
    });
    if (closest) {
      const g = closest.getAttribute('data-group');
      if (g && g !== activeGroup) {
        activeGroup = g;
        if (brandRow3) brandRow3.textContent = `(EDV®/${g})`;
        rulerMonths.querySelectorAll('.ruler-month-btn').forEach((btn) => {
          btn.classList.toggle('is-active', btn.getAttribute('data-group') === g);
        });
      }
    }
  }

  function startAnimation() {
    if (animId) return;
    function step() {
      const diff = targetX - currentX;
      const vel = diff * 0.14;
      currentX += vel;
      viewport.scrollLeft = currentX;

      const tilt = Math.max(-12, Math.min(12, -vel * 0.1));
      mediaEls.forEach((m) => {
        m.style.transform = Math.abs(tilt) > 0.2 ? `rotateY(${tilt.toFixed(2)}deg)` : '';
      });

      const shift = -(currentX % 75);
      rulerTicks.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
      checkActiveMonth();

      if (Math.abs(diff) > 0.4) {
        animId = requestAnimationFrame(step);
      } else {
        currentX = targetX;
        viewport.scrollLeft = currentX;
        mediaEls.forEach((m) => (m.style.transform = ''));
        animId = null;
      }
    }
    animId = requestAnimationFrame(step);
  }

  rulerMonths.querySelectorAll('.ruler-month-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = btn.getAttribute('data-group');
      const card = cards.find((c) => c.getAttribute('data-group') === g);
      if (card) {
        targetX = Math.max(0, card.offsetLeft - 100);
        clampTarget();
        startAnimation();
      }
    });
  });

  let isDown = false;
  let startX = 0;
  let dragStartTarget = 0;
  let lastX = 0;
  let lastTime = 0;
  let dragVel = 0;

  viewport.addEventListener('pointerdown', (e) => {
    isDown = true;
    viewport.classList.add('is-dragging');
    startX = e.clientX;
    lastX = e.clientX;
    lastTime = performance.now();
    dragStartTarget = targetX;
    dragVel = 0;
    viewport.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const now = performance.now();
    const dt = Math.max(10, now - lastTime);
    const dx = e.clientX - lastX;
    dragVel = dx / dt;
    lastX = e.clientX;
    lastTime = now;

    targetX = dragStartTarget - (e.clientX - startX) * 1.5;
    clampTarget();
    startAnimation();
  });

  window.addEventListener('pointerup', () => {
    if (!isDown) return;
    isDown = false;
    viewport.classList.remove('is-dragging');
    if (Math.abs(dragVel) > 0.15) {
      targetX -= dragVel * 220;
      clampTarget();
      startAnimation();
    }
  });

  viewport.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        targetX += e.deltaX * 1.4;
        clampTarget();
        startAnimation();
      }
    },
    { passive: false }
  );
})();
