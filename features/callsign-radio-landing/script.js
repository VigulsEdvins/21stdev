(function () {
  var root = document.querySelector('.rl-page');
  var meter = root.querySelector('.rl-meter');
  var letters = root.querySelectorAll('.rl-letter');
  var btn = root.querySelector('.rl-play');
  var label = root.querySelector('.rl-play-text');
  var N = 32, bars = [], playing = false, t = 0, raf = 0, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (var i = 0; i < N; i++) { var b = document.createElement('i'); if (i > N * 0.82) b.className = 'hot'; meter.appendChild(b); bars.push(b); }
  function level(k) { return Math.max(0, Math.min(1, 0.5 + 0.28 * Math.sin(t * 2.1 + k * 1.7) + 0.2 * Math.sin(t * 5.3 + k * 0.6) + 0.08 * Math.random())); }
  function paint(on) {
    var l = on ? level(0) : 0;
    for (var i = 0; i < N; i++) bars[i].classList.toggle('on', on && i / N < l);
    letters.forEach(function (el, k) { el.style.setProperty('--lvl', on ? Math.round(level(k + 1) * 100) + '%' : '0%'); });
  }
  function frame() { t += 0.05; paint(true); if (!reduce) raf = requestAnimationFrame(frame); }
  function start() { cancelAnimationFrame(raf); if (reduce) { paint(true); return; } frame(); }
  btn.addEventListener('click', function () {
    playing = !playing;
    btn.setAttribute('aria-pressed', playing);
    label.textContent = playing ? 'Pause' : 'Listen live';
    if (playing && visible) start(); else { cancelAnimationFrame(raf); paint(false); }
  });
  new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    if (!visible) cancelAnimationFrame(raf); else if (playing) start();
  }).observe(root);
  paint(false);
})();
