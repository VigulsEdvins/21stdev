(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.sna-demo'), function (root) {
    var bar = root.querySelector('.sna-announce');
    var close = root.querySelector('.sna-close');
    if (!bar || !close) return;
    close.addEventListener('click', function () {
      bar.classList.add('is-hidden');
      // hidden content must also leave the tab order and the accessibility tree
      setTimeout(function () { bar.hidden = true; }, 360);
    });
  });
})();
