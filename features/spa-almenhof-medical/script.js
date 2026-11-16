(function () {
  var root = document.querySelector('.ah');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header tone follows the section under it: dark over the hero, light elsewhere.
  var head = root.querySelector('.ah-head');
  var hero = root.querySelector('.ah-hero');
  function tone() { head.dataset.tone = hero.getBoundingClientRect().bottom > 40 ? 'dark' : 'light'; }
  window.addEventListener('scroll', tone, { passive: true }); tone();

  // Thirteen paths wheel: active item is 28px and full ink; neighbours step down 22/18/16px.
  var texts = [
    'A classic cure for regeneration and energy: the foundation of everything we do.',
    'Precise diagnostics and focused therapies to slow biological ageing.',
    'Lasting weight balance through medical knowledge and good food.',
    'A guided way to calm the stress response and build resilience.',
    'Bringing back deep, restoring sleep with modern sleep medicine.',
    'Rebuilding strength and energy before and after surgery.',
    'Bringing the immune system back into balance by addressing long-term inflammation, underlying imbalances and stress from your surroundings.',
    'Understanding and protecting how your brain works, at every age.',
    'Care for hormonal and gender-specific health questions.',
    'Better physical performance and faster recovery, measured.',
    'Rest beyond classic wellness, combined with gentle medicine.',
    'Supporting your natural look with medical aesthetics.',
    'Finding your inner balance again through calm practices.'
  ];
  var items = root.querySelectorAll('.ah-wheel button');
  var imgs = root.querySelectorAll('.ah-paths-img img');
  var text = root.querySelector('.ah-path-text');
  var sizes = [28, 22, 18, 16], alpha = [1, .78, .55, .35];
  var cur = 6;
  function setWheel(i) {
    cur = (i + items.length) % items.length;
    items.forEach(function (b, j) {
      var d = j - cur, a = Math.min(3, Math.abs(d));
      var y = 0, k;
      for (k = 0; k < Math.abs(d); k++) y += (sizes[Math.min(3, k)] + sizes[Math.min(3, k + 1)]) / 2 * 1.3 + 16;
      b.style.setProperty('--y', (d < 0 ? -y : y) + 'px');
      b.style.setProperty('--fs', sizes[a] + 'px');
      b.style.setProperty('--a', alpha[a]);
      b.classList.toggle('is-on', d === 0);
      b.setAttribute('aria-selected', d === 0);
    });
    imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === cur % imgs.length); });
    text.style.opacity = 0;
    setTimeout(function () { text.textContent = texts[cur]; text.style.opacity = 1; }, 350);
  }
  items.forEach(function (b, j) { b.addEventListener('click', function () { setWheel(j); }); });
  var wheel = root.querySelector('.ah-wheel'), lock = 0;
  wheel.addEventListener('wheel', function (e) {
    var now = Date.now();
    if (now - lock < 450) { e.preventDefault(); return; }
    var next = cur + (e.deltaY > 0 ? 1 : -1);
    if (next < 0 || next >= items.length) return;   // let the page scroll at the ends
    e.preventDefault(); lock = now; setWheel(next);
  }, { passive: false });
  setWheel(cur);
  if (!reduce) setInterval(function () { if (!wheel.matches(':hover')) setWheel(cur + 1); }, 4500);

  // Awards slider with progress bar.
  var track = root.querySelector('.ah-award-track'), bar = root.querySelector('.ah-bar b'), a = 0, n = track.children.length;
  root.querySelectorAll('.ah-awards-ctl button').forEach(function (b) {
    b.addEventListener('click', function () {
      a = Math.max(0, Math.min(n - 1, a + +b.dataset.a));
      track.style.transform = 'translateX(' + (-172 * a) + 'px)';
      bar.style.setProperty('--k', (a + 1) / n);
    });
  });

  // Soft entrance for titles and text blocks.
  var reveal = root.querySelectorAll('.ah-split .ah-title, .ah-panel-bot p, .ah-places-t, .ah-places-p p, .ah-ask > *');
  reveal.forEach(function (el) { el.classList.add('ah-reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    reveal.forEach(function (el) { io.observe(el); });
  } else reveal.forEach(function (el) { el.classList.add('is-in'); });
})();
