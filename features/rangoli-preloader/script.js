(function () {
  var cv = document.getElementById('rpCanvas'), ctx = cv.getContext('2d'), pct = document.getElementById('rpPct');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = 0, vis = true, t0 = performance.now();
  var POUR = 6000, HOLD = 1200, FADE = 700, FOLD = 8, ended = false, floor = document.getElementById('rpFloor');
  function complete() {
    if (ended) return; ended = true;
    floor.classList.add('is-exiting');
    setTimeout(function () { floor.setAttribute('data-phase', 'done'); floor.setAttribute('data-completed', 'true'); }, reduce ? 150 : 650);
  }

  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    S = cv.width = cv.height = Math.round(cv.clientWidth * d);
  }
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function petal(len, wid, col, edge) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, len * 0.25, wid * 0.8, len * 0.8, 0, len);
    ctx.bezierCurveTo(-wid * 0.8, len * 0.8, -wid, len * 0.25, 0, 0);
    ctx.fillStyle = col; ctx.fill();
    if (edge) { ctx.lineWidth = S * 0.003; ctx.strokeStyle = edge; ctx.stroke(); }
  }
  function ringOf(n, r, offset, fn) {
    for (var i = 0; i < n; i++) {
      ctx.save(); ctx.rotate(offset + (i / n) * Math.PI * 2); ctx.translate(0, r); fn(i); ctx.restore();
    }
  }
  function dot(r, col) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = col; ctx.fill(); }

  function draw(p) {
    var R = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.translate(R, R);
    var u = R / 100; // 100 units to the edge
    var t, n = FOLD;

    // outer scallops + dots
    t = ease(seg(p, 0.86, 1));
    if (t > 0) {
      ctx.save(); ctx.scale(1, 1);
      ringOf(n * 3, 90 * u * 0.97, 0, function () { ctx.rotate(Math.PI); ctx.translate(0, -u * 0); petal(10 * u * t, 5 * u * t, '#f6e7cf'); });
      ringOf(n * 3, 93 * u, Math.PI / (n * 3), function () { dot(1.6 * u * t, '#ffc94d'); });
      ctx.restore();
    }
    // indigo band with zigzag
    t = ease(seg(p, 0.74, 0.9));
    if (t > 0) {
      ctx.beginPath(); ctx.arc(0, 0, 80 * u, 0, Math.PI * 2 * t); ctx.arc(0, 0, 70 * u, Math.PI * 2 * t, 0, true); ctx.closePath();
      ctx.fillStyle = '#2d3a8c'; ctx.fill();
      ctx.beginPath();
      var steps = n * 6, lim = Math.floor(steps * t);
      for (var i = 0; i <= lim; i++) {
        var a = (i / steps) * Math.PI * 2, rr = (i % 2 ? 72 : 78) * u;
        i ? ctx.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr) : ctx.moveTo(Math.sin(a) * rr, -Math.cos(a) * rr);
      }
      ctx.lineWidth = u * 1.2; ctx.strokeStyle = '#ffc94d'; ctx.stroke();
    }
    // marigold petals + leaves
    t = ease(seg(p, 0.54, 0.78));
    if (t > 0) {
      ringOf(n * 2, 44 * u, Math.PI / (n * 2), function () { ctx.rotate(0); petal(26 * u * t, 8 * u * t, '#2f9d4a'); });
      ringOf(n * 2, 38 * u, 0, function () { petal(30 * u * t, 8.5 * u * t, '#ff9a1f', '#e97a00'); });
    }
    // kolam dots
    t = ease(seg(p, 0.42, 0.58));
    if (t > 0) {
      ringOf(n * 4, 50 * u, 0, function () { dot(1.3 * u * t, '#fff7ea'); });
      ringOf(n * 2, 54 * u, Math.PI / (n * 2), function () { dot(1.9 * u * t, '#fff7ea'); });
    }
    // outer lotus (pink / white)
    t = ease(seg(p, 0.27, 0.5));
    if (t > 0) {
      ringOf(n * 2, 14 * u, Math.PI / (n * 2), function () { petal(32 * u * t, 8 * u * t, '#fff3e0'); });
      ringOf(n, 14 * u, 0, function () { petal(36 * u * t, 11 * u * t, '#e83c7a', '#b11d58'); });
    }
    // inner lotus
    t = ease(seg(p, 0.12, 0.34));
    if (t > 0) {
      ringOf(n, 5 * u, Math.PI / n, function () { petal(22 * u * t, 7 * u * t, '#fdd0e1'); });
      ringOf(n, 4 * u, 0, function () { petal(18 * u * t, 6 * u * t, '#ff6a2a'); });
    }
    // turmeric core
    t = ease(seg(p, 0, 0.16));
    if (t > 0) { dot(14 * u * t, '#ffc928'); dot(6 * u * t, '#c23a1c'); dot(2.4 * u * t, '#fff3d6'); }
    ctx.restore();
  }

  function frame(now) {
    var e = now - t0;
    if (e >= POUR + HOLD + FADE) { cv.style.opacity = 0; draw(1); complete(); return; }
    var p = Math.min(1, e / POUR), a = 1;
    if (e > POUR + HOLD) a = 1 - (e - POUR - HOLD) / FADE;
    cv.style.opacity = a.toFixed(3);
    draw(p);
    pct.textContent = Math.round(p * 100) + '%';
    if (vis) requestAnimationFrame(frame);
  }
  function start() { if (!reduce) { requestAnimationFrame(frame); } }

  size();
  if (reduce) { draw(1); pct.textContent = '100%'; setTimeout(complete, 500); }
  else start();
  window.addEventListener('resize', function () { size(); if (reduce) draw(1); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    var was = vis; vis = es[0].isIntersecting; if (vis && !was) start();
  }).observe(cv);
})();
