(function () {
  var root = document.querySelector('.sx');
  if (!root) return;

  // Scroll reveal (revealUp keyframes run once when 10% visible).
  var items = root.querySelectorAll('.sx-reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('is-in'); });

  // Sun on the opening-hours arc: 8:00 = start, 23:30 = end, clamped outside opening hours.
  var path = root.querySelector('#sx-path'), sun = root.querySelector('.sx-sun');
  if (path && sun) {
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
    var t = Math.min(1, Math.max(0, (mins - 480) / (1410 - 480)));
    var pt = path.getPointAtLength(path.getTotalLength() * t);
    sun.setAttribute('cx', pt.x); sun.setAttribute('cy', pt.y);
    var day = root.querySelector('[data-day]');
    if (day) day.textContent = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' • Riverside';
  }
})();
