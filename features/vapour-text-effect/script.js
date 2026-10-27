(function () {
  var canvas = document.getElementById("smCanvas");
  var ctx = canvas.getContext("2d");
  var words = document.getElementById("smWords").textContent.split("|").map(function (w) { return w.trim(); }).filter(Boolean);
  if (!words.length) words = ["Hello"];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1, parts = [], idx = 0, phase = "form", t0 = 0, color = "255,255,255";

  function readColor() {
    var c = getComputedStyle(document.body).color.match(/\d+/g);
    if (c) color = c[0] + "," + c[1] + "," + c[2];
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function sample(text) {
    var off = document.createElement("canvas");
    off.width = W; off.height = H;
    var o = off.getContext("2d");
    var fs = Math.min(H * 0.62, 150);
    o.font = "800 " + fs + "px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
    while (o.measureText(text).width > W * 0.92 && fs > 20) { fs -= 4; o.font = "800 " + fs + "px " + getComputedStyle(document.body).fontFamily; }
    o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
    o.fillText(text, W / 2, H / 2);
    var d = o.getImageData(0, 0, W, H).data, pts = [], step = W < 500 ? 3 : 4;
    for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
    for (var i = pts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp; }
    return pts;
  }
  function assign() {
    var pts = sample(words[idx]);
    while (parts.length < pts.length) parts.push({ x: Math.random() * W, y: H + 10, vx: 0, vy: 0, hx: 0, hy: 0, a: 0, on: false, delay: 0 });
    parts.forEach(function (p, i) {
      var q = pts[i];
      p.on = !!q;
      if (q) { p.hx = q[0]; p.hy = q[1]; }
      p.vx = 0; p.vy = 0;
      p.delay = Math.random() * 500;
    });
    t0 = performance.now(); phase = "form";
  }
  function vaporize() {
    phase = "smoke"; t0 = performance.now();
    parts.forEach(function (p) {
      p.vx = (Math.random() - 0.35) * 1.4;
      p.vy = -(0.4 + Math.random() * 1.6);
      p.delay = Math.random() * 600;
    });
  }
  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    var el = now - t0, alive = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (phase === "form") {
        if (el < p.delay) continue;
        p.x += (p.hx - p.x) * 0.1; p.y += (p.hy - p.y) * 0.1;
        p.a += ((p.on ? 1 : 0) - p.a) * 0.12;
      } else {
        if (el < p.delay) { p.x += (Math.random() - 0.5) * 0.4; }
        else {
          p.vx += (Math.random() - 0.5) * 0.18; p.vy -= 0.012;
          p.x += p.vx; p.y += p.vy; p.a *= 0.972;
        }
      }
      if (p.a > 0.02) {
        alive++;
        ctx.fillStyle = "rgba(" + color + "," + p.a.toFixed(3) + ")";
        ctx.fillRect(p.x, p.y, 2.2, 2.2);
      }
    }
    if (phase === "form" && el > 2800) vaporize();
    else if (phase === "smoke" && (alive < 6 || el > 2600)) { idx = (idx + 1) % words.length; assign(); }
    requestAnimationFrame(frame);
  }
  function start() {
    readColor(); size(); parts = []; assign();
    if (reduce) { parts.forEach(function (p) { p.x = p.hx; p.y = p.hy; p.a = p.on ? 1 : 0; }); phase = "hold"; draw(); }
  }
  function draw() { ctx.clearRect(0, 0, W, H); parts.forEach(function (p) { if (p.a > 0.02) { ctx.fillStyle = "rgba(" + color + ",1)"; ctx.fillRect(p.x, p.y, 2.2, 2.2); } }); }
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(start, 150); });
  start();
  if (!reduce) requestAnimationFrame(frame);
})();
