(function () {
  var text = [
    'A flat rear deck takes crates, a child seat or a stack of boxes up to 80 kg.',
    'Roll-top bags hang low on both sides, so heavy shopping never raises the centre of gravity.',
    'A small front rack carries a bag, a laptop case or a pet crate within easy reach.',
    'A second battery clips under the frame and stretches one charge to 160 km.'
  ];
  var tabs = document.querySelectorAll('.hc-tab');
  var mounts = document.querySelectorAll('.hc-mount');
  var panel = document.getElementById('hcPanel');
  function pick(i) {
    Array.prototype.forEach.call(tabs, function (t) { var on = +t.dataset.mount === i; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(mounts, function (m) { m.classList.toggle('is-on', +m.dataset.mount === i); });
    panel.textContent = text[i];
  }
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener('click', function () { pick(+t.dataset.mount); });
    t.addEventListener('keydown', function (e) {
      var i = +t.dataset.mount, n = tabs.length;
      if (e.key === 'ArrowRight') { pick((i + 1) % n); tabs[(i + 1) % n].focus(); }
      if (e.key === 'ArrowLeft') { pick((i + n - 1) % n); tabs[(i + n - 1) % n].focus(); }
    });
  });
  pick(0);
  var burger = document.getElementById('hcBurger'), links = document.getElementById('hcLinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', function () { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
})();
