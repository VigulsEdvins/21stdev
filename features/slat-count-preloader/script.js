(function () {
  var stage = document.querySelector('.sc-stage');
  var slatsEl = stage.querySelector('.sc-slats');
  var num = stage.querySelector('.sc-num');
  var bar = stage.querySelector('.sc-count');
  var status = stage.querySelector('.sc-status');
  var replayBtn = document.querySelector('.sc-replay');
  var N = 14, slats = [], pct = 0, timer = 0, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (var i = 0; i < N; i++) { var s = document.createElement('div'); s.className = 'sc-slat'; s.style.setProperty('--i', i); slatsEl.appendChild(s); slats.push(s); }
  function paint() {
    var p = Math.round(pct);
    num.textContent = p;
    bar.setAttribute('aria-valuenow', p);
    slats.forEach(function (s, i) { s.style.setProperty('--f', Math.max(0, Math.min(1, ((pct / 100) * (N + 4) - i * 0.9) / 4)).toFixed(3)); });
  }
  function finish() {
    if (stage.dataset.state === 'done') return;
    clearTimeout(timer);
    pct = 100; paint();
    status.textContent = 'Ready';
    setTimeout(function () {
      stage.dataset.state = 'done';
      timer = setTimeout(function () {
        stage.classList.add('is-exiting');
        timer = setTimeout(function () { stage.setAttribute('data-phase', 'done'); stage.setAttribute('data-completed', 'true'); replayBtn.hidden = false; }, reduce ? 150 : 650);
      }, reduce ? 100 : 1300);
    }, reduce ? 0 : 350);
  }
  function tick() {
    if (stage.dataset.state !== 'loading') return;
    if (visible) {
      pct = Math.min(100, pct + 1 + Math.random() * 3.5);
      paint();
      if (pct >= 100) return finish();
    }
    timer = setTimeout(tick, 70);
  }
  function start() {
    clearTimeout(timer); stage.classList.remove('is-exiting'); stage.removeAttribute('data-completed'); stage.removeAttribute('data-phase'); replayBtn.hidden = true;
    pct = 0; status.textContent = 'Loading';
    stage.dataset.state = 'loading';
    paint();
    if (reduce) { finish(); return; }
    timer = setTimeout(tick, 400);
  }
  stage.querySelector('.sc-skip').addEventListener('click', finish);
  replayBtn.addEventListener('click', start);
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(stage);
  start();
})();
