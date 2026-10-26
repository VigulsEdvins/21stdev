(function () {
  var pool = document.getElementById('cwPool');
  var canvas = document.getElementById('cwCanvas');
  var dropBtn = document.getElementById('cwDrop');
  if (!pool || !canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CELL = 5;
  var gw = 0, gh = 0, cur, prev, img;
  var visible = true, raf = 0, clock = 0, nextRain = 0, last = 0;
  var pointer = null;

  function setup() {
    var w = pool.clientWidth + 28, h = pool.clientHeight + 28;
    gw = Math.max(40, Math.round(w / CELL));
    gh = Math.max(40, Math.round(h / CELL));
    canvas.width = gw; canvas.height = gh;
    cur = new Float32Array(gw * gh);
    prev = new Float32Array(gw * gh);
    img = ctx.createImageData(gw, gh);
    for (var i = 0; i < img.data.length; i += 4) { img.data[i] = 46; img.data[i + 1] = 150; img.data[i + 2] = 170; img.data[i + 3] = 255; }
  }

  function splash(gx, gy, amp, rad) {
    var r = rad || 3;
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        var d = Math.sqrt(x * x + y * y);
        if (d > r) continue;
        var fall = 0.5 * (1 + Math.cos(Math.PI * d / r));
        var px = Math.round(gx) + x, py = Math.round(gy) + y;
        if (px < 1 || py < 1 || px >= gw - 1 || py >= gh - 1) continue;
        cur[py * gw + px] += amp * fall;
      }
    }
  }

  function step() {
    var damp = 0.985;
    for (var y = 1; y < gh - 1; y++) {
      for (var x = 1; x < gw - 1; x++) {
        var i = y * gw + x;
        var n = (cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) * 0.5 - prev[i];
        prev[i] = n * damp;
      }
    }
    var t = cur; cur = prev; prev = t;
  }

  function paint() {
    var d = img.data;
    for (var y = 2; y < gh - 2; y++) {
      for (var x = 2; x < gw - 2; x++) {
        var i = y * gw + x;
        var lap = (cur[i - 2] + cur[i + 2] + cur[i - 2 * gw] + cur[i + 2 * gw] - 4 * cur[i]) * 0.7;
        var slopeX = cur[i + 1] - cur[i - 1];
        // bright where the surface focuses light (curving down), plus a slow ambient shimmer
        var c = Math.max(0, -lap * 0.9);
        var shimmer = 0.5 + 0.5 * Math.sin(x * 0.07 + clock * 0.5) * Math.sin(y * 0.09 - clock * 0.4);
        var base = 0.42 + slopeX * 0.05 + shimmer * 0.04;
        var k = i * 4;
        var gl = Math.min(1, c);
        d[k] = Math.min(255, 20 + base * 60 + gl * 235);
        d[k + 1] = Math.min(255, 90 + base * 130 + gl * 170);
        d[k + 2] = Math.min(255, 110 + base * 120 + gl * 140);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    nextRain -= dt;
    if (nextRain <= 0) {
      splash(rnd(8, gw - 8), rnd(8, gh - 8), rnd(6, 12), 2);
      nextRain = rnd(0.8, 2.4);
    }
    step(); step();
    paint();
    schedule();
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function schedule() {
    if (!raf && visible && !reduce) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function toGrid(e) {
    var r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * gw, (e.clientY - r.top) / r.height * gh];
  }
  canvas.addEventListener('pointerdown', function (e) {
    pointer = toGrid(e);
    splash(pointer[0], pointer[1], 14, 3);
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = toGrid(e);
    if (pointer || e.buttons) {
      splash(p[0], p[1], 6, 3);
      pointer = p;
    } else {
      splash(p[0], p[1], 1.2, 2);
    }
  });
  window.addEventListener('pointerup', function () { pointer = null; });
  dropBtn.addEventListener('click', function () {
    splash(rnd(10, gw - 10), rnd(10, gh - 10), 22, 4);
    if (reduce) { for (var i = 0; i < 30; i++) step(); paint(); }
  });

  window.addEventListener('resize', function () { setup(); paint(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(pool);
  }

  setup();
  splash(gw / 2, gh / 2, 20, 4);
  paint();
  schedule();
})();
