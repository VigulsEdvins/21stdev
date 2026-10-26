(function () {
  var stage = document.getElementById('dnStage'), cv = document.getElementById('dnCanvas'), ctx = cv.getContext('2d');
  var hint = document.getElementById('dnHint'), W, H, dpr, cloth, holes, hctx, down = false, last = null, mx = -999, my = -999, dirty = true, vis = true;
  var tears = [];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
    cloth = document.createElement('canvas'); cloth.width = W; cloth.height = H;
    var c = cloth.getContext('2d'), g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#16275a'); g.addColorStop(.5, '#25418a'); g.addColorStop(1, '#162a60');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // vertical folds
    for (var x = 0; x < W; x += 3) { var f = Math.sin(x / 38) * .5 + Math.sin(x / 11) * .2; c.fillStyle = 'rgba(' + (f > 0 ? '255,255,255' : '0,0,10') + ',' + Math.abs(f) * .16 + ')'; c.fillRect(x, 0, 3, H); }
    // twill weave
    c.lineWidth = 1;
    for (var d = -H; d < W; d += 4) { c.strokeStyle = (d / 4) % 2 ? 'rgba(160,190,255,.10)' : 'rgba(0,0,20,.14)'; c.beginPath(); c.moveTo(d, 0); c.lineTo(d + H, H); c.stroke(); }
    for (var i = 0; i < W * H / 120; i++) { c.fillStyle = 'rgba(255,255,255,' + rnd(0, .08) + ')'; c.fillRect(rnd(0, W), rnd(0, H), 1, 1); }
    holes = document.createElement('canvas'); holes.width = W; holes.height = H; hctx = holes.getContext('2d');
    tears.forEach(function (t) { cutTo(t[0], t[1], t[2], t[3], true); });
    dirty = true;
  }
  function cutTo(x0, y0, x1, y1, replay) {
    if (!replay) tears.push([x0, y0, x1, y1]);
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, steps = Math.ceil(len / 6), nx = -dy / len, ny = dx / len;
    hctx.fillStyle = '#000';
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, x = x0 + dx * t, y = y0 + dy * t, w = 4 + Math.abs(Math.sin((x + y) * .21)) * 6;
      hctx.beginPath(); hctx.ellipse(x + nx * rnd(-2, 2), y + ny * rnd(-2, 2), w, w * 0.7, Math.atan2(dy, dx), 0, 7); hctx.fill();
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // beneath the cloth: dark void
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
    var tmp = draw.tmp || (draw.tmp = document.createElement('canvas')); tmp.width = W; tmp.height = H;
    var t = tmp.getContext('2d'); t.drawImage(cloth, 0, 0);
    // pointer press shading
    if (mx > -900) { var r = t.createRadialGradient(mx, my, 0, mx, my, 110); r.addColorStop(0, 'rgba(0,0,20,.45)'); r.addColorStop(1, 'rgba(0,0,20,0)'); t.fillStyle = r; t.fillRect(mx - 110, my - 110, 220, 220); }
    // fray rim: draw holes slightly bigger in pale thread colour first
    t.globalCompositeOperation = 'destination-out'; t.drawImage(holes, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    // pale threads along tears
    ctx.strokeStyle = 'rgba(210,225,255,.55)'; ctx.lineWidth = 1;
    tears.forEach(function (s, i) {
      var dx = s[2] - s[0], dy = s[3] - s[1], len = Math.hypot(dx, dy) || 1, n = Math.ceil(len / 7);
      for (var k = 0; k < n; k++) { var tt = k / n, x = s[0] + dx * tt, y = s[1] + dy * tt, sd = Math.sin(i * 12.9 + k * 3.1), o = (sd > 0 ? 1 : -1) * 7; ctx.beginPath(); ctx.moveTo(x - dy / len * o, y + dx / len * o); ctx.lineTo(x - dy / len * (o * 2.2), y + dx / len * (o * 2.2) + sd * 3); ctx.stroke(); }
    });
  }
  function loop() { if (dirty) { draw(); dirty = false; } if (vis) requestAnimationFrame(loop); }
  function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', function (e) { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); hint.classList.add('is-gone'); });
  cv.addEventListener('pointermove', function (e) {
    var p = pos(e); mx = p[0]; my = p[1]; dirty = true;
    if (down && last && Math.hypot(p[0] - last[0], p[1] - last[1]) > 8) { cutTo(last[0], last[1], p[0], p[1]); last = p; }
  });
  cv.addEventListener('pointerup', function () { down = false; last = null; });
  cv.addEventListener('pointerleave', function () { mx = -999; dirty = true; });
  document.getElementById('dnReset').addEventListener('click', function () { tears = []; hctx.clearRect(0, 0, W, H); dirty = true; hint.classList.remove('is-gone'); });
  addEventListener('resize', size);
  new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vis) { vis = true; requestAnimationFrame(loop); } vis = v; }).observe(stage);
  size(); requestAnimationFrame(loop);
})();
