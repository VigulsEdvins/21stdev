(function () {
  var track = document.querySelector('.mh-track');
  var cv = track.querySelector('.mh-canvas');
  var ctx = cv.getContext('2d');
  var clock = track.querySelector('.mh-clock');
  var bar = track.querySelector('.mh-bar i');
  var W = 0, H = 0, cur = 0, goal = 0, raf = 0, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stars = [];
  for (var i = 0; i < 90; i++) stars.push([Math.random(), Math.random() * 0.6, Math.random() * 1.4 + 0.3]);
  var SKY = [[0, [250, 190, 110], [255, 120, 80]], [0.5, [240, 110, 120], [110, 60, 140]], [1, [12, 16, 40], [30, 30, 80]]];
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
  function rgb(c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }
  function sky(p) {
    var i = p < 0.5 ? 0 : 1, t = i ? (p - 0.5) / 0.5 : p / 0.5;
    return [mix(SKY[i][1], SKY[i + 1][1], t), mix(SKY[i][2], SKY[i + 1][2], t)];
  }
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function hills(base, amp, col, ph) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 12) ctx.lineTo(x, base - amp * (Math.sin(x / W * 5 + ph) * 0.5 + Math.sin(x / W * 11 + ph * 2) * 0.25 + 0.5));
    ctx.lineTo(W, H); ctx.fill();
  }
  function draw(p) {
    var s = sky(p), g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(s[1])); g.addColorStop(1, rgb(s[0]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    stars.forEach(function (st) { ctx.globalAlpha = Math.max(0, (p - 0.55) * 2.2) * (0.5 + 0.5 * Math.sin(st[0] * 50 + p * 6)); ctx.beginPath(); ctx.arc(st[0] * W, st[1] * H, st[2], 0, 6.3); ctx.fill(); });
    ctx.globalAlpha = 1;
    var sx = W * (0.3 + 0.4 * p), sy = H * (0.35 + 0.5 * p), r = Math.min(W, H) * 0.09;
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
    glow.addColorStop(0, 'rgba(255,230,170,' + (0.8 * (1 - p)) + ')'); glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,240,200,' + Math.max(0, 1 - p * 1.1) + ')'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.3); ctx.fill();
    var mx = W * (0.85 - 0.5 * p), my = H * 0.25;
    ctx.fillStyle = 'rgba(240,244,255,' + Math.max(0, (p - 0.6) * 2.5) + ')'; ctx.beginPath(); ctx.arc(mx, my, r * 0.45, 0, 6.3); ctx.fill();
    hills(H * 0.82, H * 0.12, rgb(mix([120, 70, 80], [14, 18, 36], p)), 1);
    hills(H * 0.95, H * 0.1, rgb(mix([70, 40, 56], [6, 8, 20], p)), 3);
  }
  function update(p) {
    draw(p);
    var mins = 17 * 60 + 30 + Math.round(p * 150);
    clock.textContent = String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
  }
  function readGoal() {
    var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
    goal = Math.max(0, Math.min(1, -r.top / span));
  }
  function loop() {
    cur += (goal - cur) * (reduce ? 1 : 0.12);
    if (Math.abs(goal - cur) < 0.0005) cur = goal;
    update(cur);
    raf = (cur !== goal && visible) ? requestAnimationFrame(loop) : 0;
  }
  function kick() { readGoal(); if (!raf && visible) raf = requestAnimationFrame(loop); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { size(); kick(); update(cur); });
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) kick(); }).observe(track);
  size(); readGoal(); cur = goal; update(cur);
})();
