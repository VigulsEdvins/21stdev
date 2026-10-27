(function () {
  var folders = Array.prototype.slice.call(document.querySelectorAll(".fb-folder"));
  function open(target) {
    folders.forEach(function (f) {
      var btn = f.querySelector(".fb-tab"), body = f.querySelector(".fb-body"), on = f === target;
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) body.removeAttribute("hidden"); else body.setAttribute("hidden", "");
      f.style.zIndex = on ? 5 : "";
    });
  }
  folders.forEach(function (f) {
    f.querySelector(".fb-tab").addEventListener("click", function () { open(f); });
  });
  open(folders[0]);
})();
