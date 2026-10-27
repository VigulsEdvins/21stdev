(function () {
  var track = document.querySelector('[data-tc-track]');
  var cardsBox = document.querySelector('[data-tc-cards]');
  var nav = document.querySelector('[data-tc-nav]');
  var cards = Array.prototype.slice.call(cardsBox.children);
  var n = cards.length;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  var parts = cards.map(function (card, i) {
    var inner = card.querySelector('.tc-inner');
    var pts = [], steps = 22, k;
    for (k = 0; k <= steps; k++) pts.push([(k / steps) * 100, 50 + (rnd() - 0.5) * 7]);
    var seam = pts.map(function (p) { return p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%'; });
    var topPoly = 'polygon(0 0,100% 0,' + seam.slice().reverse().join(',') + ')';
    var botPoly = 'polygon(' + seam.join(',') + ',100% 100%,0 100%)';
    card.removeChild(inner);
    var top = document.createElement('div'), bot = document.createElement('div');
    top.className = 'tc-piece'; bot.className = 'tc-piece';
    top.style.clipPath = topPoly; bot.style.clipPath = botPoly;
    top.appendChild(inner);
    var copy = inner.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a,button').forEach(function (a) { a.tabIndex = -1; });
    bot.appendChild(copy);
    card.appendChild(top); card.appendChild(bot);
    card.style.zIndex = n - i;
    var b = document.createElement('button');
    b.className = 'tc-dot'; b.type = 'button'; b.textContent = i + 1;
    b.setAttribute('aria-label', 'Go to chapter ' + (i + 1));
    b.addEventListener('click', function () { goTo(i); });
    nav.appendChild(b);
    return { top: top, bot: bot, card: card, dot: b };
  });

  function goTo(i) {
    var span = track.offsetHeight - window.innerHeight;
    var y = track.getBoundingClientRect().top + window.scrollY + (i / (n - 1)) * span;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }

  function update() {
    var span = track.offsetHeight - window.innerHeight;
    var p = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / span)) * (n - 1);
    var cur = Math.min(n - 1, Math.floor(p + 0.0001));
    var t = p - cur;
    parts.forEach(function (o, i) {
      var vis = i === cur || i === cur + 1;
      o.card.style.visibility = vis ? 'visible' : 'hidden';
      var tt = i === cur ? t : 0;
      o.top.style.transform = 'translateY(' + (-tt * 105) + '%) rotate(' + (-tt * 5) + 'deg)';
      o.bot.style.transform = 'translateY(' + (tt * 105) + '%) rotate(' + (tt * 4) + 'deg)';
      if (i === cur + 1) {
        o.top.style.transform = o.bot.style.transform = 'scale(' + (0.94 + 0.06 * t) + ')';
      }
      o.dot.setAttribute('aria-current', i === Math.round(p) ? 'true' : 'false');
    });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
