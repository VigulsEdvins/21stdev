(function () {
  var stage = document.getElementById("cpStage"), cloth = document.getElementById("cpCloth"), range = document.getElementById("cpRange");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, p = 0, drag = null, anim = 0;
  // a torn trailing edge: jagged polygon along the right side
  var pts = ["0 0"], steps = 28, seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (var i = 0; i <= steps; i++) pts.push((100 - rnd() * 1.6).toFixed(2) + "% " + ((i / steps) * 100).toFixed(1) + "%");
  pts.push("0 100%");
  cloth.style.clipPath = "polygon(" + pts.join(",") + ")";
  function set(v) { p = Math.max(0, Math.min(1, v)); stage.style.setProperty("--p", p.toFixed(4)); range.value = Math.round(p * 100); }
  function glide(to) {
    cancelAnimationFrame(anim);
    if (reduce) { set(to); return; }
    (function tick() { set(p + (to - p) * 0.14); if (Math.abs(to - p) > 0.003) anim = requestAnimationFrame(tick); else set(to); })();
  }
  cloth.addEventListener("pointerdown", function (e) { cancelAnimationFrame(anim); drag = { x: e.clientX, p: p }; cloth.setPointerCapture(e.pointerId); });
  cloth.addEventListener("pointermove", function (e) { if (drag) set(drag.p + (drag.x - e.clientX) / stage.clientWidth); });
  function end() { if (!drag) return; drag = null; glide(p > 0.35 ? 1 : 0); }
  cloth.addEventListener("pointerup", end); cloth.addEventListener("pointercancel", end);
  range.addEventListener("input", function () { cancelAnimationFrame(anim); set(range.value / 100); });
  range.addEventListener("change", function () { glide(p > 0.5 ? 1 : 0); });

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  pinRunway(stage, 3, function (v) { cancelAnimationFrame(anim); set(v); });
})();
