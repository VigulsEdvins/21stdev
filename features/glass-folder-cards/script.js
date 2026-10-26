(function () {
  var buttons = document.querySelectorAll('.ff-toggle');
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      Array.prototype.forEach.call(buttons, function (o) { o.setAttribute('aria-expanded', 'false'); });
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') Array.prototype.forEach.call(buttons, function (o) { o.setAttribute('aria-expanded', 'false'); });
  });
})();
