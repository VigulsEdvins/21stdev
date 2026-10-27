(function () {
  var screen = document.querySelector('.ph-screen');
  var cv = screen.querySelector('.ph-noise');
  var ctx = cv.getContext('2d');
  var typed = screen.querySelector('.ph-typed');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = 0, visible = true, last = 0;
  var W = 160, H = 90;
  cv.width = W; cv.height = H;
  var img = ctx.createImageData(W, H);
  // the static is tinted with the phosphor colour (the theme's accent)
  var tint = [0.3, 1, 0.5];
  (function () {
    var s = document.createElement('span'); s.style.color = 'var(--ph)'; screen.appendChild(s);
    var m = (getComputedStyle(s).color.match(/[\d.]+/g) || []); screen.removeChild(s);
    if (m.length >= 3) tint = [m[0] / 255, m[1] / 255, m[2] / 255];
  })();
  function draw(now) {
    if (visible && now - last > 70) {
      last = now;
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 255;
        img.data[i] = v * tint[0]; img.data[i + 1] = v * tint[1]; img.data[i + 2] = v * tint[2]; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    raf = requestAnimationFrame(draw);
  }
  if (reduce) { draw(100); cancelAnimationFrame(raf); } else raf = requestAnimationFrame(draw);
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(screen);

  var lines = ['retuning...', 'carrier not found', 'press return to start'];
  if (reduce) { typed.textContent = lines[2]; return; }
  var li = 0, ci = 0;
  (function type() {
    var l = lines[li];
    if (ci <= l.length) { typed.textContent = l.slice(0, ci++); setTimeout(type, 55); }
    else if (li < lines.length - 1) { setTimeout(function () { li++; ci = 0; type(); }, 900); }
  })();
})();
