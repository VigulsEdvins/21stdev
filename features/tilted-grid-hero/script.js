(function () {
  var stage = document.getElementById('cgStage');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.cg-card'));
  var n = cards.length, pos = 0, vel = 0, dragging = false, lastX = 0, visible = true, raf = 0;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function layout() {
    var w = stage.clientWidth, gap = Math.min(w * 0.3, 300);
    cards.forEach(function (c, i) {
      var d = ((i - pos) % n + n * 1.5) % n - n / 2; // wrapped distance from centre
      var ad = Math.abs(d);
      var x = d * gap;
      var rot = Math.max(-1.6, Math.min(1.6, d)) / 1.6 * 38;
      var z = -Math.pow(ad, 1.6) * 70;
      var y = Math.pow(ad, 2) * 10;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + (-rot).toFixed(1) + 'deg)';
      c.style.opacity = Math.max(0, 1 - Math.pow(ad / 2.6, 2)).toFixed(3);
      c.style.zIndex = String(100 - Math.round(ad * 10));
    });
  }
  function tick() {
    raf = 0;
    if (!dragging) { vel += ((still ? 0 : 0.006) - vel) * 0.06; }
    pos += vel; layout();
    if (visible && (!still || Math.abs(vel) > 0.0004)) raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  stage.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; stage.classList.add('is-drag'); stage.setPointerCapture(e.pointerId); start(); });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    vel = -dx / (stage.clientWidth * 0.3); pos += vel; layout();
  });
  function up() { dragging = false; stage.classList.remove('is-drag'); start(); }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  window.addEventListener('resize', layout);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(stage);
  layout(); start();
})();
