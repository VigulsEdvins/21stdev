(function () {
  var burger = document.getElementById('clhBurger');
  var panel = document.getElementById('clhMobile');
  if (!burger || !panel) return;
  function setOpen(open) { burger.setAttribute('aria-expanded', String(open)); panel.hidden = !open; }
  burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); burger.focus(); } });
})();
