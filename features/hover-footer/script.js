(function () {
  var foot = document.getElementById("sfFooter"), glow = document.getElementById("sfGlow");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".sf-chip"));
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) { foot.classList.add("is-hot"); glow.style.setProperty("opacity", "0.6"); return; }

  foot.addEventListener("pointermove", function (e) {
    var r = glow.getBoundingClientRect();
    foot.style.setProperty("--mx", (e.clientX - r.left) + "px");
    foot.style.setProperty("--my", (e.clientY - r.top) + "px");
    foot.classList.add("is-hot");
    if (reduce) return;
    chips.forEach(function (c) {
      var b = c.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      var dist = Math.hypot(dx, dy), pull = dist < 90 ? (1 - dist / 90) * 0.35 : 0;
      c.style.transform = "translate(" + (dx * pull).toFixed(1) + "px," + (dy * pull).toFixed(1) + "px)";
    });
  });
  foot.addEventListener("pointerleave", function () {
    foot.classList.remove("is-hot");
    chips.forEach(function (c) { c.style.transform = ""; });
  });
})();
