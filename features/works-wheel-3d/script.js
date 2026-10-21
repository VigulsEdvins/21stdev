/**
 * Works Wheel — 3D Ring-to-Drum Portfolio Index
 * Standalone Vanilla JS implementation ported from photo-caroulsel/code.txt
 */
(function () {
  const CARD_H = 0.38;
  const CARD_MAX_W = 0.34;
  const CARD_RATIO = 1.45;
  const STEP = 40;
  const DRUM = 2.22;
  const LENS = 2.7;
  const RING_R = 1.14;
  const BOW = 1.82;
  const TITLE = 0.124;
  const INDEX = 0.04;
  const CULL = 1.6;

  const WHEEL_UNITS = 900;
  const DRAG_UNITS = 420;
  const SETTLE = 140;
  const EASE = 0.12;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = (deg) => (deg * Math.PI) / 180;
  const bowAt = (drumDeg, bow) => -bow * (1 - Math.cos(rad(drumDeg)));

  function place(ringDeg, drumDeg, ringR, drumR, bow, m) {
    return (
      `translateX(${m * bowAt(drumDeg, bow)}px)` +
      ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px)` +
      ` rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`
    );
  }

  // Generate crisp procedural artwork data URLs so zero external network images are needed
  function makeCoverArt(title, subtitle, colors, index) {
    const c = document.createElement('canvas');
    c.width = 720;
    c.height = 500;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 720, 500);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.55, colors[1]);
    grad.addColorStop(1, colors[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 720, 500);

    // Subtle geometric rings
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.lineWidth = 1.5;
    for (let r = 60; r <= 300; r += 48) {
      g.beginPath();
      g.arc(540, 240, r, 0, Math.PI * 2);
      g.stroke();
    }

    // Glow orb
    const orb = g.createRadialGradient(540, 240, 10, 540, 240, 200);
    orb.addColorStop(0, 'rgba(255,255,255,0.35)');
    orb.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = orb;
    g.fillRect(0, 0, 720, 500);

    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = '600 18px monospace';
    g.fillText(`0${index + 1} // ARCHIVE`, 44, 62);

    g.fillStyle = '#ffffff';
    g.font = '700 44px system-ui, sans-serif';
    g.fillText(title, 44, 410);

    g.fillStyle = 'rgba(255,255,255,0.72)';
    g.font = '400 20px system-ui, sans-serif';
    g.fillText(subtitle, 44, 446);

    return c.toDataURL('image/jpeg', 0.9);
  }

  const ITEMS = [
    { title: 'Kinetic Archive', sub: '3D WebGL & Motion Direction', img: '/betteroff/assets/images/defective-units-vol-1.webp', colors: ['#1e1b4b', '#4338ca', '#0f172a'] },
    { title: 'Solaris Studio', sub: 'Interactive Brand Experience', img: '/betteroff/assets/images/asap-x-rayban.webp', colors: ['#3b0764', '#7e22ce', '#111827'] },
    { title: 'Monolith OS', sub: 'Spatial Interface System', img: '/carousel-gallery-play/assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-115.webp', colors: ['#064e3b', '#047857', '#09090b'] },
    { title: 'Aether Shaders', sub: 'Real-time OKLCH Gradients', img: '/vivmgmt/assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg', colors: ['#4c0519', '#be123c', '#18181b'] },
    { title: 'Chronos Ribbon', sub: 'Inertia Timeline Architecture', img: '/betteroff/assets/images/ch-11-shit-waves-hawaii.webp', colors: ['#172554', '#1d4ed8', '#09090b'] },
    { title: 'Velvet Editorial', sub: '5-Column Parallax Lookbook', img: '/vivmgmt/assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg', colors: ['#451a03', '#b45309', '#0c0a09'] },
    { title: 'Hyperion Sound', sub: 'WebAudio Synthesizer Jukebox', img: '/betteroff/assets/images/converse-shoe-drop-by-works-studio.webp', colors: ['#31102f', '#a21caf', '#09090b'] },
    { title: 'Polaroid Line', sub: 'Catenary String & Breeze Physics', img: '/carousel-gallery-play/assets/images/20240726-Pieter-Slembrouck-SPA-GP-131.webp', colors: ['#0f2942', '#0284c7', '#09090b'] },
    { title: 'Vertex Cylinder', sub: '360° Cylindrical Showcase', img: '/carousel-gallery-play/assets/images/20250219_Pieter-Slembrouck-PSG-148.webp', colors: ['#1e293b', '#475569', '#09090b'] },
    { title: 'Obsidian Vault', sub: 'Design Engineer Component Hub', img: '/vivmgmt/assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg', colors: ['#2e1065', '#6d28d9', '#09090b'] }
  ];

  const stageEl = document.getElementById('ww-stage');
  const wheelEl = document.getElementById('ww-wheel');
  const ringLabelEl = document.getElementById('ww-ring-label');
  const frontTitleEl = document.getElementById('ww-front-title');
  const indexEl = document.getElementById('ww-index');

  if (!stageEl || !wheelEl) return;

  const count = ITEMS.length;
  const last = Math.max(count - 1, 0);
  let turn = 0;
  let target = 0;
  let active = -1;
  let settlingTimer = 0;
  let dragStartY = null;

  const cardEls = [];
  const faceEls = [];
  const indexBtnEls = [];

  ITEMS.forEach((item, i) => {
    const card = document.createElement('a');
    card.href = '#';
    card.className = 'ww-card';
    card.id = `works-wheel-${i}`;
    card.setAttribute('role', 'option');
    card.addEventListener('click', (e) => {
      e.preventDefault();
      to(i + 1);
    });

    const face = document.createElement('span');
    face.className = 'ww-face';

    const img = document.createElement('img');
    img.src = item.img;
    img.onerror = () => {
      img.onerror = null;
      img.src = makeCoverArt(item.title, item.sub, item.colors, i);
    };
    img.alt = item.title;
    img.draggable = false;

    const badge = document.createElement('span');
    badge.className = 'ww-badge';
    badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> View`;

    face.appendChild(img);
    face.appendChild(badge);
    card.appendChild(face);
    wheelEl.appendChild(card);
    cardEls.push(card);
    faceEls.push(face);

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.title;
    btn.addEventListener('click', () => to(i + 1));
    li.appendChild(btn);
    indexEl.appendChild(li);
    indexBtnEls.push(btn);
  });

  function to(next) {
    target = clamp(next, 0, last + 1);
  }

  let metrics = {
    cardW: 260,
    cardH: 180,
    ringR: 205,
    ringScale: 0.5,
    drumR: 400,
    bow: 320,
    depth: 480,
    title: 22,
    index: 12
  };

  function updateMetrics() {
    const w = stageEl.clientWidth || window.innerWidth;
    const h = stageEl.clientHeight || window.innerHeight;
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
    const cardH = cardW / CARD_RATIO;
    const drumR = cardH * DRUM;
    const ringR = cardH * RING_R;
    const ringScale = count
      ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1)
      : 1;

    metrics = {
      cardW,
      cardH,
      ringR,
      ringScale,
      drumR,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: Math.max(18, cardH * TITLE),
      index: Math.max(11, cardH * INDEX)
    };

    stageEl.style.perspective = `${metrics.depth}px`;
    ringLabelEl.style.fontSize = `${metrics.title}px`;
    frontTitleEl.style.fontSize = `${metrics.title}px`;
    indexEl.style.fontSize = `${metrics.index}px`;

    cardEls.forEach((card) => {
      card.style.width = `${metrics.cardW}px`;
      card.style.height = `${metrics.cardH}px`;
      card.style.marginLeft = `${-metrics.cardW / 2}px`;
      card.style.marginTop = `${-metrics.cardH / 2}px`;
    });
  }

  updateMetrics();
  window.addEventListener('resize', updateMetrics);

  stageEl.addEventListener(
    'wheel',
    (event) => {
      const next = target + event.deltaY / WHEEL_UNITS;
      if (next > 0 && next < last + 1) event.preventDefault();
      to(next);
      clearTimeout(settlingTimer);
      settlingTimer = setTimeout(() => to(Math.round(target)), SETTLE);
    },
    { passive: false }
  );

  stageEl.addEventListener('pointerdown', (event) => {
    dragStartY = event.clientY;
    stageEl.setPointerCapture(event.pointerId);
  });

  stageEl.addEventListener('pointermove', (event) => {
    if (dragStartY === null) return;
    to(target + (dragStartY - event.clientY) / DRAG_UNITS);
    dragStartY = event.clientY;
  });

  stageEl.addEventListener('pointerup', () => {
    dragStartY = null;
    if (target > 1) to(Math.round(target));
  });

  stageEl.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') to(Math.round(target) + 1);
    else if (event.key === 'ArrowUp') to(Math.round(target) - 1);
    else return;
    event.preventDefault();
  });

  function draw() {
    requestAnimationFrame(draw);
    const gap = target - turn;
    if (Math.abs(gap) < 0.0005) turn = target;
    else turn += gap * EASE;

    const t = turn;
    const m = clamp(t, 0, 1);
    const pos = Math.max(0, t - 1);
    const { ringR, ringScale, drumR, bow } = metrics;

    wheelEl.style.transform = `translateZ(${-m * drumR}px)`;

    for (let i = 0; i < count; i++) {
      const d = i - pos;
      const drumDeg = d * STEP;
      const card = cardEls[i];
      card.style.transform = place(d * (360 / count), drumDeg, ringR, drumR, bow, m);
      card.style.opacity = m > 0.5 && Math.abs(d) > CULL ? '0' : '1';
      card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
      faceEls[i].style.transform = `scale(${lerp(ringScale, 1, m)})`;
    }

    ringLabelEl.style.opacity = String(1 - m);
    frontTitleEl.style.opacity = String(m);

    const near = clamp(Math.round(pos), 0, last);
    if (near !== active) {
      active = near;
      frontTitleEl.textContent = ITEMS[active]?.title || '';
      indexBtnEls.forEach((btn, idx) => {
        btn.classList.toggle('is-active', idx === active && m > 0.25);
      });
    }
  }

  requestAnimationFrame(draw);
})();
