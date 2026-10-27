(function () {
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var clock = document.querySelector('[data-hn-clock]');
  var dd = document.querySelector('[data-hn-d]'), hh = document.querySelector('[data-hn-h]'), mm = document.querySelector('[data-hn-m]');
  var target = Date.now() + (12 * 24 + 5) * 3600 * 1000;
  function tick() {
    var d = new Date();
    clock.textContent = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
    var left = Math.max(0, target - Date.now()) / 60000 | 0;
    dd.textContent = pad(Math.floor(left / 1440));
    hh.textContent = pad(Math.floor(left % 1440 / 60));
    mm.textContent = pad(left % 60);
  }
  tick(); setInterval(tick, 1000);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-hn-count]').forEach(function (el) {
    var to = +el.getAttribute('data-hn-count');
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = to; return; }
    new IntersectionObserver(function (e, io) {
      if (!e[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function step(t) {
        var p = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }).observe(el);
  });

  document.querySelectorAll('.hn-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });
})();
