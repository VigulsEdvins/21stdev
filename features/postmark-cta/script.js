(function () {
  var cta = document.getElementById("ltCta");
  var btn = document.getElementById("ltBtn");
  var note = document.getElementById("ltNote");
  var tags = Array.prototype.slice.call(cta.querySelectorAll(".lt-tag"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Parallax: each tag drifts a different distance away from the pointer.
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function tick() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    tags.forEach(function (t, i) {
      var k = (i % 2 ? -1 : 1) * (14 + i * 7);
      t.style.setProperty("--mx", (cx * k).toFixed(1) + "px");
      t.style.setProperty("--my", (cy * k).toFixed(1) + "px");
    });
    raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(tick) : 0;
  }
  if (!reduce) {
    cta.addEventListener("pointermove", function (e) {
      var r = cta.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    cta.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  // The button gives a small confirmation and flips the tags once.
  var msgs = ["Great, your trip is started.", "Where to first? Pick a place."];
  var n = 0;
  btn.addEventListener("click", function () {
    note.textContent = msgs[n++ % msgs.length];
    if (reduce) return;
    tags.forEach(function (t, i) {
      t.animate([{ rotate: "0deg" }, { rotate: (i % 2 ? -1 : 1) * 14 + "deg" }, { rotate: "0deg" }], { duration: 650, easing: "ease-in-out", delay: i * 70 });
    });
  });
})();
