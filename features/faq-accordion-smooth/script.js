/* Smooth-height FAQ accordion. Scoped to each .faq-wrap; set data-single="false" to allow several open at once. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.faq-wrap'), function (root, w) {
    if (root.getAttribute('data-faq-ready')) return;
    root.setAttribute('data-faq-ready', '1');
    var triggers = Array.prototype.slice.call(root.querySelectorAll('.faq-trigger'));
    function panelOf(t) { return t.closest('.faq-item').querySelector('.faq-panel'); }
    function set(t, open) {
      t.setAttribute('aria-expanded', String(open));
      panelOf(t).classList.toggle('is-open', open);
    }
    triggers.forEach(function (t, i) {
      var p = panelOf(t), uid = 'faq' + w + '-' + i;
      t.id = uid + '-q'; p.id = uid + '-p';
      t.setAttribute('aria-controls', p.id); p.setAttribute('aria-labelledby', t.id);
      t.addEventListener('click', function () {
        var open = t.getAttribute('aria-expanded') !== 'true';
        if (open && root.getAttribute('data-single') !== 'false') triggers.forEach(function (o) { if (o !== t) set(o, false); });
        set(t, open);
      });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowDown') n = triggers[(i + 1) % triggers.length];
        else if (e.key === 'ArrowUp') n = triggers[(i - 1 + triggers.length) % triggers.length];
        else if (e.key === 'Home') n = triggers[0];
        else if (e.key === 'End') n = triggers[triggers.length - 1];
        if (n) { e.preventDefault(); n.focus(); }
      });
    });
  });
})();
