(function () {
  var root = document.querySelector('.dw');
  if (!root) return;

  // Class rail: arrows scroll one card (419px + 12px gap).
  var rail = root.querySelector('.dw-rail');
  root.querySelectorAll('.dw-arrow[data-dir]').forEach(function (b) {
    b.addEventListener('click', function () { rail.scrollBy({ left: 431 * +b.dataset.dir, behavior: 'smooth' }); });
  });

  // Practice tabs swap the table text with a short fade.
  var data = [
    { name: 'sauna', desc: 'Temperatures sit between 80 and 85°C / 175 and 185°F with humidity from 10 to 20%.', list: ['Sharper focus + clear head', 'Faster recovery after training', 'Morning energy without coffee', 'Warm muscles, easy joints'], time: '15 to 20 minutes', freq: '3 to 7 times per week', img: 'ember', badge: '15 to 20 mins' },
    { name: 'ice bath', desc: 'Water held between 3 and 6°C / 37 and 43°F, filtered and changed daily.', list: ['Less soreness after sport', 'A calmer stress response', 'Better sleep', 'A clear, awake mind'], time: '1 to 3 minutes', freq: '2 to 4 times per week', img: 'water', badge: '1 to 3 mins' },
    { name: 'breathwork', desc: 'Guided breathing patterns that move you from alert to calm, led by our guides.', list: ['Lower heart rate', 'Release held tension', 'Steady mood', 'Easier cold plunges'], time: '10 to 15 minutes', freq: 'Daily if you like', img: 'plum', badge: '10 to 15 mins' }
  ];
  var panel = root.querySelector('.dw-panel');
  var tabs = root.querySelectorAll('.dw-tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.toggle('is-on', x === t); x.setAttribute('aria-selected', x === t); });
      var d = data[+t.dataset.tab];
      panel.classList.add('is-swap');
      setTimeout(function () {
        panel.querySelector('[data-k=name]').textContent = d.name;
        panel.querySelector('[data-k=desc]').textContent = d.desc;
        panel.querySelector('[data-k=time]').textContent = d.badge;
        panel.querySelector('dd[data-k=time]').textContent = d.time;
        panel.querySelector('[data-k=freq]').textContent = d.freq;
        panel.querySelector('[data-k=list]').innerHTML = d.list.map(function (l) { return '<li>' + l + '</li>'; }).join('');
        panel.querySelector('.dw-panel-img img').src = '/assets/library/spa-ph-' + d.img + '.svg';
        panel.classList.remove('is-swap');
      }, 350);
    });
  });

  // Stories slider: translateX by 100%, 0.5s ease, wraps around.
  var track = root.querySelector('.dw-stories-track');
  var n = track.children.length, i = 0;
  root.querySelectorAll('.dw-arrow[data-slide]').forEach(function (b) {
    b.addEventListener('click', function () { i = (i + +b.dataset.slide + n) % n; track.style.transform = 'translateX(' + (-100 * i) + '%)'; });
  });
})();
