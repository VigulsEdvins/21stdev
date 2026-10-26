(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.nav-demo-shell'), function (shell) {
    var btn = shell.querySelector('.burger-btn');
    var label = shell.querySelector('.burger-label');
    var menu = shell.querySelector('.overlay-menu');
    if (!btn || !menu) return;
    function setOpen(open) {
      shell.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'CLOSE' : 'MENU';
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    }
    menu.setAttribute('inert', '');
    btn.addEventListener('click', function () { setOpen(!shell.classList.contains('is-open')); });
    shell.querySelectorAll('.menu-links a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); setOpen(false); });
    });
    shell.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shell.classList.contains('is-open')) { setOpen(false); btn.focus(); } });
  });
})();
