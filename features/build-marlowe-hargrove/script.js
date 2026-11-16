(function () {
  var root = document.querySelector('.mh');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  var nav = root.querySelector('.mh-nav') || root.querySelector('.mh-top');
  var last = window.scrollY;

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
    var ap = root.querySelector('.mh-ap').getBoundingClientRect(), span = ap.height - window.innerHeight;
    var p = reduce ? 1 : Math.min(1, Math.max(0, -ap.top / span));
    root.style.setProperty('--p', p.toFixed(3));
    last = window.scrollY;
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Scroll reveals.
  var items = root.querySelectorAll('[data-r]');
  if (!('IntersectionObserver' in window) || reduce) items.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    items.forEach(function (e) { io.observe(e); });
  }
  // Red progress bar follows the first card slider.
  var sl = root.querySelector('.mh-slider'), bar = root.querySelector('.mh-prog i');
  sl.addEventListener('scroll', function () { bar.style.width = (33.33 + 66.67 * sl.scrollLeft / Math.max(1, sl.scrollWidth - sl.clientWidth)) + '%'; }, { passive: true });
})();
