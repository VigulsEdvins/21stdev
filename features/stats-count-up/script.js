(function () {
  var root = document.querySelector('.scu-demo');
  if (!root) return;
  var values = root.querySelectorAll('.scu-value');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function format(v, decimals) {
    return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
  }
  function run(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce || !isFinite(to)) { el.textContent = format(to, decimals) + suffix; return; }
    var start = null;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1400);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(to * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (!('IntersectionObserver' in window)) { values.forEach(run); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  values.forEach(function (v) { io.observe(v); });
})();
