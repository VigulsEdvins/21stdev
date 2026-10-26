(function () {
  var stage = document.querySelector('.sq-stage');
  var shot = stage.querySelector('.sq-shot');
  var count = stage.querySelector('.sq-count');
  var lines = stage.querySelectorAll('.sq-line');
  var end = stage.querySelector('.sq-end');
  var enter = stage.querySelector('.sq-enter');
  var skip = stage.querySelector('.sq-skip');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var total = reduce ? 1200 : 7000, start = null, done = false, shotIdx = -1, raf;

  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    setCount(100);
    stage.classList.add('sq-done');
    end.setAttribute('aria-hidden', 'false'); enter.tabIndex = 0;
  }
  function setCount(v) {
    v = Math.round(v);
    count.textContent = ('00' + v).slice(-3);
    count.setAttribute('aria-valuenow', v);
  }
  function tick(t) {
    if (start === null) start = t;
    var p = Math.min(1, (t - start) / total);
    var eased = 1 - Math.pow(1 - p, 1.6);
    setCount(eased * 100);
    var s = Math.min(3, Math.floor(p * 4));
    if (s !== shotIdx) {
      shotIdx = s; shot.dataset.s = s;
      lines[0].classList.toggle('sq-on', s % 2 === 0);
      lines[1].classList.toggle('sq-on', s % 2 === 1);
    }
    if (p >= 1) { setTimeout(finish, 400); return; }
    raf = requestAnimationFrame(tick);
  }
  skip.addEventListener('click', finish);
  enter.addEventListener('click', function () {
    done = false; stage.classList.remove('sq-done'); end.setAttribute('aria-hidden', 'true'); enter.tabIndex = -1;
    start = null; shotIdx = -1; raf = requestAnimationFrame(tick);
  });
  raf = requestAnimationFrame(tick);
})();
