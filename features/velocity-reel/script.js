(function () {
  var track = document.querySelector('.vr-track');
  var cv = document.querySelector('.vr-canvas');
  var ctx = cv.getContext('2d');
  var title = document.querySelector('.vr-title');
  var num = document.querySelector('.vr-num');
  var bar = document.querySelector('.vr-bar i');
  var names = ['Still water', 'The line', 'Breaking glass', 'Burn', 'The mark'];
  var W = 0, H = 0, dpr = 1, prog = 0, shown = -1, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ACC = '#ff3b30';

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function rnd(i) { var x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }
  function ease(t) { return t * t * (3 - 2 * t); }

  var scenes = [
    function (t) { // rings on dark water
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1020'); g.addColorStop(1, '#16243c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(180,210,255,.5)';
      for (var i = 0; i < 6; i++) {
        var r = ((t * 1.2 + i / 6) % 1) * Math.min(W, H) * .7;
        ctx.globalAlpha = 1 - r / (Math.min(W, H) * .7); ctx.beginPath(); ctx.ellipse(W / 2, H * .45, r * 1.4, r * .5, 0, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    function (t) { // speed lines toward the centre
      ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
      ctx.lineWidth = 2;
      for (var i = 0; i < 90; i++) {
        var a = rnd(i) * 6.283, s = (rnd(i + 9) + t * 2) % 1, r0 = s * R, r1 = r0 + 30 + t * 220 * s;
        ctx.strokeStyle = i % 7 ? 'rgba(255,255,255,' + (.15 + s * .6) + ')' : ACC;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
      }
    },
    function (t) { // shards flying apart
      ctx.fillStyle = '#0c0d11'; ctx.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, e = ease(t);
      for (var i = 0; i < 26; i++) {
        var a = rnd(i) * 6.283, d = e * (80 + rnd(i + 3) * Math.max(W, H) * .5), sz = 30 + rnd(i + 5) * 80;
        ctx.save(); ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.rotate(a + e * 3 * (rnd(i + 1) - .5));
        ctx.globalAlpha = 1 - e * .6; ctx.fillStyle = 'rgba(190,225,255,' + (.2 + rnd(i + 7) * .4) + ')';
        ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * .6, sz * .5); ctx.lineTo(-sz * .5, sz * .4); ctx.fill(); ctx.restore();
      }
    },
    function (t) { // red burn
      var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * (.2 + t * .6));
      g.addColorStop(0, '#fff3d0'); g.addColorStop(.25, '#ff7a30'); g.addColorStop(.6, '#b3140c'); g.addColorStop(1, '#12040a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    function (t) { // emblem draws on
      ctx.fillStyle = '#08090c'; ctx.fillRect(0, 0, W, H);
      var r = Math.min(W, H) * .22, n = 6; ctx.strokeStyle = ACC; ctx.lineWidth = 3;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) { var a = i / n * 6.283 - 1.5708; ctx.lineTo(W / 2 + Math.cos(a) * r, H * .42 + Math.sin(a) * r); }
      ctx.setLineDash([r * 7]); ctx.lineDashOffset = r * 7 * (1 - Math.min(1, t * 1.6)); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(W / 2, H * .42, r * .35 * ease(Math.min(1, t * 2)), 0, 7); ctx.fillStyle = ACC; ctx.fill();
    }
  ];

  function draw() {
    var f = Math.min(.9999, prog) * scenes.length, i = Math.floor(f), t = f - i;
    scenes[i](t);
    if (i !== shown) { shown = i; title.textContent = names[i]; num.textContent = i + 1; }
    bar.style.width = (prog * 100) + '%';
  }
  function read() {
    var r = track.getBoundingClientRect(), max = r.height - window.innerHeight;
    prog = max > 0 ? Math.max(0, Math.min(1, -r.top / max)) : 0;
    if (visible) draw();
  }
  window.addEventListener('scroll', read, { passive: true });
  window.addEventListener('resize', function () { size(); read(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) read(); }).observe(track);
  size(); read();
})();
