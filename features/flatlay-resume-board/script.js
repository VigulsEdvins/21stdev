(function () {
  var items = document.querySelectorAll('.fl-item');
  var top = 1;
  items.forEach(function (el) {
    var x = 0, y = 0, sx, sy, drag = false;
    el.tabIndex = 0;
    el.setAttribute('role', 'group');
    function set() { el.style.setProperty('--x', x + 'px'); el.style.setProperty('--y', y + 'px'); }
    el.addEventListener('pointerdown', function (e) {
      drag = true; sx = e.clientX - x; sy = e.clientY - y;
      el.style.zIndex = ++top; el.classList.add('is-drag');
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      x = e.clientX - sx; y = e.clientY - sy; set();
    });
    function end() { drag = false; el.classList.remove('is-drag'); }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
      if (!d) return;
      e.preventDefault(); x += d[0]; y += d[1]; el.style.zIndex = ++top; set();
    });
  });
})();
