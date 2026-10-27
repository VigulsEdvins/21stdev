(function () {
  var slots = [].slice.call(document.querySelectorAll('.ic-slot'));
  var title = document.getElementById('icTitle'), dotsEl = document.getElementById('icDots');
  var cur = 0, dots = [];
  var names = slots.map(function (s) { return s.querySelector('.ic-name').textContent; });
  function show(i) {
    cur = (i + slots.length) % slots.length;
    slots.forEach(function (s, k) {
      s.classList.toggle('is-on', k === cur);
      s.querySelector('.ic-card').setAttribute('aria-current', k === cur ? 'true' : 'false');
    });
    dots.forEach(function (d, k) { d.classList.toggle('is-on', k === cur); });
    title.textContent = names[cur];
  }
  slots.forEach(function (s, i) {
    s.querySelector('.ic-card').addEventListener('click', function () { show(i); });
    var d = document.createElement('button'); d.type = 'button'; d.className = 'ic-dot'; d.setAttribute('aria-label', 'Go to ' + names[i]);
    d.addEventListener('click', function () { show(i); }); dotsEl.appendChild(d); dots.push(d);
  });
  document.getElementById('icPrev').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('icNext').addEventListener('click', function () { show(cur + 1); });
  window.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); });
  show(0);
})();
