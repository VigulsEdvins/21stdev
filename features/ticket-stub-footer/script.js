(function () {
  var t = document.getElementById("tsTicket");
  if (!t || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var fine = window.matchMedia("(hover: hover)").matches;
  if (!fine) return;
  t.addEventListener("pointermove", function (e) {
    var r = t.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    t.style.transform = "rotateY(" + (x * 6).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg)";
  });
  t.addEventListener("pointerleave", function () { t.style.transform = ""; });
})();
