(function () {
  var sw = document.getElementById("opSwitch"), grid = document.getElementById("opGrid"), note = document.getElementById("opNote");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".op-card"));

  function tween(node, to, instant, label) {
    var from = parseFloat(node.textContent.replace(",", ".")) || 0, t0 = performance.now(), dur = reduce || instant ? 0 : 450;
    cancelAnimationFrame(node._raf);
    (function step(now) {
      var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      node.textContent = k < 1 ? Math.round(from + (to - from) * e) : label;
      if (k < 1) node._raf = requestAnimationFrame(step);
    })(t0);
  }
  var current = "month";
  function setPeriod(per, instant) {
    current = per;
    sw.style.setProperty("--i", per === "year" ? 1 : 0);
    Array.prototype.forEach.call(sw.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", b.dataset.per === per ? "true" : "false"); });
    cards.forEach(function (c) {
      // the prices are plain text in the card (hidden .op-m / .op-y), so they can be edited
      var src = c.querySelector(per === "year" ? ".op-y" : ".op-m");
      var typed = src ? src.textContent.trim() : "0";
      tween(c.querySelector(".op-num"), parseFloat(typed.replace(",", ".").replace(/[^0-9.]/g, "")) || 0, instant, typed);
      // clicking the big number in the admin panel edits the price that is showing
      c.querySelector(".op-num").setAttribute("data-cms-edit", per === "year" ? ".op-y" : ".op-m");
      c.querySelector(".op-per").textContent = "/ month";
    });
    note.textContent = per === "year" ? "Billed once a year, 25% lower than monthly. Prices in US dollars." : "Billed monthly. Prices in US dollars.";
  }
  // an edited price (Content tab, admin panel) shows at once
  if (window.MutationObserver) {
    var watch = new MutationObserver(function () { setPeriod(current, true); });
    Array.prototype.forEach.call(grid.querySelectorAll(".op-vals"), function (v) { watch.observe(v, { childList: true, characterData: true, subtree: true }); });
  }
  // one currency for every plan: the first sign is the one to edit
  var curs = grid.querySelectorAll(".op-cur");
  function syncCur() { for (var i = 1; i < curs.length; i++) curs[i].textContent = curs[0].textContent; }
  if (curs.length && window.MutationObserver) new MutationObserver(syncCur).observe(curs[0], { childList: true, characterData: true, subtree: true });
  syncCur();
  setPeriod(current, true);
  sw.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPeriod(b.dataset.per); });
  // spotlight follows the pointer inside each card
  cards.forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
})();
