(function () {
  var stage = document.getElementById('lbStage'), card = document.getElementById('lbCard'), btn = document.getElementById('lbBtn');
  var pathL = document.getElementById('lbL'), pathR = document.getElementById('lbR'), pathS = document.getElementById('lbS'), buckle = document.getElementById('lbBuckle');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, cw = 0, ringY = 0, p = { x: 0, y: 0 }, v = { x: 0, y: 0 };
  var drag = false, off = { x: 0, y: 0 }, moved = 0, run = false, vis = true, lastT = 0;

  function layout() {
    var r = stage.getBoundingClientRect(); W = r.width; cw = card.offsetWidth;
    ringY = Math.max(130, r.height * 0.3);
    render();
  }
  function render() {
    var cx = W / 2, tx = cx + p.x, ty = ringY + p.y;
    var ang = Math.max(-35, Math.min(35, p.x * 0.22));
    card.style.transform = 'translate(' + (tx - cw / 2).toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + ang.toFixed(2) + 'deg)';
    var bx = cx + p.x * 0.35, by = ringY * 0.62 + p.y * 0.35;
    var sw = Math.min(70, W * 0.12);
    pathL.setAttribute('d', 'M' + (cx - sw) + ' -10 Q' + (cx - sw * 0.6 + p.x * 0.1) + ' ' + (by * 0.5) + ' ' + (bx - 5) + ' ' + by);
    pathR.setAttribute('d', 'M' + (cx + sw) + ' -10 Q' + (cx + sw * 0.6 + p.x * 0.1) + ' ' + (by * 0.5) + ' ' + (bx + 5) + ' ' + by);
    buckle.setAttribute('x', bx - 13); buckle.setAttribute('y', by - 2);
    pathS.setAttribute('d', 'M' + bx + ' ' + (by + 12) + ' L' + tx + ' ' + (ty + 14));
  }
  function loop(t) {
    var dt = Math.min(2, (t - lastT) / 16.7 || 1); lastT = t;
    if (!drag) {
      v.x += -p.x * 0.045 * dt; v.y += -p.y * 0.045 * dt;
      v.x *= Math.pow(0.95, dt); v.y *= Math.pow(0.95, dt);
      p.x += v.x * dt; p.y += v.y * dt;
      p.y = Math.min(p.y, 40);
    }
    render();
    if (drag || Math.abs(p.x) + Math.abs(p.y) + Math.abs(v.x) + Math.abs(v.y) > 0.05) requestAnimationFrame(loop);
    else { p.x = p.y = 0; render(); run = false; }
  }
  function kick() { if (!run && vis) { run = true; lastT = performance.now(); requestAnimationFrame(loop); } }

  function flip(on) {
    var b = on === undefined ? !card.classList.contains('is-back') : on;
    card.classList.toggle('is-back', b);
    card.setAttribute('aria-pressed', String(b));
    btn.textContent = b ? 'Show front' : 'Show back';
  }
  card.addEventListener('pointerdown', function (e) {
    drag = true; moved = 0; card.classList.add('is-drag'); card.setPointerCapture(e.pointerId);
    off.x = e.clientX - p.x; off.y = e.clientY - p.y; v.x = v.y = 0; kick();
  });
  card.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var nx = e.clientX - off.x, ny = Math.min(e.clientY - off.y, 120);
    moved += Math.abs(nx - p.x) + Math.abs(ny - p.y);
    // the strap stops the card from going further than its length
    var len = Math.hypot(nx, ny), max = 190;
    if (len > max) { nx *= max / len; ny *= max / len; }
    v.x = nx - p.x; v.y = ny - p.y; p.x = nx; p.y = ny;
  });
  function up() { if (!drag) return; drag = false; card.classList.remove('is-drag'); if (moved < 6) flip(); kick(); }
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    var d = { ArrowLeft: -60, ArrowRight: 60 }[e.key];
    if (d) { e.preventDefault(); v.x += d * 0.12; kick(); }
  });
  btn.addEventListener('click', function () { flip(); });

  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }).observe(stage);
  window.addEventListener('resize', layout);
  layout();
  if (!reduce) { v.x = 14; kick(); } // small welcome swing
})();
