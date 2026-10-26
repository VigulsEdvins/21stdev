(function () {
  var stage = document.getElementById('bbStage');
  var cue = document.getElementById('bbCue');
  var count = document.getElementById('bbCount');
  var btn = document.getElementById('bbToggle');
  if (!stage) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phases = [
    { name: 'Breathe in', len: 4 },
    { name: 'Hold', len: 2 },
    { name: 'Breathe out', len: 6 }
  ];
  var total = 12;
  var t = 0, last = 0, paused = false, visible = true, raf = 0, spin = 0;

  function ease(x) { return x * x * (3 - 2 * x); }

  function level(time) {
    if (time < 4) return ease(time / 4);
    if (time < 6) return 1;
    return 1 - ease((time - 6) / 6);
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      t = (t + dt) % total;
      spin += dt * (reduce ? 0 : 6);
    }
    var p = reduce ? 0.5 : level(t);
    stage.style.setProperty('--bb-p', p.toFixed(3));
    stage.style.setProperty('--bb-spin', spin.toFixed(2) + 'deg');

    var acc = 0, i = 0;
    while (i < phases.length - 1 && t >= acc + phases[i].len) { acc += phases[i].len; i++; }
    var left = Math.ceil(phases[i].len - (t - acc));
    if (cue.textContent !== phases[i].name) cue.textContent = phases[i].name;
    count.textContent = String(left);
    schedule();
  }

  function schedule() {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  btn.addEventListener('click', function () {
    paused = !paused;
    btn.textContent = paused ? 'Resume' : 'Pause';
    btn.setAttribute('aria-pressed', String(paused));
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(stage);
  }
  schedule();
})();
