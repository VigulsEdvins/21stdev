(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.wt-tab'));
  var panel = document.querySelector('.wt-panel');
  var content = panel.querySelector('.wt-content');
  var band = panel.querySelector('.wt-band');
  var data = [
    '<h2>One calm place for everything</h2><p>Bring notes, tasks and files into a single workspace that stays out of your way.</p>',
    '<h2>Built for focus</h2><ul><li>Instant search across all items</li><li>Keyboard first navigation</li><li>Works offline, syncs later</li></ul>',
    '<h2>Simple pricing</h2><p>One flat price for the whole team, billed monthly.</p><div class="wt-big">$12 / mo</div>'
  ];
  var cur = 0, busy = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 600px)');
  content.innerHTML = data[0];

  function swap(i) { content.innerHTML = data[i]; panel.setAttribute('aria-labelledby', tabs[i].id); }
  function select(i) {
    if (i === cur || busy) return;
    var dir = i > cur ? 1 : -1;
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    cur = i;
    if (reduce || narrow.matches || !band.animate) {
      busy = true; content.style.transition = 'opacity .2s'; content.style.opacity = 0;
      setTimeout(function () { swap(i); content.style.opacity = 1; busy = false; }, 200);
      return;
    }
    busy = true;
    var from = dir > 0 ? '-100%' : '100%', to = dir > 0 ? '100%' : '-100%';
    var a = band.animate([
      { transform: 'translateX(' + from + ') skewX(-12deg)' },
      { transform: 'translateX(0) skewX(-12deg)', offset: .5 },
      { transform: 'translateX(' + to + ') skewX(-12deg)' }
    ], { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)' });
    setTimeout(function () { swap(i); }, 450);
    a.onfinish = a.oncancel = function () { busy = false; };
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return; e.preventDefault();
      var n = (i + k + tabs.length) % tabs.length; tabs[n].focus(); select(n);
    });
  });
})();
