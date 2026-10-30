(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.clh-demo'), function (root, rn) {
    var burger = root.querySelector('.clh-burger');
    var panel = root.querySelector('.clh-mobile');
    if (!burger || !panel) return;
    panel.id = 'clh-mobile-' + rn; burger.setAttribute('aria-controls', panel.id);
    // the phone menu is a copy of the desktop links (text and address), made when it opens, so each link is edited in one place
    function fill() {
      panel.textContent = '';
      Array.prototype.forEach.call(root.querySelectorAll('.clh-nav a'), function (a) {
        var c = a.cloneNode(true); c.removeAttribute('data-edv-nav'); panel.appendChild(c);
      });
    }
    function setOpen(open) { if (open) fill(); burger.setAttribute('aria-expanded', String(open)); panel.hidden = !open; }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); burger.focus(); } });
  });
})();
