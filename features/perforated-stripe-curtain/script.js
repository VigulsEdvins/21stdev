(function () {
  var stage = document.getElementById('psStage');
  var cv = document.getElementById('psCanvas');
  var ctx = cv.getContext('2d');
  var btn = document.getElementById('psPlay');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, strips = [], px = -999, on = false, visible = true, raf = 0;
  var grey = [150, 150, 158], tint = [255, 122, 89];
  var mix = 0;

  function build() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(10, Math.round(W / 38)), w = W / n;
    strips = [];
    for (var i = 0; i < n; i++) strips.push({ x: i * w, w: w - 3, a: 0, v: 0, len: H * (0.82 + Math.random() * 0.16), ph: Math.random() * 6 });
  }
  function frame(t) {
    raf = 0;
    ctx.clearRect(0, 0, W, H);
    mix += ((on ? 1 : 0) - mix) * 0.04;
    var col = [0, 1, 2].map(function (k) { return Math.round(grey[k] + (tint[k] - grey[k]) * mix); });
    for (var i = 0; i < strips.length; i++) {
      var s = strips[i], cx = s.x + s.w / 2;
      var d = cx - px, fall = Math.exp(-(d * d) / (2 * 70 * 70));
      var target = (d >= 0 ? 1 : -1) * fall * 0.3 + Math.sin(t / 900 + s.ph) * 0.03;
      s.v += (target - s.a) * 0.08; s.v *= 0.86; s.a += s.v;
      ctx.save();
      ctx.translate(cx, 0); ctx.rotate(s.a);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgb(' + col.join(',') + ')';
      ctx.fillRect(-s.w / 2, 0, s.w, s.len);
      ctx.globalCompositeOperation = 'destination-out';
      for (var y = 22; y < s.len - 10; y += 26) { ctx.beginPath(); ctx.arc(0, y, 3.2, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  stage.addEventListener('pointermove', function (e) { px = e.clientX - stage.getBoundingClientRect().left; kick(); });
  stage.addEventListener('pointerleave', function () { px = -999; });
  btn.addEventListener('click', function () {
    on = !on;
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? 'Cover the picture' : 'Reveal the picture');
    stage.classList.toggle('is-on', on);
    kick();
  });
  window.addEventListener('resize', function () { build(); kick(); });
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(stage);
  build(); kick();
  if (reduce) { frame(0); btn.addEventListener('click', function () { setTimeout(function () { mix = on ? 1 : 0; frame(0); }, 0); }); }
})();
