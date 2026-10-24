(function () {
  var form = document.getElementById('ctfForm');
  var input = document.getElementById('ctfEmail');
  var msg = document.getElementById('ctfMsg');
  if (!form || !input) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    msg.textContent = ok ? 'Thank you! We will be in touch.' : 'Please enter a valid email address.';
    if (!ok) input.focus(); else input.value = '';
  });
})();
