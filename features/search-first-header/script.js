(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.sfh-search'), function (form) {
    var input = form.querySelector('.sfh-input');
    if (!input) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) input.blur(); });
  });
})();
