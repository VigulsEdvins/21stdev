(function () {
  var flip = document.getElementById('bpFlip');
  var tabs = document.querySelectorAll('.bp-tab');
  function show(back) {
    flip.classList.toggle('is-back', back);
    flip.querySelector('.bp-front').setAttribute('aria-hidden', back);
    flip.querySelector('.bp-back').setAttribute('aria-hidden', !back);
    Array.prototype.forEach.call(tabs, function (t) {
      var on = (t.dataset.side === '1') === back;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-pressed', on);
    });
  }
  Array.prototype.forEach.call(tabs, function (t) {
    t.addEventListener('click', function () { show(t.dataset.side === '1'); });
  });
  flip.addEventListener('click', function () { show(!flip.classList.contains('is-back')); });
})();
