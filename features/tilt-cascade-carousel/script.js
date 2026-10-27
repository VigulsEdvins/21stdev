(function () {
  var wheel = document.getElementById('wtWheel');
  var tiles = Array.prototype.slice.call(wheel.querySelectorAll('.wt-tile'));
  var names = ['Dune', 'Lagoon', 'Pine', 'Plum dusk', 'Glacier', 'Ember'];
  var count = document.getElementById('wtCount'), title = document.getElementById('wtTitle');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = tiles.length, STEP = 17, pos = 0, target = 0, raf = 0, drag = null;

  function layout() {
    var w = wheel.clientWidth, h = wheel.clientHeight;
    var R = Math.max(520, w * 1.1), cx = w / 2, baseY = h * .5 - Math.min(150, w * .31);
    tiles.forEach(function (t, i) {
      var off = i - pos;
      if (off > n / 2) off -= n; if (off < -n / 2) off += n;
      var a = off * STEP * Math.PI / 180, abs = Math.abs(off);
      var x = Math.sin(a) * R, y = (1 - Math.cos(a)) * R * .55;
      var sc = Math.max(.45, 1 - abs * .13);
      t.style.transform = 'translate(' + x + 'px,' + (baseY + y) + 'px) rotate(' + (off * STEP * .75) + 'deg) scale(' + sc + ')';
      t.style.zIndex = 100 - Math.round(abs * 10);
      t.style.opacity = abs > 3.2 ? 0 : 1;
      t.style.pointerEvents = abs > 3.2 ? 'none' : '';
      t.style.filter = abs < .5 ? 'none' : 'brightness(' + (1 - Math.min(.35, abs * .1)) + ')';
      t.tabIndex = Math.round(pos + n * 10) % n === i ? 0 : -1;
    });
  }
  function label() {
    var k = ((Math.round(target) % n) + n) % n;
    count.textContent = String(k + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'); title.textContent = names[k];
  }
  function frame() {
    raf = 0;
    pos += (target - pos) * (reduce ? 1 : .13);
    if (Math.abs(target - pos) < .002) pos = target;
    layout();
    if (pos !== target) raf = requestAnimationFrame(frame);
  }
  function go(t) { target = t; label(); if (!raf) raf = requestAnimationFrame(frame); }
  document.getElementById('wtPrev').addEventListener('click', function () { go(Math.round(target) - 1); });
  document.getElementById('wtNext').addEventListener('click', function () { go(Math.round(target) + 1); });
  wheel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { go(Math.round(target) + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(Math.round(target) - 1); e.preventDefault(); }
  });
  tiles.forEach(function (t, i) {
    t.addEventListener('click', function () {
      if (wheel.dataset.moved === '1') return;
      var d = i - (((Math.round(target) % n) + n) % n); if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      go(Math.round(target) + d);
    });
  });
  wheel.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, t: target }; wheel.dataset.moved = '0'; });
  addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) { wheel.dataset.moved = '1'; wheel.classList.add('is-drag'); }
    if (wheel.dataset.moved === '1') { target = drag.t - dx / 120; pos = target; layout(); }
  });
  addEventListener('pointerup', function () {
    if (!drag) return; drag = null; wheel.classList.remove('is-drag');
    if (wheel.dataset.moved === '1') { go(Math.round(target)); setTimeout(function () { wheel.dataset.moved = '0'; }, 0); }
  });
  addEventListener('resize', layout);
  label(); layout();
})();
