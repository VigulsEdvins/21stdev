(function () {
  window.__edvUid = window.__edvUid || 0;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  Array.prototype.forEach.call(document.querySelectorAll('.snf-demo'), function (root) {
    if (root.__snfInit) return;
    root.__snfInit = true;
    var form = root.querySelector('.snf-form');
    if (!form) return;
    var input = form.querySelector('.snf-input');
    var msg = form.querySelector('.snf-msg');
    var btn = form.querySelector('.snf-submit');
    var n = 'snf' + (++window.__edvUid);
    input.id = n + 'E'; msg.id = n + 'M';
    input.setAttribute('aria-describedby', msg.id);
    form.querySelector('.snf-label').setAttribute('for', input.id);
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
      form.dispatchEvent(new CustomEvent('edv:submitted', { bubbles: true }));
      btn.disabled = true;
      say('Subscribing...');
      // Replace this timer with a request to your own newsletter service
      setTimeout(function () {
        btn.disabled = false;
        input.value = '';
        say('Thanks! Check your inbox to confirm.', 'ok');
      }, 900);
    });
  });
})();
