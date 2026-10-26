(function () {
  var gate = document.getElementById('hcGate'), num = document.getElementById('hcNum'), rail = document.getElementById('hcRail');
  var w = document.getElementById('hcW'), state = document.getElementById('hcState'), btn = document.getElementById('hcBtn');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TICKS = 40, ticks = [], DUR = reduce ? 800 : 5200, t0 = 0, raf = 0;
  for (var i = 0; i < TICKS; i++) { var t = document.createElement('i'); rail.appendChild(t); ticks.push(t); }

  function render(p) {
    var v = Math.round(p * 100);
    num.textContent = String(v).padStart(3, '0');
    // weight axis: hairline to black. Real weight when the font supports it, plus a stroke so it works everywhere.
    num.style.fontWeight = Math.round(100 + p * 800);
    gate.style.setProperty('--hc-stroke', (p * 0.045).toFixed(4) + 'em');
    w.textContent = Math.round(100 + p * 800);
    var on = Math.round(p * TICKS);
    for (var k = 0; k < TICKS; k++) ticks[k].classList.toggle('is-on', k < on);
    gate.setAttribute('aria-valuenow', v);
  }
  function frame(now) {
    var p = Math.min(1, (now - t0) / DUR);
    // stutter like a real load: eased with a mid-way pause
    var e = p < .6 ? p / .6 * .55 : .55 + Math.pow((p - .6) / .4, 1.6) * .45;
    render(e);
    if (p < 1) raf = requestAnimationFrame(frame);
    else { render(1); gate.classList.add('is-done'); state.textContent = 'Ready'; btn.hidden = false; }
  }
  function run() {
    btn.hidden = true; gate.classList.remove('is-done'); state.textContent = 'Loading';
    cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame);
  }
  btn.addEventListener('click', run);
  run();
})();
