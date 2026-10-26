(function () {
  var mark = document.getElementById('kfMark'), word = 'fernwell';
  word.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'kf-l'; s.textContent = ch; mark.appendChild(s); });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('kfUp').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
