// Style page helper: reads the real tokens from the page and prints every colour pair's contrast, so the page cannot drift from tokens.css.
(function () {
  'use strict';
  var root = getComputedStyle(document.documentElement);
  function token(name) { return root.getPropertyValue(name).trim(); }
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255; }).map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  document.querySelectorAll('[data-token]').forEach(function (el) {
    var name = el.getAttribute('data-token');
    var v = token(name);
    el.querySelector('.chip').style.background = v;
    el.querySelector('.hex').textContent = v;
  });
  var body = document.getElementById('pair-rows');
  if (!body) return;
  JSON.parse(document.getElementById('pair-data').textContent).forEach(function (p) {
    var fg = token(p[0]), bg = token(p[1]), need = p[2] === 'large' ? 3 : 4.5, r = ratio(fg, bg);
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><span class="sample" style="color:' + fg + ';background:' + bg + (p[2] === 'large' ? ';font-size:24px' : '') + '">Aa sample text</span></td><td>' + p[0] + ' on ' + p[1] + '</td><td>' + p[3] + '</td><td>' + r.toFixed(2) + ':1</td><td class="' + (r >= need ? 'pass' : 'fail') + '">' + (r >= need ? 'Pass' : 'Fail') + ' (needs ' + need + ')</td>';
    body.appendChild(tr);
  });
  var open = document.getElementById('open-modal'), dlg = document.getElementById('demo-modal');
  if (open && dlg && dlg.showModal) { open.addEventListener('click', function () { dlg.showModal(); }); dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); }); }
})();
