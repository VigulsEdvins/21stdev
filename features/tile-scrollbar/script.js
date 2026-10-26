(function () {
  var rail = document.getElementById('ssRail'), tray = document.getElementById('ssTray'), tip = document.getElementById('ssTip');
  var secs = Array.prototype.slice.call(document.querySelectorAll('.ss-article section'));
  var N = 16, stones = [], fills = [], dragging = false;
  rail.tabIndex = 0; rail.setAttribute('role', 'scrollbar'); rail.setAttribute('aria-orientation', 'vertical'); rail.setAttribute('aria-valuemin', 0); rail.setAttribute('aria-valuemax', 100);
  rail.setAttribute('aria-label', 'Page position');

  for (var i = 0; i < N; i++) {
    var s = document.createElement('span'); s.className = 'ss-stone';
    var f = document.createElement('span'); f.className = 'ss-fill'; s.appendChild(f);
    tray.appendChild(s); stones.push(s); fills.push(f);
  }
  function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  function marks() {
    var m = maxScroll();
    stones.forEach(function (s) { s.classList.remove('is-mark'); });
    secs.forEach(function (sec) {
      var y = sec.getBoundingClientRect().top + scrollY;
      stones[Math.min(N - 1, Math.floor(Math.min(1, y / m) * N))].classList.add('is-mark');
    });
  }
  function update() {
    var p = Math.min(1, Math.max(0, scrollY / maxScroll())), pos = p * N, cur = Math.min(N - 1, Math.floor(pos));
    stones.forEach(function (s, i) {
      s.classList.toggle('is-past', i < cur); s.classList.toggle('is-now', i === cur);
      fills[i].style.width = (i < cur ? 100 : i === cur ? (pos - cur) * 100 : 0) + '%';
    });
    rail.setAttribute('aria-valuenow', Math.round(p * 100));
    var idx = 0; secs.forEach(function (sec, k) { if (sec.getBoundingClientRect().top < innerHeight * .4) idx = k; });
    rail.setAttribute('aria-valuetext', secs[idx].dataset.title);
  }
  function fromPointer(e) {
    var r = tray.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return p;
  }
  function showTip(e) {
    var r = rail.getBoundingClientRect(), p = fromPointer(e), best = 0;
    var m = maxScroll(); secs.forEach(function (sec, k) { if ((sec.getBoundingClientRect().top + scrollY) / m <= p + .02) best = k; });
    tip.textContent = secs[best].dataset.title; tip.style.top = Math.min(r.height - 28, Math.max(0, e.clientY - r.top - 14)) + 'px';
  }
  rail.addEventListener('pointerenter', function () { rail.classList.add('is-hot'); });
  rail.addEventListener('pointerleave', function () { if (!dragging) rail.classList.remove('is-hot'); });
  rail.addEventListener('pointermove', function (e) { showTip(e); if (dragging) scrollTo(0, fromPointer(e) * maxScroll()); });
  rail.addEventListener('pointerdown', function (e) {
    dragging = true; rail.setPointerCapture(e.pointerId);
    scrollTo({ top: fromPointer(e) * maxScroll(), behavior: 'auto' });
  });
  function end() { dragging = false; }
  rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end);
  rail.addEventListener('keydown', function (e) {
    var step = innerHeight * .8, k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown') scrollBy({ top: step, behavior: 'smooth' });
    else if (k === 'ArrowUp' || k === 'PageUp') scrollBy({ top: -step, behavior: 'smooth' });
    else if (k === 'Home') scrollTo({ top: 0, behavior: 'smooth' });
    else if (k === 'End') scrollTo({ top: maxScroll(), behavior: 'smooth' });
    else return;
    e.preventDefault();
  });
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', function () { marks(); update(); });
  marks(); update();
})();
