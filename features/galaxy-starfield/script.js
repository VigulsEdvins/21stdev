(function () {
  var sky = document.getElementById('nsSky');
  var canvas = document.getElementById('nsCanvas');
  if (!sky || !canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COUNT = 3400;
  var stars = [];
  var w = 0, h = 0, dpr = 1;
  var yaw = 0, pitch = 0.15, tx = 0, ty = 0, lx = 0, ly = 0;
  var visible = true, raf = 0, last = 0, clock = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    stars.length = 0;
    for (var i = 0; i < COUNT; i++) {
      // uniform direction on a sphere, thinned toward a dusty band at the equator
      var z = rand(-1, 1);
      if (Math.abs(z) < 0.18 && Math.random() < 0.45) z *= 2.2;
      var a = rand(0, Math.PI * 2);
      var r = Math.sqrt(Math.max(0, 1 - z * z));
      var big = Math.random() < 0.025;
      stars.push({
        x: Math.cos(a) * r, y: z, z: Math.sin(a) * r,
        size: big ? rand(1.5, 2.4) : rand(0.4, 1.2),
        phase: rand(0, 6.28), speed: rand(0.6, 2.4), big: big,
        hue: Math.random() < 0.2 ? 205 : (Math.random() < 0.3 ? 35 : 230)
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = sky.clientWidth; h = sky.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function nebula() {
    var blobs = [
      [0.28, 0.35, 0.55, 'rgba(110,70,200,0.20)'],
      [0.72, 0.62, 0.5, 'rgba(30,170,170,0.16)'],
      [0.5, 0.5, 0.35, 'rgba(180,90,170,0.10)']
    ];
    var ox = -yaw * 40, oy = pitch * 60;
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var R = Math.max(w, h) * b[2];
      var g = ctx.createRadialGradient(w * b[0] + ox * (i + 1) * 0.4, h * b[1] + oy, 0,
        w * b[0] + ox * (i + 1) * 0.4, h * b[1] + oy, R);
      g.addColorStop(0, b[3]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function draw() {
    ctx.fillStyle = '#04050d';
    ctx.fillRect(0, 0, w, h);
    nebula();

    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var f = Math.max(w, h) * 0.9;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var x = s.x * cy - s.z * sy;
      var z = s.x * sy + s.z * cy;
      var y = s.y * cp - z * sp;
      z = s.y * sp + z * cp;
      if (z < 0.08) continue;
      var px = w / 2 + (x / z) * f * 0.5;
      var py = h / 2 + (y / z) * f * 0.5;
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue;
      var tw = 0.55 + 0.45 * Math.sin(clock * s.speed + s.phase);
      var a = Math.min(1, tw * (0.4 + z * 0.6));
      ctx.fillStyle = 'hsla(' + s.hue + ',70%,' + (s.big ? 90 : 82) + '%,' + a.toFixed(2) + ')';
      var r = s.size * (0.7 + z * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 6.283);
      ctx.fill();
      if (s.big && tw > 0.85) {
        var L = r * 7 * (tw - 0.5);
        ctx.strokeStyle = 'hsla(' + s.hue + ',80%,92%,' + (a * 0.6).toFixed(2) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px - L, py); ctx.lineTo(px + L, py);
        ctx.moveTo(px, py - L); ctx.lineTo(px, py + L);
        ctx.stroke();
      }
    }
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    lx += (tx - lx) * 0.05;
    ly += (ty - ly) * 0.05;
    yaw += dt * 0.025;
    pitch = 0.15 + ly * 0.25;
    yaw += lx * dt * 0.12;
    draw();
    schedule();
  }

  function schedule() {
    if (!raf && visible && !reduce) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  sky.addEventListener('pointermove', function (e) {
    var r = sky.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  sky.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
  window.addEventListener('resize', resize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(sky);
  }

  seed();
  resize();
  schedule();
})();
