(function () {
  var rail = document.getElementById('smRail'), box = document.getElementById('smYears');
  var cards = rail.querySelectorAll('.sm-card'), btns = [];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  cards.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = c.querySelector('.sm-year').textContent;
    b.addEventListener('click', function () { rail.scrollTo({ left: c.offsetLeft - cards[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' }); });
    box.appendChild(b); btns.push(b);
  });
  function sync() {
    var best = 0, bd = 1e9;
    cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - cards[0].offsetLeft - rail.scrollLeft); if (d < bd) { bd = d; best = i; } });
    if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4) best = cards.length - 1;
    btns.forEach(function (b, i) { b.classList.toggle('is-on', i === best); });
  }
  rail.addEventListener('scroll', sync, { passive: true });
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') rail.scrollBy({ left: 300, behavior: 'smooth' });
    if (e.key === 'ArrowLeft') rail.scrollBy({ left: -300, behavior: 'smooth' });
  });
  sync();
})();
