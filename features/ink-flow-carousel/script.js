(function () {
  var cv = document.getElementById('ipCanvas'), ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slides = [
    { t: 'Deep Tide', s: ['#04243a', '#0d6e8c', '#7fe0d0'], k: 'wave' },
    { t: 'Ember Field', s: ['#2a0a12', '#c2331f', '#ffc16b'], k: 'sun' },
    { t: 'Moss Hour', s: ['#0c1f14', '#2f7a46', '#d9f27a'], k: 'hills' },
    { t: 'Violet Static', s: ['#150a2e', '#6a3de0', '#ff9be0'], k: 'rings' }
  ];
  var W = 0, H = 0, dpr = 1, cur = 0, nxt = 0, art = [];
  var anim = null, visible = true, dots = [];

  function paint(i) {
    var s = slides[i], c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d'), m = Math.max(W, H);
    var bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, s.s[0]); bg.addColorStop(0.6, s.s[1]); bg.addColorStop(1, s.s[2]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.5;
    if (s.k === 'wave') {
      for (var r = 0; r < 14; r++) {
        g.beginPath(); g.moveTo(0, H);
        for (var x = 0; x <= W; x += 12) g.lineTo(x, H * (0.3 + r * 0.05) + Math.sin(x / (80 + r * 9) + r) * (14 + r * 2));
        g.lineTo(W, H); g.fillStyle = 'rgba(' + (4 + r * 8) + ',' + (40 + r * 12) + ',' + (70 + r * 8) + ',0.35)'; g.fill();
      }
    } else if (s.k === 'sun') {
      var rg = g.createRadialGradient(W * 0.7, H * 0.4, 0, W * 0.7, H * 0.4, m * 0.45);
      rg.addColorStop(0, '#fff3c4'); rg.addColorStop(0.3, '#ffb24d'); rg.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    } else if (s.k === 'hills') {
      for (var h = 0; h < 5; h++) {
        g.beginPath(); g.moveTo(0, H);
        for (var x2 = 0; x2 <= W; x2 += 14) g.lineTo(x2, H * (0.45 + h * 0.1) - Math.sin(x2 / (120 + h * 40) + h * 2) * 50);
        g.lineTo(W, H); g.fillStyle = 'rgba(8,' + (30 + h * 14) + ',20,0.45)'; g.fill();
      }
    } else {
      g.lineWidth = 3; g.strokeStyle = '#fff';
      for (var q = 1; q < 14; q++) { g.globalAlpha = 0.5 - q * 0.03; g.beginPath(); g.arc(W * 0.35, H * 0.5, q * m * 0.05, 0, 7); g.stroke(); }
    }
    g.globalAlpha = 1;
    return c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    W = cv.width = Math.max(1, Math.round(r.width * dpr)); H = cv.height = Math.max(1, Math.round(r.height * dpr));
    art = slides.map(function (_, i) { return paint(i); });
    draw(null);
  }

  function draw(p) {
    ctx.drawImage(art[cur], 0, 0);
    if (!p) return;
    var a = p.t, R = p.max * (a * a * (3 - 2 * a));
    ctx.save();
    ctx.beginPath();
    var n = 180;
    for (var i = 0; i <= n; i++) {
      var th = (i / n) * Math.PI * 2;
      var wob = 1 + 0.16 * Math.sin(3 * th + p.ph + a * 6) + 0.1 * Math.sin(7 * th - p.ph * 1.7 + a * 9) + 0.07 * Math.sin(13 * th + a * 14);
      var rr = R * wob * (0.8 + 0.2 * Math.min(1, a * 3));
      var x = p.x + Math.cos(th) * rr, y = p.y + Math.sin(th) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.clip();
    ctx.drawImage(art[nxt], 0, 0);
    ctx.restore();
  }

  function go(to, x, y) {
    to = (to + slides.length) % slides.length;
    if (to === cur && !anim) return;
    if (anim) { cur = nxt; cancelAnimationFrame(anim.id); anim = null; }
    nxt = to;
    setUI(to);
    if (reduce) { cur = nxt; draw(null); return; }
    var px = x == null ? (Math.random() < 0.5 ? 0 : W) : x, py = y == null ? H * Math.random() : y;
    var max = Math.hypot(Math.max(px, W - px), Math.max(py, H - py)) * 1.35;
    var t0 = performance.now(), dur = 1900, ph = Math.random() * 6;
    anim = { id: 0 };
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur);
      draw({ t: t, x: px, y: py, max: max, ph: ph });
      if (t < 1) { anim.id = requestAnimationFrame(step); }
      else { cur = nxt; anim = null; draw(null); }
    })(t0);
  }

  function setUI(i) {
    document.getElementById('ipTitle').textContent = slides[i].t;
    document.getElementById('ipCount').textContent = '0' + (i + 1) + ' / 0' + slides.length;
    dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }

  var dw = document.getElementById('ipDots');
  slides.forEach(function (s, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ip-dot'; b.setAttribute('aria-label', 'Show ' + s.t);
    b.addEventListener('click', function () { go(i); }); dw.appendChild(b); dots.push(b);
  });
  document.getElementById('ipPrev').addEventListener('click', function () { go((anim ? nxt : cur) - 1); });
  document.getElementById('ipNext').addEventListener('click', function () { go((anim ? nxt : cur) + 1); });
  cv.addEventListener('pointerdown', function (e) {
    var r = cv.getBoundingClientRect();
    go((anim ? nxt : cur) + 1, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go((anim ? nxt : cur) + 1); else if (e.key === 'ArrowLeft') go((anim ? nxt : cur) - 1);
  });
  window.addEventListener('resize', resize);
  setUI(0); resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
})();
