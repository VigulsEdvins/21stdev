(function () {
  window.__edvUid = window.__edvUid || 0;
  Array.prototype.forEach.call(document.querySelectorAll('.ctf-demo'), function (root) {
    if (root.__ctfInit) return;
    root.__ctfInit = true;
    var form = root.querySelector('.ctf-form');
    var input = root.querySelector('.ctf-input');
    var msg = root.querySelector('.ctf-msg');
    if (!form || !input || !msg) return;
    var n = 'ctf' + (++window.__edvUid);
    input.id = n + 'E'; msg.id = n + 'M';
    input.setAttribute('aria-describedby', msg.id);
    root.querySelector('.ctf-sr').setAttribute('for', input.id);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      msg.textContent = ok ? 'Thank you! We will be in touch.' : 'Please enter a valid email address.';
      if (!ok) input.focus(); else input.value = '';
    });
  });
})();
