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

  // Pins the section while the page scrolls past it and reports how far through (0 to 1) the visitor is,
  // so the animation plays through with the page scroll
  function pinRunway(el, screens, onProgress) {
    var run = document.createElement('div');
    run.style.cssText = 'position:relative;height:' + screens * 100 + 'vh';
    var pin = document.createElement('div');
    pin.style.cssText = 'position:sticky;top:0;height:100vh;display:grid;grid-template-columns:minmax(0,1fr);align-items:center';
    el.parentNode.insertBefore(run, el); run.appendChild(pin); pin.appendChild(el);
    el.style.alignSelf = 'stretch'; // fill the pinned screen
    function update() {
      var r = run.getBoundingClientRect(), total = r.height - window.innerHeight;
      onProgress(total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  pinRunway(document.getElementById("sfSec"), 3, function (v) {
    var qs = list.querySelectorAll(".sf-q"), i = Math.min(qs.length - 1, Math.floor(v * qs.length));
    if (qs[i] && qs[i].getAttribute("aria-expanded") !== "true") qs[i].click();
  });
})();
