(function () {
  var hero = document.getElementById('osHero'), cv = document.getElementById('osCanvas'), ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, pts = [], mouse = { x: -999, y: -999 }, ripples = [], run = true, GAP = 34;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    var cols = Math.ceil(W / GAP), rows = Math.ceil(H / GAP);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) pts.push({ x: i * GAP + GAP / 2, y: j * GAP + GAP / 2, a: 0, ph: Math.random() * 6.28 });
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.42, clearX = Math.min(W * 0.42, 300), clearY = 130;
    for (var k = ripples.length - 1; k >= 0; k--) { ripples[k].r += 5; if (ripples[k].r > 600) ripples.splice(k, 1); }
    for (var n = 0; n < pts.length; n++) {
      var p = pts[n], dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
      var target = Math.atan2(1, 0.4) * 0 + 0.8; // base angle: pointing down-right
      var ang = target + Math.sin(t / 1400 + p.ph) * 0.15;
      var push = 0;
      if (d < 140) { ang = Math.atan2(dy, dx); push = (1 - d / 140) * 8; }
      for (var q = 0; q < ripples.length; q++) {
        var rd = Math.hypot(p.x - ripples[q].x, p.y - ripples[q].y), off = Math.abs(rd - ripples[q].r);
        if (off < 40) { ang = Math.atan2(p.y - ripples[q].y, p.x - ripples[q].x); push += (1 - off / 40) * 8; }
      }
      var ex = Math.abs(p.x - cx) / clearX, ey = Math.abs(p.y - cy) / clearY;
      var fade = Math.min(1, Math.max(0, Math.sqrt(ex * ex + ey * ey) - 0.7) * 1.5);
      var shimmer = 0.55 + 0.45 * Math.sin(t / 900 + p.ph * 3);
      var tone = Math.min(1, p.y / H);
      var alpha = fade * (0.3 + 0.5 * shimmer) * (1 - tone * 0.85);
      if (alpha < 0.02) continue;
      ctx.save();
      ctx.translate(p.x + Math.cos(ang) * push, p.y + Math.sin(ang) * push);
      ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(210,225,255,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(1, -3.5); ctx.lineTo(5, 0); ctx.lineTo(1, 3.5); ctx.stroke();
      ctx.restore();
    }
  }
  function loop(t) { if (!run) return; draw(t); requestAnimationFrame(loop); }
  size();
  window.addEventListener('resize', function () { size(); if (reduce) draw(0); });
  hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
  hero.addEventListener('pointerdown', function (e) { var r = hero.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0 }); if (reduce) draw(0); });
  if (reduce) { draw(0); return; }
  new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(loop); } else if (!v) run = false; }).observe(hero);
  requestAnimationFrame(loop);
})();
