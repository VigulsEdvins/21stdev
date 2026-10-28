/* The account page: sign in, create an account (with a repeated password and an emailed code), Google, GitHub, emailed link or code,
   forgot password, change password, sign out. A hidden "honeypot" box catches simple bots; when the owner turns on Cloudflare Turnstile
   (a site key in /api/config) a spam check is shown and its token goes to Supabase, which verifies it itself.
   All the talking to Supabase is in auth.js; this file only shows things. No HTML strings: everything is set with textContent. */
(function () {
  const $ = (id) => document.getElementById(id);
  const A = window.EdvAuth;
  let auth = null, mode = 'in', mailKind = null, pending = null, captcha = null, lastSent = 0;

  const VIEWS = ['a-loading', 'a-closed', 'a-out', 'f-code', 'a-in', 'f-new'];
  const view = (name) => { VIEWS.forEach((id) => { $(id).hidden = id !== name; }); };
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

  /** The spam check. Without a site key nothing is shown and no token is sent (and Supabase's own check is off). */
  function makeCaptcha(siteKey) {
    if (!siteKey) return { on: false, mount() {}, token: () => null, reset() {}, ready: () => true };
    const tokens = {}, widgets = {};
    let loading = null;
    const load = () => loading || (loading = new Promise((resolve) => {
      if (window.turnstile) return resolve();
      const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = () => resolve(); s.onerror = () => resolve();
      document.head.append(s);
    }));
    return {
      on: true,
      async mount(id) {
        const el = $(id); el.hidden = false;
        if (widgets[id] !== undefined) return;
        await load(); if (!window.turnstile) { el.hidden = true; return; }
        widgets[id] = window.turnstile.render(el, { sitekey: siteKey, callback: (t) => { tokens[id] = t; }, 'expired-callback': () => { tokens[id] = null; }, 'error-callback': () => { tokens[id] = null; } });
      },
      token: (id) => tokens[id] || null,
      reset(id) { tokens[id] = null; if (widgets[id] !== undefined && window.turnstile) window.turnstile.reset(widgets[id]); },
      ready: (id) => !!tokens[id]
    };
  }
  /** true when the check is on but has not finished: tell the visitor instead of sending something that would be refused */
  function waitForCheck(id) {
    if (captcha.on && !captcha.ready(id)) { notice('Please wait a moment for the spam check to finish, then press the button again.', 'info'); return true; }
    return false;
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
    $('p-hint').hidden = m === 'in'; $('p-pass2-field').hidden = m === 'in'; $('l-forgot').hidden = m === 'up';
    clearErrors();
  }
  function showPass() { $('f-pass').hidden = false; $('f-mail').hidden = true; captcha.mount('p-captcha'); }
  function showMail(kind) {
    mailKind = kind; clearErrors(); $('f-pass').hidden = true; $('f-mail').hidden = false; captcha.mount('m-captcha');
    $('m-intro').textContent = kind === 'reset' ? 'Type your email address and we will send you a code and a link to choose a new password.' : 'Type your email address and we will send you a code and a link that sign you in. No password needed.';
    $('m-go').textContent = kind === 'reset' ? 'Send the code' : 'Email me a code';
    $('m-email').value = $('p-email').value; $('m-email').focus();
  }
  /** The "type the code from the email" step. kind: 'signup', 'link' or 'recovery'. */
  function showCode(email, kind) {
    pending = { email, kind }; lastSent = Date.now(); clearErrors(); $('c-code').value = '';
    $('c-intro').textContent = 'We sent a code to ' + email + '. Type it here, or press the link in the same email. It can take a minute to arrive; look in your spam folder too.';
    $('c-note').hidden = kind !== 'signup'; // the service says nothing about whether an address is registered, so the page tells the person what to do if no email comes
    title('Check your email.', 'One more step.'); view('f-code'); captcha.mount('c-captcha'); $('c-code').focus();
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
    if ($('p-trap').value) { if (mode === 'up') showCode(email || 'your address', 'signup'); return; } // a bot filled the hidden box: look like it worked, send nothing
    if (waitForCheck('p-captcha')) return;
    const opts = { captchaToken: captcha.token('p-captcha') };
    let r;
    if (mode === 'in') r = await auth.signIn(email, pass, opts);
    else { opts.repeat = $('p-pass2').value; r = await auth.signUp(email, pass, opts); }
    captcha.reset('p-captcha'); // a spam-check token works once
    if (!r.ok) return problem(r, { email: 'p-email', password: 'p-pass', password2: 'p-pass2' });
    if (r.checkEmail) { $('p-pass').value = ''; $('p-pass2').value = ''; return showCode(email, 'signup'); }
    notice(''); const who = await auth.current(); who ? showSignedIn(who) : showSignedOut();
  }
  async function submitMail(e) {
    e.preventDefault(); clearErrors(); notice('');
    const email = $('m-email').value.trim();
    if ($('m-trap').value) { if (EmailOk(email)) showCode(email, mailKind === 'reset' ? 'recovery' : 'link'); return; }
    if (waitForCheck('m-captcha')) return;
    const opts = { captchaToken: captcha.token('m-captcha') };
    const r = mailKind === 'reset' ? await auth.forgotPassword(email, opts) : await auth.emailLink(email, opts);
    captcha.reset('m-captcha');
    if (!r.ok) return problem(r, { email: 'm-email' });
    showCode(email, mailKind === 'reset' ? 'recovery' : 'link');
  }
  const EmailOk = (e) => A.EMAIL_RE.test(e || '');

  async function submitCode(e) {
    e.preventDefault(); clearErrors(); notice('');
    const r = await auth.verifyCode(pending.email, $('c-code').value, pending.kind);
    if (!r.ok) return problem(r, { code: 'c-code' });
    if (r.kind === 'recovery') { title('Choose a new password.', ''); view('f-new'); $('n-pass').focus(); return; }
    const who = await auth.current(); who ? showSignedIn(who) : showSignedOut();
  }
  async function resendCode() {
    clearErrors(); notice('');
    if (Date.now() - lastSent < 30000) { notice('Please wait half a minute before asking for another code.', 'info'); return; }
    if (waitForCheck('c-captcha')) return;
    const r = await auth.resend(pending.email, pending.kind, { captchaToken: captcha.token('c-captcha') });
    captcha.reset('c-captcha');
    if (!r.ok) return problem(r, { email: 'c-code' });
    lastSent = Date.now(); notice('We sent a new code to ' + pending.email + '. Use the newest one.', 'ok');
  }
  async function submitNew(e) {
    e.preventDefault(); clearErrors(); notice('');
    const r = await auth.setPassword($('n-pass').value, { repeat: $('n-pass2').value });
    if (!r.ok) return problem(r, { password: 'n-pass', password2: 'n-pass2' });
    $('n-pass').value = ''; $('n-pass2').value = ''; notice('Your password is changed.', 'ok');
    const who = await auth.current(); who ? showSignedIn(who) : showSignedOut();
  }

  async function start() {
    let cfg = null;
    try { const r = await fetch('/api/config', { cache: 'no-store' }); if (r.ok) cfg = await r.json(); } catch (_) { /* the page says accounts are not open */ }
    if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) { title('Your account.', ''); view('a-closed'); return; }
    const safe = (k) => { try { return window[k]; } catch (_) { return null; } };
    const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
    auth = A.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: safe('localStorage') || mem(), tempStorage: safe('sessionStorage') || mem(), origin: window.location.origin, returnTo: window.location.origin + window.location.pathname.replace(/index\.html$/, '') });
    captcha = makeCaptcha(cfg.turnstileSiteKey);

    $('b-google').addEventListener('click', () => oauth('google')); $('b-github').addEventListener('click', () => oauth('github'));
    $('t-in').addEventListener('click', () => setMode('in')); $('t-up').addEventListener('click', () => setMode('up'));
    $('f-pass').addEventListener('submit', submitPass); $('f-mail').addEventListener('submit', submitMail); $('f-new').addEventListener('submit', submitNew); $('f-code').addEventListener('submit', submitCode);
    $('l-forgot').addEventListener('click', () => showMail('reset')); $('l-link').addEventListener('click', () => showMail('link'));
    $('m-back').addEventListener('click', () => { notice(''); clearErrors(); showPass(); $('p-email').focus(); });
    $('c-resend').addEventListener('click', resendCode); $('c-other').addEventListener('click', () => { notice(''); showSignedOut(); });
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
