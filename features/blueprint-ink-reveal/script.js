(function () {
  var cv = document.getElementById('dpCanvas'), ctx = cv.getContext('2d');
  var word = document.getElementById('dpWord'), sheet = document.getElementById('dpSheet');
  var mask = document.createElement('canvas'), mx = mask.getContext('2d');
  var tmp = document.createElement('canvas'), tx = tmp.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, fs = 0, active = 0, run = false, vis = true, last = null, demo = null, doneP = 0, curP = 0;
  var INK = '#14378a', pinned = false;
  // the ink is the section's text colour, which follows the theme
  function inkColour() { return getComputedStyle(sheet).color || INK; }

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = mask.width = tmp.width = Math.round(cv.clientWidth * dpr);
    H = cv.height = mask.height = tmp.height = Math.round(cv.clientHeight * dpr);
    var txt = word.textContent || 'Atlas';
    ctx.font = tx.font = '800 100px Georgia, "Times New Roman", serif';
    var w = ctx.measureText(txt).width;
    fs = Math.min(H * 0.55, (W * 0.84) / w * 100);
    if (reduce) { mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H); }
    schedule();
  }
  function textPath(g, fn) {
    var txt = word.textContent || 'Atlas';
    g.font = '800 ' + fs + 'px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    fn(g, txt, W / 2, H / 2 + fs * 0.04);
  }
  function blot(x, y, r) {
    mx.fillStyle = '#000';
    for (var i = 0; i < 9; i++) {
      var a = Math.random() * 6.283, d = Math.random() * r * 0.6, rr = r * (0.4 + Math.random() * 0.5);
      mx.beginPath(); mx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); mx.fill();
    }
    active = 1;
  }
  function stamp(x, y) {
    var px = x * dpr, py = y * dpr, r = Math.max(26, Math.min(W, H) * 0.07);
    if (last) {
      var dx = px - last.x, dy = py - last.y, n = Math.ceil(Math.hypot(dx, dy) / (r * 0.5));
      for (var i = 1; i <= n; i++) blot(last.x + dx * i / n, last.y + dy * i / n, r * (0.85 + Math.random() * 0.3));
    } else blot(px, py, r);
    last = { x: px, y: py }; schedule();
  }
  function render() {
    ctx.clearRect(0, 0, W, H);
    // hairline outline
    textPath(ctx, function (g, t, x, y) { g.lineWidth = Math.max(1, dpr); g.strokeStyle = inkColour(); g.strokeText(t, x, y); });
    // solid letters, cut by the ink mask
    tx.clearRect(0, 0, W, H);
    textPath(tx, function (g, t, x, y) { g.fillStyle = inkColour(); g.fillText(t, x, y); });
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mask, 0, 0); tx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tmp, 0, 0);
  }
  function loop() {
    run = true;
    if (demo) { demo.t += 0.012; var p = demo.t; stamp(cv.clientWidth * (0.08 + 0.84 * p), cv.clientHeight * (0.5 + Math.sin(p * 9) * 0.18)); if (p >= 1) { demo = null; last = null; } }
    if (!reduce && !pinned) { mx.globalCompositeOperation = 'destination-out'; mx.fillStyle = 'rgba(0,0,0,0.012)'; mx.fillRect(0, 0, W, H); mx.globalCompositeOperation = 'source-over'; active *= 0.995; }
    render();
    if (vis && (active > 0.05 || demo)) requestAnimationFrame(loop); else { run = false; }
  }
  function schedule() { if (!run) requestAnimationFrame(loop); }

  cv.addEventListener('pointermove', function (e) { if (demo) demo = null; var r = cv.getBoundingClientRect(); stamp(e.clientX - r.left, e.clientY - r.top); });
  cv.addEventListener('pointerleave', function () { last = null; });
  cv.addEventListener('pointerdown', function (e) { var r = cv.getBoundingClientRect(); last = null; stamp(e.clientX - r.left, e.clientY - r.top); });
  window.addEventListener('resize', fit);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) schedule(); }).observe(sheet);
  fit();
  render();

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  // the ink spreads along the word as the page scrolls, and stays
  function inkAt(p) { return [cv.clientWidth * (0.08 + 0.84 * p), cv.clientHeight * (0.5 + Math.sin(p * 9) * 0.18)]; }
  function paintTo(v) {
    if (v < doneP - 0.02) { mx.clearRect(0, 0, W, H); doneP = 0; }
    last = null;
    for (var p = doneP; p <= v; p += 0.01) { var pt = inkAt(p); stamp(pt[0], pt[1]); }
    doneP = v; last = null; schedule();
  }
  pinRunway(sheet, 3, function (v) { pinned = true; curP = v; paintTo(v); });
  window.addEventListener('resize', function () { doneP = 0; paintTo(curP); });
})();
