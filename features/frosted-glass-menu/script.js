(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.fm-nav'), function (nav, n) {
    var btn = nav.querySelector('.fm-toggle');
    var panel = nav.querySelector('.fm-panel');
    panel.id = 'fm-panel-' + n; btn.setAttribute('aria-controls', panel.id);
    function set(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
      if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
    }
    panel.setAttribute('inert', '');
    btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
    });
  });
})();
