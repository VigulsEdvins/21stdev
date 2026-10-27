(function () {
  var track = document.getElementById('ncTrack');
  var cv = document.getElementById('ncCanvas'), ctx = cv.getContext('2d');
  var chs = document.querySelectorAll('.nc-ch');
  var num = document.getElementById('ncNum'), bar = document.getElementById('ncBar'), hint = document.getElementById('ncHint');
  var romans = ['I', 'II', 'III', 'IV'], N = chs.length;
  var W = 0, H = 0, dpr = 1, progress = 0, shown = -1, raf = 0, visible = true;
  var RED = '196,22,28', BONE = '239,230,214', INK = '10,5,6';
  // the drawing uses the theme's colours: accent, text and background, read from the section as plain r,g,b
  function rgbOf(v) {
    var s = document.createElement('span'); s.style.color = 'var(' + v + ')'; track.appendChild(s);
    var c = getComputedStyle(s).color; track.removeChild(s);
    var m = c.match(/[\d.]+/g) || [];
    if (m.length < 3) return null;
    var k = c.indexOf('color(') === 0 ? 255 : 1;
    return m.slice(0, 3).map(function (x) { return Math.round(parseFloat(x) * k); }).join(',');
  }
  function themeColours() { RED = rgbOf('--nc-red') || RED; BONE = rgbOf('--nc-bone') || BONE; INK = rgbOf('--nc-ink') || INK; }

  function size() {
    themeColours();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(cv.clientWidth * dpr); H = cv.height = Math.round(cv.clientHeight * dpr);
    draw();
  }
  function readProgress() {
    var r = track.getBoundingClientRect(), max = r.height - window.innerHeight;
    progress = Math.min(1, Math.max(0, -r.top / Math.max(1, max)));
  }
  function ease(t) { return t * t * (3 - 2 * t); }

  function motif(k, t) {
    var cx = W / 2, cy = H / 2, m = Math.min(W, H), i;
    ctx.lineWidth = 1.5 * dpr;
    if (k === 0) { // contracting rings
      for (i = 0; i < 12; i++) {
        var rr = m * (0.08 + i * 0.07) * (1.3 - 0.6 * t) ;
        ctx.strokeStyle = 'rgba(' + (i % 3 ? BONE : RED) + ',' + (0.5 - i * 0.03) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();
      }
    } else if (k === 1) { // falling ash lines
      for (i = 0; i < 60; i++) {
        var x = ((i * 137.5) % 100) / 100 * W, sp = 0.4 + (i % 7) / 7, y = ((i * 53 % 100) / 100 * H + t * H * sp * 1.6) % (H * 1.2) - H * 0.1;
        ctx.strokeStyle = 'rgba(' + (i % 5 ? BONE : RED) + ',' + (0.2 + (i % 4) * 0.1) + ')';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * dpr, y + (30 + i % 40) * dpr); ctx.stroke();
      }
    } else if (k === 2) { // blinds that open
      var bars = 14, bh = H / bars;
      for (i = 0; i < bars; i++) {
        var open = ease(Math.min(1, Math.max(0, t * 1.6 - i / bars * 0.6)));
        ctx.fillStyle = 'rgba(' + RED + ',' + (0.55 * (1 - open) + 0.05) + ')';
        ctx.fillRect(0, i * bh, W, bh * (1 - open * 0.9));
      }
    } else { // eye / lens
      var w = m * (0.35 + 0.35 * t), h = m * 0.14 * (0.4 + Math.sin(t * Math.PI));
      ctx.fillStyle = 'rgba(' + RED + ',0.85)';
      ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx, cy - h * 2, cx + w, cy); ctx.quadraticCurveTo(cx, cy + h * 2, cx - w, cy); ctx.fill();
      ctx.fillStyle = 'rgb(' + INK + ')'; ctx.beginPath(); ctx.arc(cx, cy, h * 0.9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(' + BONE + ',0.6)'; ctx.beginPath(); ctx.arc(cx, cy, h * 1.15, 0, 7); ctx.stroke();
    }
  }

  function draw() {
    var f = progress * N, idx = Math.min(N - 1, Math.floor(f)), t = f - idx;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(' + RED + ',0.28)'); g.addColorStop(1, 'rgba(' + INK + ',1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    motif(idx, t);
    chs.forEach(function (c, i) {
      var o = 0, y = 0;
      if (i === idx) { o = Math.min(1, t * 6, (1 - t) * 6 + (idx === N - 1 ? 1 : 0)); y = (1 - Math.min(1, t * 6)) * 14; }
      c.style.opacity = Math.max(0, Math.min(1, o)).toFixed(3); c.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    });
    if (idx !== shown) { shown = idx; num.textContent = romans[idx] + ' / ' + romans[N - 1]; }
    bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    hint.style.opacity = progress > 0.02 ? 0 : 0.6;
  }
  function onScroll() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; readProgress(); draw(); }); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { readProgress(); size(); });
  readProgress(); size();
})();
