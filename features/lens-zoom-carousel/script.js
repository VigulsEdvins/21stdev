(function () {
  var wrap = document.getElementById('zpWrap');
  var stage = document.getElementById('zpStage');
  if (!wrap || !stage) return;
  var slides = Array.prototype.slice.call(stage.querySelectorAll('.zp-slide'));
  var numEl = document.getElementById('zpNum');
  var titleEl = document.getElementById('zpTitle');
  var live = document.getElementById('zpLive');
  var index = 0, busy = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function show(next, dir) {
    if (busy || next === index) return;
    busy = true;
    var oldEl = slides[index], newEl = slides[next];
    var d = dir > 0 ? 'fwd' : 'back';

    [oldEl, newEl].forEach(function (el) { el.className = el.className.replace(/\s*(in|out|ghost)-\S+/g, ''); });
    oldEl.classList.remove('is-current');
    oldEl.classList.add('is-leaving', 'out-' + d);
    newEl.classList.add('is-current', 'in-' + d);

    var ghosts = [0, 1].map(function (n) {
      var g = newEl.cloneNode(true);
      g.className = 'zp-slide ' + slides[next].className.split(' ').filter(function (c) { return /^zp-s\d/.test(c); }).join(' ') +
        ' is-ghost ghost-' + d + (n ? ' ghost-2' : '');
      g.setAttribute('aria-hidden', 'true');
      stage.appendChild(g);
      return g;
    });

    index = next;
    numEl.textContent = pad(next + 1);
    titleEl.textContent = newEl.getAttribute('data-title');
    live.textContent = 'Slide ' + (next + 1) + ' of ' + slides.length + ': ' + newEl.getAttribute('data-title');

    setTimeout(function () {
      ghosts.forEach(function (g) { g.remove(); });
      oldEl.classList.remove('is-leaving', 'out-' + d);
      newEl.classList.remove('in-' + d);
      busy = false;
    }, 950);
  }

  function go(dir) { show((index + dir + slides.length) % slides.length, dir); }

  document.getElementById('zpNext').addEventListener('click', function () { go(1); });
  document.getElementById('zpPrev').addEventListener('click', function () { go(-1); });
  wrap.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  var sx = null;
  wrap.addEventListener('pointerdown', function (e) { sx = e.clientX; });
  wrap.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  });
})();
