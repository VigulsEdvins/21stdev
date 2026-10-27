(function () {
  var stage = document.getElementById("cpStage"), card = document.getElementById("cpCard"), cap = document.getElementById("cpCap");
  var rows = Array.prototype.slice.call(stage.querySelectorAll(".cp-row"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tx = 0, ty = 0, x = 0, y = 0, raf = 0, seen = false;

  function loop() {
    var k = reduce ? 1 : 0.16;
    x += (tx - x) * k; y += (ty - y) * k;
    var tilt = reduce ? 0 : Math.max(-8, Math.min(8, (tx - x) * 0.25));
    card.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + tilt.toFixed(2) + "deg)";
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
  }
  function aim(e) {
    tx = e.clientX + 22; ty = e.clientY - 150;
    if (tx + 230 > window.innerWidth) tx = e.clientX - 240;
    if (ty < 8) ty = e.clientY + 24;
    if (!seen) { x = tx; y = ty; seen = true; }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  rows.forEach(function (r) {
    r.addEventListener("pointerenter", function (e) {
      card.style.setProperty("--h1", r.dataset.h1); card.style.setProperty("--h2", r.dataset.h2);
      cap.textContent = r.dataset.note; card.classList.add("is-on"); aim(e);
    });
    r.addEventListener("pointermove", aim);
    r.addEventListener("pointerleave", function () { card.classList.remove("is-on"); seen = false; });
  });
})();
