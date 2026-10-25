(function () {
  var form = document.getElementById('msfForm');
  if (!form) return;
  var steps = form.querySelectorAll('.msf-step');
  var names = ['About you', 'Your project', 'Review'];
  var bar = document.getElementById('msfBar');
  var label = document.getElementById('msfLabel');
  var back = document.getElementById('msfBack');
  var next = document.getElementById('msfNext');
  var done = document.getElementById('msfDone');
  var current = 0;
  function check(id, msg) {
    var el = document.getElementById(id);
    document.getElementById(id + 'Err').textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) el.focus();
    return !msg;
  }
  function validate(step) {
    if (step === 0) {
      var name = document.getElementById('msfName').value.trim();
      var mail = document.getElementById('msfEmail').value.trim();
      var okName = check('msfName', name ? '' : 'Please tell us your name.');
      var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
      document.getElementById('msfEmailErr').textContent = okMail ? '' : 'Enter an email address like name@example.com.';
      document.getElementById('msfEmail').setAttribute('aria-invalid', okMail ? 'false' : 'true');
      if (!okName) return false;
      if (!okMail) { document.getElementById('msfEmail').focus(); return false; }
      return true;
    }
    if (step === 1) return check('msfType', document.getElementById('msfType').value ? '' : 'Please choose a project type.');
    return true;
  }
  function show(i) {
    current = i;
    steps.forEach(function (s, n) { s.hidden = n !== i; });
    bar.style.width = ((i + 1) / steps.length * 100) + '%';
    label.textContent = 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + names[i];
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? 'Send request' : 'Next';
    if (i === 2) {
      var s = document.getElementById('msfSummary');
      s.textContent = '';
      [['Name', 'msfName'], ['Email', 'msfEmail'], ['Project', 'msfType'], ['Budget', 'msfBudget']].forEach(function (p) {
        var dt = document.createElement('dt'); dt.textContent = p[0];
        var dd = document.createElement('dd'); dd.textContent = document.getElementById(p[1]).value;
        s.appendChild(dt); s.appendChild(dd);
      });
    }
    var first = steps[i].querySelector('input, select');
    if (first) first.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(current)) return;
    if (current < steps.length - 1) { show(current + 1); return; }
    form.hidden = true;
    done.hidden = false;
    done.setAttribute('tabindex', '-1');
    done.focus();
  });
  back.addEventListener('click', function () { if (current > 0) show(current - 1); });
})();
