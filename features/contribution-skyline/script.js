(function () {
  var cv = document.getElementById('akCanvas'), ctx = cv.getContext('2d');
  var tip = document.getElementById('akTip'), W = 53, D = 7;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var days = [], best = 0, active = 0, run = 0, streak = 0, i, v;
  for (i = 0; i < W * D; i++) {
    var wk = Math.floor(i / D), wave = 0.5 + 0.5 * Math.sin(wk / 5), wkend = (i % D === 0 || i % D === 6) ? 0.35 : 1;
    v = rnd() < 0.28 ? 0 : Math.floor(Math.pow(rnd(), 2.2) * 18 * wave * wkend + (rnd() < 0.04 ? 20 : 0));
    days.push(v); best = Math.max(best, v);
    if (v) { active++; run++; streak = Math.max(streak, run); } else run = 0;
  }
  var tot = days.reduce(function (a, b) { return a + b; }, 0); document.querySelector('.ak-title b').textContent = tot.toLocaleString('en-US');
  document.getElementById('akBest').textContent = best;
  document.getElementById('akStreak').textContent = streak + ' days';
  document.getElementById('akActive').textContent = active;
  var level = function (n) { return n === 0 ? 0 : n < 4 ? 1 : n < 8 ? 2 : n < 14 ? 3 : 4; };
  var alphas = [0.12, 0.35, 0.6, 0.8, 1];

  var t = 0, goal = 0, raf = 0, visible = true, hover = -1, geo = null;
  function accent() { return getComputedStyle(cv).getPropertyValue('--accent').trim() || '#0f8f6a'; }

  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    var w = cv.clientWidth, h = cv.clientHeight, col = accent();
    ctx.clearRect(0, 0, w, h);
    var ang = t * Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang), squash = 1 - 0.5 * t;
    // fit: measure the rotated grid extents at unit scale
    var xs = [], ys = [];
    [[0, 0], [W, 0], [0, D], [W, D]].forEach(function (p) { xs.push(p[0] * ca - p[1] * sa); ys.push((p[0] * sa + p[1] * ca) * squash); });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var tall = 5.5 * t, s = Math.min((w - 40) / (maxX - minX), (h - 40) / (maxY - minY + tall * 0.9));
    var ox = (w - (maxX - minX) * s) / 2 - minX * s, oy = (h - (maxY - minY) * s) / 2 - minY * s + tall * s * 0.45;
    var order = [];
    for (var n = 0; n < days.length; n++) { var gx = Math.floor(n / D), gy = n % D; order.push([n, (gx + 0.5) * sa + (gy + 0.5) * ca]); }
    order.sort(function (a, b) { return a[1] - b[1]; });
    var pr = function (x, y) { return [ox + (x * ca - y * sa) * s, oy + (x * sa + y * ca) * squash * s]; };
    var boxes = [];
    ctx.fillStyle = col;
    order.forEach(function (o) {
      var n = o[0], gx = Math.floor(n / D), gy = n % D, lv = level(days[n]);
      var hh = t * (days[n] / best) * 5.2 * s, pad = 0.08;
      var a = pr(gx + pad, gy + pad), b = pr(gx + 1 - pad, gy + pad), c = pr(gx + 1 - pad, gy + 1 - pad), d = pr(gx + pad, gy + 1 - pad);
      ctx.globalAlpha = n === hover ? 1 : alphas[lv];
      if (hh > 1) {
        var faces = [[d, c, 0.42], [c, b, 0.62]];
        faces.forEach(function (f) {
          ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1]); ctx.lineTo(f[1][0], f[1][1]); ctx.lineTo(f[1][0], f[1][1] - hh); ctx.lineTo(f[0][0], f[0][1] - hh); ctx.closePath();
          ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.fill();
          ctx.globalAlpha = f[2]; ctx.fillStyle = '#000'; ctx.fill();
        });
      }
      ctx.fillStyle = col; ctx.globalAlpha = hh > 1 ? 1 : (n === hover ? 1 : alphas[lv]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1] - hh); ctx.lineTo(b[0], b[1] - hh); ctx.lineTo(c[0], c[1] - hh); ctx.lineTo(d[0], d[1] - hh); ctx.fill();
      boxes.push([n, a[0], b[0], c[0], d[0], a[1] - hh, b[1] - hh, c[1] - hh, d[1] - hh]);
    });
    ctx.globalAlpha = 1; geo = boxes;
  }
  function inQuad(b, x, y) { // point in top-face quad (convex), via cross products
    var px = [b[1], b[2], b[3], b[4]], py = [b[5], b[6], b[7], b[8]], sign = 0;
    for (var k = 0; k < 4; k++) { var j = (k + 1) % 4, cr = (px[j] - px[k]) * (y - py[k]) - (py[j] - py[k]) * (x - px[k]); if (cr !== 0) { if (sign && (cr > 0) !== (sign > 0)) return false; sign = cr; } }
    return true;
  }
  function loop() {
    raf = 0; var diff = goal - t;
    if (Math.abs(diff) > 0.002) t += diff * (reduce ? 1 : 0.08); else t = goal;
    draw();
    if (visible && t !== goal) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  Array.prototype.forEach.call(document.querySelectorAll('.ak-opt'), function (b) {
    b.addEventListener('click', function () {
      goal = b.dataset.mode === 'city' ? 1 : 0;
      Array.prototype.forEach.call(document.querySelectorAll('.ak-opt'), function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); });
      kick();
    });
  });
  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hit = -1;
    if (geo) for (var k = geo.length - 1; k >= 0; k--) if (inQuad(geo[k], x, y)) { hit = geo[k][0]; break; }
    if (hit !== hover) { hover = hit; tip.textContent = hit < 0 ? 'Hover a day' : days[hit] + ' check-ins, week ' + (Math.floor(hit / D) + 1) + ', day ' + (hit % D + 1); draw(); }
  });
  cv.addEventListener('pointerleave', function () { hover = -1; tip.textContent = 'Hover a day'; draw(); });
  window.addEventListener('resize', function () { size(); draw(); });
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  size(); draw();
})();
