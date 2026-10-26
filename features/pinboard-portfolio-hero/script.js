(function () {
  var hero = document.getElementById('pwHero');
  if (!hero) return;
  var cards = hero.querySelectorAll('.pw-card');
  var svg = document.getElementById('pwStrings');
  var links = [[0, 1], [1, 2], [1, 3], [2, 4]];
  function strings() {
    var hr = hero.getBoundingClientRect();
    var pts = Array.prototype.map.call(cards, function (c) {
      var r = c.querySelector('.pw-pin').getBoundingClientRect();
      return [r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2];
    });
    svg.innerHTML = links.map(function (l) {
      var a = pts[l[0]], b = pts[l[1]];
      var midx = (a[0] + b[0]) / 2, midy = (a[1] + b[1]) / 2 + 24; // slight sag
      return '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + midx.toFixed(1) + ' ' + midy.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" />';
    }).join('');
  }
  strings();
  window.addEventListener('resize', strings);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var raf = 0, mx = 0, my = 0;

  function paint() {
    raf = 0;
    for (var i = 0; i < cards.length; i++) {
      var depth = 4 + (i % 3) * 3;
      cards[i].style.setProperty('--px', (mx * depth).toFixed(1) + 'px');
      cards[i].style.setProperty('--py', (my * depth).toFixed(1) + 'px');
    }
    strings();
  }
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5;
    my = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(paint);
  });
  hero.addEventListener('pointerleave', function () {
    mx = 0; my = 0;
    if (!raf) raf = requestAnimationFrame(paint);
  });
})();
