(function () {
  var root = document.querySelector('.td');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  var nav = root.querySelector('.td-nav') || root.querySelector('.td-top');
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
  // Hero messages: a lime bar fills over 6 s, then the next message; the II button pauses.
  var hero = root.querySelector('.td-hero'), slides = [].slice.call(hero.querySelectorAll('.td-slide')), pp = hero.querySelector('.td-pp'), cur = 0, timer, paused = reduce;
  function show(i) { cur = (i + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('is-on', k === cur); }); hero.classList.remove('run'); void hero.offsetWidth; if (!paused) hero.classList.add('run'); }
  function tick() { clearInterval(timer); if (!paused) timer = setInterval(function () { show(cur + 1); }, 6000); }
  pp.addEventListener('click', function () { paused = !paused; pp.textContent = paused ? '\u25B6' : 'II'; pp.setAttribute('aria-label', paused ? 'Play slides' : 'Pause slides'); show(cur); tick(); });
  var up = root.querySelector('.td-up'); up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  show(0); tick();
})();
