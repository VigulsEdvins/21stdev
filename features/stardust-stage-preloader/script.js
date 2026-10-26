(function () {
  var stage = document.getElementById("dcStage"), cv = document.getElementById("dcCanvas");
  var ctx = cv.getContext("2d");
  var count = document.getElementById("dcCount"), cap = document.getElementById("dcCaption"), enter = document.getElementById("dcEnter");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, cell = 10, cols = 0, rows = 0, dpr = 1;
  var DURATION = reduce ? 1200 : 7000;
  var start = performance.now(), visible = true, finished = false, raf = 0;
  var notes = [[0, "Lighting the first star"], [0.35, "The sky starts to fall"], [0.6, "Hanging the curtain"], [0.85, "Warming the spotlight"], [1, "Curtain up"]];

  function hash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.max(7, Math.round(Math.min(W, H) / 56));
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    draw(performance.now());
  }

  // brightness 0..1 of the night sky with one big star
  function sky(u, v, t) {
    var h = hash(Math.floor(u * 90), Math.floor(v * 60));
    var s = h > 0.965 ? 0.12 + 0.3 * Math.abs(Math.sin(t * 0.002 + h * 40)) : 0;
    var dx = u - 0.5, dy = (v - 0.42) * (H / W), r = Math.sqrt(dx * dx + dy * dy);
    var core = Math.exp(-r * 38);
    var cross = Math.exp(-Math.abs(dx) * 90) * Math.exp(-Math.abs(dy) * 6) + Math.exp(-Math.abs(dy) * 90) * Math.exp(-Math.abs(dx) * 6);
    return Math.min(1, s + core * 1.2 + cross * 0.5);
  }
  // brightness of a stage: curtain folds, a spotlight cone and a floor
  function theatre(u, v, t) {
    var drape = v < 0.3 ? 1 : 0;
    var fold = 0.35 + 0.35 * Math.sin(u * 46 + Math.sin(t * 0.0006 + u * 6) * 0.7);
    var top = v < 0.32 ? fold * smooth(0, 0.08, 0.34 - v) * 1.6 : 0;
    var side = (u < 0.14 || u > 0.86) ? fold * 0.9 : 0;
    var cone = Math.max(0, 1 - Math.abs(u - 0.5) / (0.04 + (v - 0.1) * 0.5)) * smooth(0.1, 0.4, v) * (v < 0.82 ? 1 : 0);
    var floor = v > 0.8 ? 0.55 * Math.exp(-Math.abs(u - 0.5) * 3.2) * (0.6 + 0.4 * Math.sin(v * 80)) : 0;
    var moon = Math.exp(-(Math.pow(u - 0.72, 2) + Math.pow((v - 0.2) * (H / W), 2)) * 900) * 0.0;
    return Math.min(1, Math.max(top * drape, side) * 0.9 + cone * 0.6 + floor + moon);
  }
  function progress(now) { return Math.min(1, (now - start) / DURATION); }

  function draw(now) {
    var p = finished ? 1 : progress(now), t = now - start;
    var mix = smooth(0.38, 0.72, p);
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f2f2f2";
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var u = (i + 0.5) / cols, v = (j + 0.5) / rows;
        var b = sky(u, v, t) * (1 - mix) + theatre(u, v, t) * mix;
        // wipe: a ripple of change travelling outward from the middle
        var d = Math.hypot(u - 0.5, (v - 0.5) * (H / W));
        var ring = Math.exp(-Math.pow((d - mix * 1.1) * 10, 2)) * 0.5 * Math.sin(Math.PI * mix);
        b = Math.min(1, b + ring);
        if (b < 0.06) continue;
        var r = (cell / 2) * Math.min(1, b) * 0.92;
        ctx.beginPath(); ctx.arc(i * cell + cell / 2, j * cell + cell / 2, r, 0, 6.2832); ctx.fill();
      }
    }
    var shown = Math.round(p * 100);
    count.textContent = ("00" + shown).slice(-3);
    for (var k = notes.length - 1; k >= 0; k--) if (p >= notes[k][0]) { if (cap.textContent !== notes[k][1]) cap.textContent = notes[k][1]; break; }
  }

  function loop(now) {
    raf = 0;
    if (!visible) return;
    draw(now);
    if (!finished && progress(now) >= 1) {
      finished = true;
      enter.hidden = false;
      stage.querySelector(".dc-sr").textContent = "Loaded";
    }
    // after finishing, keep a gentle idle shimmer
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(stage);
  }
  enter.addEventListener("click", function () {
    start = performance.now(); finished = false; enter.hidden = true; cap.textContent = notes[0][1];
    stage.querySelector(".dc-sr").textContent = "Loading";
    kick();
  });
  window.addEventListener("resize", resize);
  resize(); kick();
})();
