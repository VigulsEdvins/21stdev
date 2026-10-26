(function () {
  var track = document.getElementById('bsTrack'), cv = document.getElementById('bsCanvas'), ctx = cv.getContext('2d');
  var frames = document.querySelectorAll('.bs-frame'), dots = document.getElementById('bsDots'), pct = document.getElementById('bsPct');
  var N = frames.length, W = 0, H = 0, dpr = 1, p = 0, shown = 0, visible = true;
  frames.forEach(function () { dots.appendChild(document.createElement('i')); });
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; }
  function ease(x) { return x * x * (3 - 2 * x); }
  function seg(a, b) { return ease(Math.max(0, Math.min(1, (p - a) / (b - a)))); }
  function readScroll() {
    var r = track.getBoundingClientRect(), max = r.height - innerHeight;
    p = max > 0 ? Math.max(0, Math.min(1, -r.top / max)) : 0;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var s = Math.min(W, H) / 2.2, cx = W * (W > 700 ? 0.62 : 0.5), cy = H * 0.46;
    var stem = seg(0.05, 0.3), open = seg(0.3, 0.62), reach = seg(0.55, 0.82), turn = seg(0.7, 1);
    // stem
    var topY = cy + s * 0.15, baseY = H + 10, ty = baseY + (topY - baseY) * stem;
    ctx.strokeStyle = '#3f7a46'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.quadraticCurveTo(cx - 12, (baseY + ty) / 2, cx, ty); ctx.stroke();
    var rot = turn * Math.PI * 0.9, flat = 1 - turn * 0.35;
    ctx.save(); ctx.translate(cx, cy);
    var petals = 6, spin = 0.2 + rot;
    for (var i = 0; i < petals; i++) {
      var a = spin + i * Math.PI * 2 / petals, L = s * (0.15 + 0.85 * open) * (0.9 + 0.1 * Math.sin(i * 2));
      var bend = (1 - open) * 0.9 + 0.35;
      ctx.save(); ctx.rotate(a); ctx.scale(1, flat);
      var g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, '#7a0f1c'); g.addColorStop(1, '#ff4d5e');
      ctx.fillStyle = g; ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, stem * 2);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(L * 0.3, -L * 0.22, L * 0.8, -L * 0.2 * bend - L * 0.05, L, L * 0.08 * bend * 2);
      ctx.bezierCurveTo(L * 0.75, L * 0.18, L * 0.3, L * 0.16, 0, 0); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // stamens
    ctx.lineWidth = 1.5;
    for (var k = 0; k < 9; k++) {
      var b = spin + 0.3 + k * Math.PI * 2 / 9, len = s * 1.0 * reach;
      if (len < 2) continue;
      ctx.save(); ctx.rotate(b); ctx.scale(1, flat);
      ctx.strokeStyle = '#ffd5cc'; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.4, -len * 0.28, len * 0.8, -len * 0.22, len, len * 0.1); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(len, len * 0.1, 3.2, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#e8c15a'; ctx.beginPath(); ctx.arc(0, 0, 5 + 4 * open, 0, 7); ctx.fill();
    ctx.restore();
  }
  function ui() {
    var idx = Math.min(N - 1, Math.floor(p * N));
    if (idx !== shown || !frames[idx].classList.contains('is-on')) {
      frames.forEach(function (f, i) { f.classList.toggle('is-on', i === idx); });
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('is-on', i === idx); });
      shown = idx;
    }
    pct.textContent = String(Math.round(p * 100)).padStart(2, '0') + '%';
  }
  var last = -1;
  function loop() {
    readScroll();
    if (p !== last) { last = p; draw(); ui(); }
    if (visible) requestAnimationFrame(loop);
  }
  new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !visible) { visible = true; requestAnimationFrame(loop); } visible = v; }).observe(track);
  addEventListener('resize', function () { size(); last = -1; });
  size(); requestAnimationFrame(loop);
})();
