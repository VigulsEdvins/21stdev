(function () {
  var roots = document.querySelectorAll(".pm-demo");
  Array.prototype.forEach.call(roots, function (root) {
    if (root.__pmReady) return;
    root.__pmReady = true;
    var heads = root.querySelectorAll(".pm-col");
    var cells = root.querySelectorAll("td[data-col]");
    function pick(n) {
      Array.prototype.forEach.call(heads, function (h) { var on = h.getAttribute("data-col") === n; h.classList.toggle("is-on", on); h.setAttribute("aria-pressed", on ? "true" : "false"); });
      Array.prototype.forEach.call(cells, function (c) { c.classList.toggle("is-on", c.getAttribute("data-col") === n); });
    }
    Array.prototype.forEach.call(heads, function (h) { h.addEventListener("click", function () { pick(h.getAttribute("data-col")); }); });
    pick("2");
  });
})();
