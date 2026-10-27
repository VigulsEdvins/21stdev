(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll(".pj-item"));
  var bars = Array.prototype.slice.call(document.querySelectorAll("#pjSplit span"));

  // One phase is open at a time; the matching segment of the time bar lights up.
  function open(idx) {
    items.forEach(function (it, i) {
      var on = i === idx;
      it.classList.toggle("is-open", on);
      it.querySelector(".pj-head").setAttribute("aria-expanded", on ? "true" : "false");
      bars[i].classList.toggle("is-on", on);
    });
  }
  items.forEach(function (it, i) {
    it.querySelector(".pj-head").addEventListener("click", function () {
      open(it.classList.contains("is-open") ? -1 : i);
    });
    it.querySelector(".pj-head").addEventListener("mouseenter", function () { bars[i].classList.add("is-on"); });
    it.querySelector(".pj-head").addEventListener("mouseleave", function () { if (!it.classList.contains("is-open")) bars[i].classList.remove("is-on"); });
  });
  open(0);
})();
