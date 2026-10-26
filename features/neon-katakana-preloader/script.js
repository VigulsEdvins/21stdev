(function () {
  var root = document.getElementById('nsRoot'), count = document.getElementById('nsCount'), bar = document.getElementById('nsBar');
  var again = document.getElementById('nsAgain'), cv = document.getElementById('nsRain'), ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'.split('');
  var cols = [], fs = 16, rafRain = 0, visible = true, last = 0;

  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.ceil(r.width / fs); cols = [];
    for (var i = 0; i < n; i++) cols.push(Math.random() * -40);
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, r.width, r.height);
  }
  function rain(t) {
    rafRain = 0;
    if (t - last > 60) {
      last = t;
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.fillStyle = 'rgba(5,4,10,.14)'; ctx.fillRect(0, 0, w, h);
      ctx.font = fs + 'px monospace';
      for (var i = 0; i < cols.length; i++) {
        var y = cols[i] * fs;
        ctx.fillStyle = Math.random() > .96 ? '#ffffff' : (i % 5 === 0 ? '#ff2e93' : '#25f4ee');
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * fs, y);
        cols[i] = y > h && Math.random() > .96 ? 0 : cols[i] + 1;
      }
    }
    if (visible && !reduce) rafRain = requestAnimationFrame(rain);
  }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !rafRain && !reduce) rafRain = requestAnimationFrame(rain); }).observe(root);
  addEventListener('resize', size);
  size(); if (reduce) { for (var k = 0; k < 40; k++) rain(k * 100); } else rafRain = requestAnimationFrame(rain);

  var DUR = reduce ? 800 : 3800, t0 = 0, raf = 0, tm = 0;
  function step(now) {
    var p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 2.2), v = Math.round(e * 100);
    count.textContent = String(v).padStart(2, '0');
    bar.style.width = v + '%'; root.setAttribute('aria-valuenow', v);
    if (p < 1) raf = requestAnimationFrame(step);
    else {
      tm = setTimeout(function () {
        root.classList.add('is-open');
        tm = setTimeout(function () {
          root.classList.add('is-exiting');
          tm = setTimeout(function () { root.setAttribute('data-phase', 'done'); root.setAttribute('data-completed', 'true'); again.hidden = false; }, reduce ? 150 : 650);
        }, reduce ? 200 : 1900);
      }, 300);
    }
  }
  function run() {
    clearTimeout(tm); root.classList.remove('is-open', 'is-exiting'); root.removeAttribute('data-completed'); root.removeAttribute('data-phase'); again.hidden = true; count.textContent = '00'; bar.style.width = '0';
    cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(step);
  }
  again.addEventListener('click', run);
  run();
})();
