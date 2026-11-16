(function () {
  var root = document.querySelector('.tw');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  var nav = root.querySelector('.tw-nav'), last = window.scrollY;
  function onScroll() {
    if (nav) { nav.classList.toggle('is-scrolled', window.scrollY > 40); nav.classList.toggle('is-hidden', window.scrollY > last && window.scrollY > 500); }
    last = window.scrollY;
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var items = root.querySelectorAll('[data-r]');
  if (!('IntersectionObserver' in window) || reduce) items.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    items.forEach(function (e) { io.observe(e); });
  }
})();
