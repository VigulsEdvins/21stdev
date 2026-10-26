(function () {
  var wrap = document.getElementById('vtWrap');
  var tabs = Array.prototype.slice.call(wrap.querySelectorAll('.vt-tab'));
  var panels = Array.prototype.slice.call(wrap.querySelectorAll('.vt-slide'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = 5000, cur = 0, timer = 0, left = DUR, t0 = 0, paused = false, seen = true;
  wrap.style.setProperty('--vt-dur', DUR + 'ms');
  function show(i, focus) {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      var on = k === cur;
      t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on; panels[k].classList.toggle('is-on', on);
      if (on) { var b = t.querySelector('.vt-bar'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
    });
    if (focus) tabs[cur].focus();
    left = DUR; arm();
  }
  function arm() {
    clearTimeout(timer);
    if (reduce || paused || !seen) return;
    t0 = performance.now(); timer = setTimeout(function () { show(cur + 1); }, left);
  }
  function pause() { if (paused) return; paused = true; left = Math.max(300, left - (performance.now() - t0)); clearTimeout(timer); wrap.classList.add('is-paused'); }
  function resume() { paused = false; wrap.classList.remove('is-paused'); arm(); }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(k); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
    });
  });
  wrap.addEventListener('pointerenter', pause); wrap.addEventListener('pointerleave', resume);
  new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) { wrap.classList.remove('is-paused'); if (!paused) arm(); } else { clearTimeout(timer); wrap.classList.add('is-paused'); left = DUR; } }).observe(wrap);
  if (reduce) { tabs[0].querySelector('.vt-bar').style.display = 'none'; }
  show(0);
})();
