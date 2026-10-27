(function () {
  var car = document.querySelector('.ap-car');
  var slides = Array.prototype.slice.call(car.querySelectorAll('.ap-slide'));
  var ring = car.querySelector('.ap-ring');
  var lens = car.querySelector('.ap-lens');
  var line = car.querySelector('.ap-line i');
  var label = car.querySelector('.ap-n');
  var n = slides.length, cur = 0, busy = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mx = innerWidth / 2, my = innerHeight / 2;

  function pad(v) { return (v < 10 ? '0' : '') + v; }
  function go(to, x, y) {
    if (busy || to === cur) return;
    var next = slides[to], old = slides[cur], rect = car.getBoundingClientRect();
    var px = x == null ? rect.width / 2 : x - rect.left, py = y == null ? rect.height / 2 : y - rect.top;
    var R = Math.hypot(Math.max(px, rect.width - px), Math.max(py, rect.height - py));
    busy = true;
    function done() {
      old.classList.remove('ap-cur'); old.setAttribute('aria-hidden', 'true');
      next.classList.remove('ap-in'); next.classList.add('ap-cur'); next.removeAttribute('aria-hidden');
      next.style.removeProperty('--r'); ring.style.opacity = 0;
      cur = to; busy = false;
    }
    line.style.width = ((to + 1) / n * 100) + '%';
    label.textContent = pad(to + 1) + ' / ' + pad(n);
    if (reduce) { done(); return; }
    next.style.setProperty('--x', px + 'px'); next.style.setProperty('--y', py + 'px'); next.style.setProperty('--r', '0px');
    next.classList.add('ap-in');
    ring.style.left = px + 'px'; ring.style.top = py + 'px'; ring.style.opacity = 1;
    var t0 = performance.now(), D = 1100;
    (function step(now) {
      var t = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - t, 3), r = e * R;
      next.style.setProperty('--r', r + 'px');
      ring.style.width = ring.style.height = (r * 2) + 'px';
      if (t < 1) requestAnimationFrame(step); else done();
    })(t0);
  }
  car.addEventListener('click', function (e) {
    if (e.target.closest('.ap-ui')) return;
    var left = e.clientX < car.getBoundingClientRect().left + car.clientWidth * .3;
    go((cur + (left ? n - 1 : 1)) % n, e.clientX, e.clientY);
  });
  car.querySelector('.ap-next').addEventListener('click', function () { go((cur + 1) % n); });
  car.querySelector('.ap-prev').addEventListener('click', function () { go((cur + n - 1) % n); });
  car.setAttribute('tabindex', '0');
  car.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go((cur + 1) % n); else if (e.key === 'ArrowLeft') go((cur + n - 1) % n);
  });
  car.addEventListener('mousemove', function (e) {
    lens.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    lens.style.opacity = e.target.closest('.ap-ui') ? 0 : 1;
    lens.textContent = e.clientX < car.getBoundingClientRect().left + car.clientWidth * .3 ? 'Prev' : 'Next';
  });
  car.addEventListener('mouseleave', function () { lens.style.opacity = 0; });
})();
