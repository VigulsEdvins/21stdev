(function () {
  // Count the numbers up once when the stats scroll into view.
  var nums = document.querySelectorAll('.hl-stats dd[data-count]');
  if (!nums.length || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function run(el) {
    var target = Number(el.getAttribute('data-count'));
    var t0 = performance.now(), dur = 1100;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  nums.forEach(function (n) { n.textContent = '0'; io.observe(n); });
})();
