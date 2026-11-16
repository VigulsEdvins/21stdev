(function () {
  var root = document.querySelector('.so');
  if (!root) return;

  var ups = root.querySelectorAll('.so-up');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    ups.forEach(function (el) { io.observe(el); });
  } else ups.forEach(function (el) { el.classList.add('is-in'); });

  // Concierge pill appears after the first screen.
  var c = root.querySelector('.so-concierge');
  function onScroll() { c.classList.toggle('is-on', window.scrollY > 200); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Carousel: one card (440 + 40 gap) per click, stops at the ends.
  var track = root.querySelector('.so-ctrack'), i = 0;
  root.querySelectorAll('.so-arrows button').forEach(function (b) {
    b.addEventListener('click', function () {
      var max = Math.max(0, track.children.length - Math.floor(track.parentNode.clientWidth / 480));
      i = Math.min(max, Math.max(0, i + +b.dataset.go));
      track.style.transform = 'translateX(' + (-480 * i) + 'px)';
    });
  });
})();
