(function () {
  var hero = document.getElementById("bhHero");
  var btn = document.getElementById("bhReplay");
  var started = false;

  // The word and the red swash are revealed with a left-to-right wipe, then hold.
  function paint() {
    hero.classList.remove("is-painted", "is-painting");
    void hero.offsetWidth;
    hero.classList.add("is-painting");
    var done = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 2300;
    setTimeout(function () { hero.classList.remove("is-painting"); hero.classList.add("is-painted"); }, done);
  }
  btn.addEventListener("click", paint);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { if (en[0].isIntersecting && !started) { started = true; paint(); } }, { threshold: 0.3 }).observe(hero);
  } else paint();
})();
