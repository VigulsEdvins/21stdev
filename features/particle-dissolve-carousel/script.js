(function () {
  var stage = document.getElementById("dzStage");
  var cv = document.getElementById("dzCanvas");
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var slides = [
    { eyebrow: "Cove / 06:10", title: "Glass Harbour", text: "Still water holds the whole sky until the first boat leaves.", sky: ["#0f2a4a", "#2f7da6", "#f6d7a7"], orb: ["#fff3d0", 0.68, 0.46, 0.07], ridges: ["#2b6a86", "#1f4f6b", "#12364f"], water: true },
    { eyebrow: "Crater / 19:40", title: "Ember Ridge", text: "The ridge keeps its heat long after the light has gone.", sky: ["#2a0d2e", "#a8315b", "#ffa45c"], orb: ["#ffe4a8", 0.3, 0.52, 0.09], ridges: ["#6b1d3a", "#451229", "#25091a"] },
    { eyebrow: "Valley / 08:25", title: "Moss Hollow", text: "Fog fills the folds of the hills and slowly lets go.", sky: ["#bfe0d0", "#e6f0d6", "#fdf6dc"], orb: ["#fffbe8", 0.5, 0.3, 0.06], ridges: ["#8fbf9a", "#5e9873", "#2f6a4d"] },
    { eyebrow: "Plateau / 23:15", title: "Violet Night", text: "A thin moon, a long road and nobody else for miles.", sky: ["#070a1f", "#241a5e", "#6c4ba8"], orb: ["#eef0ff", 0.78, 0.28, 0.045], ridges: ["#2a2260", "#1a1546", "#0c0a26"], stars: true },
    { eyebrow: "Dunes / 12:00", title: "Salt Noon", text: "Everything is pale, flat and shimmering at midday.", sky: ["#5aa9e6", "#cfe9f7", "#fff1d6"], orb: ["#ffffff", 0.2, 0.2, 0.08], ridges: ["#f0cf9a", "#e0b070", "#c68f4b"] }
  ];

  var W = 0, H = 0, CELL = 6, cols = 0, rows = 0, dpr = 1;
  var sceneData = [];   // per slide: Uint8ClampedArray rgb at cols x rows
  var parts = null;     // {ox, oy, phase, rnd}
  var cur = 0, from = 0, to = 0, progress = 1, anim = false, last = 0, timer = 0, visible = true, restT = 0;

  function paintScene(s, w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d");
    var sk = g.createLinearGradient(0, 0, 0, h);
    sk.addColorStop(0, s.sky[0]); sk.addColorStop(0.55, s.sky[1]); sk.addColorStop(1, s.sky[2]);
    g.fillStyle = sk; g.fillRect(0, 0, w, h);
    if (s.stars) { g.fillStyle = "#fff"; for (var i = 0; i < 90; i++) g.fillRect(((i * 97) % 100) / 100 * w, ((i * 53) % 55) / 100 * h, 1.5, 1.5); }
    var og = g.createRadialGradient(s.orb[1] * w, s.orb[2] * h, 0, s.orb[1] * w, s.orb[2] * h, s.orb[3] * w * 3);
    og.addColorStop(0, s.orb[0] + "cc"); og.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = og; g.fillRect(0, 0, w, h);
    g.fillStyle = s.orb[0]; g.beginPath(); g.arc(s.orb[1] * w, s.orb[2] * h, s.orb[3] * w, 0, 6.283); g.fill();
    s.ridges.forEach(function (col, k) {
      var y0 = h * (0.58 + k * 0.13), amp = h * (0.08 - k * 0.012), f = 2.2 + k * 1.3 + (cur + 1) * 0.1;
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (var x = 0; x <= w; x += 4) g.lineTo(x, y0 - Math.abs(Math.sin(x / w * f * 3 + k * 1.7)) * amp - Math.sin(x / w * 11 + k) * amp * 0.25);
      g.lineTo(w, h); g.fill();
    });
    if (s.water) {
      var wg = g.createLinearGradient(0, h * 0.8, 0, h); wg.addColorStop(0, "rgba(255,240,210,0.35)"); wg.addColorStop(1, "rgba(20,60,90,0.5)");
      g.fillStyle = wg; g.fillRect(0, h * 0.8, w, h * 0.2);
    }
    return g.getImageData(0, 0, w, h).data;
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    CELL = W < 600 ? 5 : Math.max(5, Math.round(W / 220));
    cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sceneData = slides.map(function (s, i) { cur = i; return paintScene(s, cols, rows); });
    cur = from;
    var n = cols * rows;
    parts = { ox: new Float32Array(n), oy: new Float32Array(n), rnd: new Float32Array(n) };
    for (var i = 0; i < n; i++) { parts.ox[i] = Math.random() * 2 - 1; parts.oy[i] = Math.random() * 2 - 1; parts.rnd[i] = Math.random(); }
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function render(time) {
    ctx.clearRect(0, 0, W, H);
    var A = sceneData[from], B = sceneData[to];
    var p = progress, dir = to >= from || (from === slides.length - 1 && to === 0) ? 1 : -1;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x, k = i * 4;
        var local = 0;
        if (p < 1) {
          // a wave crosses the picture; each grain starts a little later than its neighbour
          var wave = dir > 0 ? x / cols : 1 - x / cols;
          local = Math.min(Math.max((p * 1.6 - wave * 0.6 - parts.rnd[i] * 0.15) / 0.75, 0), 1);
        }
        var r, g, b, dx = 0, dy = 0, size = CELL;
        if (local <= 0) { r = A[k]; g = A[k + 1]; b = A[k + 2]; if (p >= 1) { r = B[k]; g = B[k + 1]; b = B[k + 2]; } }
        else {
          var m = local < 0.5 ? 0 : 1;
          var src = m ? B : A;
          r = src[k]; g = src[k + 1]; b = src[k + 2];
          var lift = Math.sin(local * Math.PI);
          var flow = Math.sin(y * 0.09 + time * 0.002 + parts.rnd[i] * 3) * 40;
          dx = (parts.ox[i] * 70 + flow * dir) * lift;
          dy = (parts.oy[i] * 60 - 30) * lift;
          size = CELL * (1 - lift * 0.55);
        }
        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        ctx.fillRect(x * CELL + dx + (CELL - size) / 2, y * CELL + dy + (CELL - size) / 2, size + (local > 0 ? 0 : 0.6), size + (local > 0 ? 0 : 0.6));
      }
    }
  }

  var ui = { count: document.getElementById("dzCount"), eb: document.getElementById("dzEyebrow"), ti: document.getElementById("dzTitle"), tx: document.getElementById("dzText"), dots: document.getElementById("dzDots") };
  slides.forEach(function (s, i) {
    var d = document.createElement("button"); d.type = "button"; d.className = "dz-dot"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", "Slide " + (i + 1) + ": " + s.title);
    d.addEventListener("click", function () { go(i); }); ui.dots.appendChild(d);
  });
  function text(i) {
    var s = slides[i];
    ui.eb.textContent = s.eyebrow; ui.ti.textContent = s.title; ui.tx.textContent = s.text;
    ui.count.textContent = ("0" + (i + 1)).slice(-2) + " / " + ("0" + slides.length).slice(-2);
    Array.prototype.forEach.call(ui.dots.children, function (d, k) { d.setAttribute("aria-selected", k === i ? "true" : "false"); });
  }

  function go(i) {
    i = (i + slides.length) % slides.length;
    if (anim || i === cur) return;
    from = cur; to = i; progress = 0; anim = true;
    stage.classList.add("is-moving");
    clearTimeout(restT);
    restT = setTimeout(function () { text(to); stage.classList.remove("is-moving"); }, reduce ? 0 : 900);
    if (reduce) { progress = 1; finish(); render(0); return; }
    last = performance.now(); loop();
    schedule();
  }
  function finish() { cur = to; from = to; anim = false; progress = 1; }
  var raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function step(now) {
      if (anim) { progress = Math.min(progress + (now - last) / 2200, 1); last = now; if (progress >= 1) finish(); }
      render(now);
      if (anim || visible) { if (anim) raf = requestAnimationFrame(step); }
    });
  }
  function schedule() {
    clearTimeout(timer);
    if (reduce) return;
    timer = setTimeout(function () { if (visible) go(cur + 1); else schedule(); }, 6500);
  }

  document.getElementById("dzPrev").addEventListener("click", function () { go(cur - 1); });
  document.getElementById("dzNext").addEventListener("click", function () { go(cur + 1); });
  stage.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") go(cur - 1); if (e.key === "ArrowRight") go(cur + 1); });

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); render(performance.now()); }, 200); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(stage);

  build(); text(0); render(0); schedule();
})();
