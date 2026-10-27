(function () {
  var folders = Array.prototype.slice.call(document.querySelectorAll(".fs-folder"));
  function open(target) {
    folders.forEach(function (f) {
      var on = f === target;
      f.classList.toggle("is-open", on);
      f.querySelector(".fs-tab").setAttribute("aria-expanded", on ? "true" : "false");
    });
  }
  folders.forEach(function (f) {
    f.querySelector(".fs-tab").addEventListener("click", function () { open(f); });
    f.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) open(f); });
  });
})();
