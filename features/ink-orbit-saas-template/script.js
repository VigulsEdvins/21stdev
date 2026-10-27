(function () {
  var cv = document.getElementById('qpCanvas'), ctx = cv.getContext('2d');
  var art = cv.parentNode;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pts = [], U = 46, V = 18, ay = 0.6, ax = 0.9, vy = 0.004, drag = false, lx = 0, ly = 0, visible = true, raf = 0;
  for (var i = 0; i < U; i++) for (var j = 0; j < V; j++) {
    var u = i / U * Math.PI * 2, v = j / V * Math.PI * 2, R = 1, r = 0.42;
    var rr = r * (1 + 0.35 * Math.sin(u * 3));
    pts.push([(R + rr * Math.cos(v)) * Math.cos(u), (R + rr * Math.cos(v)) * Math.sin(u), rr * Math.sin(v) * 1.2]);
  }
  function accent() { return getComputedStyle(art).getPropertyValue('--accent').trim() || '#4f46e5'; }
  function draw() {
    var w = cv.width, c = w / 2, s = w * 0.22, col = accent();
    ctx.clearRect(0, 0, w, w);
    var sy = Math.sin(ay), cy = Math.cos(ay), sx = Math.sin(ax), cx = Math.cos(ax), out = [];
    for (var k = 0; k < pts.length; k++) {
      var p = pts[k], x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy, y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
      var f = 3.2 / (3.2 + z);
      out.push([c + x * s * f * 1.5, c + y * s * f * 1.5, z]);
    }
    out.sort(function (a, b) { return b[2] - a[2]; });
    ctx.fillStyle = col;
    for (var m = 0; m < out.length; m++) {
      var o = out[m], t = (1 - o[2]) / 3;
      ctx.globalAlpha = Math.max(0.12, Math.min(1, 0.35 + t * 0.9));
      ctx.beginPath(); ctx.arc(o[0], o[1], 1.2 + t * 2.6, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { raf = 0; if (!drag) ay += vy; draw(); if (visible && !reduce) raf = requestAnimationFrame(loop); }
  art.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; art.setPointerCapture(e.pointerId); });
  art.addEventListener('pointermove', function (e) { if (!drag) return; ay += (e.clientX - lx) * 0.01; ax += (e.clientY - ly) * 0.01; lx = e.clientX; ly = e.clientY; if (reduce) draw(); });
  function up() { drag = false; } art.addEventListener('pointerup', up); art.addEventListener('pointercancel', up);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(art);
  draw(); if (!reduce) raf = requestAnimationFrame(loop);
})();
