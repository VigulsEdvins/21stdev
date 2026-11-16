(function () {
  var root = document.querySelector('.ki');
  if (!root) return;
  var nav = root.querySelector('.ki-nav'), band = root.querySelector('.ki-band'), bandImg = band.querySelector('img');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    if (reduce) return;
    // Slow parallax on the wide photo band.
    var r = band.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) bandImg.style.setProperty('--py', (-(window.innerHeight - r.top) * 0.12) + 'px');
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Full-screen menu.
  var btn = root.querySelector('.ki-burger'), menu = root.querySelector('.ki-menu');
  btn.addEventListener('click', function () {
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) btn.click(); });
})();
