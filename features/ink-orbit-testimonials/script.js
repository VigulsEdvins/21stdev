(function () {
  var stage = document.getElementById('tqStage'), slides = Array.prototype.slice.call(stage.querySelectorAll('.tq-slide'));
  var dots = document.getElementById('tqDots'), cur = 0, timer = 0, paused = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  slides.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tq-dot'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Quote ' + (i + 1));
    b.addEventListener('click', function () { go(i); restart(); });
    dots.appendChild(b);
  });
  function go(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle('is-on', k === cur); s.setAttribute('aria-hidden', k !== cur); });
    Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-selected', k === cur); });
  }
  function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!paused) go(cur + 1); }, 5500); }
  document.getElementById('tqPrev').addEventListener('click', function () { go(cur - 1); restart(); });
  document.getElementById('tqNext').addEventListener('click', function () { go(cur + 1); restart(); });
  stage.addEventListener('mouseenter', function () { paused = true; }); stage.addEventListener('mouseleave', function () { paused = false; });
  stage.addEventListener('focusin', function () { paused = true; }); stage.addEventListener('focusout', function () { paused = false; });
  go(0); restart();
})();
