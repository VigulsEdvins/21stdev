(function () {
  var switches = Array.prototype.slice.call(document.querySelectorAll('.tsw-switch'));
  var status = document.getElementById('tswStatus');
  function count() {
    var on = switches.filter(function (s) { return s.getAttribute('aria-checked') === 'true'; }).length;
    if (status) status.textContent = on + ' of ' + switches.length + ' notifications on';
  }
  switches.forEach(function (s) {
    s.addEventListener('click', function () {
      s.setAttribute('aria-checked', s.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      count();
    });
  });
  var seg = document.querySelector('.tsw-seg');
  if (!seg) return;
  var radios = Array.prototype.slice.call(seg.querySelectorAll('[role=radio]'));
  var thumb = seg.querySelector('.tsw-thumb');
  function choose(i, focus) {
    radios.forEach(function (r, n) { r.setAttribute('aria-checked', String(n === i)); r.tabIndex = n === i ? 0 : -1; });
    thumb.style.setProperty('--i', i);
    if (focus) radios[i].focus();
  }
  radios.forEach(function (r, i) {
    r.addEventListener('click', function () { choose(i, false); });
    r.addEventListener('keydown', function (e) {
      var n = radios.length;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choose((i + 1) % n, true); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choose((i - 1 + n) % n, true); }
    });
  });
})();
