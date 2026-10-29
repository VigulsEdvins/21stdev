(function () {
  window.__edvUid = window.__edvUid || 0;
  var names = ['About you', 'Your project', 'Review'];
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  Array.prototype.forEach.call(document.querySelectorAll('.msf-demo'), function (root) {
    if (root.__msfInit) return;
    root.__msfInit = true;
    var form = root.querySelector('form');
    if (!form) return;
    var steps = form.querySelectorAll('.msf-step');
    var bar = root.querySelector('.msf-bar');
    var label = root.querySelector('.msf-step-label');
    var back = root.querySelector('.msf-back');
    var next = form.querySelector('.msf-actions .msf-btn[type="submit"]');
    var done = root.querySelector('.msf-done');
    var summary = root.querySelector('.msf-summary');
    var f = {};
    var n = 'msf' + (++window.__edvUid);
    var title = root.querySelector('.msf-title');
    title.id = n + 'T'; root.setAttribute('aria-labelledby', title.id);
    Array.prototype.forEach.call(form.querySelectorAll('[data-key]'), function (el, i) {
      var field = el.closest('.msf-field');
      var err = field.querySelector('.msf-error');
      el.id = n + 'F' + i;
      field.querySelector('label').setAttribute('for', el.id);
      if (err) { err.id = el.id + 'Err'; el.setAttribute('aria-describedby', err.id); }
      f[el.getAttribute('data-key')] = { el: el, err: err };
    });
    var current = 0;
    function set(key, msg) {
      var o = f[key];
      o.err.textContent = msg;
      o.el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    function validate(step) {
      if (step === 0) {
        var okName = set('name', f.name.el.value.trim() ? '' : 'Please tell us your name.');
        var okMail = set('email', EMAIL.test(f.email.el.value.trim()) ? '' : 'Enter an email address like name@example.com.');
        if (!okName) { f.name.el.focus(); return false; }
        if (!okMail) { f.email.el.focus(); return false; }
        return true;
      }
      if (step === 1) {
        var ok = set('type', f.type.el.value ? '' : 'Please choose a project type.');
        if (!ok) f.type.el.focus();
        return ok;
      }
      return true;
    }
    function show(i) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
      label.textContent = 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + names[i];
      back.hidden = i === 0;
      next.textContent = i === steps.length - 1 ? 'Send request' : 'Next';
      if (i === 2) {
        summary.textContent = '';
        [['Name', 'name'], ['Email', 'email'], ['Project', 'type'], ['Budget', 'budget']].forEach(function (p) {
          var dt = document.createElement('dt'); dt.textContent = p[0];
          var dd = document.createElement('dd'); dd.textContent = f[p[1]].el.value;
          summary.appendChild(dt); summary.appendChild(dd);
        });
      }
      var first = steps[i].querySelector('input, select');
      if (first) first.focus();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(current)) return;
      if (current < steps.length - 1) { show(current + 1); return; }
      form.dispatchEvent(new CustomEvent('edv:submitted', { bubbles: true }));
      form.hidden = true;
      done.hidden = false;
      done.setAttribute('tabindex', '-1');
      done.focus();
    });
    back.addEventListener('click', function () { if (current > 0) show(current - 1); });
  });
})();
