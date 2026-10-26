(function () {
  var stage = document.getElementById('ffStage'), strip = document.getElementById('ffStrip'), text = document.getElementById('ffText');
  var data = [
    ['#ff9a5a', '#7a2cff', '#1b1340', 'Ember'], ['#5ae0c8', '#1d6bff', '#06162e', 'Tide'], ['#ffe27a', '#ff5a7e', '#2a0d2b', 'Dusk'],
    ['#b9ff7a', '#14a38a', '#04201e', 'Moss'], ['#ffb3e6', '#6a5cff', '#12103a', 'Orchid'], ['#ffd0a0', '#e5483b', '#2b0a0a', 'Clay'],
    ['#9fd8ff', '#3a4bd6', '#0a0e30', 'Frost'], ['#f4ff9a', '#ff8a1f', '#2b1503', 'Solar'], ['#d6b3ff', '#00b3a4', '#07211f', 'Lagoon']
  ];
  var n = data.length, cards = [], pos = 0, goal = 0, raf = 0, visible = true, drag = false, lx = 0, sx = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  data.forEach(function (d, i) {
    var li = document.createElement('li'); li.className = 'ff-card';
    li.style.setProperty('--a', d[0]); li.style.setProperty('--b', d[1]); li.style.setProperty('--c', d[2]);
    li.dataset.n = ('0' + (i + 1)).slice(-2); strip.appendChild(li); cards.push(li);
    li.addEventListener('click', function () { if (Math.abs(sx - lx) < 6) set(i); });
  });
  function layout() {
    var w = cards[0].offsetWidth, gap = 14, step = 22;
    cards.forEach(function (c, i) {
      var d = i - pos, ad = Math.abs(d), s = d < 0 ? -1 : 1, f = Math.min(ad, 1);
      var x = s * (f * (w * 0.5 + gap) + Math.max(0, ad - 1) * step);
      var ry = -s * f * 80, z = -f * 60;
      c.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateZ(' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(1) + 'deg)';
      c.style.zIndex = String(100 - Math.round(ad * 10));
      c.style.opacity = ad > 6 ? 0 : 1; c.classList.toggle('is-c', ad < 0.5);
    });
  }
  function tick() {
    raf = 0; pos += (goal - pos) * (reduce ? 1 : 0.14);
    if (Math.abs(goal - pos) < 0.001) pos = goal;
    layout();
    if (visible && pos !== goal) raf = requestAnimationFrame(tick);
  }
  function set(i) { goal = Math.max(0, Math.min(n - 1, Math.round(i))); text.textContent = 'Frame ' + ('0' + (goal + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2) + ' · ' + data[goal][3]; if (!raf) raf = requestAnimationFrame(tick); }
  document.getElementById('ffPrev').addEventListener('click', function () { set(goal - 1); });
  document.getElementById('ffNext').addEventListener('click', function () { set(goal + 1); });
  stage.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { set(goal + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { set(goal - 1); e.preventDefault(); } });
  stage.addEventListener('pointerdown', function (e) { drag = true; sx = lx = e.clientX; });
  stage.addEventListener('pointermove', function (e) { if (!drag) return; lx = e.clientX; });
  function up() { if (!drag) return; drag = false; var dx = lx - sx; if (Math.abs(dx) > 40) set(goal + (dx < 0 ? 1 : -1)); }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  window.addEventListener('resize', layout);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(stage);
  pos = goal = 4; set(4); layout();
})();
