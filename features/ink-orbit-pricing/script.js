(function () {
  var sw = document.getElementById("opSwitch"), grid = document.getElementById("opGrid"), note = document.getElementById("opNote");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".op-card"));

  function tween(node, to) {
    var from = parseFloat(node.textContent) || 0, t0 = performance.now(), dur = reduce ? 0 : 450;
    cancelAnimationFrame(node._raf);
    (function step(now) {
      var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(from + (to - from) * e);
      if (k < 1) node._raf = requestAnimationFrame(step);
    })(t0);
  }
  function setPeriod(per) {
    sw.style.setProperty("--i", per === "year" ? 1 : 0);
    Array.prototype.forEach.call(sw.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", b.dataset.per === per ? "true" : "false"); });
    cards.forEach(function (c) {
      tween(c.querySelector(".op-num"), +c.dataset[per === "year" ? "y" : "m"]);
      c.querySelector(".op-per").textContent = "/ month";
    });
    note.textContent = per === "year" ? "Billed once a year, 25% lower than monthly. Prices in US dollars." : "Billed monthly. Prices in US dollars.";
  }
  sw.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPeriod(b.dataset.per); });
  // spotlight follows the pointer inside each card
  cards.forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
})();
