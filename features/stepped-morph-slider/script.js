(function () {
  var cv = document.getElementById("skCanvas"), ctx = cv.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLS = 14, W = 0, H = 0;
  var slides = [
    { t: "Dune Morning", c: "Warm light climbing over a quiet ridge.", sky: ["#ffd9a0", "#f6a07a"], sun: "#fff3d6", land: ["#c9694a", "#8c3f3a"], sx: 0.7, sy: 0.35, h: [.5,.7,.55,.8,.6,.9,.7,.95,.75,.6,.85,.65,.5,.7] },
    { t: "Harbor Blue", c: "Cool water, small boats and a long shadow.", sky: ["#bfe3f0", "#6aa6c8"], sun: "#ffffff", land: ["#2f6c8f", "#1b3f5c"], sx: 0.25, sy: 0.3, h: [.85,.6,.9,.5,.7,.45,.65,.4,.6,.5,.7,.55,.8,.6] },
    { t: "Moss Hollow", c: "A green fold between two sleepy hills.", sky: ["#e4f0c4", "#a9cf86"], sun: "#fffbe0", land: ["#4c8a4e", "#25573a"], sx: 0.5, sy: 0.25, h: [.7,.85,.95,.8,.55,.4,.35,.45,.6,.8,.95,.85,.7,.75] },
    { t: "Violet Hour", c: "Dusk settles on a city that never stands still.", sky: ["#e0c3f0", "#8c6bc2"], sun: "#ffe7f5", land: ["#4b3a8c", "#241a4e"], sx: 0.8, sy: 0.4, h: [.4,.9,.5,1,.6,.85,.45,.75,.95,.55,.8,.5,.9,.6] }
  ];
  var cur = 0, prev = 0;
  var from = [], to = [], prog = [], hover = -1, raf = 0, visible = true, blend = [];
  var shapes = slides.map(function (s) { return s.h.slice(0, COLS); });
  var hov = new Array(COLS).fill(0);

  function art(g, s, w, h) {
    var sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, s.sky[0]); sky.addColorStop(1, s.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    var sr = h * 0.13, sx = s.sx * w, sy = s.sy * h;
    var glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
    glow.addColorStop(0, "rgba(255,255,255,.55)"); glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.fillStyle = s.sun; g.beginPath(); g.arc(sx, sy, sr, 0, 6.2832); g.fill();
    for (var l = 0; l < 3; l++) {
      var y0 = h * (0.58 + l * 0.12);
      g.fillStyle = l === 0 ? s.land[0] : l === 1 ? mixc(s.land[0], s.land[1], 0.5) : s.land[1];
      g.beginPath(); g.moveTo(0, h);
      for (var x = 0; x <= w; x += w / 40) g.lineTo(x, y0 + Math.sin(x / w * 7 + l * 2 + s.sx * 5) * h * 0.05 + Math.sin(x / w * 17 + l) * h * 0.015);
      g.lineTo(w, h); g.closePath(); g.fill();
    }
  }
  function mixc(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "rgb(" + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); }).join(",") + ")";
  }
  var layers = [];
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
    cv.width = W; cv.height = H;
    layers = slides.map(function (s) { var c = document.createElement("canvas"); c.width = W; c.height = H; art(c.getContext("2d"), s, W, H); return c; });
    draw();
  }
  function setup(n) {
    prev = cur; cur = (n + slides.length) % slides.length;
    from = shapes[prev].slice(); to = shapes[cur].slice();
    for (var i = 0; i < COLS; i++) prog[i] = reduce ? 1 : -i * 0.045;
    dots(); text(); kick();
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
  function draw() {
    if (!layers.length) return;
    ctx.clearRect(0, 0, W, H);
    var cw = W / COLS, gap = Math.max(2, W * 0.004);
    for (var i = 0; i < COLS; i++) {
      var e = ease(prog[i] === undefined ? 1 : prog[i]);
      var h = (from[i] !== undefined ? from[i] + (to[i] - from[i]) * e : shapes[cur][i]);
      h = Math.min(1, h + hov[i] * 0.08) * H;
      var x = i * cw;
      ctx.save(); ctx.beginPath(); ctx.rect(x + gap / 2, H - h, cw - gap, h); ctx.clip();
      ctx.drawImage(layers[prev], 0, 0);
      ctx.globalAlpha = e; ctx.drawImage(layers[cur], 0, 0); ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  function tick() {
    raf = 0; if (!visible) return;
    var busy = false;
    for (var i = 0; i < COLS; i++) {
      if (prog[i] < 1) { prog[i] += 0.018; busy = true; }
      var tgt = i === hover ? 1 : (Math.abs(i - hover) === 1 ? 0.4 : 0);
      var d = tgt - hov[i]; if (Math.abs(d) > 0.01) { hov[i] += d * 0.2; busy = true; } else hov[i] = tgt;
    }
    draw();
    if (busy) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(tick); }
  function dots() {
    var box = document.getElementById("skDots"); box.innerHTML = "";
    slides.forEach(function (s, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "sk-dot";
      b.setAttribute("aria-label", "Slide " + (i + 1) + ": " + s.t); b.setAttribute("aria-current", String(i === cur));
      b.addEventListener("click", function () { if (i !== cur) setup(i); });
      box.appendChild(b);
    });
  }
  function text() {
    var s = slides[cur];
    document.getElementById("skNum").textContent = "0" + (cur + 1);
    document.getElementById("skTitle").textContent = s.t;
    document.getElementById("skCap").textContent = s.c;
  }
  cv.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); hover = Math.floor((e.clientX - r.left) / r.width * COLS); kick(); });
  cv.addEventListener("pointerleave", function () { hover = -1; kick(); });
  cv.addEventListener("click", function () { setup(cur + 1); });
  document.getElementById("skPrev").addEventListener("click", function () { setup(cur - 1); });
  document.getElementById("skNext").addEventListener("click", function () { setup(cur + 1); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(cv);
  window.addEventListener("resize", function () { size(); });
  from = shapes[0].slice(); to = shapes[0].slice(); prev = 0; cur = 0;
  size(); dots(); text(); draw();
})();
