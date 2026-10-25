(function () {
  var header = document.getElementById('sshHeader');
  var burger = document.getElementById('sshBurger');
  var nav = document.getElementById('sshNav');
  if (!header || !burger || !nav) return;
  var scroller = window;
  function update() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    header.classList.toggle('is-scrolled', y > 40);
  }
  scroller.addEventListener('scroll', update, { passive: true });
  update();
  function setOpen(open) {
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
})();
