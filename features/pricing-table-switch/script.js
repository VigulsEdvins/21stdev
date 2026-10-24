(function () {
  var root = document.querySelector('.ptw-demo');
  if (!root) return;
  var buttons = root.querySelectorAll('.ptw-opt');
  function setPeriod(period) {
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-period') === period;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    root.querySelectorAll('.ptw-amount').forEach(function (a) { a.textContent = a.getAttribute('data-' + period); });
    root.querySelectorAll('.ptw-per').forEach(function (p) { p.textContent = '/ month' + (period === 'yearly' ? ', billed yearly' : ''); });
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { setPeriod(b.getAttribute('data-period')); }); });
})();
