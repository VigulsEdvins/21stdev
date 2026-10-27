(function () {
  var cv = document.getElementById("lmArt"), c = cv.getContext("2d"), W = cv.width, H = cv.height;
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function px(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); }
  var bands = ["#0b1030", "#101a45", "#18265c", "#243670", "#34498a"];
  var stars = [];
  for (var i = 0; i < 70; i++) stars.push([rnd() * W, rnd() * H * 0.5, rnd()]);
  var t = 0, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, vis = true;
  function draw() {
    for (var b = 0; b < bands.length; b++) px(0, b * H * 0.13, W, H * 0.13 + 1, bands[b]);
    for (var s = 0; s < stars.length; s++) { var tw = Math.sin(t / 24 + stars[s][2] * 20) > -0.3; if (tw) px(stars[s][0], stars[s][1], 1, 1, stars[s][2] > .8 ? "#fff6c8" : "#9fb0e8"); }
    // moon
    for (var y = -7; y <= 7; y++) for (var x = -7; x <= 7; x++) if (x * x + y * y <= 49) px(120 + x, 18 + y, 1, 1, x * x + y * y > 36 ? "#fff1b8" : "#ffe28a");
    px(117, 15, 2, 2, "#e8c870"); px(122, 20, 3, 2, "#e8c870");
    // far hills
    for (var x2 = 0; x2 < W; x2++) { var h1 = 56 + Math.sin(x2 / 17) * 5 + Math.sin(x2 / 6) * 1.5; px(x2, h1, 1, H - h1, "#1c2f55"); }
    // lake
    px(0, 74, W, 12, "#25407a");
    for (var r = 0; r < 8; r++) { var ox = (r * 23 + Math.sin(t / 30 + r) * 3) % W; px(ox, 76 + r * 1.3, 8 - r % 3, 1, "#6f8fd0"); }
    px(108, 76, 24, 1, "#ffe28a"); px(111, 79, 18, 1, "#e8c870"); px(114, 82, 12, 1, "#b09a50");
    // meadow
    for (var x3 = 0; x3 < W; x3++) { var h2 = 86 + Math.sin(x3 / 11 + 1) * 3; px(x3, h2, 1, H - h2, "#14301f"); px(x3, h2, 1, 1, "#2a5a33"); }
    // trees
    [[20, 84], [34, 87], [140, 85], [150, 88]].forEach(function (p) { px(p[0], p[1] - 4, 2, 6, "#0a1a12"); px(p[0] - 4, p[1] - 12, 10, 8, "#0f2b1a"); px(p[0] - 2, p[1] - 16, 6, 5, "#143823"); });
    // lanterns / fireflies
    for (var f = 0; f < 10; f++) { var fx = (f * 17 + Math.sin(t / 40 + f) * 6 + 5) % W, fy = 86 + (f * 7) % 12 + Math.cos(t / 33 + f) * 2; if (Math.sin(t / 15 + f * 2) > 0) px(fx, fy, 1, 1, "#ffe28a"); }
  }
  function loop() { t++; draw(); if (!reduce && vis) requestAnimationFrame(loop); }
  draw();
  if (!reduce) { new IntersectionObserver(function (e) { var was = vis; vis = e[0].isIntersecting; if (vis && !was) loop(); }).observe(cv); loop(); }
})();
