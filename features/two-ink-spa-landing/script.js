(function () {
  var page = document.querySelector('.sh-page');
  var opts = page.querySelectorAll('.sh-opt');
  var deg = page.querySelector('.sh-deg');
  var cur = 86, raf = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tween(to) {
    cancelAnimationFrame(raf);
    if (reduce) { cur = to; deg.textContent = cur; return; }
    (function step() {
      cur += (to - cur) * 0.12;
      if (Math.abs(to - cur) < 0.5) cur = to;
      deg.textContent = Math.round(cur);
      if (cur !== to) raf = requestAnimationFrame(step);
    })();
  }
  opts.forEach(function (b) {
    b.addEventListener('click', function () {
      var mode = b.dataset.mode;
      page.dataset.mode = mode;
      opts.forEach(function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); });
      tween(mode === 'hot' ? 86 : 4);
    });
  });
})();
