(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var time = document.getElementById('bnTime');
  function tick() {
    var d = new Date();
    time.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 15000);

  var num = document.getElementById('bnNum'), to = +num.dataset.to, val = 0;
  function show() { num.textContent = val; }
  if (reduce) { val = to; show(); } else {
    var start = null;
    (function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / 1200, 1);
      val = Math.round(to * (1 - Math.pow(1 - p, 3))); show();
      if (p < 1) requestAnimationFrame(step); else to = val;
    })(performance.now());
  }
  document.getElementById('bnBump').addEventListener('click', function () { val += 1; to = val; show(); });

  var card = document.querySelector('[data-tilt]');
  if (card && !reduce) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(700px) rotateY(' + x * 8 + 'deg) rotateX(' + -y * 8 + 'deg) translateY(-3px)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  }
})();
