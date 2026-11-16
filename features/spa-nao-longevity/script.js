(function () {
  var root = document.querySelector('.na');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header turns solid after the hero starts to scroll away.
  var head = root.querySelector('.na-head');

  // Hero slideshow: 7 s per slide.
  var slides = root.querySelectorAll('.na-slides img'), dots = root.querySelectorAll('.na-dots i'), s = 0;
  if (!reduce) setInterval(function () {
    slides[s].classList.remove('is-on'); dots[s].classList.remove('is-on');
    s = (s + 1) % slides.length;
    slides[s].classList.add('is-on'); dots[s].classList.add('is-on');
  }, 7000);

  // Counters count up when shown.
  function count(el) {
    var end = +el.dataset.count, t0 = null;
    function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }
    if (reduce) el.textContent = end; else requestAnimationFrame(step);
  }

  // AOS-style reveal, title lines and counters.
  var items = root.querySelectorAll('.na-aos, .na-line, [data-count]');
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      if (e.target.dataset.count) count(e.target); else e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  items.forEach(function (el) { if (io) io.observe(el); else { el.classList.add('is-in'); if (el.dataset.count) el.textContent = el.dataset.count; } });

  // Programme filters dim the cards that do not match.
  var btns = root.querySelectorAll('.na-filters button'), cards = root.querySelectorAll('.na-cards article');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      cards.forEach(function (c) { c.classList.toggle('is-off', b.dataset.f !== 'all' && c.dataset.tag !== b.dataset.f); });
    });
  });

  // Scroll-linked effects: clip-path wipe (scrub) and pinned destinations.
  var scrub = root.querySelector('.na-scrub'), dark = root.querySelector('.na-scrub-dark');
  var pin = root.querySelector('.na-pin'), sticky = root.querySelector('.na-sticky');
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function onScroll() {
    head.classList.toggle('is-solid', window.scrollY > 60);
    var vh = window.innerHeight;
    var r = scrub.getBoundingClientRect();
    var k = clamp((vh - r.top) / (vh + r.height));       // start: top bottom, end: bottom top
    dark.style.setProperty('--clip', (100 - k * 100).toFixed(2) + '%');
    var pr = pin.getBoundingClientRect();
    var p = clamp(-pr.top / (pr.height - vh)) * 2;        // 0..2 across three places
    sticky.style.setProperty('--p', p.toFixed(3));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
