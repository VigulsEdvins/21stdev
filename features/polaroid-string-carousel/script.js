/**
 * Polaroid Line Carousel — Sagging String & Breeze Physics
 * Standalone Vanilla JS implementation ported from photo-caroulsel/code2.txt
 */
(function () {
  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function stringY(x, w, y0, sag) {
    const t = clamp(x / w, 0, 1);
    return y0 + 4 * sag * t * (1 - t);
  }

  function springStep(x, v, target, dt, k = 70) {
    const c = 2 * Math.sqrt(k);
    const nv = v + (k * (target - x) - c * v) * dt;
    return [x + nv * dt, nv];
  }

  function swingStep(a, w, lineVel, dt, gain) {
    const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt;
    return [clamp(a + nw * dt, -0.6, 0.6), nw];
  }

  function nearestAt(off, spacing, n) {
    return clamp(Math.round(off / spacing), 0, Math.max(0, n - 1));
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  const PALETTES = {
    dawn: { top: '#e7b7a5', bottom: '#f8e8d6', sun: '#fff4df', far: '#d2b2bb', near: '#3a2a3b', mist: '255,240,232' },
    alpine: { top: '#7ea5c8', bottom: '#e3ecf2', sun: '#ffffff', far: '#a9bfd0', near: '#1c3044', mist: '236,244,250' },
    dusk: { top: '#2a2450', bottom: '#ef8d60', sun: '#ffd9a6', far: '#93607c', near: '#18121f', mist: '255,196,160' },
    mist: { top: '#c4d0cb', bottom: '#eef1ec', sun: '#ffffff', far: '#aebcb5', near: '#2c3a33', mist: '246,248,245' }
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexRgb(h) {
    const v = parseInt(h.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function mixRgb(a, b, t) {
    const A = hexRgb(a);
    const B = hexRgb(b);
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
  }

  function paintLandscape(seed, palette, w = 640, h = 640) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const P = PALETTES[palette] || PALETTES.dawn;
    const r = mulberry32(seed * 104729 + 7);

    const sky = g.createLinearGradient(0, 0, 0, h * 0.72);
    sky.addColorStop(0, P.top);
    sky.addColorStop(1, P.bottom);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    const sx = w * (0.22 + r() * 0.56);
    const sy = h * (0.26 + r() * 0.16);
    const halo = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.45);
    halo.addColorStop(0, 'rgba(' + hexRgb(P.sun).join(',') + ',.85)');
    halo.addColorStop(0.08, 'rgba(' + hexRgb(P.sun).join(',') + ',.55)');
    halo.addColorStop(1, 'rgba(' + hexRgb(P.sun).join(',') + ',0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);

    g.fillStyle = P.sun;
    g.beginPath();
    g.arc(sx, sy, h * 0.045, 0, Math.PI * 2);
    g.fill();

    const layers = 5;
    for (let L = 0; L < layers; L++) {
      const k = L / (layers - 1);
      const base = h * (0.42 + k * 0.4);
      const amp = h * (0.07 + k * 0.1);
      const ph = [r(), r(), r(), r()].map((v) => v * Math.PI * 2);
      const fr = [1.3 + r(), 3.1 + r() * 2, 7 + r() * 4, 17 + r() * 8];
      const ridge = (x) => {
        const u = x / w;
        return (
          base -
          amp *
            (0.55 * Math.sin(u * fr[0] + ph[0]) +
              0.28 * Math.sin(u * fr[1] + ph[1]) +
              0.12 * Math.abs(Math.sin(u * fr[2] + ph[2])) +
              0.05 * Math.sin(u * fr[3] + ph[3]))
        );
      };

      const mist = g.createLinearGradient(0, base - amp * 1.4, 0, base + amp * 0.4);
      mist.addColorStop(0, 'rgba(' + P.mist + ',0)');
      mist.addColorStop(1, 'rgba(' + P.mist + ',' + (0.55 - k * 0.35).toFixed(2) + ')');
      g.fillStyle = mist;
      g.fillRect(0, base - amp * 1.4, w, amp * 1.8);

      const body = g.createLinearGradient(0, base - amp, 0, h);
      body.addColorStop(0, mixRgb(P.far, P.near, Math.pow(k, 1.3)));
      body.addColorStop(1, mixRgb(P.far, P.near, Math.min(1, Math.pow(k, 1.3) + 0.18)));
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, ridge(x));
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }

    return c.toDataURL('image/jpeg', 0.88);
  }

  const SLIDES = [
    { title: 'First Light', caption: 'Haze lifting off the eastern ridges.', palette: 'dawn', seed: 3, img: '/vivmgmt/assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg' },
    { title: 'High Pass', caption: 'Cold air, clear to the far range.', palette: 'alpine', seed: 8, img: '/carousel-gallery-play/assets/images/20240726-Pieter-Slembrouck-SPA-GP-131.webp' },
    { title: 'Ember Hour', caption: 'The last of the sun on the valley floor.', palette: 'dusk', seed: 14, img: '/betteroff/assets/images/ch-11-shit-waves-hawaii.webp' },
    { title: 'Still Valley', caption: 'Morning mist that never quite lifts.', palette: 'mist', seed: 21, img: '/vivmgmt/assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg' },
    { title: 'Rose Ridge', caption: 'Five ridges, one long exhale.', palette: 'dawn', seed: 34, img: '/betteroff/assets/images/asap-x-rayban.webp' },
    { title: 'Blue Hour', caption: 'Pines going dark against the snow.', palette: 'alpine', seed: 55, img: '/carousel-gallery-play/assets/images/20240806-Pieter-Slembrouck-IBZ-Woodwork-110.webp' }
  ];

  const root = document.getElementById('pl-root');
  const pathEl = document.getElementById('pl-path');
  const cardsContainer = document.getElementById('pl-cards');
  const titleEl = document.getElementById('pl-title');
  const subEl = document.getElementById('pl-sub');
  const currEl = document.getElementById('pl-curr');
  const totalEl = document.getElementById('pl-total');
  const prevBtn = document.getElementById('pl-prev');
  const nextBtn = document.getElementById('pl-next');

  if (!root || !cardsContainer) return;

  const n = SLIDES.length;
  totalEl.textContent = pad2(n);

  const cardWidth = 280;
  const sag = 46;
  const swing = 1;
  let size = { w: window.innerWidth, h: window.innerHeight, cw: 260 };
  let spacing = size.cw * 1.08;
  let active = 0;
  let drag = null;
  let lastTouch = 0;

  const sim = {
    off: 0,
    vel: 0,
    target: 0,
    a: new Array(n).fill(0),
    w: new Array(n).fill(0)
  };

  const cardEls = SLIDES.map((sl, i) => {
    const el = document.createElement('div');
    el.className = 'pl-card';
    el.setAttribute('data-i', String(i));
    el.setAttribute('data-on', i === 0 ? '1' : '0');

    const fallbackSrc = paintLandscape(sl.seed, sl.palette);
    el.innerHTML = `
      <div class="pl-print">
        <div class="pl-shot"><img src="${sl.img || fallbackSrc}" alt="${sl.title}" draggable="false" /></div>
        <div class="pl-note">${sl.title}</div>
      </div>
      <div class="pl-peg"></div>
    `;
    const imgEl = el.querySelector('img');
    if (imgEl) {
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = fallbackSrc;
      };
    }
    cardsContainer.appendChild(el);
    return el;
  });

  function updateSize() {
    const r = root.getBoundingClientRect();
    const cw = Math.round(Math.max(150, Math.min(cardWidth, r.width * 0.42, r.height * 0.42)));
    size = { w: r.width || window.innerWidth, h: r.height || window.innerHeight, cw };
    spacing = size.cw * 1.08;
    root.style.setProperty('--pl-cw', size.cw + 'px');
    sim.target = active * spacing;
  }

  updateSize();
  window.addEventListener('resize', updateSize);

  function goTo(i) {
    sim.target = clamp(i, 0, n - 1) * spacing;
  }

  function updateUI(near) {
    active = near;
    const s = SLIDES[active] || {};
    titleEl.textContent = s.title || '';
    subEl.textContent = s.caption || '';
    currEl.textContent = pad2(active + 1);
    cardEls.forEach((el, idx) => {
      el.setAttribute('data-on', idx === active ? '1' : '0');
    });
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pl-bar')) return;
    lastTouch = performance.now();
    drag = { x: e.clientX, off: sim.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  });

  root.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      root.setAttribute('data-drag', '1');
      root.setPointerCapture(e.pointerId);
    }
    if (!drag.moved) return;
    const dt = Math.max(1, e.timeStamp - drag.lt);
    drag.v = 0.7 * ((e.clientX - drag.lx) / dt) + 0.3 * drag.v;
    drag.lx = e.clientX;
    drag.lt = e.timeStamp;
    const max = (n - 1) * spacing;
    let off = drag.off - dx;
    if (off < 0) off *= 0.35;
    if (off > max) off = max + (off - max) * 0.35;
    sim.off = off;
  });

  function endDrag(e) {
    const d = drag;
    drag = null;
    lastTouch = performance.now();
    root.setAttribute('data-drag', '0');
    if (!d) return;
    if (d.moved) {
      sim.vel = -d.v * 1000;
      goTo(nearestAt(sim.off - d.v * 180, spacing, n));
      return;
    }
    const card = e.target.closest('[data-i]');
    if (card) goTo(Number(card.getAttribute('data-i')));
  }

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  prevBtn.addEventListener('click', () => {
    lastTouch = performance.now();
    goTo(clamp(active - 1, 0, n - 1));
  });

  nextBtn.addEventListener('click', () => {
    lastTouch = performance.now();
    goTo(clamp(active + 1, 0, n - 1));
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(clamp(active + 1, 0, n - 1));
    else if (e.key === 'ArrowLeft') goTo(clamp(active - 1, 0, n - 1));
    else return;
    e.preventDefault();
  });

  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, (now - prev) / 1000);
    prev = now;
    const { w, h, cw } = size;
    const y0 = Math.max(40, h * 0.18);

    let lineVel;
    if (drag && drag.moved) {
      lineVel = drag.v * 1000;
    } else {
      const before = sim.off;
      [sim.off, sim.vel] = springStep(sim.off, sim.vel, sim.target, dt);
      lineVel = -(sim.off - before) / Math.max(dt, 1e-3);
    }

    const near = nearestAt(sim.off, spacing, n);
    for (let i = 0; i < n; i++) {
      const el = cardEls[i];
      const x = w / 2 + i * spacing - sim.off;
      if (x < -cw * 1.5 || x > w + cw * 1.5) {
        el.style.visibility = 'hidden';
        continue;
      }
      el.style.visibility = 'visible';
      let a = sim.a[i] || 0;
      let av = sim.w[i] || 0;
      [a, av] = swingStep(a, av, lineVel, dt, swing);
      a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * swing;
      sim.a[i] = a;
      sim.w[i] = av;
      const y = stringY(x, w, y0, sag) - 6;
      el.style.transform = `translate(${(x - cw / 2).toFixed(1)}px,${y.toFixed(1)}px) rotate(${a.toFixed(4)}rad)`;
      el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
    }

    pathEl.setAttribute('d', `M0 ${y0} Q${w / 2} ${y0 + 2 * sag} ${w} ${y0}`);
    if (near !== active) {
      updateUI(near);
    }
  }

  requestAnimationFrame(frame);
})();
