(function () {
  var cv = document.getElementById('hpCanvas'), ctx = cv.getContext('2d'), foot = document.getElementById('hpFoot');
  var WORD = 'plotter', CELL = 9, cells = [], cols = 0, rows = 0, W = 0, H = 0, dpr = 1, mouse = { x: -999, y: -999 }, raf = 0, vis = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fam = getComputedStyle(document.body).getPropertyValue('--font-display').trim() || 'Georgia, serif';
  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = W * dpr; cv.height = H * dpr;
    CELL = Math.max(3, Math.min(9, W / 130)); cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
    var off = document.createElement('canvas'); off.width = cols; off.height = rows;
    var o = off.getContext('2d', { willReadFrequently: true });
    o.fillStyle = '#000';
    var fs = 100; o.font = '900 ' + fs + 'px ' + fam;
    var tw = o.measureText(WORD).width; fs = fs * (cols * 0.98) / tw;
    o.font = '900 ' + fs + 'px ' + fam; o.textAlign = 'center'; o.textBaseline = 'alphabetic';
    o.fillText(WORD, cols / 2, rows * 0.68);
    var d = o.getImageData(0, 0, cols, rows).data;
    cells = new Float32Array(cols * rows);
    for (var i = 0; i < cells.length; i++) cells[i] = d[i * 4 + 3] / 255;
  }
  function draw() {
    var cs = getComputedStyle(foot);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var ink = cs.getPropertyValue('--hp-ink').trim() || '#1d1b18', hot = cs.getPropertyValue('--hp-dot').trim() || '#e0452f';
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var c = cells[y * cols + x]; if (c < 0.05) continue;
      var cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2, d = Math.hypot(cx - mouse.x, cy - mouse.y);
      var near = d < 90 ? 1 - d / 90 : 0;
      ctx.fillStyle = near > 0.3 ? hot : ink;
      ctx.beginPath(); ctx.arc(cx, cy, (CELL / 2) * Math.min(1.1, c + near * 0.25) * 0.95, 0, 6.283); ctx.fill();
    }
  }
  function loop() { if (!vis) return; draw(); raf = requestAnimationFrame(loop); }
  build(); draw();
  window.addEventListener('resize', function () { build(); draw(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); draw(); });
  if (reduce) return;
  cv.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cv.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
  new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !vis) { vis = true; loop(); } else if (!v) { vis = false; cancelAnimationFrame(raf); } }).observe(foot);
  loop();
})();
