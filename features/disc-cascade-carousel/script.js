(function () {
  var stage = document.getElementById("vsStage"), wrap = document.getElementById("vsWrap");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var records = [
    { t: "Paper Lanterns", a: "The Quiet Orchard", y: "1974", c: "#ff9a5c" },
    { t: "Salt and Static", a: "Nova Harbour", y: "1981", c: "#8fd3c8" },
    { t: "Midnight Ferry", a: "Ines Calloway", y: "1969", c: "#e8c46a" },
    { t: "Glass Meadow", a: "Brightside Trio", y: "1992", c: "#c59cf0" },
    { t: "Slow Weather", a: "Rowan Pike", y: "1977", c: "#f07f8f" },
    { t: "Copper Hours", a: "Lumen Club", y: "1985", c: "#7fb4f0" }
  ];
  var cur = 0, discs = [];
  records.forEach(function (r, i) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "vs-disc";
    b.style.setProperty("--c1", r.c);
    b.setAttribute("aria-label", r.t + " by " + r.a);
    b.innerHTML = '<span class="vs-label">' + r.t + "</span>";
    b.addEventListener("click", function () { if (!moved) go(i); });
    stage.appendChild(b); discs.push(b);
  });

  function layout() {
    var dx = stage.clientWidth * 0.2;
    discs.forEach(function (el, i) {
      var k = i - cur, ak = Math.abs(k);
      var s = k >= 0 ? 1 + k * 0.22 : Math.max(0.3, 1 + k * 0.26);
      var x = k * dx * (k > 0 ? 1.15 : 0.9), y = -k * dx * 0.42 + stage.clientHeight * 0.1;
      el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ") rotate(" + (k * -50) + "deg)";
      el.style.opacity = ak > 3 ? 0 : (k < 0 ? 1 - ak * 0.22 : 1 - Math.max(0, k - 1) * 0.3);
      el.style.zIndex = 10 - ak + (k >= 0 ? 0 : -1);
      el.style.pointerEvents = ak > 3 ? "none" : "auto";
      el.style.setProperty("--spin", (k * 40) + "deg");
      el.tabIndex = k === 0 ? 0 : -1;
      el.setAttribute("aria-current", k === 0 ? "true" : "false");
    });
    var r = records[cur];
    document.getElementById("vsYear").textContent = r.y;
    document.getElementById("vsName").textContent = r.t;
    document.getElementById("vsArtist").textContent = r.a;
    document.getElementById("vsCount").textContent = (cur + 1) + " / " + records.length;
  }
  function go(n) { cur = Math.max(0, Math.min(records.length - 1, n)); layout(); }
  document.getElementById("vsPrev").addEventListener("click", function () { go(cur - 1); });
  document.getElementById("vsNext").addEventListener("click", function () { go(cur + 1); });
  wrap.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { go(cur + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(cur - 1); e.preventDefault(); }
  });
  var wheelLock = 0;
  stage.addEventListener("wheel", function (e) {
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 350; go(cur + (d > 0 ? 1 : -1));
    e.preventDefault();
  }, { passive: false });

  var sx = null, moved = false;
  stage.addEventListener("pointerdown", function (e) { sx = e.clientX; moved = false; });
  window.addEventListener("pointermove", function (e) {
    if (sx === null) return;
    if (Math.abs(e.clientX - sx) > 50) { moved = true; go(cur + (e.clientX < sx ? 1 : -1)); sx = e.clientX; }
  });
  window.addEventListener("pointerup", function () { sx = null; setTimeout(function () { moved = false; }, 0); });
  window.addEventListener("resize", layout);
  if (reduce) discs.forEach(function (d) { d.style.transition = "none"; });
  layout();
})();
