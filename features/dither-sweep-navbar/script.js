(function () {
  Array.prototype.forEach.call(document.querySelectorAll(".dn-demo"), function (root, rn) {
  var head = root.querySelector(".dn-head"), burger = root.querySelector(".dn-burger"), nav = root.querySelector(".dn-nav");
  nav.id = "dn-nav-" + rn; burger.setAttribute("aria-controls", nav.id);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], CELL = 6;

  // each link owns a canvas that paints an ordered-dither sweep: columns fill left to right, bayer noise breaks the edge
  function Sweep(link) {
    var cv = link.querySelector("canvas"), x = cv.getContext("2d"), prog = 0, target = 0, raf = 0, last = 0, cols = 0, rows = 0;
    function size() {
      var w = link.offsetWidth, h = link.offsetHeight; cols = Math.ceil(w / CELL); rows = Math.ceil(h / CELL);
      cv.width = cols; cv.height = rows; draw();
    }
    function draw() {
      x.clearRect(0, 0, cols, rows); x.fillStyle = getComputedStyle(link.parentNode.parentNode).getPropertyValue("--dn-hot").trim() || "#c6f432";
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var th = (c / cols) * 0.72 + (BAYER[(r % 4) * 4 + (c % 4)] / 16) * 0.28;
        if (prog > th) x.fillRect(c, r, 1, 1);
      }
      link.classList.toggle("is-full", prog > 0.55);
    }
    function step(now) {
      var dt = Math.min(48, now - last); last = now;
      var d = target - prog, v = dt / (reduce ? 1 : 260);
      prog = Math.abs(d) <= v ? target : prog + Math.sign(d) * v; draw();
      raf = prog === target ? 0 : requestAnimationFrame(step);
    }
    function go(t) { target = t; if (!cols || cols !== Math.ceil(link.offsetWidth / CELL)) size(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }
    link.addEventListener("pointerenter", function () { go(1); });
    link.addEventListener("pointerleave", function () { go(0); });
    link.addEventListener("focus", function () { go(1); });
    link.addEventListener("blur", function () { go(0); });
    if ("ResizeObserver" in window) new ResizeObserver(function () { if (!raf) size(); }).observe(link);
  }
  Array.prototype.forEach.call(nav.querySelectorAll(".dn-link"), Sweep);

  function onScroll() { head.classList.toggle("is-compact", root.scrollTop > 40); }
  root.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  function set(open) { burger.setAttribute("aria-expanded", open ? "true" : "false"); nav.classList.toggle("is-open", open); }
  burger.addEventListener("click", function () { set(burger.getAttribute("aria-expanded") !== "true"); });
  root.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  });
})();
