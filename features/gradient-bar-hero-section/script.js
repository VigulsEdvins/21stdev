(function () {
  var box = document.getElementById("rbBars");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bars = [], count = 0;

  function build() {
    box.textContent = ""; bars = [];
    var n = Math.max(14, Math.round(box.clientWidth / 38));
    for (var i = 0; i < n; i++) { var s = document.createElement("span"); box.appendChild(s); bars.push(s); }
  }
  function paint(t) {
    var n = bars.length;
    bars.forEach(function (b, i) {
      var x = i / (n - 1);
      var edge = Math.pow(Math.abs(x - 0.5) * 2, 1.4);
      var wave = 0.5 + 0.5 * Math.sin(t * 0.0011 + i * 0.55);
      b.style.setProperty("--h", (18 + edge * 62 + wave * 18).toFixed(1) + "%");
    });
  }
  function loop(t) { paint(t); requestAnimationFrame(loop); }
  build(); paint(0);
  window.addEventListener("resize", function () { build(); paint(0); });
  if (!reduce) requestAnimationFrame(loop);

  var el = document.getElementById("rbCount"), target = 1847, start = performance.now();
  function tick(now) {
    var p = Math.min(1, (now - start) / 1400);
    count = Math.round(target * (1 - Math.pow(1 - p, 3)));
    el.textContent = count.toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  }
  if (reduce) el.textContent = target.toLocaleString("en-US"); else requestAnimationFrame(tick);
})();
