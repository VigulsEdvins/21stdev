(function () {
  var panes = Array.prototype.slice.call(document.querySelectorAll('.gf-pane'));
  var count = document.querySelector('.gf-count');
  var n = panes.length, cur = 0, timer = null;
  function render() {
    panes.forEach(function (p, i) {
      var pos = (i - cur + n) % n;
      p.dataset.pos = pos;
      p.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      p.tabIndex = pos === 0 ? -1 : 0;
    });
    count.textContent = (cur + 1) + ' / ' + n;
  }
  function go(d) { cur = (cur + d + n) % n; render(); }
  document.querySelector('.gf-next').addEventListener('click', function () { go(1); restart(); });
  document.querySelector('.gf-prev').addEventListener('click', function () { go(-1); restart(); });
  panes.forEach(function (p, i) {
    p.addEventListener('click', function () { cur = i; render(); restart(); });
    p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cur = i; render(); restart(); } });
  });
  function restart() {
    clearInterval(timer);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { go(1); }, 5000);
  }
  var sec = document.querySelector('.gf-section');
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { if (e[0].isIntersecting) restart(); else clearInterval(timer); }).observe(sec);
  else restart();
  render();
})();
