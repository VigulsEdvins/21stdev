(function () {
  var roots = document.querySelectorAll('.ptw-demo');
  Array.prototype.forEach.call(roots, function (root) {
    if (root.getAttribute('data-ptw-ready')) return;
    root.setAttribute('data-ptw-ready', '1');
    var buttons = Array.prototype.slice.call(root.querySelectorAll('.ptw-opt'));
    var period = 'monthly';
    function setPeriod(next) {
      period = next;
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-period') === next;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      root.setAttribute('data-period', next);
      Array.prototype.forEach.call(root.querySelectorAll('.ptw-card'), function (card) {
        var a = card.querySelector('.ptw-amount');
        var per = card.querySelector('.ptw-per');
        var note = card.querySelector('.ptw-note');
        if (!a) return;
        var m = parseFloat(a.getAttribute('data-monthly')) || 0;
        var y = parseFloat(a.getAttribute('data-yearly')) || 0;
        a.textContent = String(next === 'yearly' ? y : m);
        if (per) per.textContent = next === 'yearly' ? '/ month, billed yearly' : '/ month';
        if (note) {
          var saved = (m - y) * 12;
          note.textContent = next === 'yearly' && saved > 0 ? 'Save $' + saved + ' a year' : (next === 'yearly' ? 'Free forever' : 'Billed every month');
        }
      });
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { setPeriod(b.getAttribute('data-period')); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = buttons[(i + d + buttons.length) % buttons.length];
        n.focus(); setPeriod(n.getAttribute('data-period'));
      });
    });
    setPeriod(period);
  });
})();
