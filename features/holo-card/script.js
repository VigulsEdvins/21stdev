(function () {
  var card = document.getElementById('pfCard'), flip = document.getElementById('pfFlip');
  var opts = document.querySelectorAll('.pf-opt[data-f]');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function set(x, y, on) {
    var px = x * 100, py = y * 100;
    card.style.setProperty('--mx', px + '%'); card.style.setProperty('--my', py + '%');
    card.style.setProperty('--rx', reduce ? '0deg' : ((.5 - y) * 26) + 'deg'); card.style.setProperty('--ry', reduce ? '0deg' : ((x - .5) * 30) + 'deg');
    card.style.setProperty('--int', on ? Math.min(1, .55 + Math.hypot(x - .5, y - .5)) : 0);
  }
  card.addEventListener('pointermove', function (e) {
    var r = card.getBoundingClientRect();
    card.classList.add('is-live');
    set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
  });
  card.addEventListener('pointerleave', function () { card.classList.remove('is-live'); set(.5, .5, false); });
  function doFlip() { card.classList.toggle('is-flipped'); }
  card.addEventListener('click', doFlip);
  card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFlip(); } });
  flip.addEventListener('click', doFlip);
  Array.prototype.forEach.call(opts, function (b) {
    b.addEventListener('click', function () {
      card.dataset.finish = b.dataset.f;
      Array.prototype.forEach.call(opts, function (o) { var on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on); });
    });
  });
  set(.35, .3, true);
})();
