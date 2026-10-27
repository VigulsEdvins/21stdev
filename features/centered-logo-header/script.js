(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.clh-demo'), function (root, rn) {
    var burger = root.querySelector('.clh-burger');
    var panel = root.querySelector('.clh-mobile');
    if (!burger || !panel) return;
    panel.id = 'clh-mobile-' + rn; burger.setAttribute('aria-controls', panel.id);
    function setOpen(open) { burger.setAttribute('aria-expanded', String(open)); panel.hidden = !open; }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); burger.focus(); } });
  });
})();
