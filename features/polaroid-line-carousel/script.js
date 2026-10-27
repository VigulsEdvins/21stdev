(function () {
  // The builder can place this carousel on a page more than once: look elements up inside this copy's own section
  var host = window.__activeSectionRegisteringId && document.getElementById(window.__activeSectionRegisteringId);
  var scope = host || document;
  function $(sel) { return scope.querySelector(sel); }
  var line = $('#plLine'), path = $('#plPath');
  if (!line || !path) return;
  var items = Array.prototype.slice.call(scope.querySelectorAll('.pl-print'));
  var nameEl = $('#plName'), countEl = $('#plCount');
  var n = items.length, off = 0, target = 0, vel = 0, sway = items.map(function () { return { a: 0, v: 0 }; });
  var dragging = false, lx = 0, moved = 0, visible = true, raf = 0, t0 = performance.now(), W = 0, H = 0, sag = 70, spacing = 280;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var names = items.map(function (it) { return it.querySelector('b').textContent; });

  function measure() {
    W = line.clientWidth; H = line.clientHeight; sag = Math.min(90, H * 0.2);
    spacing = Math.min(300, Math.max(190, W * 0.26));
    path.setAttribute('d', 'M -20 ' + (H * 0.2) + ' Q ' + (W / 2) + ' ' + (H * 0.2 + sag * 2) + ' ' + (W + 20) + ' ' + (H * 0.2));
  }
  function yAt(x) { var u = x / W; return H * 0.2 + sag * 2 * 2 * u * (1 - u); } // quadratic curve at u
  function render(now) {
    if (!W || !H) { measure(); if (!W || !H) return; }
    var total = n * spacing, breeze = reduce ? 0 : 1;
    items.forEach(function (it, i) {
      var x = ((i * spacing - off) % total + total * 1.5) % total - total / 2 + W / 2;
      var w = it.offsetWidth, cx = x, y = yAt(Math.max(0, Math.min(W, cx)));
      var s = sway[i];
      var k = Math.max(-1, Math.min(1, (cx - W / 2) / W));
      var rest = k * 4 + Math.sin(now / 1100 + i * 1.7) * 1.6 * breeze;
      s.v += (-s.a + rest - vel * 0.9 - s.a * 0) * 0.06; s.v *= 0.9; s.a += s.v;
      it.style.transform = 'translate(' + (cx - w / 2).toFixed(1) + 'px,' + (y + 4).toFixed(1) + 'px) rotate(' + (s.a).toFixed(2) + 'deg)';
      it.style.zIndex = String(Math.round(100 - Math.abs(cx - W / 2) / 10));
    });
    var idx = ((Math.round(off / spacing) % n) + n) % n;
    nameEl.textContent = names[idx]; countEl.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2);
  }
  function loop(now) {
    raf = 0;
    if (!dragging) { off += (target - off) * (reduce ? 1 : 0.1); vel = (target - off) * 0.02; }
    render(now);
    if (visible && !reduce) raf = requestAnimationFrame(loop);
    else if (reduce && Math.abs(target - off) > 0.5) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function snap(i) { target = Math.round(i) * spacing; if (reduce) off = target; kick(); }

  line.addEventListener('pointerdown', function (e) { dragging = true; moved = 0; lx = e.clientX; line.classList.add('is-drag'); line.setPointerCapture(e.pointerId); });
  line.addEventListener('pointermove', function (e) {
    if (!dragging) return; var dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx);
    off -= dx; target = off; vel = -dx * 0.25; kick();
  });
  function up(e) { if (!dragging) return; dragging = false; line.classList.remove('is-drag'); target = off; snap(off / spacing); }
  line.addEventListener('pointerup', up); line.addEventListener('pointercancel', up);
  line.addEventListener('click', function (e) {
    if (moved > 6) return; var it = null; document.elementsFromPoint(e.clientX, e.clientY).some(function (el) { it = el.closest && el.closest('.pl-print'); return it; }); if (!it) return;
    var i = items.indexOf(it); if (i < 0) return; var cur = Math.round(off / spacing), d = (((i - cur) % n) + n * 1.5) % n - n / 2;
    snap(cur + Math.round(d));
  });
  line.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { snap(Math.round(target / spacing) + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { snap(Math.round(target / spacing) - 1); e.preventDefault(); } });
  $('#plPrev').addEventListener('click', function () { snap(Math.round(target / spacing) - 1); });
  $('#plNext').addEventListener('click', function () { snap(Math.round(target / spacing) + 1); });
  function remeasure() { var i = spacing ? off / spacing : 0; measure(); if (W && H) { off = target = i * spacing; kick(); } }
  window.addEventListener('resize', remeasure);
  // The line can be laid out after the script runs (hidden section, preview width change): measure again whenever its size changes
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(line);
  new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; if (visible) kick(); }).observe(line);
  measure(); kick();
})();
