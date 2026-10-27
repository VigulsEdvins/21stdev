(function () {
  var sec = document.getElementById("fbSec");
  var items = Array.prototype.slice.call(sec.querySelectorAll(".fb-steps li"));
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var visible = false, step = 0, timer = 0;

  // Bars grow in once when the section enters the viewport.
  // The flow list ticks through its steps in a loop while visible.
  function tick() {
    clearTimeout(timer);
    if (!visible) return;
    if (step > items.length) { items.forEach(function (li) { li.classList.remove("is-done"); }); step = 0; }
    else if (step > 0) items[step - 1].classList.add("is-done");
    step++;
    timer = setTimeout(tick, step > items.length ? 2200 : 1100);
  }

  if (reduce || !("IntersectionObserver" in window)) {
    sec.classList.add("is-in");
    items.forEach(function (li) { li.classList.add("is-done"); });
    return;
  }
  new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting;
    if (visible) { sec.classList.add("is-in"); tick(); } else clearTimeout(timer);
  }, { threshold: 0.25 }).observe(sec);
})();
