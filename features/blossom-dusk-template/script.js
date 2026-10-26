(function () {
  var page = document.getElementById("tgPage");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var box = document.getElementById("tgPetals");
  var tints = ["#ffd9e6", "#ffc0d6", "#fff0f5", "#ffb3cc"];
  for (var i = 0; i < 18; i++) {
    var p = document.createElement("span");
    p.className = "tg-petal";
    p.style.left = Math.round(Math.random() * 100) + "%";
    p.style.background = tints[i % tints.length];
    p.style.setProperty("--dx", Math.round(Math.random() * 160 - 40) + "px");
    p.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + "s";
    p.style.animationDelay = (-Math.random() * 18).toFixed(1) + "s";
    box.appendChild(p);
  }
  var hero = page.querySelector(".tg-hero");
  if ("IntersectionObserver" in window && !reduce) {
    new IntersectionObserver(function (e) {
      box.style.visibility = e[0].isIntersecting ? "visible" : "hidden";
    }).observe(hero);
  }
  var burger = page.querySelector(".tg-burger"), menu = document.getElementById("tgMenu");
  burger.addEventListener("click", function () {
    var open = menu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { menu.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
  });
  if (!reduce) {
    var chips = page.querySelectorAll("#tgChips li"), n = 0;
    setInterval(function () {
      chips.forEach(function (c) { c.classList.remove("is-lit"); });
      chips[n % chips.length].classList.add("is-lit");
      n++;
    }, 1100);
  }
})();
