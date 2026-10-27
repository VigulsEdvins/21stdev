(function () {
  var band = document.querySelector('.ma-band');
  var svg = band.querySelector('.ma-view');
  var probe = band.querySelector('.ma-probe');
  var range = band.querySelector('.ma-range');
  var alt = band.querySelector('.ma-alt'), vel = band.querySelector('.ma-vel'), phase = band.querySelector('.ma-phase');
  var RX = 150, RY = 95, TILT = -18 * Math.PI / 180;
  var angle = 40, dragging = false, raf = 0, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pos(a) {
    var r = a * Math.PI / 180, x = RX * Math.cos(r), y = RY * Math.sin(r);
    return [x * Math.cos(TILT) - y * Math.sin(TILT), x * Math.sin(TILT) + y * Math.cos(TILT)];
  }
  function render() {
    var p = pos(angle);
    probe.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
    var r = angle * Math.PI / 180;
    alt.textContent = Math.round(412 + 38 * Math.cos(r));
    vel.textContent = (7.66 - 0.18 * Math.cos(r)).toFixed(2);
    phase.textContent = Math.sin(r) < 0 ? 'Day side' : 'Night side';
    range.value = Math.round(angle) % 360;
  }
  function fromPointer(e) {
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var q = pt.matrixTransform(svg.getScreenCTM().inverse());
    var x = q.x * Math.cos(-TILT) - q.y * Math.sin(-TILT), y = q.x * Math.sin(-TILT) + q.y * Math.cos(-TILT);
    angle = (Math.atan2(y / RY, x / RX) * 180 / Math.PI + 360) % 360;
    render();
  }
  probe.addEventListener('pointerdown', function (e) { dragging = true; probe.setPointerCapture(e.pointerId); cancelAnimationFrame(raf); });
  probe.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
  probe.addEventListener('pointerup', function () { dragging = false; drift(); });
  range.addEventListener('input', function () { angle = +range.value; render(); });
  function drift() {
    cancelAnimationFrame(raf);
    if (reduce) return;
    (function step() { if (!dragging && visible) { angle = (angle + 0.15) % 360; render(); } raf = requestAnimationFrame(step); })();
  }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(band);
  render(); drift();
})();
