(function () {
  var root = document.querySelector('.kn');
  if (!root) return;
  // Feature columns and the phone card rise in once.
  var items = root.querySelectorAll('.kn-rise');
  if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e, k) {
      if (!e.isIntersecting) return;
      e.target.style.transitionDelay = (k * 0.12) + 's';
      e.target.classList.add('is-in'); io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  items.forEach(function (el) { io.observe(el); });
})();
