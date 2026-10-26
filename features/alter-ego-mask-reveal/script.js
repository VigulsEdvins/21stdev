(function () {
  var stage = document.getElementById('aeStage');
  var hero = document.getElementById('aeHero');
  if (!stage || !hero) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LIFE = 1100;     // ms a trail point lasts
  var MAX = 56;
  var points = [];
  var raf = 0, hover = false;

  function addPoint(x, y) {
    var last = points[points.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) < 6) { last.t = performance.now(); return; }
    points.push({ x: x, y: y, t: performance.now() });
    if (points.length > MAX) points.shift();
    start();
  }

  function render() {
    raf = 0;
    var now = performance.now();
    points = points.filter(function (p) { return now - p.t < LIFE; });
    var layers = points.map(function (p, i) {
      var age = (now - p.t) / LIFE;
      var r = 80 * Math.pow(1 - age, 0.7) + 6;
      if (i === points.length - 1 && hover) r = Math.max(r, 80);
      return 'radial-gradient(circle at ' + p.x.toFixed(0) + 'px ' + p.y.toFixed(0) + 'px, #000 ' + (r * 0.72).toFixed(0) + 'px, transparent ' + r.toFixed(0) + 'px)';
    });
    var img = layers.length ? layers.join(',') : 'radial-gradient(circle at -200px -200px, #000 0, #000 1px, transparent 2px)';
    hero.style.webkitMaskImage = img;
    hero.style.maskImage = img;
    if (points.length) raf = requestAnimationFrame(render);
  }
  function start() { if (!raf) raf = requestAnimationFrame(render); }

  stage.addEventListener('pointermove', function (e) {
    var r = stage.getBoundingClientRect();
    hover = true;
    addPoint(e.clientX - r.left, e.clientY - r.top);
  });
  stage.addEventListener('pointerleave', function () { hover = false; });
  stage.addEventListener('pointerdown', function (e) {
    var r = stage.getBoundingClientRect();
    addPoint(e.clientX - r.left, e.clientY - r.top);
  });

  // without a pointer (or with reduced motion) show a small reveal so the idea is visible
  if (reduce) {
    var r0 = stage.getBoundingClientRect();
    hero.style.maskImage = hero.style.webkitMaskImage =
      'radial-gradient(circle at ' + (r0.width / 2) + 'px ' + (r0.height * 0.45) + 'px, #000 70px, transparent 100px)';
  } else {
    // a short intro sweep so the effect is visible before any interaction
    var t0 = performance.now();
    (function intro() {
      var s = stage.getBoundingClientRect();
      var k = (performance.now() - t0) / 1400;
      if (k > 1 || hover) return;
      addPoint(s.width * (0.3 + 0.4 * k), s.height * (0.55 - 0.15 * Math.sin(k * Math.PI)));
      requestAnimationFrame(intro);
    })();
  }
})();
