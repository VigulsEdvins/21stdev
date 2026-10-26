(function () {
  var card = document.getElementById('ptCard'), fill = document.getElementById('ptFill'), pct = document.getElementById('ptPct');
  var btn = document.getElementById('ptReplay');
  var steps = Array.prototype.slice.call(card.querySelectorAll('.pt-steps li'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = reduce ? 1200 : 7000, start = 0, raf = 0;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  function render(p) {
    // easing: the percent crawls a little during "paint" like real renders do
    var v = p * 100;
    card.style.setProperty('--pt-rough', clamp(v / 25));
    card.style.setProperty('--pt-ink', clamp((v - 25) / 25));
    card.style.setProperty('--pt-paint', clamp((v - 50) / 30));
    var stage = v < 25 ? 'rough' : v < 50 ? 'ink' : v < 80 ? 'paint' : 'final';
    if (v >= 100) stage = 'final';
    card.dataset.stage = stage;
    var idx = ['rough', 'ink', 'paint', 'final'].indexOf(stage);
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i <= idx); });
    fill.style.width = v + '%';
    var n = Math.round(v);
    pct.textContent = String(n).padStart(3, '0') + '%';
    card.setAttribute('aria-valuenow', n);
  }

  function frame(t) {
    var p = clamp((t - start) / DUR);
    var eased = p < .5 ? p * 1.15 : .575 + (p - .5) * .85;
    render(Math.min(1, eased));
    if (p < 1) raf = requestAnimationFrame(frame);
    else { render(1); btn.hidden = false; }
  }
  function run() { btn.hidden = true; cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(frame); }
  btn.addEventListener('click', run);
  run();
})();
