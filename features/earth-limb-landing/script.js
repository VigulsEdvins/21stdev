(function () {
  var burger = document.getElementById('olBurger');
  var links = document.getElementById('olLinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nums = document.querySelectorAll('.ol-stats b');
  function count(el) {
    var to = +el.dataset.n, t0 = performance.now();
    if (reduce) return;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { count(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }
})();
