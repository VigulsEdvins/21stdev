(function () {
  var form = document.getElementById('cfvForm');
  var ok = document.getElementById('cfvSuccess');
  if (!form) return;
  var rules = {
    cfvName: function (v) { return v.trim() ? '' : 'Please tell us your name.'; },
    cfvEmail: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.'; },
    cfvMsg: function (v) { return v.trim().length >= 10 ? '' : 'Please write at least 10 characters.'; }
  };
  function check(input) {
    var err = document.getElementById(input.id + 'Err');
    var msg = rules[input.id](input.value);
    err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  Object.keys(rules).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () { check(el); });
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') check(el); });
  });
  form.addEventListener('submit', function (e) {
    var firstBad = null;
    Object.keys(rules).forEach(function (id) { var el = document.getElementById(id); if (!check(el) && !firstBad) firstBad = el; });
    if (firstBad) { e.preventDefault(); firstBad.focus(); return; }
    // With an address in the form's action the browser sends it; without one this stays a demo.
    if (form.getAttribute('action')) return;
    e.preventDefault();
    form.hidden = true;
    ok.hidden = false;
    ok.focus && ok.setAttribute('tabindex', '-1');
    ok.focus && ok.focus();
  });
})();
