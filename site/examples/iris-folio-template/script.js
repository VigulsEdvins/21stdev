(function () {
  // Fade project tiles in as they scroll into view.
  var tiles = document.querySelectorAll('.ar-tile');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  tiles.forEach(function (t, i) {
    t.style.opacity = '0';
    t.style.translate = '0 20px';
    t.style.transition = 'opacity 0.6s ' + (i * 0.08) + 's, translate 0.6s ' + (i * 0.08) + 's, transform 0.3s';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.translate = '0 0';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  tiles.forEach(function (t) { io.observe(t); });
})();
