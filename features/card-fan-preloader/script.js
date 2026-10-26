(function () {
  var page = document.querySelector('.cf-page');
  var pct = document.getElementById('cfPct');
  var label = document.getElementById('cfLabel');
  var content = document.getElementById('cfContent');
  var total = 4200, start = null;
  function tick(t) {
    if (start === null) start = t;
    var p = Math.min(1, (t - start) / total);
    var eased = 1 - Math.pow(1 - p, 2);
    pct.textContent = Math.round(eased * 100) + '%';
    if (p < 1) { requestAnimationFrame(tick); return; }
    label.textContent = 'Ready';
    setTimeout(function () {
      page.classList.add('is-done');
      content.removeAttribute('aria-hidden');
    }, 250);
  }
  requestAnimationFrame(tick);
})();
