(function () {
  var stage = document.querySelector('.ft-stage');
  var counts = document.querySelectorAll('.ft-count');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fmt(n, el) { return (el.dataset.prefix || '') + n.toLocaleString('en-US'); }
  function run() {
    stage.classList.add('is-in');
    Array.prototype.forEach.call(counts, function (el) {
      var to = +el.dataset.to, t0 = performance.now();
      if (reduce) { el.textContent = fmt(to, el); return; }
      (function step(now) {
        var p = Math.min(1, (now - t0) / 1400);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))), el);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .3 });
    io.observe(stage);
  } else run();
  var tg = document.querySelectorAll('.ft-tg'), amt = document.getElementById('ftAmt'), per = document.getElementById('ftPer');
  Array.prototype.forEach.call(tg, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(tg, function (o) { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', o === b); });
      amt.textContent = b.dataset.p; per.textContent = 'per ' + b.dataset.l;
    });
  });
})();
