(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.mmh-item'));
  var triggers = items.map(function (li) { return li.querySelector('.mmh-trigger'); }).filter(Boolean);
  var closeTimer = null;
  function panelOf(t) { return document.getElementById(t.getAttribute('aria-controls')); }
  function closeAll(except) {
    triggers.forEach(function (t) {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      var p = panelOf(t); if (p) p.hidden = true;
    });
  }
  // A panel opened by hovering is "pending": the first click pins it open instead of toggling it shut.
  function open(t, byHover) {
    clearTimeout(closeTimer);
    closeAll(t);
    t.__hover = !!byHover;
    t.setAttribute('aria-expanded', 'true');
    var p = panelOf(t); if (p) p.hidden = false;
  }
  triggers.forEach(function (t) {
    var li = t.closest('.mmh-item');
    t.addEventListener('click', function () {
      if (t.getAttribute('aria-expanded') === 'true') {
        if (t.__hover) t.__hover = false; // pin it
        else closeAll();
      } else open(t, false);
    });
    li.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) open(t, true); });
    li.addEventListener('mouseleave', function () { if (t.__hover) closeTimer = setTimeout(closeAll, 180); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { open(t); var a = panelOf(t).querySelector('a'); if (a) { e.preventDefault(); a.focus(); } }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var expanded = triggers.filter(function (t) { return t.getAttribute('aria-expanded') === 'true'; })[0];
    if (expanded) { closeAll(); expanded.focus(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.mmh-item')) closeAll(); });
  document.querySelectorAll('.mmh-panel').forEach(function (panel) {
    panel.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(panel.querySelectorAll('a'));
      var i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) links[i - 1].focus(); else { var t = document.querySelector('[aria-controls="' + panel.id + '"]'); if (t) t.focus(); } }
    });
    panel.addEventListener('focusout', function (e) {
      if (!panel.contains(e.relatedTarget) && !(e.relatedTarget && e.relatedTarget.getAttribute && e.relatedTarget.getAttribute('aria-controls') === panel.id)) closeAll();
    });
  });
})();
