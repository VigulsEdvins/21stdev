(function () {
  var cv = document.querySelector('[data-ko-canvas]');
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 300, GOLD = Math.PI * (3 - Math.sqrt(5));
  var legends = 'QWERTYUIOPASDFGHJKLZXCVBNM<>?/+=#@&*'.split('');
  var kinds = [
    { c: [34, 37, 52], ink: '#e9ebf5', gloss: 0.55 },
    { c: [214, 216, 226], ink: '#22232c', gloss: 0.8 },
    { c: [240, 168, 58], ink: '#2a1a05', gloss: 0.7 },
    { c: [47, 183, 166], ink: '#04231f', gloss: 0.7 },
    { c: [60, 92, 255], ink: '#f2f5ff', gloss: 0.9 },
    { c: [190, 215, 255], ink: '#ffffff', gloss: 1, glass: true }
  ];
  var L = norm([-0.55, -0.7, 0.62]);
  var H = norm([L[0], L[1], L[2] + 1]);
  var keys = [], W = 0, Hh = 0, dpr = 1, R = 100, D = 400;
  var ry = 0.6, rx = -0.25, vy = 0, vx = 0, drag = false, lx = 0, ly = 0, visible = true, raf = 0, t0 = 0;

  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = GOLD * i;
    var n = [Math.cos(th) * r, y, Math.sin(th) * r];
    var up = Math.abs(n[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    var u = norm(cross(up, n)), v = cross(n, u);
    var k = (i * 7 + ((i / 5) | 0)) % 11;
    var kind = kinds[k < 4 ? 0 : k < 6 ? 1 : k < 7 ? 2 : k < 8 ? 3 : k < 10 ? 4 : 5];
    keys.push({ n: n, u: u, v: v, kind: kind, ch: legends[i % legends.length], lift: 0.04 * ((i * 13) % 5) / 4 });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r0 = cv.getBoundingClientRect();
    W = Math.max(200, r0.width); Hh = Math.max(200, r0.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    R = Math.min(W * 0.34, Hh * 0.265); D = R * 4.4;
  }

  // view rotation: yaw (ry) then pitch (rx); returns [x, y, z] with +z toward the viewer
  var cy_, sy_, cx_, sx_;
  function setRot() { cy_ = Math.cos(ry); sy_ = Math.sin(ry); cx_ = Math.cos(rx); sx_ = Math.sin(rx); }
  function rotV(p) {
    var x = p[0] * cy_ + p[2] * sy_, z = -p[0] * sy_ + p[2] * cy_, y = p[1];
    var y2 = y * cx_ - z * sx_, z2 = y * sx_ + z * cx_;
    return [x, y2, z2];
  }
  function proj(p) { var s = D / (D - p[2]); return [W / 2 + p[0] * s, Hh * 0.56 + p[1] * s, s]; }
  function shade(c, k, a) { return 'rgba(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ',' + a + ')'; }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - t0) / 1000 || 0.016); t0 = now;
    if (!drag) {
      var auto = reduce ? 0 : 0.18;
      vy += (auto - vy) * Math.min(1, dt * 1.5);
      vx *= Math.pow(0.04, dt);
      ry += vy * dt; rx += vx * dt;
      rx = Math.max(-1.2, Math.min(1.2, rx));
    }
    draw();
    if (visible && (!reduce || drag || Math.abs(vy) > 0.001 || Math.abs(vx) > 0.001)) raf = requestAnimationFrame(frame);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    setRot();
    // floor shadow
    ctx.save(); ctx.translate(W / 2, Hh * 0.56 + R * 1.3); ctx.scale(1, 0.2);
    var sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.2);
    sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6); ctx.restore();
    // core sphere so gaps between caps are dark, not see-through
    var cg = ctx.createRadialGradient(W / 2 - R * 0.3, Hh * 0.56 - R * 0.35, R * 0.1, W / 2, Hh / 2, R * 1.0);
    cg.addColorStop(0, 'rgb(40,44,70)'); cg.addColorStop(1, 'rgb(6,7,14)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(W / 2, Hh * 0.56, R * 0.95, 0, 7); ctx.fill();

    var list = [];
    for (var i = 0; i < keys.length; i++) {
      var K = keys[i], c = rotV(K.n);
      list.push({ k: K, c: c });
    }
    list.sort(function (a, b) { return a.c[2] - b.c[2]; });

    var s0 = R * 0.098, t = 0.8;
    for (var j = 0; j < list.length; j++) {
      var K2 = list[j].k, cn = list[j].c;
      if (cn[2] < -0.55) continue; // deep back side hidden behind the core
      var un = rotV(K2.u), vn = rotV(K2.v);
      var hgt = R * (0.1 + K2.lift);
      var depthK = 0.45 + 0.55 * (cn[2] * 0.5 + 0.5);
      var base = [], top = [];
      var sg = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (var q = 0; q < 4; q++) {
        var a = sg[q][0], b = sg[q][1];
        var bp = [cn[0] * R + (un[0] * a + vn[0] * b) * s0, cn[1] * R + (un[1] * a + vn[1] * b) * s0, cn[2] * R + (un[2] * a + vn[2] * b) * s0];
        var tp = [cn[0] * (R + hgt) + (un[0] * a + vn[0] * b) * s0 * t, cn[1] * (R + hgt) + (un[1] * a + vn[1] * b) * s0 * t, cn[2] * (R + hgt) + (un[2] * a + vn[2] * b) * s0 * t];
        base.push(bp); top.push(tp);
      }
      var kc = K2.kind.c, alpha = K2.kind.glass ? 0.62 : 1;
      var cam = [0, 0, D];
      // side faces
      for (var e = 0; e < 4; e++) {
        var e2 = (e + 1) % 4;
        var ctr = [(base[e][0] + base[e2][0] + top[e][0] + top[e2][0]) / 4, (base[e][1] + base[e2][1] + top[e][1] + top[e2][1]) / 4, (base[e][2] + base[e2][2] + top[e][2] + top[e2][2]) / 4];
        var ed = [base[e2][0] - base[e][0], base[e2][1] - base[e][1], base[e2][2] - base[e][2]];
        var up2 = [top[e][0] - base[e][0], top[e][1] - base[e][1], top[e][2] - base[e][2]];
        var fn = norm(cross(ed, up2));
        var mid = [ctr[0] - cn[0] * R, ctr[1] - cn[1] * R, ctr[2] - cn[2] * R];
        if (dot(fn, mid) < 0) fn = [-fn[0], -fn[1], -fn[2]];
        var toCam = [cam[0] - ctr[0], cam[1] - ctr[1], cam[2] - ctr[2]];
        if (dot(fn, toCam) <= 0) continue;
        var dif = Math.max(0, dot(fn, L));
        var p0 = proj(base[e]), p1 = proj(base[e2]), p2 = proj(top[e2]), p3 = proj(top[e]);
        ctx.fillStyle = shade(kc, (0.28 + 0.62 * dif) * depthK, alpha * (K2.kind.glass ? 0.8 : 1));
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.fill();
        if (K2.kind.glass) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.6; ctx.stroke(); }
      }
      // top face
      var tn = cn, tc = [cn[0] * (R + hgt), cn[1] * (R + hgt), cn[2] * (R + hgt)];
      var facing = dot(tn, norm([cam[0] - tc[0], cam[1] - tc[1], cam[2] - tc[2]]));
      if (facing <= 0) continue;
      var P = top.map(proj);
      var dif2 = Math.max(0, dot(tn, L));
      var g = ctx.createLinearGradient(P[0][0], P[0][1], P[2][0], P[2][1]);
      g.addColorStop(0, shade(kc, (0.55 + 0.75 * dif2) * depthK * 1.08, alpha));
      g.addColorStop(1, shade(kc, (0.35 + 0.6 * dif2) * depthK, alpha));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (var m = 1; m < 4; m++) ctx.lineTo(P[m][0], P[m][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 + 0.12 * dif2) + ')'; ctx.lineWidth = 0.8; ctx.stroke();
      // specular highlight (Blinn)
      var spec = Math.pow(Math.max(0, dot(tn, H)), 36) * K2.kind.gloss;
      var pc = proj(tc);
      if (spec > 0.04) {
        var sr = s0 * t * pc[2] * 1.3;
        var sg2 = ctx.createRadialGradient(pc[0] - sr * 0.2, pc[1] - sr * 0.2, 0, pc[0], pc[1], sr);
        sg2.addColorStop(0, 'rgba(255,255,255,' + Math.min(0.95, spec * 1.3) + ')'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.clip(); ctx.fillStyle = sg2; ctx.fillRect(pc[0] - sr, pc[1] - sr, sr * 2, sr * 2); ctx.restore();
      }
      // legend, mapped onto the top face with an affine transform
      if (facing > 0.35 && pc[2] * s0 > 7) {
        var o = P[0], ax = [(P[1][0] - P[0][0]) / 2, (P[1][1] - P[0][1]) / 2], bx = [(P[3][0] - P[0][0]) / 2, (P[3][1] - P[0][1]) / 2];
        ctx.save();
        ctx.setTransform(ax[0] * dpr, ax[1] * dpr, bx[0] * dpr, bx[1] * dpr, (o[0] + ax[0] + bx[0]) * dpr, (o[1] + ax[1] + bx[1]) * dpr);
        ctx.fillStyle = K2.kind.ink; ctx.globalAlpha = Math.min(1, (facing - 0.35) * 2.2) * 0.9;
        ctx.font = '700 0.9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(K2.ch, 0, 0.05);
        ctx.restore();
      }
    }
    // soft sphere rim light on top of everything
    var rim = ctx.createRadialGradient(W / 2, Hh * 0.56, R * 0.85, W / 2, Hh * 0.56, R * 1.22);
    rim.addColorStop(0, 'rgba(120,150,255,0)'); rim.addColorStop(1, 'rgba(120,150,255,0.10)');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(W / 2, Hh * 0.56, R * 1.22, 0, 7); ctx.fill();
  }

  function kick() { if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(frame); } }
  cv.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; vy = vx = 0; cv.setPointerCapture(e.pointerId); kick(); });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    ry += dx * 0.008; rx = Math.max(-1.2, Math.min(1.2, rx - dy * 0.008));
    vy = vy * 0.5 + (dx * 0.008 * 60) * 0.5; vx = vx * 0.5 + (-dy * 0.008 * 60) * 0.5;
  });
  function up() { drag = false; if (reduce) { vy = vx = 0; } kick(); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', function () { resize(); draw(); });
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  resize(); draw(); kick();
})();
