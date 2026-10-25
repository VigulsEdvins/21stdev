(function () {
  var stage = document.getElementById("mqStage");
  var slides = Array.prototype.slice.call(stage.querySelectorAll(".mq-slide"));
  var dotsBox = document.getElementById("mqDots");
  var num = document.getElementById("mqNum"), lab = document.getElementById("mqLab");
  var i = 0, timer = 0;

  var dots = slides.map(function (_, n) {
    var d = document.createElement("button");
    d.type = "button"; d.className = "mq-dot"; d.setAttribute("aria-label", "Quote " + (n + 1));
    d.addEventListener("click", function () { go(n); restart(); });
    dotsBox.appendChild(d);
    return d;
  });
  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle("is-current", k === i); s.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
    num.textContent = slides[i].dataset.metric;
    lab.textContent = slides[i].dataset.label;
  }
  function restart() {
    clearInterval(timer);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(function () { go(i + 1); }, 6000);
  }
  document.getElementById("mqPrev").addEventListener("click", function () { go(i - 1); restart(); });
  document.getElementById("mqNext").addEventListener("click", function () { go(i + 1); restart(); });
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { go(i + 1); restart(); }
    if (e.key === "ArrowLeft") { go(i - 1); restart(); }
  });
  stage.addEventListener("mouseenter", function () { clearInterval(timer); });
  stage.addEventListener("mouseleave", restart);
  go(0); restart();
})();
