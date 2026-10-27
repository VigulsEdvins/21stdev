(function () {
  var stage = document.getElementById("ccStage"), cv = document.getElementById("ccCanvas"), c = cv.getContext("2d");
  var SRC = [
    "function weave(threads, wind) {", "  const rows = [];", "  for (const t of threads) {", "    t.y += gravity * dt;", "    t.x += wind.at(t.y);",
    "    if (t.pinned) t.y = rod;", "    rows.push(t);", "  }", "  return fold(rows).map(smooth);", "}", "",
    "const cloth = new Sheet(cols, rows);", "cloth.pin(0, rod);", "window.on('pointer', (p) => {", "  cloth.push(p.x, p.y, 40);", "});",
    "export default function tick() {", "  cloth.step(1 / 60);", "  draw(cloth);", "}", "", "// every letter hangs on a thread"
  ];
  var W = 0, H = 0, dpr = 1, CW = 11, CH = 17, cols = 0, rows = 0, P = [], reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, vis = true, raf = 0;
  var ptr = { x: -999, y: -999, vx: 0, vy: 0 }, gust = 0, ink = "#1f2430";
  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    CW = W < 600 ? 9 : 11; CH = CW * 1.55;
    cols = Math.min(Math.floor((W * 0.92) / CW), 36); rows = Math.min(Math.floor((H - 50) / CH), 40);
    var x0 = (W - cols * CW) / 2; P = [];
    var rod = stage.querySelector(".cc-rod"); rod.style.left = (x0 - 12) + "px"; rod.style.right = "auto"; rod.style.width = (cols * CW + 24) + "px";
    for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) P.push({ x: x0 + i * CW, y: 24 + j * CH, ox: x0 + i * CW, oy: 24 + j * CH, pin: j === 0 });
    if (reduce) draw();
  }
  function at(i, j) { return P[j * (cols + 1) + i]; }
  function step(t) {
    var i, j, p;
    for (i = 0; i < P.length; i++) {
      p = P[i]; if (p.pin) continue;
      var vx = (p.x - p.ox) * 0.985, vy = (p.y - p.oy) * 0.985;
      p.ox = p.x; p.oy = p.y;
      p.x += vx + Math.sin(t * 0.8 + p.y * 0.01) * 0.04 + gust * Math.sin(p.y * 0.02 - t * 7);
      p.y += vy + 0.32;
      var dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < 3600) { var f = (1 - Math.sqrt(d2) / 60) * 0.18; p.x += ptr.vx * f; p.y += ptr.vy * f * 0.5; }
    }
    gust *= 0.94;
    for (var it = 0; it < 4; it++) {
      for (j = 0; j <= rows; j++) for (i = 0; i <= cols; i++) {
        if (i < cols) link(at(i, j), at(i + 1, j), CW);
        if (j < rows) link(at(i, j), at(i, j + 1), CH);
      }
    }
    ptr.vx *= 0.6; ptr.vy *= 0.6;
  }
  function link(a, b, len) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001, k = (d - len) / d;
    if (a.pin && b.pin) return;
    var wa = a.pin ? 0 : (b.pin ? 1 : 0.5), wb = b.pin ? 0 : (a.pin ? 1 : 0.5);
    a.x += dx * k * wa; a.y += dy * k * wa; b.x -= dx * k * wb; b.y -= dy * k * wb;
  }
  function draw() {
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    ink = getComputedStyle(stage).color || ink;
    c.font = "600 " + (CW * 1.25) + "px 'Courier New', ui-monospace, monospace"; c.textBaseline = "middle"; c.textAlign = "center"; c.fillStyle = ink;
    for (var j = 0; j < rows; j++) {
      var line = SRC[j % SRC.length];
      for (var i = 0; i < cols; i++) {
        var ch = line.charAt(i); if (!ch || ch === " ") continue;
        var a = at(i, j), b = at(i + 1, j), d = at(i, j + 1);
        var ex = (b.x - a.x) / CW, ey = (b.y - a.y) / CW, fx = (d.x - a.x) / CH, fy = (d.y - a.y) / CH;
        var area = ex * fy - ey * fx;
        c.globalAlpha = Math.max(0.15, Math.min(1, 0.45 + 0.55 * Math.abs(area)));
        c.setTransform(ex * dpr, ey * dpr, fx * dpr, fy * dpr, (a.x + (b.x - a.x) / 2 + (d.x - a.x) / 2) * dpr, (a.y + (b.y - a.y) / 2 + (d.y - a.y) / 2) * dpr);
        c.fillText(ch, 0, 0);
      }
    }
    c.globalAlpha = 1;
  }
  function loop(ts) { raf = 0; if (!vis) return; step(ts / 1000); draw(); raf = requestAnimationFrame(loop); }
  stage.addEventListener("pointermove", function (e) { var r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; ptr.vx = x - ptr.x > 80 ? 0 : x - ptr.x; ptr.vy = y - ptr.y > 80 ? 0 : y - ptr.y; ptr.x = x; ptr.y = y; });
  stage.addEventListener("pointerleave", function () { ptr.x = ptr.y = -999; });
  document.getElementById("ccGust").addEventListener("click", function () { gust = 1.4; if (reduce) { for (var k = 0; k < 40; k++) step(k); draw(); } });
  addEventListener("resize", build); build();
  if (!reduce) { new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); }).observe(stage); raf = requestAnimationFrame(loop); }
})();
