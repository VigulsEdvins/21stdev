(function () {
  var cv = document.querySelector('[data-ko-canvas]');
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 340, GOLD = Math.PI * (3 - Math.sqrt(5));
  var legends = 'QWERTYUIOPASDFGHJKLZXCVBNM<>?/+=#@&*'.split('');
  var kinds = [
    { top: '#1b1d27', side: '#0c0d14', ink: '#e9e9f0' },
    { top: '#cfcfd6', side: '#8a8b96', ink: '#22232c' },
    { top: '#f0a93a', side: '#a96a12', ink: '#2a1a05' },
    { top: '#2fb7a6', side: '#16706a', ink: '#04231f' },
    { top: 'rgba(210,225,255,.28)', side: 'rgba(160,185,240,.22)', ink: 'rgba(255,255,255,.8)', glass: true }
  ];
  var keys = [];
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = GOLD * i;
    var n = [Math.cos(th) * r, y, Math.sin(th) * r];
    var up = Math.abs(n[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    var u = norm(cross(up, n)), v = cross(n, u);
    var k = (i * 7 + ((i / 5) | 0)) % 9;
    keys.push({ n: n, u: u, v: v, kind: kinds[k < 3 ? 0 : k < 5 ? 1 : k < 6 ? 2 : k < 7 ? 3 : 4], ch: legends[i % legends.length] });
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }
  function rot(p, ay, ax) {
    var c = Math.cos(ay), s = Math.sin(ay), x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c;
    c = Math.cos(ax); s = Math.sin(ax);
    return [x, p[1] * c - z * s, p[1] * s + z * c];
  }

  var W, H, dpr, ay = 0.6, ax = -0.25, vy = 0.004, vx = 0, drag = false, lx = 0, ly = 0, run = true;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }
  cv.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    vy = (e.clientX - lx) * 0.006; vx = (e.clientY - ly) * 0.004;
    ay += vy; ax = Math.max(-1.1, Math.min(1.1, ax + vx)); lx = e.clientX; ly = e.clientY;
  });
  function up() { drag = false; }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function frame(t) {
    if (!run) return;
    if (!drag) { ay += vy; vy += ((reduce ? 0 : 0.003) - vy) * 0.02; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var R = Math.min(W, H) * 0.3, cx = W / 2, cy = H * 0.55 + Math.sin(t / 1200) * (reduce ? 0 : 6);
    // floor glow + shadow
    var g = ctx.createRadialGradient(W / 2, H * 0.86, 0, W / 2, H * 0.86, R * 1.3);
    g.addColorStop(0, 'rgba(70,120,255,.45)'); g.addColorStop(1, 'rgba(70,120,255,0)');
    ctx.fillStyle = g; ctx.save(); ctx.translate(0, 0); ctx.scale(1, 1);
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.86, R * 1.3, R * 0.22, 0, 0, 7); ctx.fill(); ctx.restore();
    var vis = [];
    keys.forEach(function (k) {
      var n = rot(k.n, ay, ax);
      if (n[2] < -0.05) return;
      vis.push({ k: k, n: n, u: rot(k.u, ay, ax), v: rot(k.v, ay, ax) });
    });
    vis.sort(function (a, b) { return a.n[2] - b.n[2]; });
    var s = R * 0.115;
    vis.forEach(function (o) {
      var k = o.k, d = o.n[2], px = cx + o.n[0] * R, py = cy + o.n[1] * R;
      ctx.setTransform(dpr * o.u[0], dpr * o.u[1], dpr * o.v[0], dpr * o.v[1], dpr * px, dpr * py);
      var shade = 0.35 + 0.65 * Math.max(0, d);
      ctx.globalAlpha = k.kind.glass ? 0.9 : 1;
      ctx.fillStyle = k.kind.side; rr(-s, -s, s * 2, s * 2, s * 0.28); ctx.fill();
      ctx.fillStyle = k.kind.top; rr(-s * 0.78, -s * 0.78, s * 1.56, s * 1.5, s * 0.22); ctx.fill();
      ctx.fillStyle = k.kind.ink; ctx.font = '700 ' + (s * 0.9) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k.ch, 0, s * 0.04);
      ctx.fillStyle = 'rgba(5,6,14,' + (1 - shade) * 0.8 + ')'; rr(-s, -s, s * 2, s * 2, s * 0.28); ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  size(); window.addEventListener('resize', size);
  new IntersectionObserver(function (e) {
    var on = e[0].isIntersecting;
    if (on && !run) { run = true; requestAnimationFrame(frame); } else if (!on) run = false;
  }).observe(cv);
  requestAnimationFrame(frame);
})();
