(function () {
  window.__edvUid = window.__edvUid || 0;
  function nextId(p) { return p + (++window.__edvUid); }
  Array.prototype.forEach.call(document.querySelectorAll('.acl-demo'), function (root) {
    if (root.__aclInit) return;
    root.__aclInit = true;
    var form = root.querySelector('.acl-form');
    if (!form) return;
    var email = root.querySelector('.acl-email');
    var pass = root.querySelector('.acl-pass-input');
    var emailErr = root.querySelector('.acl-email-err');
    var passErr = root.querySelector('.acl-pass-err');
    var eye = root.querySelector('.acl-eye');
    var status = root.querySelector('.acl-status');
    var title = root.querySelector('.acl-title');
    var sub = root.querySelector('.acl-sub');
    var submit = root.querySelector('.acl-btn');
    var forgot = form.querySelector('.acl-row');
    var switchBtn = root.querySelector('.acl-link');
    var switchText = root.querySelector('.acl-switch span');
    var signUp = false;
    // unique ids per copy so labels and aria links never cross between copies
    var n = nextId('acl');
    title.id = n + 'T'; root.setAttribute('aria-labelledby', title.id);
    [[email, emailErr, 'E'], [pass, passErr, 'P']].forEach(function (p) {
      p[0].id = n + p[2]; p[1].id = n + p[2] + 'Err';
      p[0].setAttribute('aria-describedby', p[1].id);
      p[0].parentNode.closest('.acl-field').querySelector('label').setAttribute('for', p[0].id);
    });
    function check(input, err, msg) {
      err.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    eye.addEventListener('click', function () {
      var show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.textContent = show ? 'Hide' : 'Show';
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = check(email, emailErr, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? '' : 'Enter an email address like name@example.com.');
      var b = check(pass, passErr, pass.value.length >= 8 ? '' : 'Use at least 8 characters.');
      status.textContent = '';
      if (!a) { email.focus(); return; }
      if (!b) { pass.focus(); return; }
      status.textContent = signUp ? 'Demo only: account not created.' : 'Demo only: connect this form to your sign-in to continue.';
    });
    switchBtn.addEventListener('click', function () {
      signUp = !signUp;
      title.textContent = signUp ? 'Create your account' : 'Welcome back';
      sub.textContent = signUp ? 'Free for 14 days. No credit card needed.' : 'Sign in to continue to your dashboard.';
      submit.textContent = signUp ? 'Create account' : 'Sign in';
      pass.setAttribute('autocomplete', signUp ? 'new-password' : 'current-password');
      forgot.hidden = signUp;
      switchText.textContent = signUp ? 'Already have an account?' : 'New here?';
      switchBtn.textContent = signUp ? 'Sign in' : 'Create an account';
      status.textContent = '';
    });
  });
})();
