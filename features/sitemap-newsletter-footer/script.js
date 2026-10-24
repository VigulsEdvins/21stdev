(function () {
  var form = document.getElementById('snfForm');
  if (!form) return;
  var input = document.getElementById('snfEmail');
  var msg = document.getElementById('snfMsg');
  var btn = form.querySelector('.snf-submit');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'snf-msg' + (kind ? ' is-' + kind : '');
  }
  input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); if (msg.classList.contains('is-error')) say(''); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = input.value.trim();
    if (!EMAIL.test(value)) {
      input.setAttribute('aria-invalid', 'true');
      say(value ? 'That does not look like an email address.' : 'Please enter your email address.', 'error');
      input.focus();
      return;
    }
    btn.disabled = true;
    say('Subscribing...');
    // Replace this timer with a request to your own newsletter service
    setTimeout(function () {
      btn.disabled = false;
      input.value = '';
      say('Thanks! Check your inbox to confirm.', 'ok');
    }, 900);
  });
})();
