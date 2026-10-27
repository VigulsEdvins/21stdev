(function () {
  var hero = document.getElementById("ioHero"), cv = document.getElementById("ioCanvas"), c = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, mx = 0, my = 0, tx = 0, ty = 0, vis = true, t = 0, raf = 0;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var orbits = [
    { rx: 0.34, ry: 0.2, tilt: -0.3, sp: 0.5, n: 1, r: 7 },
    { rx: 0.46, ry: 0.3, tilt: 0.25, sp: -0.35, n: 2, r: 5 },
    { rx: 0.6, ry: 0.4, tilt: -0.1, sp: 0.22, n: 3, r: 4 }
  ];
  function ink() { return getComputedStyle(hero).getPropertyValue("--io-ink").trim() || "#1d1b22"; }
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = hero.clientWidth; H = hero.clientHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); }
  size(); addEventListener("resize", size);
  hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; });
  function pos(o, a) { var x = Math.cos(a) * o.rx * W, y = Math.sin(a) * o.ry * W * 0.8; var ct = Math.cos(o.tilt), st = Math.sin(o.tilt); return [W / 2 + mx * 30 + x * ct - y * st, H / 2 + my * 30 + x * st + y * ct]; }
  function draw() {
    var col = ink();
    c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0,0.06)"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "source-over";
    c.fillStyle = col;
    orbits.forEach(function (o, i) {
      for (var k = 0; k < o.n; k++) {
        var p = pos(o, t * o.sp + (k * 6.283) / o.n + i), wob = 0.7 + 0.3 * Math.sin(t * 2 + k);
        c.globalAlpha = 0.85; c.beginPath(); c.arc(p[0], p[1], o.r * wob, 0, 6.283); c.fill();
      }
    });
    c.globalAlpha = 1;
  }
  function staticFrame() { c.clearRect(0, 0, W, H); var col = ink(); c.strokeStyle = col; c.globalAlpha = 0.18; orbits.forEach(function (o) { c.beginPath(); for (var a = 0; a <= 6.3; a += 0.1) { var p = pos(o, a); a ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); }); c.globalAlpha = 1; draw(); }
  function loop() { raf = 0; if (!vis) return; mx += (tx - mx) * 0.05; my += (ty - my) * 0.05; t += 0.012; draw(); raf = requestAnimationFrame(loop); }
  if (reduce) staticFrame();
  else { new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && !raf) loop(); }).observe(hero); loop(); }
})();
