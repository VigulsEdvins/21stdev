(function () {
  var row = document.getElementById("heRow"), items = [].slice.call(row.children);
  function open(it) {
    items.forEach(function (x) { var on = x === it; x.classList.toggle("is-open", on); x.firstElementChild.setAttribute("aria-expanded", on ? "true" : "false"); });
  }
  items.forEach(function (it) {
    var btn = it.firstElementChild;
    btn.addEventListener("click", function () { open(it); });
    it.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" && matchMedia("(min-width: 1024px)").matches) open(it); });
  });
  open(items[0]);
})();
