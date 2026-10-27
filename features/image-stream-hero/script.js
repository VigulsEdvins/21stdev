(function () {
  var hero = document.getElementById('ccHero'), field = document.getElementById('ccField');
  var PER = 9, hues = [250, 190, 330, 40, 150, 10, 280, 210, 90];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, cards = [], vis = true, t0 = performance.now();
  [-1, 1].forEach(function (side) {
    for (var i = 0; i < PER; i++) {
      var c = document.createElement('div'); c.className = 'cc-card';
      var h = hues[(i + (side > 0 ? 4 : 0)) % hues.length];
      c.style.background = 'linear-gradient(' + (130 + i * 25) + 'deg, hsl(' + h + ' 75% 60%), hsl(' + (h + 50) + ' 70% 35%))';
      field.appendChild(c); cards.push({ el: c, side: side, off: i / PER });
    }
  });
  function render(now) {
    var w = hero.clientWidth, hgt = hero.clientHeight, time = reduce ? 0.35 : (now - t0) / 14000;
    cards.forEach(function (k, idx) {
      var t = (k.off + time) % 1;                    // 0 near vanishing point, 1 at the edge
      var depth = Math.pow(t, 1.7);
      var x = k.side * depth * (w * 0.62 + 120);
      var y = (k.side * (idx % 2 ? 1 : -1) * 0.12 + (k.off - 0.5) * 0.15) * depth * hgt * 0.9;
      var s = 0.15 + depth * 1.25;
      var rot = -k.side * (62 - depth * 40);
      k.el.style.opacity = Math.min(1, t * 6) * (t > 0.92 ? (1 - t) * 12 : 1);
      k.el.style.transform = 'translate(-50%,-50%) translate3d(' + x + 'px,' + y + 'px,' + (depth * 160) + 'px) rotateY(' + rot + 'deg) scale(' + s + ')';
      k.el.style.zIndex = Math.round(depth * 10);
    });
    if (vis && !reduce) requestAnimationFrame(render);
  }
  new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vis) { vis = true; requestAnimationFrame(render); } vis = v; }).observe(hero);
  addEventListener('resize', function () { render(performance.now()); });
  requestAnimationFrame(render);
})();
