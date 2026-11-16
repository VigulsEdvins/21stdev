(function () {
  var root = document.querySelector('.il');
  if (!root) return;
  // Sections fade and rise once when they enter the viewport.
  var secs = root.querySelectorAll('.il-sec');
  if (!('IntersectionObserver' in window)) { secs.forEach(function (s) { s.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  secs.forEach(function (s) { io.observe(s); });
})();
