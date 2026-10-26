(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.ssh-demo'), function (root, rn) {
    var header = root.querySelector('.ssh-header');
    var burger = root.querySelector('.ssh-burger');
    var nav = root.querySelector('.ssh-nav');
    if (!header || !burger || !nav) return;
    nav.id = 'ssh-nav-' + rn; burger.setAttribute('aria-controls', nav.id);
    function update() { header.classList.toggle('is-scrolled', root.scrollTop > 40); }
    root.addEventListener('scroll', update, { passive: true });
    update();
    function setOpen(open) {
      burger.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
  });
})();
