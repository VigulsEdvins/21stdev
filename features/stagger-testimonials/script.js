(function () {
  var grid = document.getElementById("sqGrid");
  var tabs = Array.prototype.slice.call(document.querySelectorAll("#sqTabs .sq-tab"));
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".sq-card"));

  function layout(filter) {
    var n = 0;
    cards.forEach(function (c) {
      var show = filter === "all" || c.dataset.role === filter;
      c.hidden = !show;
      c.classList.toggle("is-odd", show && n++ % 2 === 1);
    });
  }
  cards.forEach(function (c) {
    c.addEventListener("click", function () {
      cards.forEach(function (o) { o.classList.toggle("is-front", o === c); });
    });
  });
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (o) { o.classList.toggle("is-active", o === t); });
      layout(t.dataset.filter);
    });
  });
  cards[0].classList.add("is-front");
  layout("all");
})();
