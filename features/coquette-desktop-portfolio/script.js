(function () {
  var desk = document.getElementById('srDesk'), layer = document.getElementById('srWindows');
  var data = {}, z = 10, open = {};
  var tpl = document.getElementById('srData').content.querySelectorAll('section');
  Array.prototype.forEach.call(tpl, function (s) { data[s.dataset.id] = { title: s.dataset.title, html: s.innerHTML }; });

  function openWin(id) {
    if (open[id]) { open[id].style.zIndex = ++z; return; }
    var d = data[id], n = Object.keys(open).length;
    var w = document.createElement('div');
    w.className = 'sr-win'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', d.title);
    w.innerHTML = '<div class="sr-head"><span>' + d.title + '</span><button class="sr-x" aria-label="Close ' + d.title + '">&#10005;</button></div><div class="sr-body">' + d.html + '</div>';
    layer.appendChild(w);
    var dw = desk.clientWidth, dh = desk.clientHeight;
    w.style.left = Math.max(8, Math.min(dw - w.offsetWidth - 8, dw / 2 - w.offsetWidth / 2 + (n % 3 - 1) * 40)) + 'px';
    w.style.top = Math.max(50, Math.min(dh - w.offsetHeight - 90, dh / 2 - w.offsetHeight / 2 - 40 + n * 28)) + 'px';
    w.style.zIndex = ++z; open[id] = w;
    w.addEventListener('pointerdown', function () { w.style.zIndex = ++z; });
    w.querySelector('.sr-x').addEventListener('click', function () { w.remove(); delete open[id]; });
    drag(w, w.querySelector('.sr-head'));
  }

  function drag(w, h) {
    var sx, sy, ox, oy, on = false;
    h.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.sr-x')) return;
      on = true; sx = e.clientX; sy = e.clientY; ox = w.offsetLeft; oy = w.offsetTop; h.setPointerCapture(e.pointerId);
    });
    h.addEventListener('pointermove', function (e) {
      if (!on) return;
      var x = Math.max(0, Math.min(desk.clientWidth - w.offsetWidth, ox + e.clientX - sx));
      var y = Math.max(32, Math.min(desk.clientHeight - 60, oy + e.clientY - sy));
      w.style.left = x + 'px'; w.style.top = y + 'px';
    });
    h.addEventListener('pointerup', function () { on = false; });
  }

  desk.addEventListener('click', function (e) {
    var b = e.target.closest('[data-win]'); if (b) openWin(b.dataset.win);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var last = Object.keys(open).pop(); if (last) { open[last].remove(); delete open[last]; } }
  });
  var clock = document.getElementById('srClock');
  function tick() { var d = new Date(); clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  tick(); setInterval(tick, 20000);
})();
