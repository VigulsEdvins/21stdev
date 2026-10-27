(function () {
  var snaps = Array.prototype.slice.call(document.querySelectorAll('.sz-snap')), dots = document.getElementById('szDots'), n = snaps.length, cur = 0, btns = [];
  for (var i = 0; i < n; i++) (function (i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Snapshot ' + (i + 1));
    b.addEventListener('click', function () { go(i); }); dots.appendChild(b); btns.push(b);
  })(i);
  function go(i) {
    cur = (i + n) % n;
    snaps.forEach(function (s, k) { s.dataset.pos = (k - cur + n) % n; s.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
    btns.forEach(function (b, k) { b.classList.toggle('is-on', k === cur); b.setAttribute('aria-current', k === cur); });
  }
  document.getElementById('szNext').addEventListener('click', function () { go(cur + 1); });
  document.querySelector('.sz-stack').addEventListener('click', function () { go(cur + 1); });
  go(0);
})();
