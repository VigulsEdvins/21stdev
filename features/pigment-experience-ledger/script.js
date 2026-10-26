(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll(".cl-row"));

  function setOpen(row, open) {
    row.classList.toggle("is-open", open);
    row.querySelector(".cl-btn").setAttribute("aria-expanded", String(open));
  }

  rows.forEach(function (row) {
    var btn = row.querySelector(".cl-btn");
    // pigment follows the pointer inside the row
    row.addEventListener("pointermove", function (e) {
      var r = row.getBoundingClientRect();
      row.style.setProperty("--mx", e.clientX - r.left + "px");
      row.style.setProperty("--my", e.clientY - r.top + "px");
    });
    // one row open at a time
    btn.addEventListener("click", function () {
      var willOpen = !row.classList.contains("is-open");
      rows.forEach(function (o) { setOpen(o, o === row && willOpen); });
    });
  });
})();
