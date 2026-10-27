(function () {
  var cv = document.getElementById('mgCanvas'), ctx = cv.getContext('2d');
  var page = document.getElementById('mgPage');
  var idxEl = document.getElementById('mgIdx'), spEl = document.getElementById('mgSpecies');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // petals, length, width, tip (0 round .. 1 pointed), layers, hue outer/inner, centre
  var SP = [
    { n: 5,  len: 150, w: .95, tip: .1, layers: 1, c1: [350, 78, 52], c2: [8, 85, 66], core: 22, name: 'Meadow poppy' },
    { n: 11, len: 170, w: .42, tip: .55, layers: 2, c1: [268, 52, 48], c2: [292, 60, 72], core: 26, name: 'Violet aster' },
    { n: 8,  len: 128, w: .62, tip: .9, layers: 2, c1: [38, 90, 52], c2: [52, 95, 70], core: 30, name: 'Golden marigold' }
  ];
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.mg-chapter'));
  var pos = 0, target = 0, t0 = performance.now(), visible = true, raf = 0;

  function lerp(a, b, k) { return a + (b - a) * k; }
  function mix(A, B, k) { return A.map(function (v, i) { return lerp(v, B[i], k); }); }
  function hsl(c, a) { return 'hsla(' + c[0] + ',' + c[1] + '%,' + c[2] + '%,' + (a == null ? 1 : a) + ')'; }

  function params(p) {
    var i = Math.min(SP.length - 2, Math.floor(p)), k = p - i;
    k = k * k * (3 - 2 * k);
    var a = SP[i], b = SP[i + 1], o = {};
    ['n', 'len', 'w', 'tip', 'layers', 'core'].forEach(function (key) { o[key] = lerp(a[key], b[key], k); });
    o.c1 = mix(a.c1, b.c1, k); o.c2 = mix(a.c2, b.c2, k);
    return o;
  }

  function petal(len, w, tip) {
    var half = len * .26 * w * 2, sh = lerp(.5, .78, tip);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(half, len * .25, half * lerp(1, .55, tip), len * sh, 0, len);
    ctx.bezierCurveTo(-half * lerp(1, .55, tip), len * sh, -half, len * .25, 0, 0);
    ctx.closePath();
  }

  function draw(time) {
    var W = cv.width, H = cv.height, cx = W / 2, cy = H * .38;
    ctx.clearRect(0, 0, W, H);
    var sway = reduce ? 0 : Math.sin(time / 1700) * .035;
    // stem
    ctx.save();
    ctx.strokeStyle = '#3f6b45'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, H); ctx.quadraticCurveTo(cx + 26 + sway * 300, H * .7, cx + sway * 200, cy + 10); ctx.stroke();
    ctx.fillStyle = '#4f8556';
    [[.82, -1], [.66, 1]].forEach(function (l) {
      var y = H * l[0], x = cx + 14 * l[1];
      ctx.save(); ctx.translate(x, y); ctx.rotate(l[1] * (.9 + sway)); ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(46, -28, 110, 0); ctx.quadraticCurveTo(46, 22, 0, 0); ctx.fill(); ctx.restore();
    });
    ctx.restore();

    var p = params(pos), n = p.n, count = Math.ceil(n), L = Math.round(p.layers);
    ctx.save(); ctx.translate(cx + sway * 200, cy); ctx.rotate(sway * 1.5);
    for (var layer = 0; layer < 2; layer++) {
      var amt = layer === 0 ? 1 : Math.min(1, Math.max(0, p.layers - 1));
      if (amt <= 0.001) continue;
      var scale = layer === 0 ? 1 : .68, off = layer * (Math.PI / n);
      for (var i = 0; i < 14; i++) {
        var vis = Math.min(1, Math.max(0, n - i)) * amt;
        if (vis <= 0.001) continue;
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / n + off + Math.PI);
        var len = p.len * scale * vis;
        var g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, hsl(layer ? p.c1 : p.c2)); g.addColorStop(1, hsl(layer ? p.c2 : p.c1));
        ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 8;
        petal(len, p.w, p.tip); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, len * .1); ctx.lineTo(0, len * .8); ctx.stroke();
        ctx.restore();
      }
    }
    var cg = ctx.createRadialGradient(0, 0, 2, 0, 0, p.core);
    cg.addColorStop(0, 'hsl(' + (p.c1[0] + 40) + ',70%,32%)'); cg.addColorStop(1, 'hsl(' + (p.c1[0] + 30) + ',60%,20%)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, p.core, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,.85)';
    for (var d = 0; d < 16; d++) { var a = d * 2.4, r = p.core * .75 * Math.sqrt((d + 1) / 16); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function measure() {
    var vh = innerHeight, best = 0;
    var sc = chapters.map(function (c) { var r = c.getBoundingClientRect(); return (r.top + r.height / 2) - vh * .5; });
    // fractional index: how far the viewport centre has moved from chapter i toward chapter i+1
    var f = 0;
    if (sc[0] >= 0) f = 0; else if (sc[sc.length - 1] <= 0) f = chapters.length - 1;
    else for (var i = 0; i < sc.length - 1; i++) if (sc[i] <= 0 && sc[i + 1] > 0) { f = i + (-sc[i]) / (sc[i + 1] - sc[i]); break; }
    target = f;
  }

  function tick(now) {
    raf = 0;
    measure();
    pos += (target - pos) * (reduce ? 1 : .12);
    if (Math.abs(target - pos) < .001) pos = target;
    draw(now);
    var near = Math.round(pos);
    idxEl.textContent = '0' + (near + 1); spEl.textContent = SP[near].name;
    if (visible) raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(page);
  start();

  var form = document.getElementById('mgForm'), note = document.getElementById('mgNote');
  form.addEventListener('submit', function (e) { e.preventDefault(); note.textContent = 'Thank you. The next issue is on its way.'; form.reset(); });
})();
