(function () {
  var head = document.getElementById("sfHead"), host = head.querySelector(".sf-word"), list = document.getElementById("sfList");
  var text = head.getAttribute("aria-label"), k = 0;
  text.split(" ").forEach(function (word) {
    var w = document.createElement("span"); w.className = "sf-w";
    word.split("").forEach(function (ch, i) {
      var l = document.createElement("span"); l.className = "sf-l";
      l.style.setProperty("--s", 1); l.style.setProperty("--k", k++);
      l.innerHTML = "<i>" + ch + "</i><i>" + ch + "</i>"; w.appendChild(l);
    });
    host.appendChild(w);
  });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { head.classList.add("is-in"); io.disconnect(); } }); }, { threshold: 0.3 });
    io.observe(head);
  } else head.classList.add("is-in");

  list.addEventListener("click", function (e) {
    var b = e.target.closest(".sf-q"); if (!b) return;
    var open = b.getAttribute("aria-expanded") === "true";
    list.querySelectorAll(".sf-q").forEach(function (x) {
      var on = x === b && !open;
      x.setAttribute("aria-expanded", on ? "true" : "false");
      document.getElementById(x.getAttribute("aria-controls")).classList.toggle("is-open", on);
    });
  });
  var first = list.querySelector(".sf-q"); if (first) first.click();
})();
