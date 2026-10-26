(function () {
  var root = document.querySelector('[data-dp-root]');
  var word = document.querySelector('[data-dp-word]');
  var pct = document.querySelector('[data-dp-pct]');
  var msg = document.querySelector('[data-dp-msg]');
  var btn = document.querySelector('[data-dp-replay]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var text = 'SOLSTICE', letters = [];
  text.split('').forEach(function (c, i) {
    var s = document.createElement('span');
    var m = (text.length - 1) / 2, o = (i - m) / m;
    s.className = 'dp-ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = c;
    s.style.setProperty('--r', (o * 16) + 'deg');
    s.style.setProperty('--sy', (1 + Math.abs(o) * 0.45).toFixed(2));
    s.style.marginBottom = (-Math.abs(o) * 0 + (1 - o * o) * 28) + 'px';
    word.appendChild(s); letters.push(s);
  });
  var msgs = ['warming up', 'lifting the sun', 'colouring the sky', 'almost there', 'good morning'];
  var raf, t0;
  function set(p) {
    root.style.setProperty('--p', p.toFixed(3));
    pct.textContent = Math.round(p * 100);
    msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p * (msgs.length - 0.001)))];
    letters.forEach(function (l, i) { l.style.setProperty('--in', p * letters.length > i + 0.2 ? 1 : 0); });
  }
  function run() {
    cancelAnimationFrame(raf); btn.hidden = true; root.setAttribute('aria-busy', 'true');
    if (reduce) { set(1); done(); return; }
    var dur = 4200; t0 = performance.now(); set(0);
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      set(k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      if (k < 1) raf = requestAnimationFrame(step); else done();
    })(t0);
  }
  function done() { root.setAttribute('aria-busy', 'false'); btn.hidden = false; }
  btn.addEventListener('click', run);
  run();
})();
