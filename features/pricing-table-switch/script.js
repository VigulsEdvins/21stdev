(function () {
  var roots = document.querySelectorAll('.ptw-demo');
  Array.prototype.forEach.call(roots, function (root) {
    if (root.getAttribute('data-ptw-ready')) return;
    root.setAttribute('data-ptw-ready', '1');
    var buttons = Array.prototype.slice.call(root.querySelectorAll('.ptw-opt'));
    var period = 'monthly';
    function setPeriod(next) {
      period = next;
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-period') === next;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      root.setAttribute('data-period', next);
      Array.prototype.forEach.call(root.querySelectorAll('.ptw-card'), function (card) {
        var a = card.querySelector('.ptw-amount');
        var per = card.querySelector('.ptw-per');
        var note = card.querySelector('.ptw-note');
        if (!a) return;
        // the two prices are plain text in the card, so they can be edited in the Content tab or the admin panel
        var mEl = card.querySelector('.ptw-m'), yEl = card.querySelector('.ptw-y');
        var num = function (el, attr) { return parseFloat(el ? el.textContent.replace(',', '.').replace(/[^0-9.]/g, '') : a.getAttribute(attr)) || 0; };
        var m = num(mEl, 'data-monthly');
        var y = num(yEl, 'data-yearly');
        a.textContent = String(next === 'yearly' ? y : m);
        // keep the price as typed (9,99 stays 9,99)
        var typed = (next === 'yearly' ? yEl : mEl);
        if (typed && typed.textContent.trim()) a.textContent = typed.textContent.trim();
        a.setAttribute('data-cms-edit', next === 'yearly' ? '.ptw-y' : '.ptw-m');
        if (per) per.textContent = next === 'yearly' ? '/ month, billed yearly' : '/ month';
        if (note) {
          var cur = card.querySelector('.ptw-cur');
          var saved = Math.round((m - y) * 12 * 100) / 100;
          note.textContent = next === 'yearly' && saved > 0 ? 'Save ' + (cur ? cur.textContent : '$') + saved + ' a year' : (next === 'yearly' ? 'Free forever' : 'Billed every month');
        }
      });
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { setPeriod(b.getAttribute('data-period')); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = buttons[(i + d + buttons.length) % buttons.length];
        n.focus(); setPeriod(n.getAttribute('data-period'));
      });
    });
    // one currency for every plan: the first sign is the one to edit
    var curs = root.querySelectorAll('.ptw-cur');
    function syncCur() { for (var i = 1; i < curs.length; i++) curs[i].textContent = curs[0].textContent; }
    if (curs.length && window.MutationObserver) new MutationObserver(function () { syncCur(); setPeriod(period); }).observe(curs[0], { childList: true, characterData: true, subtree: true });
    syncCur();
    setPeriod(period);
    // an edited price (Content tab, admin panel) shows at once
    if (window.MutationObserver) {
      var watch = new MutationObserver(function () { setPeriod(period); });
      Array.prototype.forEach.call(root.querySelectorAll('.ptw-vals'), function (v) { watch.observe(v, { childList: true, characterData: true, subtree: true }); });
    }
  });
})();
