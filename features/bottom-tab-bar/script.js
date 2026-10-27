(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.btb-demo'), function (root) {
  var tabs = Array.prototype.slice.call(root.querySelectorAll('.btb-tab'));
  var pill = root.querySelector('.btb-pill');
  var title = root.querySelector('.btb-title');
  var text = root.querySelector('.btb-text');
  if (!tabs.length || !pill) return;
  function select(i, focus) {
    tabs.forEach(function (t, n) {
      var on = n === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    pill.style.setProperty('--i', i);
    title.textContent = tabs[i].getAttribute('data-title');
    text.textContent = tabs[i].getAttribute('data-text');
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i, false); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length;
      if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
      else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
    });
  });
  });
})();
