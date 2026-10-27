(function () {
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // sunburst rays
  var rays = document.getElementById("eaRays");
  for (var i = 0; i < 72; i++) {
    var a = (i / 72) * Math.PI * 2, len = i % 3 === 0 ? 520 : 380;
    var l = document.createElementNS(NS, "line");
    l.setAttribute("x1", 600 + Math.cos(a) * 130);
    l.setAttribute("y1", 300 + Math.sin(a) * 130);
    l.setAttribute("x2", 600 + Math.cos(a) * len);
    l.setAttribute("y2", 300 + Math.sin(a) * len);
    rays.appendChild(l);
  }

  // marquee names (duplicated for a seamless loop)
  var names = ["Hollin House", "The Quiet Table", "Oakgrove Inn", "Pell Street Deli", "Saltmarsh Rooms", "Ferrow Gallery"];
  var track = document.getElementById("eaMarq");
  names.concat(names).forEach(function (n) {
    var s = document.createElement("span");
    s.textContent = n;
    track.appendChild(s);
  });

  // pointer drift on the plate
  var plate = document.getElementById("eaPlate");
  var sun = document.getElementById("eaSun");
  if (!reduce) {
    plate.addEventListener("pointermove", function (e) {
      var r = plate.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      sun.style.transform = "translate(" + x * 30 + "px," + y * 18 + "px)";
    });
    plate.addEventListener("pointerleave", function () { sun.style.transform = ""; });
  }

  // reveal on scroll
  var items = document.querySelectorAll(".ea-reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
