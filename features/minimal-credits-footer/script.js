(function () {
  var top = document.getElementById('mcfTop');
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
    var first = document.querySelector('.mcf-page h1');
    if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
  });
})();
