(function () {
  var form = document.querySelector('.sfh-search');
  var input = document.getElementById('sfhQ');
  if (!form || !input) return;
  form.addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) input.blur(); });
})();
