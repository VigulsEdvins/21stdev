(function () {
  var zone = document.getElementById('mcbZone');
  var btn = document.getElementById('mcbButton');
  if (!zone || !btn) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !calm) {
    var STRENGTH = 0.32;
    zone.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      btn.classList.add('is-near');
      btn.style.setProperty('--x', (dx * STRENGTH).toFixed(1) + 'px');
      btn.style.setProperty('--y', (dy * STRENGTH).toFixed(1) + 'px');
    });
    zone.addEventListener('pointerleave', function () {
      btn.classList.remove('is-near');
      btn.style.setProperty('--x', '0px');
      btn.style.setProperty('--y', '0px');
    });
  }
  btn.addEventListener('click', function (e) {
    if (calm) return;
    var layer = btn.querySelector('.mcb-ripple-layer');
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2;
    var d = document.createElement('span');
    d.className = 'mcb-ripple';
    d.style.width = d.style.height = size + 'px';
    d.style.left = (e.clientX - r.left - size / 2) + 'px';
    d.style.top = (e.clientY - r.top - size / 2) + 'px';
    layer.appendChild(d);
    setTimeout(function () { d.remove(); }, 700);
  });
})();
