(function () {
  var links = document.querySelectorAll('.cs-link');
  var secs = [].map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a, i) { a.classList.toggle('is-on', secs[i] === e.target); });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    secs.forEach(function (s) { if (s) io.observe(s); });
  }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.cs-count b').forEach(function (el) {
    if (reduce) return;
    var to = +el.dataset.n, t0 = performance.now();
    (function tick(t) {
      var p = Math.min(1, (t - t0) / 1100);
      el.textContent = Math.round(to * p * (2 - p));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
})();
