(function () {
  var stage = document.getElementById('pkStage');
  var topEl = document.getElementById('pkTop');
  var underEl = document.getElementById('pkUnder');
  var flapEl = document.getElementById('pkFlap');
  var shadowEl = document.getElementById('pkShadow');
  var caption = document.getElementById('pkCaption');
  if (!stage) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var titles = ['Sunrise study', 'Field stripes', 'Arch no. 4', 'Ring and night', 'Pine form'];
  var n = titles.length;
  var index = 0, p = 0, W = 0, H = 0, anim = 0, busy = false;

  function art(el, i) {
    el.setAttribute('data-art', i);
    el.className = el.className.replace(/\bpk-a\d\b/g, '').trim() + ' pk-a' + i;
    el.innerHTML = '<span class="pk-label">' + titles[i] + '</span>';
  }

  function measure() { var r = stage.getBoundingClientRect(); W = r.width; H = r.height; }

  // p: 0 = sheet flat, 1 = sheet fully peeled away. The fold runs along x + y = c.
  function apply() {
    var B = W + H, c = B * (1 - p);
    var half = 'polygon(' + (c + B) + 'px ' + (-B) + 'px,' + (-B) + 'px ' + (c + B) + 'px,' + (-B) + 'px ' + (-B) + 'px)';
    var other = 'polygon(' + (c + B) + 'px ' + (-B) + 'px,' + (3 * B) + 'px ' + (-B) + 'px,' + (3 * B) + 'px ' + (3 * B) + 'px,' + (-B) + 'px ' + (3 * B) + 'px,' + (-B) + 'px ' + (c + B) + 'px)';
    var f = (1 - p) * 100;
    if (p <= 0.001) {
      topEl.style.clipPath = 'none';
      flapEl.style.display = 'none';
      shadowEl.style.background = 'none';
      return;
    }
    topEl.style.clipPath = half;
    flapEl.style.display = 'block';
    flapEl.style.transform = 'matrix(0,-1,-1,0,' + c + ',' + c + ')';
    flapEl.style.clipPath = other;
    flapEl.style.setProperty('--pk-flapshade',
      'linear-gradient(135deg, transparent ' + (f - 1) + '%, rgba(0,0,0,0.32) ' + f + '%, rgba(255,255,255,0.28) ' + (f + 5) + '%, transparent ' + (f + 22) + '%)');
    shadowEl.style.background =
      'linear-gradient(135deg, transparent ' + (f - 1) + '%, rgba(0,0,0,0.38) ' + f + '%, transparent ' + (f + 16) + '%)';
  }

  function render() {
    art(topEl, index);
    art(underEl, (index + 1) % n);
    caption.textContent = 'Print ' + (index + 1) + ' of ' + n;
    p = 0;
    apply();
  }

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function tween(from, to, ms, done) {
    cancelAnimationFrame(anim);
    if (reduce) { p = to; apply(); done && done(); return; }
    var t0 = performance.now();
    (function tick(now) {
      var k = Math.min(1, (now - t0) / ms);
      p = from + (to - from) * ease(k);
      apply();
      if (k < 1) anim = requestAnimationFrame(tick); else done && done();
    })(t0);
  }

  function next() {
    if (busy) return;
    busy = true; measure();
    tween(p, 1, 750, function () { index = (index + 1) % n; render(); busy = false; });
  }
  function prev() {
    if (busy) return;
    busy = true; measure();
    index = (index - 1 + n) % n;
    art(topEl, index);
    art(underEl, (index + 1) % n);
    caption.textContent = 'Print ' + (index + 1) + ' of ' + n;
    p = 1; apply();
    tween(1, 0, 750, function () { busy = false; });
  }

  document.getElementById('pkNext').addEventListener('click', next);
  document.getElementById('pkPrev').addEventListener('click', prev);
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    if (busy) return;
    measure();
    drag = { s0: e.clientX + e.clientY, moved: false };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dS = (e.clientX + e.clientY) - drag.s0;
    if (Math.abs(dS) > 4) drag.moved = true;
    p = Math.max(0, Math.min(1, -dS / (W + H)));
    apply();
  });
  function release() {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.moved || p > 0.3) { busy = true; tween(p, 1, 450, function () { index = (index + 1) % n; render(); busy = false; }); }
    else { busy = true; tween(p, 0, 350, function () { busy = false; }); }
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', function () { if (drag) { drag.moved = true; p = 0; release(); } });
  window.addEventListener('resize', function () { measure(); apply(); });

  measure();
  render();
})();
