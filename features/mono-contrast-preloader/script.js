(function () {
  var stage = document.querySelector('.mc-stage');
  var cv = stage.querySelector('.mc-canvas');
  var ctx = cv.getContext('2d');
  var num = stage.querySelector('.mc-count span');
  var bar = stage.querySelector('.mc-bar i');
  var cnt = stage.querySelector('.mc-count');
  var title = stage.querySelector('.mc-title');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = reduce ? 800 : 6500, t0 = performance.now(), visible = true, done = false;
  var small = document.createElement('canvas'), sctx = small.getContext('2d');
  var grain = document.createElement('canvas'); grain.width = grain.height = 128;
  var blobs = [];
  for (var i = 0; i < 7; i++) blobs.push({ x: Math.random(), y: Math.random(), r: .15 + Math.random() * .25, sx: (Math.random() - .5) * .05, sy: (Math.random() - .5) * .05, v: 70 + Math.random() * 160 });

  function makeGrain() {
    var g = grain.getContext('2d'), d = g.createImageData(128, 128);
    for (var k = 0; k < d.data.length; k += 4) { var v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  function size() {
    cv.width = Math.max(2, Math.round(cv.clientWidth / 2)); cv.height = Math.max(2, Math.round(cv.clientHeight / 2));
    small.width = 96; small.height = Math.max(2, Math.round(96 * cv.height / cv.width));
  }
  function frame(now) {
    var p = Math.min(1, (now - t0) / DUR), s = (now - t0) / 1000;
    sctx.fillStyle = '#222'; sctx.fillRect(0, 0, small.width, small.height);
    blobs.forEach(function (b) {
      var x = ((b.x + b.sx * s) % 1 + 1) % 1 * small.width, y = ((b.y + b.sy * s) % 1 + 1) % 1 * small.height, r = b.r * small.width * (0.8 + 0.2 * Math.sin(s + b.v));
      var g = sctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + b.v + ',' + b.v + ',' + b.v + ',.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = g; sctx.fillRect(0, 0, small.width, small.height);
    });
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1; ctx.drawImage(small, 0, 0, cv.width, cv.height);
    if (Math.floor(s * 12) % 2 === 0) makeGrain();
    ctx.globalAlpha = .28; ctx.globalCompositeOperation = 'overlay';
    var pat = ctx.createPattern(grain, 'repeat');
    ctx.save(); ctx.translate(Math.random() * 64, Math.random() * 64); ctx.fillStyle = pat; ctx.fillRect(-64, -64, cv.width + 128, cv.height + 128); ctx.restore();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    var n = Math.round(p * 100);
    num.textContent = n; cnt.setAttribute('aria-valuenow', n); bar.style.width = n + '%';
    if (p >= 1 && !done) { done = true; stage.classList.add('mc-done'); title.textContent = 'Ready';
      setTimeout(function () {
        stage.classList.add('is-exiting');
        setTimeout(function () { stage.setAttribute('data-phase', 'done'); stage.setAttribute('data-completed', 'true'); }, reduce ? 150 : 650);
      }, reduce ? 200 : 1400);
    }
    if (visible) requestAnimationFrame(frame);
  }
  window.addEventListener('resize', size);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    var was = visible; visible = e[0].isIntersecting; if (visible && !was) requestAnimationFrame(frame);
  }).observe(stage);
  size(); makeGrain(); requestAnimationFrame(frame);
})();
