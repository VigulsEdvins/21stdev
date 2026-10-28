/* The account page: sign in, create an account, Google, GitHub, emailed link, forgot password, change password, sign out.
   All the talking to Supabase is in auth.js; this file only shows things. No HTML strings: everything is set with textContent. */
(function () {
  const $ = (id) => document.getElementById(id);
  const A = window.EdvAuth;
  let auth = null, mode = 'in', mailKind = null;

  const view = (name) => { ['a-loading', 'a-closed', 'a-out', 'a-in', 'f-new'].forEach((id) => { $(id).hidden = id !== name; }); };
  const notice = (text, kind) => {
    const n = $('a-notice'); n.replaceChildren();
    if (!text) return;
    const d = document.createElement('div'); d.className = 'alert alert--' + (kind || 'info'); const p = document.createElement('p'); p.textContent = text; d.append(p); n.append(d);
  };
  const title = (t, lead) => { $('a-title').textContent = t; $('a-lead').textContent = lead; };
  const focusTitle = () => { $('a-title').focus(); };

  // each problem is shown under the box it is about
  function clearErrors() {
    document.querySelectorAll('#acct .error-text').forEach((e) => { e.textContent = ''; });
    document.querySelectorAll('#acct .field').forEach((f) => f.classList.remove('has-error'));
    document.querySelectorAll('#acct input').forEach((i) => i.removeAttribute('aria-invalid'));
  }
  function problem(r, map) {
    const id = map[r.field];
    if (!id) { notice(r.message, 'error'); return; }
    const input = $(id), err = $(id + '-err');
    err.textContent = r.message; input.closest('.field').classList.add('has-error'); input.setAttribute('aria-invalid', 'true'); input.focus();
  }

  function showSignedIn(who) {
    const how = { google: 'Signed in with Google.', github: 'Signed in with GitHub.', email: 'Signed in with your email address.' }[who.provider] || 'Signed in.';
    $('i-who').textContent = who.email; $('i-how').textContent = how; $('b-newpass').hidden = who.provider !== 'email'; // a Google or GitHub account has no password of its own here
    title('You are signed in.', 'This is your edvlabs account.'); view('a-in'); focusTitle();
  }
  function showSignedOut() { title('Sign in or create an account.', 'Use Google, GitHub or your email address.'); view('a-out'); setMode('in'); showPass(); }

  function setMode(m) {
    mode = m;
    $('t-in').setAttribute('aria-pressed', String(m === 'in')); $('t-up').setAttribute('aria-pressed', String(m === 'up'));
    $('p-go').textContent = m === 'in' ? 'Sign in' : 'Create account';
    $('p-pass').autocomplete = m === 'in' ? 'current-password' : 'new-password';
    $('p-hint').hidden = m === 'in'; $('l-forgot').hidden = m === 'up';
    clearErrors();
  }
  function showPass() { $('f-pass').hidden = false; $('f-mail').hidden = true; }
  function showMail(kind) {
    mailKind = kind; clearErrors(); $('f-pass').hidden = true; $('f-mail').hidden = false;
    $('m-intro').textContent = kind === 'reset' ? 'Type your email address and we will send you a link to choose a new password.' : 'Type your email address and we will send you a link that signs you in. No password needed.';
    $('m-go').textContent = kind === 'reset' ? 'Send the link' : 'Email me the link';
    $('m-email').value = $('p-email').value; $('m-email').focus();
  }

  async function oauth(provider) {
    notice(''); clearErrors();
    const r = await auth.oauthUrl(provider);
    if (!r.ok) { notice(r.message, 'error'); return; }
    window.location.assign(r.url);
  }

  async function submitPass(e) {
    e.preventDefault(); clearErrors(); notice('');
    const email = $('p-email').value.trim(), pass = $('p-pass').value;
    const r = mode === 'in' ? await auth.signIn(email, pass) : await auth.signUp(email, pass);
    if (!r.ok) return problem(r, { email: 'p-email', password: 'p-pass' });
    if (r.checkEmail) { $('p-pass').value = ''; notice('We sent a link to ' + email + '. Open it to finish creating your account. It can take a minute to arrive; look in your spam folder too.', 'info'); return; }
    notice(''); const who = await auth.current(); who ? showSignedIn(who) : showSignedOut();
  }
  async function submitMail(e) {
    e.preventDefault(); clearErrors(); notice('');
    const email = $('m-email').value.trim();
    const r = mailKind === 'reset' ? await auth.forgotPassword(email) : await auth.emailLink(email);
    if (!r.ok) return problem(r, { email: 'm-email' });
    notice(mailKind === 'reset' ? 'If there is an account for ' + email + ', we sent a link to choose a new password.' : 'We sent a link to ' + email + '. Open it to sign in.', 'info');
  }
  async function submitNew(e) {
    e.preventDefault(); clearErrors(); notice('');
    const r = await auth.setPassword($('n-pass').value);
    if (!r.ok) return problem(r, { password: 'n-pass' });
    $('n-pass').value = ''; notice('Your password is changed.', 'ok');
    const who = await auth.current(); who ? showSignedIn(who) : showSignedOut();
  }

  async function start() {
    let cfg = null;
    try { const r = await fetch('/api/config', { cache: 'no-store' }); if (r.ok) cfg = await r.json(); } catch (_) { /* the page says accounts are not open */ }
    if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) { title('Your account.', ''); view('a-closed'); return; }
    const safe = (k) => { try { return window[k]; } catch (_) { return null; } };
    const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
    auth = A.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: safe('localStorage') || mem(), tempStorage: safe('sessionStorage') || mem(), origin: window.location.origin, returnTo: window.location.origin + window.location.pathname.replace(/index\.html$/, '') });

    $('b-google').addEventListener('click', () => oauth('google')); $('b-github').addEventListener('click', () => oauth('github'));
    $('t-in').addEventListener('click', () => setMode('in')); $('t-up').addEventListener('click', () => setMode('up'));
    $('f-pass').addEventListener('submit', submitPass); $('f-mail').addEventListener('submit', submitMail); $('f-new').addEventListener('submit', submitNew);
    $('l-forgot').addEventListener('click', () => showMail('reset')); $('l-link').addEventListener('click', () => showMail('link'));
    $('m-back').addEventListener('click', () => { notice(''); clearErrors(); showPass(); $('p-email').focus(); });
    $('b-newpass').addEventListener('click', () => { notice(''); title('Change your password.', ''); view('f-new'); $('n-pass').focus(); });
    $('b-out').addEventListener('click', async () => { await auth.signOut(); notice('You are signed out.', 'ok'); showSignedOut(); });

    // coming back from Google, GitHub or an emailed link: ?code=… (or ?error=…)
    const q = new URLSearchParams(window.location.search);
    if (q.has('code') || q.has('error')) {
      history.replaceState(null, '', window.location.pathname); // the code is single-use and must not stay in the address bar or history
      if (q.has('error')) { notice('That did not work. ' + (q.get('error_description') ? 'Please try again.' : ''), 'error'); }
      else {
        const r = await auth.finishFromCode(q.get('code'));
        if (!r.ok) notice(r.message, 'error');
        else if (r.kind === 'recovery') { title('Choose a new password.', ''); view('f-new'); $('n-pass').focus(); return; }
      }
    }
    const who = await auth.current();
    who ? showSignedIn(who) : showSignedOut();
  }
  start();
})();
