(function () {
  var card = document.getElementById("gelCard");
  var lens = document.getElementById("gelLens");
  if (!card || !lens) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Shapes lean toward the pointer at different depths; the glass lens follows it.
  function move(e) {
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (!reduce) { card.style.setProperty("--px", (x - 0.5) * 2); card.style.setProperty("--py", (y - 0.5) * 2); }
    var s = lens.offsetWidth;
    card.style.setProperty("--lx", Math.max(0, Math.min(r.width - s, e.clientX - r.left - s / 2)) + "px");
    card.style.setProperty("--ly", Math.max(0, Math.min(r.height - s, e.clientY - r.top - s / 2)) + "px");
    lens.style.opacity = 1;
  }
  card.addEventListener("pointermove", move);
  card.addEventListener("pointerleave", function () {
    card.style.setProperty("--px", 0); card.style.setProperty("--py", 0);
  });
})();
