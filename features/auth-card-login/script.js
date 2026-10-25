(function () {
  var form = document.getElementById('aclForm');
  if (!form) return;
  var email = document.getElementById('aclEmail');
  var pass = document.getElementById('aclPass');
  var eye = document.getElementById('aclEye');
  var status = document.getElementById('aclStatus');
  var title = document.getElementById('aclTitle');
  var sub = document.getElementById('aclSub');
  var submit = document.getElementById('aclSubmit');
  var forgot = form.querySelector('.acl-row');
  var switchBtn = document.getElementById('aclSwitch');
  var switchText = document.getElementById('aclSwitchText');
  var signUp = false;
  function check(input, msg) {
    document.getElementById(input.id + 'Err').textContent = msg;
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
    var a = check(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? '' : 'Enter an email address like name@example.com.');
    var b = check(pass, pass.value.length >= 8 ? '' : 'Use at least 8 characters.');
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
})();
