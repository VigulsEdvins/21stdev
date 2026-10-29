(function () {
  window.__edvUid = window.__edvUid || 0;
  var rules = {
    name: function (v) { return v.trim() ? '' : 'Please tell us your name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.'; },
    msg: function (v) { return v.trim().length >= 10 ? '' : 'Please write at least 10 characters.'; }
  };
  Array.prototype.forEach.call(document.querySelectorAll('.cfv-demo'), function (root) {
    if (root.__cfvInit) return;
    root.__cfvInit = true;
    var form = root.querySelector('.cfv-form');
    var ok = root.querySelector('.cfv-success');
    if (!form) return;
    var n = 'cfv' + (++window.__edvUid);
    var title = root.querySelector('.cfv-title');
    if (title) { title.id = n + 'T'; root.setAttribute('aria-labelledby', title.id); }
    var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-rule]'));
    inputs.forEach(function (el, i) {
      var field = el.closest('.cfv-field');
      var err = field.querySelector('.cfv-error');
      el.id = n + 'F' + i; err.id = el.id + 'Err';
      field.querySelector('label').setAttribute('for', el.id);
      el.setAttribute('aria-describedby', err.id);
      el.__err = err;
      el.addEventListener('blur', function () { check(el); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') check(el); });
    });
    function check(input) {
      var msg = rules[input.getAttribute('data-rule')](input.value);
      input.__err.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    form.addEventListener('submit', function (e) {
      var firstBad = null;
      inputs.forEach(function (el) { if (!check(el) && !firstBad) firstBad = el; });
      if (firstBad) { e.preventDefault(); firstBad.focus(); return; }
      // With an address in the form's action the browser sends it; without one this stays a demo.
      if (form.getAttribute('action')) return;
      e.preventDefault();
      form.dispatchEvent(new CustomEvent('edv:submitted', { bubbles: true }));
      form.hidden = true;
      ok.hidden = false;
      ok.setAttribute('tabindex', '-1');
      ok.focus();
    });
  });
})();
