(function () {
  var root = document.querySelector('.nb');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  var nav = root.querySelector('.nb-nav') || root.querySelector('.nb-top');
  var last = window.scrollY;
  var steps = [].slice.call(root.querySelectorAll('.nb-steps p')), dots = [].slice.call(root.querySelectorAll('.nb-dots li'));

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 40);
    nav.classList.toggle('is-hidden', window.scrollY > last && window.scrollY > 300);
    var st = root.querySelector('.nb-story').getBoundingClientRect(), sp = Math.min(1, Math.max(0, -st.top / (st.height - window.innerHeight)));
    root.style.setProperty('--sp', sp.toFixed(3));
    var i = Math.min(steps.length - 1, Math.floor(sp * steps.length));
    steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
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
})();
