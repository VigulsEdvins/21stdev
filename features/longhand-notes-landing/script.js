(function () {
  var ink = document.getElementById("nbInk");
  var pen = document.getElementById("nbPen");
  var card = document.getElementById("nbCard");
  if (!ink || !pen || !card) return;

  // Build a loopy, cursive-looking scrawl: five lines of a looping trochoid.
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var d = "";
  var lines = 5, left = 44, right = 350, top = 64, gap = 40;
  for (var l = 0; l < lines; l++) {
    var y0 = top + l * gap, span = right - left - (l === lines - 1 ? 150 : rnd() * 30);
    var steps = 150, loopSize = 8 + rnd() * 3, phase = rnd() * 6;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, a = t * 64 + phase;
      var x = left + t * span + Math.sin(a) * loopSize * 0.9;
      var y = y0 - Math.cos(a) * loopSize * (0.9 + 0.7 * Math.sin(t * 17 + l)) - (Math.sin(a * 0.5) > 0.85 ? 8 : 0);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    }
  }
  ink.setAttribute("d", d);
  var total = ink.getTotalLength();
  ink.style.strokeDasharray = total;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DURATION = 11000, HOLD = 2500, start = 0, raf = 0, running = false;

  function draw(p) {
    ink.style.strokeDashoffset = total * (1 - p);
    var pt = ink.getPointAtLength(total * p);
    pen.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ")");
  }
  function frame(now) {
    if (!running) return;
    if (!start) start = now;
    var e = now - start, p = Math.min(e / DURATION, 1);
    draw(p);
    if (e > DURATION + HOLD) start = now;
    raf = requestAnimationFrame(frame);
  }
  function go() { if (running || reduce) return; running = true; start = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (reduce) { draw(1); return; }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { en[0].isIntersecting ? go() : stop(); }).observe(card);
  } else go();
})();
