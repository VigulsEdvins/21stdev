(function () {
  var root = document.getElementById('nsRoot'), count = document.getElementById('nsCount'), bar = document.getElementById('nsBar');
  var again = document.getElementById('nsAgain'), cv = document.getElementById('nsRain'), ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'.split('');
  function tok(n, f) { var s = document.createElement('span'); s.style.color = 'var(' + n + ', ' + f + ')'; root.appendChild(s); var c = getComputedStyle(s).color; root.removeChild(s); return c; }
  var cBg = '#05040a', cWhite = '#ffffff', cPink = '#ff2e93', cCyan = '#25f4ee', nRain = 0;
  function colours() { cBg = tok('--bg', '#05040a'); cWhite = tok('--text', '#ffffff'); cPink = tok('--pink', '#ff2e93'); cCyan = tok('--cyan', '#25f4ee'); }
  var cols = [], fs = 16, rafRain = 0, visible = true, last = 0;

  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.ceil(r.width / fs); cols = [];
    for (var i = 0; i < n; i++) cols.push(Math.random() * -40);
    colours(); ctx.fillStyle = cBg; ctx.fillRect(0, 0, r.width, r.height);
  }
  function rain(t) {
    rafRain = 0;
    if (t - last > 60) {
      last = t;
      var w = cv.clientWidth, h = cv.clientHeight;
      if (nRain++ % 40 === 0) colours();
      ctx.globalAlpha = .14; ctx.fillStyle = cBg; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      ctx.font = fs + 'px monospace';
      for (var i = 0; i < cols.length; i++) {
        var y = cols[i] * fs;
        ctx.fillStyle = Math.random() > .96 ? cWhite : (i % 5 === 0 ? cPink : cCyan);
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
