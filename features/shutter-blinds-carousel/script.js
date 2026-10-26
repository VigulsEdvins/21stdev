(function () {
  var scenes = [
    { t: 'Harbour at dawn', d: 'Cold light on still water and a single boat leaving early.', bg: 'radial-gradient(circle at 70% 38%, #ffe3b0 0 7%, transparent 8%), linear-gradient(180deg, #f6b98a 0%, #e98f7a 38%, #3d5a80 39%, #1f3550 100%)' },
    { t: 'Salt flats', d: 'A horizon so flat the sky seems to fold back on itself.', bg: 'linear-gradient(180deg, #7fb8e6 0%, #cfe8f7 49%, #f1f1ec 50%, #d7d6cf 100%)' },
    { t: 'Night market', d: 'Paper lanterns, steam, and a hundred small conversations.', bg: 'radial-gradient(circle at 20% 60%, #ffb347 0 6%, transparent 14%), radial-gradient(circle at 55% 45%, #ff6b6b 0 7%, transparent 15%), radial-gradient(circle at 82% 62%, #ffd166 0 6%, transparent 14%), linear-gradient(180deg, #120a24, #2a1244)' },
    { t: 'Pine ridge', d: 'Cold air, wet needles and a trail that only goes up.', bg: 'linear-gradient(160deg, transparent 0 55%, #14352a 56% 100%), linear-gradient(200deg, transparent 0 62%, #0d261e 63% 100%), linear-gradient(180deg, #a8dadc, #457b6d)' }
  ];
  var N = 8, stage = document.getElementById('sfStage'), base = document.getElementById('sfBase'), slats = document.getElementById('sfSlats');
  var count = document.getElementById('sfCount'), title = document.getElementById('sfTitle'), text = document.getElementById('sfText');
  var cur = 0, busy = false, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = [];
  for (var i = 0; i < N; i++) {
    var s = document.createElement('div'); s.className = 'sf-slat'; s.style.top = (i * 100 / N) + '%';
    slats.appendChild(s); els.push(s);
  }
  base.style.background = scenes[0].bg;
  function slatBg(el, i, bg) { el.style.background = bg; el.style.backgroundSize = '100% ' + (N * 100) + '%'; el.style.backgroundPosition = '0 ' + (i * 100 / (N - 1)) + '%'; }
  function fixBase() { base.style.background = scenes[cur].bg; }
  function go(dir) {
    if (busy) return; busy = true;
    var next = (cur + dir + scenes.length) % scenes.length, sc = scenes[next];
    stage.classList.add('is-busy');
    els.forEach(function (el, i) {
      slatBg(el, i, sc.bg); el.classList.remove('is-in'); void el.offsetWidth;
      var k = dir > 0 ? i : N - 1 - i;
      el.style.animationDelay = (reduce ? 0 : k * 70) + 'ms'; el.classList.add('is-in');
    });
    var total = reduce ? 50 : 700 + (N - 1) * 70;
    count.textContent = '0' + (next + 1) + ' / 0' + scenes.length; title.textContent = sc.t; text.textContent = sc.d;
    setTimeout(function () {
      cur = next; fixBase(); stage.classList.remove('is-busy');
      els.forEach(function (el) { el.classList.remove('is-in'); el.style.animationDelay = ''; });
      busy = false;
    }, total + 40);
  }
  document.getElementById('sfNext').addEventListener('click', function () { go(1); });
  document.getElementById('sfPrev').addEventListener('click', function () { go(-1); });
  stage.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
})();
