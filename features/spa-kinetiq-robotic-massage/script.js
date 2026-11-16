(function () {
  var root = document.querySelector('.kq');
  if (!root) return;
  // Appear on scroll (fade + rise) and grow the chart bars, once.
  var items = root.querySelectorAll('.kq-reveal, .kq-tile--chart');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
