(function () {
  var stage = document.getElementById('lbStage'), card = document.getElementById('lbCard'), tilt = document.getElementById('lbTilt');
  var btn = document.getElementById('lbBtn');
  var P = { L: document.getElementById('lbL'), R: document.getElementById('lbR'), Ls: document.getElementById('lbLs'), Rs: document.getElementById('lbRs'), Lt: document.getElementById('lbLt'), Rt: document.getElementById('lbRt') };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // QR-like patterns drawn from a tiny seeded generator
  function qr(svg, seed) {
    var s = seed, rects = '';
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    function finder(ox, oy) { rects += '<rect x="' + ox + '" y="' + oy + '" width="7" height="7"/><rect x="' + (ox + 1) + '" y="' + (oy + 1) + '" width="5" height="5" style="fill:rgb(250,250,252)"/><rect x="' + (ox + 2) + '" y="' + (oy + 2) + '" width="3" height="3"/>'; }
    for (var y = 0; y < 21; y++) for (var x = 0; x < 21; x++) {
      if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
      if (rnd() > 0.52) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    finder(0, 0); finder(14, 0); finder(0, 14);
    svg.innerHTML = rects;
  }
  var qrs = stage.querySelectorAll('[data-qr]');
  for (var q = 0; q < qrs.length; q++) qr(qrs[q], 4021 + q * 77);

  var N = 8, SEG = 0, W = 0, H = 0, CW = 0, CH = 0, ROD = 0, dt = 1 / 60, G = 2400;
  var pts = [], cons = [], C, B, ancL, ancR, strandL = [], strandR = [];
  function pt(x, y, w) { var p = { x: x, y: y, px: x, py: y, w: w }; pts.push(p); return p; }
  function build() {
    var r = stage.getBoundingClientRect(); W = r.width; H = r.height; CW = card.offsetWidth; CH = card.offsetHeight;
    var cx = W / 2, half = Math.min(78, W * 0.17), clipY = Math.min(H * 0.34, 190);
    ROD = CH * 0.46; SEG = (Math.hypot(half, clipY) * 1.02) / N;
    pts = []; cons = []; strandL = []; strandR = [];
    ancL = pt(cx - half, -14, 0); ancR = pt(cx + half, -14, 0);
    C = pt(cx, clipY, 0.55); B = pt(cx, clipY + ROD, 0.2);
    function strand(a, list) {
      var prev = a; list.push(a);
      for (var i = 1; i < N; i++) { var t = i / N, p = pt(a.x + (cx - a.x) * t, a.y + (clipY - a.y) * t, 1); cons.push([prev, p, SEG, 0]); list.push(p); prev = p; }
      cons.push([prev, C, SEG, 0]); list.push(C);
    }
    strand(ancL, strandL); strand(ancR, strandR);
    cons.push([C, B, ROD, 1]);
    if (!reduce) { B.px -= 9; B.py -= 3; }
  }
  var drag = false, grab = { x: 0, y: 0 }, tx = 0, ty = 0, lastX = 0, lastY = 0, mvx = 0, mvy = 0, moved = 0, running = false, vis = true, last = 0, acc = 0, sleepT = 0;
  var tiltY = 0, tiltS = 0, back = false;

  function step() {
    var i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i]; if (!p.w) continue;
      var vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * dt * dt * (p === B ? 1.2 : 1);
    }
    for (var it = 0; it < 14; it++) {
      for (i = 0; i < cons.length; i++) {
        var c = cons[i], a = c[0], b = c[1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        if (!c[3] && d <= c[2]) continue;
        var ws = a.w + b.w; if (!ws) continue;
        var k = (d - c[2]) / d / ws;
        a.x += dx * k * a.w; a.y += dy * k * a.w; b.x -= dx * k * b.w; b.y -= dy * k * b.w;
      }
      if (drag) { B.x = tx + grab.x; B.y = ty + grab.y; }
    }
    if (drag) { B.px = B.x - mvx * dt * 0.9; B.py = B.y - mvy * dt * 0.9; }
    // keep inside the stage
    for (i = 0; i < pts.length; i++) { p = pts[i]; if (p.w) { p.x = Math.max(20, Math.min(W - 20, p.x)); p.y = Math.min(H - 20, p.y); } }
  }
  function smooth(list) {
    var d = 'M' + list[0].x.toFixed(1) + ' ' + list[0].y.toFixed(1);
    for (var i = 1; i < list.length - 1; i++) { var m = { x: (list[i].x + list[i + 1].x) / 2, y: (list[i].y + list[i + 1].y) / 2 }; d += 'Q' + list[i].x.toFixed(1) + ' ' + list[i].y.toFixed(1) + ' ' + m.x.toFixed(1) + ' ' + m.y.toFixed(1); }
    var e = list[list.length - 1]; return d + 'L' + e.x.toFixed(1) + ' ' + e.y.toFixed(1);
  }
  function render() {
    var dL = smooth(strandL), dR = smooth(strandR);
    P.L.setAttribute('d', dL); P.R.setAttribute('d', dR); P.Ls.setAttribute('d', dL); P.Rs.setAttribute('d', dR); P.Lt.setAttribute('d', dL); P.Rt.setAttribute('d', dR);
    var ang = Math.atan2(B.x - C.x, B.y - C.y);
    var vxs = (B.x - B.px) / dt;
    tiltY += (Math.max(-28, Math.min(28, vxs * 0.035)) - tiltY) * 0.15;
    tiltS += (ang - tiltS) * 0.2;
    card.style.transform = 'translate(' + (C.x - CW / 2).toFixed(1) + 'px,' + C.y.toFixed(1) + 'px) rotate(' + (-ang).toFixed(4) + 'rad)';
    tilt.style.transform = 'rotateY(' + tiltY.toFixed(2) + 'deg) rotateX(' + (Math.min(8, Math.abs(tiltY) * 0.15)).toFixed(2) + 'deg)';
    card.style.setProperty('--lb-hx', (50 + ang * 160 + tiltY * 2.2).toFixed(1) + '%');
    card.style.setProperty('--lb-sx', (50 - ang * 220 - tiltY * 3).toFixed(1) + '%');
  }
  function frame(now) {
    raf = 0; if (!vis) { running = false; return; }
    var el = Math.min(0.05, (now - last) / 1000); last = now; acc += el;
    while (acc >= dt) { step(); acc -= dt; }
    render();
    var e = Math.abs(B.x - B.px) + Math.abs(B.y - B.py) + Math.abs(C.x - C.px) + Math.abs(tiltY) * 0.1;
    sleepT = (e < 0.02 && !drag) ? sleepT + el : 0;
    if (sleepT > 1.2) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }
  var raf = 0;
  function wake() { sleepT = 0; if (!running && vis) { running = true; last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); } }

  function flip(v) { back = typeof v === 'boolean' ? v : !back; card.classList.toggle('is-back', back); card.setAttribute('aria-pressed', back ? 'true' : 'false'); btn.textContent = back ? 'Show front' : 'Show back'; if (!reduce) { B.px += back ? 6 : -6; wake(); } }
  card.addEventListener('pointerdown', function (e) {
    var r = stage.getBoundingClientRect(); drag = true; moved = 0; card.classList.add('is-drag'); card.setPointerCapture(e.pointerId);
    tx = e.clientX - r.left; ty = e.clientY - r.top; grab.x = B.x - tx; grab.y = B.y - ty; lastX = tx; lastY = ty; mvx = mvy = 0; wake();
  });
  card.addEventListener('pointermove', function (e) {
    if (!drag) return; var r = stage.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; moved += Math.abs(tx - lastX) + Math.abs(ty - lastY);
    mvx = mvx * 0.5 + ((tx - lastX) * 60) * 0.5; mvy = mvy * 0.5 + ((ty - lastY) * 60) * 0.5; lastX = tx; lastY = ty;
  });
  function up() { if (!drag) return; drag = false; card.classList.remove('is-drag'); if (moved < 6) flip(); wake(); }
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
  card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  btn.addEventListener('click', function () { flip(); });
  window.addEventListener('resize', function () { build(); render(); wake(); });
  new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) wake(); }).observe(stage);
  build(); render(); wake();
})();
