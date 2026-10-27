(function () {
  // Draw a static field of tiny blossoms on rolling hills (canvas 2D, drawn once per resize).
  var cv = document.getElementById("fmField");
  if (!cv) return;
  var ctx = cv.getContext("2d");

  function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function paint() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var palettes = [
      ["#f6b36a", "#ffd08a", "#ffe2b0"],
      ["#ee7d4b", "#f59a63", "#ffc18a"],
      ["#d9472f", "#e8553d", "#f27a5e", "#f6a58f"]
    ];
    var rows = [0.0, 0.32, 0.62];
    var r = rand(11);
    rows.forEach(function (rowStart, li) {
      var base = h * (0.22 + rowStart * 0.8);
      var count = Math.round(w * (h * (1 - rowStart)) / 260 * (1 + li * 0.4));
      var size = 2.4 + li * 1.6;
      var pal = palettes[li];
      // hill fill so gaps between flowers are not empty
      ctx.fillStyle = pal[0];
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += 8) ctx.lineTo(x, base + Math.sin(x * 0.006 + li * 2) * 16 + Math.sin(x * 0.017 + li) * 6);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      for (var i = 0; i < count; i++) {
        var px = r() * w;
        var top = base + Math.sin(px * 0.006 + li * 2) * 16 + Math.sin(px * 0.017 + li) * 6;
        var py = top + r() * (h - top);
        ctx.fillStyle = pal[(r() * pal.length) | 0];
        ctx.beginPath(); ctx.arc(px, py, size * (0.7 + r() * 0.7), 0, 6.283); ctx.fill();
        if (r() > 0.7) { ctx.fillStyle = "#fff4d6"; ctx.beginPath(); ctx.arc(px, py, size * 0.35, 0, 6.283); ctx.fill(); }
      }
    });
  }
  paint();
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(paint, 150); });

  // Count the numbers up once when they scroll into view.
  var nums = document.querySelectorAll(".fm-numbers strong");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(el, v) { el.textContent = v.toFixed(+el.dataset.dec || 0) + (el.dataset.suf || ""); }
  function run(el) {
    var to = +el.dataset.to;
    if (reduce || !to) { show(el, to); return; }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min((now - t0) / 1200, 1);
      show(el, to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  } else nums.forEach(run);
})();
