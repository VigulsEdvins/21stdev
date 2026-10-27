(function () {
  var poster = document.getElementById('cpPoster'), cv = document.getElementById('cpField'), ctx = cv.getContext('2d');
  var face = document.getElementById('cpFace'), fig = document.getElementById('cpFigure');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, flowers = [], run = true;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = poster.clientWidth; H = poster.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flowers = [];
    var n = Math.round(W * H / 2600), horizon = H * 0.5;
    for (var i = 0; i < n; i++) {
      var t = Math.pow(Math.random(), 0.8), y = horizon + t * (H - horizon);
      flowers.push({ x: rnd(-10, W + 10), y: y, s: 3 + t * 20, ph: rnd(0, 6.28), hue: rnd(-8, 10) });
    }
    flowers.sort(function (a, b) { return a.y - b.y; });
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, '#6c2a1a'); g.addColorStop(1, '#2c1208');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i], sway = reduce ? 0 : Math.sin(t / 900 + f.ph) * f.s * 0.15;
      ctx.strokeStyle = '#3d4a1c'; ctx.lineWidth = Math.max(1, f.s * 0.08);
      ctx.beginPath(); ctx.moveTo(f.x, f.y + f.s * 1.4); ctx.quadraticCurveTo(f.x, f.y + f.s * 0.5, f.x + sway, f.y); ctx.stroke();
      ctx.fillStyle = 'hsl(' + (4 + f.hue) + ',85%,' + (40 + f.s) + '%)';
      for (var p = 0; p < 4; p++) {
        var a = p * 1.57 + f.ph * 0.3;
        ctx.beginPath(); ctx.ellipse(f.x + sway + Math.cos(a) * f.s * 0.35, f.y + Math.sin(a) * f.s * 0.3, f.s * 0.42, f.s * 0.34, a, 0, 6.28); ctx.fill();
      }
      ctx.fillStyle = '#1a0b08'; ctx.beginPath(); ctx.arc(f.x + sway, f.y, f.s * 0.14, 0, 6.28); ctx.fill();
    }
  }
  function loop(t) { if (!run) return; draw(t); requestAnimationFrame(loop); }
  build();
  window.addEventListener('resize', function () { build(); if (reduce) draw(0); });
  poster.addEventListener('pointermove', function (e) {
    var r = fig.getBoundingClientRect(), cx = r.left + r.width / 2;
    var k = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
    var cy = r.top + r.height * 0.24, v = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
    face.style.transform = 'translate(' + (k * 12).toFixed(1) + 'px,' + (v * 5).toFixed(1) + 'px) scale(' + (1 - Math.abs(k) * 0.12).toFixed(3) + ',1)';
  });
  poster.addEventListener('pointerleave', function () { face.style.transform = ''; });
  if (reduce) { draw(0); return; }
  new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(loop); } else if (!v) run = false; }).observe(poster);
  requestAnimationFrame(loop);
})();
