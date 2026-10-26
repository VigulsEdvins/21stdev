(function () {
  var stage = document.getElementById("wcStage"), host = document.getElementById("wcSlides");
  var countEl = document.getElementById("wcCount"), bar = document.getElementById("wcBar");
  var tag = document.getElementById("wcTag"), replay = document.getElementById("wcReplay");
  var WORD = "Studio", N = 7, STEP = 1000;
  var dirs = ["", "from-r", "", "from-t", "from-r", "", "from-t"];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var timers = [], raf = 0, slides = [];

  function build() {
    host.innerHTML = ""; slides = [];
    for (var i = 0; i < N; i++) {
      var s = document.createElement("div"); s.className = "wc-s k" + i + (dirs[i] ? " " + dirs[i] : "");
      var w = document.createElement("div"); w.className = "wc-w";
      WORD.split("").forEach(function (ch, j) { var sp = document.createElement("span"); sp.textContent = ch; sp.style.setProperty("--i", j); w.appendChild(sp); });
      s.appendChild(w); host.appendChild(s); slides.push(s);
    }
  }
  function setCount(p) {
    var v = Math.round(p * 100);
    countEl.textContent = (v < 10 ? "00" : v < 100 ? "0" : "") + v; bar.style.width = v + "%";
  }
  function finish() { tag.textContent = "Ready"; replay.hidden = false; setCount(1); }
  function run() {
    timers.forEach(clearTimeout); cancelAnimationFrame(raf); replay.hidden = true; tag.textContent = "Loading";
    build();
    if (reduce) { slides.forEach(function (s, i) { s.classList.toggle("is-in", i === N - 1); }); finish(); return; }
    var t0 = performance.now(), total = STEP * N;
    slides.forEach(function (s, i) { timers.push(setTimeout(function () { s.classList.add("is-in"); }, 150 + i * STEP)); });
    (function tick(now) {
      var p = Math.min(1, (now - t0) / (total + 300)); setCount(p);
      if (p < 1) raf = requestAnimationFrame(tick); else finish();
    })(t0);
  }
  replay.addEventListener("click", run);
  run();
})();
