(function () {
  var nav = document.getElementById('fmNav');
  var btn = document.getElementById('fmToggle');
  var panel = document.getElementById('fmPanel');
  function set(open) {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
    if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
  }
  panel.setAttribute('inert', '');
  btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
  });
})();
