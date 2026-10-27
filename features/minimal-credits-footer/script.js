(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.mcf-demo'), function (root) {
  var top = root.querySelector('.mcf-top');
  if (!top) return;
  function y() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  // shown once the reader is well into the page; short pages that barely scroll never need it
  function update() {
    var range = document.documentElement.scrollHeight - window.innerHeight;
    top.hidden = range < 120 || y() < Math.min(240, range * 0.5);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
  top.addEventListener('click', function () {
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    var first = root.querySelector('.mcf-page h1');
    if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
  });
  });
})();
