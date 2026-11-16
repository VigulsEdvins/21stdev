(function () {
  var root = document.querySelector('.wx');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  var nav = root.querySelector('.wx-nav') || root.querySelector('.wx-top');
  var last = window.scrollY;

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
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
  // Auto-rotating slides; dots/arrows jump, reduced motion keeps the first slide.
  var slides = [].slice.call(root.querySelectorAll('.wx-quotes figure')), dots = [], cur = 0, timer;
  function show(i) { cur = (i + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('is-on', k === cur); }); dots.forEach(function (d, k) { d.classList.toggle('is-on', k === cur); }); }
  function play() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(cur + 1); }, 5000); }
  dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); play(); }); });
  play();
})();
