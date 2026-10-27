(function () {
  var W = 960, H = 540;
  var stage = document.getElementById("csStage");
  var cv = document.getElementById("csCanvas");
  var ctx = cv.getContext("2d");
  var elTitle = document.getElementById("csTitle"), elSub = document.getElementById("csSub"), elCount = document.getElementById("csCount"), elProg = document.getElementById("csProg");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cv.width = W; cv.height = H;

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function mk() { var c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
  function grad(g, stops) { stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }

  // ---- procedural scenes ----
  function harbour(c) {
    c.fillStyle = grad(c.createLinearGradient(0, 0, 0, H * 0.62), [[0, "#150a3a"], [0.6, "#a8226e"], [1, "#ff8a5c"]]); c.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) { c.fillStyle = "rgba(255,255,255," + (rnd() * 0.7).toFixed(2) + ")"; c.fillRect(rnd() * W, rnd() * H * 0.35, 1.5, 1.5); }
    var x = 0, wy = H * 0.62;
    while (x < W) {
      var bw = 30 + rnd() * 60, bh = 60 + rnd() * 190;
      c.fillStyle = "#0b0720"; c.fillRect(x, wy - bh, bw, bh);
      for (var wy2 = wy - bh + 10; wy2 < wy - 8; wy2 += 14) for (var wx = x + 6; wx < x + bw - 6; wx += 12) if (rnd() > 0.55) { c.fillStyle = rnd() > 0.5 ? "#ffd27a" : "#5be8ff"; c.fillRect(wx, wy2, 4, 6); }
      x += bw + 2;
    }
    c.fillStyle = grad(c.createLinearGradient(0, wy, 0, H), [[0, "#2a0e4a"], [1, "#07040f"]]); c.fillRect(0, wy, W, H - wy);
    for (var k = 0; k < 40; k++) { c.fillStyle = "rgba(" + (rnd() > 0.5 ? "255,120,170" : "90,230,255") + "," + (0.15 + rnd() * 0.3).toFixed(2) + ")"; c.fillRect(rnd() * W, wy + 6 + rnd() * (H - wy - 10), 20 + rnd() * 90, 2); }
  }
  function flats(c) {
    c.fillStyle = grad(c.createLinearGradient(0, 0, 0, H), [[0, "#7ec8e3"], [0.5, "#f4f1e6"], [0.5, "#e9e6dc"], [1, "#9fb7c2"]]); c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(255,255,255,.85)"; for (var i = 0; i < 5; i++) { c.beginPath(); c.ellipse(120 + i * 190, 80 + rnd() * 120, 90 + rnd() * 60, 12, 0, 0, 6.28); c.fill(); }
    c.strokeStyle = "rgba(120,140,150,.35)"; c.lineWidth = 1; for (var j = 0; j < 14; j++) { c.beginPath(); c.moveTo(W / 2, H * 0.5); c.lineTo(W / 2 + (j - 6.5) * 220, H); c.stroke(); }
    for (var r = 1; r < 8; r++) { c.beginPath(); c.moveTo(0, H * 0.5 + Math.pow(r, 2) * 7); c.lineTo(W, H * 0.5 + Math.pow(r, 2) * 7); c.stroke(); }
    c.fillStyle = "#1c2b36"; c.fillRect(W * 0.62, H * 0.5 - 34, 6, 34); c.beginPath(); c.arc(W * 0.62 + 3, H * 0.5 - 40, 6, 0, 6.28); c.fill(); c.fillRect(W * 0.62, H * 0.5 + 2, 6, 34);
  }
  function orbit(c) {
    c.fillStyle = "#03030a"; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 160; i++) { c.fillStyle = "rgba(255,255,255," + (0.2 + rnd() * 0.8).toFixed(2) + ")"; c.fillRect(rnd() * W, rnd() * H, rnd() * 2 + 0.5, rnd() * 2 + 0.5); }
    c.save(); c.translate(W * 0.58, H * 0.52); c.rotate(-0.35);
    c.strokeStyle = "rgba(255,200,140,.55)"; for (var r = 0; r < 6; r++) { c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 250 + r * 14, 62 + r * 4, 0, Math.PI, 6.28); c.stroke(); }
    c.fillStyle = grad(c.createRadialGradient(-60, -60, 10, 0, 0, 170), [[0, "#ffd6a0"], [0.5, "#c8553d"], [1, "#2a0d1f"]]); c.beginPath(); c.arc(0, 0, 160, 0, 6.28); c.fill();
    c.strokeStyle = "rgba(255,200,140,.55)"; for (var s = 0; s < 6; s++) { c.beginPath(); c.ellipse(0, 0, 250 + s * 14, 62 + s * 4, 0, 0, Math.PI); c.stroke(); }
    c.restore();
    c.fillStyle = "#cfd8ff"; c.beginPath(); c.arc(W * 0.17, H * 0.75, 18, 0, 6.28); c.fill();
  }
  function glasshouse(c) {
    c.fillStyle = grad(c.createLinearGradient(0, 0, 0, H), [[0, "#0d3b2c"], [1, "#03130d"]]); c.fillRect(0, 0, W, H);
    c.strokeStyle = "rgba(190,255,220,.5)"; c.lineWidth = 2;
    for (var x = 0; x <= W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (var y = 0; y <= H; y += 90) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (var i = 0; i < 38; i++) { var cx = rnd() * W, cy = H - rnd() * 260, a = rnd() * 3; c.fillStyle = "hsl(" + (110 + rnd() * 50) + ",65%," + (24 + rnd() * 26) + "%)"; c.beginPath(); c.ellipse(cx, cy, 30 + rnd() * 50, 12 + rnd() * 18, a, 0, 6.28); c.fill(); }
    c.fillStyle = "rgba(255,255,200,.16)"; c.beginPath(); c.moveTo(W * 0.3, 0); c.lineTo(W * 0.5, 0); c.lineTo(W * 0.8, H); c.lineTo(W * 0.35, H); c.fill();
  }
  function tunnel(c) {
    c.fillStyle = "#05060f"; c.fillRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.48;
    for (var r = 12; r > 0; r--) { var s = Math.pow(r / 12, 1.7); c.strokeStyle = "hsl(" + (200 + r * 6) + ",90%," + (20 + (12 - r) * 4) + "%)"; c.lineWidth = 2 + (12 - r) * 0.5; c.strokeRect(cx - W * 0.55 * s, cy - H * 0.55 * s, W * 1.1 * s, H * 1.1 * s); }
    c.strokeStyle = "rgba(120,200,255,.4)"; c.lineWidth = 1.5;
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(cx, cy); c.stroke(); });
    c.fillStyle = "#fff6c8"; c.shadowColor = "#fff6c8"; c.shadowBlur = 40; c.beginPath(); c.arc(cx, cy, 14, 0, 6.28); c.fill(); c.shadowBlur = 0;
    for (var i = 0; i < 40; i++) { c.fillStyle = "rgba(255,255,255,.5)"; var a = rnd() * 6.28, d = 60 + rnd() * 420; c.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 1.5, 1.5); }
  }

  var slides = [
    { t: "Neon Harbour", s: "Midnight reflections along the quay.", f: harbour },
    { t: "Salt Flats", s: "A single walker on a mirror of cracked white.", f: flats },
    { t: "Ringed World", s: "Slow light at the edge of a quiet system.", f: orbit },
    { t: "Glasshouse", s: "Green air and a shaft of afternoon sun.", f: glasshouse },
    { t: "Last Carriage", s: "Lamps count down the length of the tunnel.", f: tunnel }
  ];
  var tints = ["#ff0000", "#00ff00", "#0000ff"];
  slides.forEach(function (sl) {
    sl.img = mk(); sl.f(sl.img.getContext("2d"));
    sl.ch = tints.map(function (col) {
      var c = mk(), g = c.getContext("2d");
      g.drawImage(sl.img, 0, 0);
      g.globalCompositeOperation = "multiply"; g.fillStyle = col; g.fillRect(0, 0, W, H);
      return c;
    });
  });

  // ---- state ----
  var cur = 0, next = 0, glitchT = 0, glitching = false, GLITCH_MS = 560, AUTO_MS = 5200;
  var autoStart = performance.now(), paused = false, visible = true, raf = 0, bands = [];

  function label() {
    var s = slides[cur];
    elTitle.textContent = s.t; elSub.textContent = s.s;
    elCount.textContent = ("0" + (cur + 1)).slice(-2) + " / " + ("0" + slides.length).slice(-2);
  }
  function still(i) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.drawImage(slides[i].img, 0, 0); }

  function drawGlitch(k) {
    var k2 = reduce ? 0 : Math.sin(Math.PI * k);
    var from = k < 0.5 ? cur : next;
    var sl = slides[from];
    if (reduce) { still(cur); ctx.globalAlpha = k; ctx.drawImage(slides[next].img, 0, 0); ctx.globalAlpha = 1; return; }
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    var n = bands.length;
    for (var b = 0; b < n; b++) {
      var y0 = Math.round((b / n) * H), y1 = Math.round(((b + 1) / n) * H), bd = bands[b];
      var shift = bd.dx * k2 * (bd.big ? 1.4 : 0.35);
      for (var c = 0; c < 3; c++) {
        var off = (c - 1) * k2 * 34 * bd.sp;
        ctx.drawImage(sl.ch[c], 0, y0, W, y1 - y0, shift + off, y0, W, y1 - y0);
        if (shift + off > 0) ctx.drawImage(sl.ch[c], W - (shift + off), y0, shift + off, y1 - y0, 0, y0, shift + off, y1 - y0);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    for (var i = 0; i < 6 * k2; i++) { ctx.fillStyle = "rgba(255,255,255," + (rnd() * 0.5).toFixed(2) + ")"; ctx.fillRect(0, rnd() * H, W, 1 + rnd() * 2); }
  }

  function go(i) {
    if (glitching) return;
    next = (i + slides.length) % slides.length;
    if (next === cur) return;
    bands = [];
    var n = 16;
    for (var b = 0; b < n; b++) bands.push({ dx: (rnd() - 0.5) * 220, big: rnd() > 0.65, sp: 0.5 + rnd() });
    glitching = true; glitchT = performance.now();
    kick();
  }
  function frame(now) {
    raf = 0;
    if (glitching) {
      var k = Math.min(1, (now - glitchT) / (reduce ? 300 : GLITCH_MS));
      if (k >= 1) { glitching = false; cur = next; label(); still(cur); autoStart = now; }
      else { drawGlitch(k); if (k >= 0.5 && elTitle.textContent !== slides[next].t) { var s = slides[next]; elTitle.textContent = s.t; elSub.textContent = s.s; } }
    } else if (!paused && visible) {
      var p = (now - autoStart) / AUTO_MS;
      elProg.style.transform = "scaleX(" + Math.min(1, p) + ")";
      if (p >= 1) go(cur + 1);
    }
    if (glitching || (!paused && visible)) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  document.getElementById("csNext").addEventListener("click", function () { go(cur + 1); });
  document.getElementById("csPrev").addEventListener("click", function () { go(cur - 1); });
  stage.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") go(cur + 1); else if (e.key === "ArrowLeft") go(cur - 1); });
  stage.addEventListener("pointerenter", function () { paused = true; });
  stage.addEventListener("pointerleave", function () { paused = false; autoStart = performance.now(); kick(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { autoStart = performance.now(); kick(); } }).observe(stage);

  label(); still(0);
  if (reduce) paused = true;
  kick();
})();
