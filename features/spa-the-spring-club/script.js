(function () {
  var root = document.querySelector('.ts');
  if (!root) return;

  // Card sliders: arrows move one card (340 + 40), stop at the ends.
  root.querySelectorAll('[data-slider]').forEach(function (sec) {
    var track = sec.querySelector('.ts-track'), i = 0;
    sec.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () {
        var visible = Math.max(1, Math.floor(sec.clientWidth / 380));
        i = Math.max(0, Math.min(track.children.length - visible, i + +b.dataset.d));
        track.style.transform = 'translateX(' + (-380 * i) + 'px)';
      });
    });
  });

  // Testimonials: 1 s cross-fade (tiny-slider "fade" mode), every 6 s or on click.
  var qs = root.querySelectorAll('.ts-q'), q = 0;
  function show(n) { qs[q].classList.remove('is-on'); q = (n + qs.length) % qs.length; qs[q].classList.add('is-on'); }
  root.querySelectorAll('[data-q]').forEach(function (b) { b.addEventListener('click', function () { show(q + +b.dataset.q); }); });
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(function () { show(q + 1); }, 6000);

  var ups = root.querySelectorAll('.ts-up');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    ups.forEach(function (el) { io.observe(el); });
  } else ups.forEach(function (el) { el.classList.add('is-in'); });
})();
