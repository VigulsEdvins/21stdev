(function () {
  var strip = document.getElementById('lrStrip'), read = document.getElementById('lrRead');
  var frames = Array.prototype.slice.call(strip.querySelectorAll('.lr-frame'));
  var labels = frames.map(function (f) { return f.querySelector('figcaption').textContent; });
  var raf = 0, lastIdx = -1;

  function update() {
    raf = 0;
    var r = strip.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, bd = 1e9;
    frames.forEach(function (f, i) {
      var b = f.getBoundingClientRect(), c = b.left + b.width / 2, d = Math.abs(c - mid), u = Math.min(1, d / (b.width * 1.6));
      f.style.filter = 'blur(' + (u * 7).toFixed(2) + 'px) saturate(' + (1 - u * .5).toFixed(2) + ')';
      f.style.transform = 'scale(' + (1 - u * .22).toFixed(3) + ')';
      f.style.opacity = (1 - u * .55).toFixed(2);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== lastIdx) { lastIdx = best; read.textContent = labels[best]; }
  }
  function sched() { if (!raf) raf = requestAnimationFrame(update); }
  strip.addEventListener('scroll', sched, { passive: true });
  addEventListener('resize', sched);

  // mouse drag
  var down = false, sx = 0, sl = 0;
  strip.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    down = true; sx = e.clientX; sl = strip.scrollLeft; strip.classList.add('is-drag'); strip.setPointerCapture(e.pointerId);
  });
  strip.addEventListener('pointermove', function (e) { if (down) strip.scrollLeft = sl - (e.clientX - sx); });
  function up() { if (!down) return; down = false; strip.classList.remove('is-drag'); }
  strip.addEventListener('pointerup', up); strip.addEventListener('pointercancel', up);

  strip.addEventListener('keydown', function (e) {
    var w = frames[0].offsetWidth + 22;
    if (e.key === 'ArrowRight') { strip.scrollBy({ left: w, behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { strip.scrollBy({ left: -w, behavior: 'smooth' }); e.preventDefault(); }
  });
  // vertical wheel moves the strip sideways
  strip.addEventListener('wheel', function (e) {
    var max = strip.scrollWidth - strip.clientWidth;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if ((e.deltaY < 0 && strip.scrollLeft <= 0) || (e.deltaY > 0 && strip.scrollLeft >= max - 1)) return;
    strip.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
  update();
})();
