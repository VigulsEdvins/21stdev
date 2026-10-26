(function () {
  var deck = document.getElementById('dkDeck');
  var cards = Array.prototype.slice.call(deck.querySelectorAll('.dk-card'));
  var live = document.getElementById('dkLive');
  var autoBtn = document.getElementById('dkAuto');
  var order = cards.slice();
  var busy = false, timer = null, visible = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rest(pos) {
    var rot = [0, -4, 5, -7, 8][pos % 5];
    var y = Math.min(pos, 4) * 7, s = 1 - Math.min(pos, 4) * 0.04;
    return 'translate(' + (pos ? rot * 1.5 : 0) + 'px,' + y + 'px) rotate(' + rot + 'deg) scale(' + s + ')';
  }
  function layout() {
    order.forEach(function (c, i) {
      c.style.zIndex = order.length - i;
      c.style.transform = rest(i);
      c.classList.toggle('is-top', i === 0);
      c.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
    live.textContent = 'Card ' + (cards.indexOf(order[0]) + 1) + ' of ' + cards.length;
  }
  function throwTop(dx, dy) {
    if (busy) return;
    busy = true;
    var c = order[0];
    if (dx === undefined) { dx = (Math.random() < 0.5 ? -1 : 1) * 380; dy = -40; }
    c.classList.remove('is-drag');
    c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + dx / 12 + 'deg)';
    c.style.opacity = '0';
    setTimeout(function () {
      order.push(order.shift());
      c.style.transition = 'none';
      c.style.zIndex = 0;
      c.style.transform = rest(order.length - 1);
      void c.offsetWidth;
      c.style.transition = '';
      c.style.opacity = '';
      layout();
      busy = false;
    }, reduce ? 20 : 380);
  }
  function back() {
    if (busy) return;
    busy = true;
    var c = order.pop();
    order.unshift(c);
    c.style.transition = 'none';
    c.style.transform = 'translate(0,-60px) rotate(-10deg)';
    c.style.opacity = '0';
    void c.offsetWidth;
    c.style.transition = '';
    c.style.opacity = '';
    layout();
    setTimeout(function () { busy = false; }, reduce ? 20 : 400);
  }

  var sx = 0, sy = 0, dragging = null;
  deck.addEventListener('pointerdown', function (e) {
    var c = order[0];
    if (busy || !c.contains(e.target)) return;
    dragging = c; sx = e.clientX; sy = e.clientY;
    c.classList.add('is-drag');
    deck.setPointerCapture(e.pointerId);
  });
  deck.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    dragging.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + dx / 14 + 'deg)';
  });
  function release(e) {
    if (!dragging) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    var c = dragging; dragging = null;
    if (Math.hypot(dx, dy) > 90) throwTop(dx * 3, dy * 3);
    else { c.classList.remove('is-drag'); c.style.transform = rest(0); }
  }
  deck.addEventListener('pointerup', release);
  deck.addEventListener('pointercancel', release);

  document.getElementById('dkNext').addEventListener('click', function () { throwTop(); });
  document.getElementById('dkPrev').addEventListener('click', back);
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); throwTop(380, -30); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  });

  function schedule() {
    clearInterval(timer);
    if (autoBtn.getAttribute('aria-pressed') === 'true' && visible) timer = setInterval(function () { if (!dragging) throwTop(); }, 2600);
  }
  autoBtn.addEventListener('click', function () {
    autoBtn.setAttribute('aria-pressed', autoBtn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    schedule();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; schedule(); }).observe(deck);
  }
  layout();
})();
