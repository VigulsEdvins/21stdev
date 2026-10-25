(function () {
  var bar = document.getElementById('snaAnnounce');
  var close = document.getElementById('snaClose');
  if (!bar || !close) return;
  close.addEventListener('click', function () {
    bar.classList.add('is-hidden');
    // hidden content must also leave the tab order and the accessibility tree
    setTimeout(function () { bar.hidden = true; }, 360);
  });
})();
