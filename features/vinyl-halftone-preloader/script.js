(function () {
  var cv = document.getElementById('vrDots'), ctx = cv.getContext('2d'), stage = document.getElementById('vrStage');
  var steps = document.querySelectorAll('#vrSteps li'), btn = document.getElementById('vrGo');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, W, H, dpr, vis = true;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var step = 16, cx = W * 0.55, cy = H * 0.5, beat = reduce ? 0 : Math.pow(Math.max(0, Math.sin(t / 380)), 3);
    for (var y = step / 2; y < H; y += step) for (var x = step / 2; x < W; x += step) {
      var dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      var ray = 0.5 + 0.5 * Math.cos(a * 12 + (reduce ? 0 : t / 2600));
      var v = ray * Math.max(0, 1 - d / (Math.min(W, H) * (0.62 + beat * 0.08)));
      var r = v * step * 0.62; if (r < 0.7) continue;
      ctx.fillStyle = (Math.floor(x / step) + Math.floor(y / step)) % 2 ? '#e5344f' : '#1d3f8a';
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
    }
  }
  function loop(t) { draw(t); if (vis && !reduce) requestAnimationFrame(loop); }
  new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vis) { vis = true; requestAnimationFrame(loop); } vis = v; }).observe(cv);
  addEventListener('resize', function () { size(); if (reduce) draw(0); });
  size(); requestAnimationFrame(loop);
  steps.forEach(function (li, i) { setTimeout(function () { li.classList.add('is-on'); if (i === steps.length - 1) { btn.disabled = false; stage.classList.add('is-done'); } }, (reduce ? 100 : 900) * (i + 1)); });
  btn.addEventListener('click', function () { btn.textContent = 'Now playing'; });
})();
