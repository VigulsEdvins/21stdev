(function () {
  var sky = document.getElementById("swSky");
  var cv = document.getElementById("swCanvas");
  var ctx = cv.getContext("2d");
  var words = (sky.getAttribute("data-words") || "Gather").split("|").map(function (w) { return w.trim(); }).filter(Boolean);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, dpr = 1, N = 1400, px, py, vx, vy, tx, ty, has;
  var wi = 0, phase = "roam", phaseT = 0, last = 0, running = false, raf = 0, time = 0;
  var HOLD = 3600, ROAM = 5200, FORM = 2400;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    N = Math.round(Math.min(2400, Math.max(700, W * H / 330)));
    px = new Float32Array(N); py = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N);
    tx = new Float32Array(N); ty = new Float32Array(N); has = new Uint8Array(N);
    for (var i = 0; i < N; i++) { px[i] = Math.random() * W; py[i] = Math.random() * H * 0.8; vx[i] = Math.random() - 0.5; vy[i] = Math.random() - 0.5; }
    sample(words[wi]);
  }

  // Turn the word into a cloud of target points, one per bird.
  function sample(text) {
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var o = off.getContext("2d");
    var fs = Math.min(H * 0.34, 220), font = "800 FSpx " + (getComputedStyle(document.body).fontFamily || "sans-serif");
    do { o.font = font.replace("FS", Math.round(fs)); fs -= 4; } while (o.measureText(text).width > W * 0.84 && fs > 24);
    o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle"; o.fillText(text, W / 2, H * 0.45);
    var d = o.getImageData(0, 0, W, H).data, pts = [], step = Math.max(2, Math.round(Math.sqrt(W * H / N / 3)));
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
    var count = pts.length / 2;
    for (var i = 0; i < N; i++) {
      if (count) { var k = ((Math.random() * count) | 0) * 2; tx[i] = pts[k] + (Math.random() - 0.5) * step; ty[i] = pts[k + 1] + (Math.random() - 0.5) * step; has[i] = 1; } else has[i] = 0;
    }
  }

  // Divergence-free swirl (curl of a stream function), so the flock rolls and folds without collapsing into sinks.
  function flow(x, y, t, out) {
    var a = x * 0.0045 + t * 0.3, b = y * 0.006 - t * 0.22, c = x * 0.011 - t * 0.4, d = y * 0.013 + t * 0.3;
    out[0] = (Math.sin(a) * Math.cos(b) * 0.006 + 0.7 * 0.013 * Math.sin(c) * Math.cos(d)) * 230;
    out[1] = -(Math.cos(a) * Math.sin(b) * 0.0045 + 0.7 * 0.011 * Math.cos(c) * Math.sin(d)) * 230;
  }
  var f2 = [0, 0];

  function step(dt) {
    time += dt;
    var t = time / 1000;
    var cx = W * (0.5 + 0.28 * Math.sin(t * 0.25)), cy = H * (0.4 + 0.15 * Math.sin(t * 0.37 + 1));
    var pull = phase === "form" ? Math.min(phaseT / FORM, 1) : phase === "hold" ? 1 : 0;
    var k = dt / 16.7;
    for (var i = 0; i < N; i++) {
      flow(px[i], py[i], t, f2);
      var ax = (f2[0] - vx[i]) * 0.05 + (cx - px[i]) * 0.00006, ay = (f2[1] - vy[i]) * 0.05 + (cy - py[i]) * 0.00006;
      if (has[i] && pull > 0) {
        var s = (phase === "hold" ? 0.03 : 0.006 + pull * pull * 0.02);
        ax = ax * (1 - pull) + (tx[i] - px[i]) * s; ay = ay * (1 - pull) + (ty[i] - py[i]) * s;
        if (phase === "hold") { ax += Math.sin(t * 3 + i) * 0.02; ay += Math.cos(t * 2.6 + i * 1.3) * 0.02; }
      }
      var damp = phase === "hold" ? 0.86 : 0.99 - pull * 0.08;
      vx[i] = (vx[i] + ax * k) * damp; vy[i] = (vy[i] + ay * k) * damp;
      var sp = Math.hypot(vx[i], vy[i]), max = 3.2;
      if (sp > max) { vx[i] *= max / sp; vy[i] *= max / sp; }
      px[i] += vx[i] * k; py[i] += vy[i] * k;
      if (pull === 0) { if (px[i] < -20) px[i] = W + 20; else if (px[i] > W + 20) px[i] = -20; if (py[i] < -20) py[i] = H * 0.85; else if (py[i] > H * 0.9) py[i] = -10; }
    }
    phaseT += dt;
    if (phase === "roam" && phaseT > ROAM) { phase = "form"; phaseT = 0; }
    else if (phase === "form" && phaseT > FORM) { phase = "hold"; phaseT = 0; }
    else if (phase === "hold" && phaseT > HOLD) {
      phase = "roam"; phaseT = 0; wi = (wi + 1) % words.length; sample(words[wi]);
      for (var j = 0; j < N; j++) { vx[j] += (Math.random() - 0.5) * 6; vy[j] += (Math.random() - 0.5) * 6; }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineWidth = 1.5;
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? "rgba(255,255,255,0.9)" : "rgba(120,200,255,0.45)";
      ctx.lineWidth = pass ? 1 : 2.2;
      ctx.beginPath();
      for (var i = pass; i < N; i += pass ? 3 : 1) {
        var l = 2 + Math.min(Math.hypot(vx[i], vy[i]) * 2.2, 7);
        var a = Math.atan2(vy[i], vx[i]);
        ctx.moveTo(px[i], py[i]); ctx.lineTo(px[i] - Math.cos(a) * l, py[i] - Math.sin(a) * l);
      }
      ctx.stroke();
    }
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(now - last, 50); last = now;
    step(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  size();
  if (reduce) {
    for (var i = 0; i < N; i++) if (has[i]) { px[i] = tx[i]; py[i] = ty[i]; vx[i] = vy[i] = 0.8; }
    draw();
  }
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (reduce) { for (var i = 0; i < N; i++) if (has[i]) { px[i] = tx[i]; py[i] = ty[i]; } draw(); } }, 200); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(sky);
  else start();
})();
