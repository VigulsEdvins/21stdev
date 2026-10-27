(function () {
  var stage = document.getElementById('dsStage'), snake = document.getElementById('dsSnake');
  var bar = document.getElementById('dsBar'), count = document.getElementById('dsCount');
  var btn = document.getElementById('dsEnter'), ticks = document.getElementById('dsTicks');
  var NS = 'http://www.w3.org/2000/svg';
  for (var i = 0; i < 36; i++) {
    var a = i * Math.PI / 18, l = document.createElementNS(NS, 'line'), r2 = i % 3 ? 126 : 120;
    l.setAttribute('class', 'ds-tick');
    l.setAttribute('x1', Math.cos(a) * 124); l.setAttribute('y1', Math.sin(a) * 124);
    l.setAttribute('x2', Math.cos(a) * (r2 + (i % 3 ? 0 : -8))); l.setAttribute('y2', Math.sin(a) * (r2 + (i % 3 ? 0 : -8)));
    ticks.appendChild(l);
  }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dur = reduce ? 600 : 3800, t0 = null;
  function frame(t) {
    if (t0 === null) t0 = t;
    var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 2.4);
    snake.style.strokeDashoffset = 100 - e * 100;
    bar.style.width = e * 100 + '%';
    count.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(frame);
    else { stage.classList.add('is-ready'); btn.disabled = false; btn.focus({ preventScroll: true }); }
  }
  requestAnimationFrame(frame);
  btn.addEventListener('click', function () {
    stage.classList.add('is-open'); btn.textContent = 'Seal broken'; btn.disabled = true;
    setTimeout(function () {
      stage.classList.add('is-exiting');
      setTimeout(function () { stage.setAttribute('data-phase', 'done'); stage.setAttribute('data-completed', 'true'); }, reduce ? 150 : 650);
    }, reduce ? 100 : 500);
  });
})();
