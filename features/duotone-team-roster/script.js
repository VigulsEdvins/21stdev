(function () {
  var section = document.getElementById('tcSection');
  var pauseBtn = document.getElementById('tcPause');
  if (!section) return;

  // [shadow, midtone, highlight] triples
  var tones = [
    ['#2b0a3d', '#ff4d6d', '#ffe66d'],
    ['#0b1d51', '#4cc9f0', '#f1fbff'],
    ['#1b0a05', '#ff9f1c', '#fff1d0'],
    ['#00282b', '#2ec4b6', '#e8fff8'],
    ['#2d0a1f', '#c77dff', '#fbeaff'],
    ['#14213d', '#fca311', '#fff7e0']
  ];

  function card(person, hidden) {
    var parts = person.split('|');
    var t = tones[Number(parts[2]) % tones.length];
    var li = document.createElement('li');
    li.className = 'tc-card';
    if (hidden) li.setAttribute('aria-hidden', 'true');
    li.innerHTML =
      '<div class="tc-photo" style="--tc-lo:' + t[0] + ';--tc-mid:' + t[1] + ';--tc-hi:' + t[2] + '"></div>' +
      '<p class="tc-name">' + parts[0] + '</p><p class="tc-role">' + parts[1] + '</p>';
    return li;
  }

  Array.prototype.forEach.call(section.querySelectorAll('.tc-track'), function (track) {
    var people = track.getAttribute('data-people').split(';');
    // two copies so the -50% drift loops without a seam
    [false, true].forEach(function (hidden) {
      people.forEach(function (p) { track.appendChild(card(p, hidden)); });
    });
  });

  pauseBtn.addEventListener('click', function () {
    var paused = section.classList.toggle('is-paused');
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Resume drift' : 'Pause drift';
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      section.style.setProperty('--tc-state', entries[0].isIntersecting ? 'running' : 'paused');
      Array.prototype.forEach.call(section.querySelectorAll('.tc-track'), function (t) {
        t.style.animationPlayState = entries[0].isIntersecting && !section.classList.contains('is-paused') ? '' : 'paused';
      });
    }).observe(section);
  }
})();
