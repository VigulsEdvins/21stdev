(function () {
  var hero = document.getElementById('mpHero'), svg = document.getElementById('mpMascot');
  var pupils = svg.querySelectorAll('.mp-pupil');
  hero.addEventListener('pointermove', function (e) {
    var r = svg.getBoundingClientRect(), cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.43;
    var dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 220) * 9;
    var x = (dx / d) * k, y = (dy / d) * k;
    for (var i = 0; i < pupils.length; i++) pupils[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  });
  hero.addEventListener('pointerleave', function () { for (var i = 0; i < pupils.length; i++) pupils[i].style.transform = ''; });
  var pauseObs = new IntersectionObserver(function (es) {
    hero.style.setProperty('--mp-play', es[0].isIntersecting ? 'running' : 'paused');
    hero.querySelectorAll('.mp-floor,.mp-mascot,.mp-doodle').forEach(function (n) { n.style.animationPlayState = es[0].isIntersecting ? 'running' : 'paused'; });
  });
  pauseObs.observe(hero);
})();
