/* The account page: sign in, create an account (with a repeated password and an emailed code), Google, GitHub, emailed link or code,
   forgot password, change password, sign out. A hidden "honeypot" box catches simple bots; when the owner turns on Cloudflare Turnstile
   (a site key in /api/config) a spam check is shown and its token goes to Supabase, which verifies it itself.
   All the talking to Supabase is in auth.js; this file only shows things. No HTML strings: everything is set with textContent. */
(function () {
  const $ = (id) => document.getElementById(id);
  const A = window.EdvAuth;
  let auth = null, answersSync = null, extras = null, mode = 'in', mailKind = null, pending = null, captcha = null, lastSent = 0, knownEmail = '';

  const VIEWS = ['a-loading', 'a-closed', 'a-out', 'f-code', 'a-in', 'f-new'];
  const view = (name) => { VIEWS.forEach((id) => { $(id).hidden = id !== name; }); hideAllPasswords(); };
  const notice = (text, kind) => {
    const n = $('a-notice'); n.replaceChildren();
    if (!text) return;
    const d = document.createElement('div'); d.className = 'alert alert--' + (kind || 'info'); const p = document.createElement('p'); p.textContent = text; d.append(p); n.append(d);
  };
  const title = (t, lead) => { $('a-title').textContent = t; $('a-lead').textContent = lead; };
  const focusTitle = () => { $('a-title').focus(); };

  /** Show/hide button on a password box, so the person can check what they typed. Every box starts hidden again whenever the view changes. */
  const boxes = [];
  function addToggle(id) {
    const input = $(id); if (!input || input.parentElement.classList.contains('pw-wrap')) return;
    const wrap = document.createElement('div'); wrap.className = 'pw-wrap'; input.replaceWith(wrap); wrap.append(input);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pw-toggle'; b.setAttribute('aria-controls', id);
    const set = (show) => { input.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-label', (show ? 'Hide' : 'Show') + ' ' + (input.closest('.field').querySelector('label').textContent.toLowerCase())); };
    b.addEventListener('click', () => { set(input.type === 'password'); input.focus(); });
    wrap.append(b); set(false); boxes.push({ input, set });
  }
  const hideAllPasswords = () => boxes.forEach((x) => x.set(false));

  /** Strength bar, a checklist of the rules and a line of advice under a password box. Used when a NEW password is chosen. */
  function addMeter(id, getEmail) {
    const input = $(id), field = input.closest('.field'), errEl = $(id + '-err');
    const meter = document.createElement('div'); meter.className = 'pw-meter'; meter.id = id + '-meter'; meter.hidden = true;
    const bar = document.createElement('div'); bar.className = 'pw-bar'; bar.setAttribute('aria-hidden', 'true'); for (let i = 0; i < 3; i++) bar.append(document.createElement('span'));
    const label = document.createElement('p'); label.className = 'pw-label'; label.setAttribute('aria-live', 'polite');
    const list = document.createElement('ul'); list.className = 'pw-rules';
    const items = window.EdvPassword.RULES.map((r) => { const li = document.createElement('li'); li.dataset.rule = r.id; const mark = document.createElement('span'); mark.className = 'pw-mark'; mark.setAttribute('aria-hidden', 'true'); const sr = document.createElement('span'); sr.className = 'sr-only'; const t = document.createElement('span'); t.textContent = r.label; li.append(mark, sr, t); list.append(li); return { li, mark, sr }; });
    const notes = document.createElement('p'); notes.className = 'pw-notes';
    meter.append(bar, label, list, notes);
    field.insertBefore(meter, errEl);
    let lastLevel = '';
    function update() {
      const c = window.EdvPassword.check(input.value, { email: getEmail() });
      bar.dataset.level = c.level;
      if (c.level !== lastLevel) { lastLevel = c.level; label.replaceChildren(); if (c.level !== 'empty') { label.append('Password strength: '); const strong = document.createElement('strong'); strong.textContent = { low: 'Low', medium: 'Medium', high: 'High' }[c.level]; label.append(strong); } }
      c.rules.forEach((r, i) => { items[i].li.dataset.ok = String(r.ok); items[i].mark.textContent = r.ok ? '✓' : '○'; items[i].sr.textContent = r.ok ? 'Done: ' : 'Still needed: '; });
      notes.textContent = c.notes[0] || '';
    }
    input.addEventListener('input', update);
    return { update, show(on) { meter.hidden = !on; if (on) update(); } };
  }

  /** "The passwords match" / "Not the same yet" under a repeat box, as the person types. */
  function addMatch(repeatId, firstId) {
    const rep = $(repeatId), first = $(firstId), field = rep.closest('.field');
    const hint = document.createElement('p'); hint.className = 'hint pw-match'; hint.setAttribute('aria-live', 'polite'); field.insertBefore(hint, $(repeatId + '-err'));
    const update = () => { hint.textContent = !rep.value ? '' : rep.value === first.value ? 'The passwords match.' : 'Not the same yet.'; hint.dataset.state = !rep.value ? '' : rep.value === first.value ? 'same' : 'different'; };
    rep.addEventListener('input', update); first.addEventListener('input', update);
    return update;
  }
  let meters = {}, matchers = [];

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

  async function showSignedIn(who) {
    if (window.EdvNav) window.EdvNav.refresh();
    const how = { google: 'Signed in with Google.', github: 'Signed in with GitHub.', email: 'Signed in with your email address.' }[who.provider] || 'Signed in.';
    knownEmail = who.email; $('i-who').textContent = who.email; $('i-how').textContent = how; $('b-newpass').hidden = who.provider !== 'email'; // a Google or GitHub account has no password of its own here
    title('You are signed in.', 'This is your edvlabs account.'); view('a-in'); focusTitle();
    if (extras) extras.show(who);
    const toBuilder = takeBuilderIntent();
    if (toBuilder) title('You are signed in.', 'Opening the builder…');
    // the answers from the questions: this browser's go to the account, or the account's come back here (site/js/brief-sync.js)
    const r = answersSync ? await answersSync.sync({ userId: who.id }) : { action: 'none' };
    if (r.action === 'saved') notice('Your answers are saved to your account.', 'ok');
    else if (r.action === 'restored') notice('We found your saved answers and put them back in this browser.', 'ok');
    if (toBuilder) window.location.assign(BUILDER_URL);
  }
  /* "I will build it" on the questions page sends people here with ?from=start. The wish is remembered in this browser, so it also survives the
     round trip through Google or GitHub (which comes back without the query); once signed in they go on to the builder, once. */
  const BUILDER_URL = '/builder/', INTENT_KEY = 'edvlabs.after_login';
  const store = () => { try { return window.localStorage; } catch (_) { return null; } };
  const from = new URLSearchParams(window.location.search).get('from');
  const fromStart = from === 'start' || from === 'builder'; // sent here by "I will build it" on the questions page, or by a locked block in the builder; either way on to the builder after signing in
  if (fromStart) { const st = store(); if (st) { try { st.setItem(INTENT_KEY, 'builder'); } catch (_) { /* storage blocked: they can still open the builder by hand */ } } }
  function takeBuilderIntent() {
    const st = store(); if (!st) return false;
    try { if (st.getItem(INTENT_KEY) !== 'builder') return false; st.removeItem(INTENT_KEY); return true; } catch (_) { return false; }
  }
  function showSignedOut() { if (window.EdvNav) window.EdvNav.refresh(); title(from === 'builder' ? 'Sign in to unlock every block.' : fromStart ? 'Sign in to build your page.' : 'Sign in or create an account.', from === 'builder' ? 'A free account unlocks every block. Your page stays as it is. Use Google, GitHub or your email address.' : fromStart ? 'We save your answers to your account, so you can carry on from any device. Use Google, GitHub or your email address.' : 'Use Google, GitHub or your email address.'); view('a-out'); setMode('in'); showPass(); }

  function setMode(m) {
    mode = m;
    $('t-in').setAttribute('aria-pressed', String(m === 'in')); $('t-up').setAttribute('aria-pressed', String(m === 'up'));
    $('p-go').textContent = m === 'in' ? 'Sign in' : 'Create account';
    $('p-pass').autocomplete = m === 'in' ? 'current-password' : 'new-password';
    $('p-hint').hidden = m === 'in'; $('p-pass2-field').hidden = m === 'in'; $('l-forgot').hidden = m === 'up';
    if (meters.sign) meters.sign.show(m === 'up'); // the rules and the bar are for choosing a password, not for typing an existing one
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
    if (r.kind === 'recovery') { title('Choose a new password.', ''); view('f-new'); meters.fresh.show(true); $('n-pass').focus(); return; }
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
    const r = await auth.setPassword($('n-pass').value, { repeat: $('n-pass2').value, email: knownEmail || (pending && pending.email) || '' });
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
    answersSync = window.EdvBriefSync ? window.EdvBriefSync.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken(), storage: safe('localStorage') || mem() }) : null;
    const pagesApi = window.EdvMyPages ? window.EdvMyPages.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken() }) : null;
    extras = pagesApi && window.EdvAccountExtras ? window.EdvAccountExtras.create({ auth, pages: pagesApi, storage: safe('localStorage') || mem(), notice, signedOut: (text) => { showSignedOut(); notice(text, 'ok'); } }) : null;
    captcha = makeCaptcha(cfg.turnstileSiteKey);
    ['p-pass', 'p-pass2', 'n-pass', 'n-pass2'].forEach(addToggle);
    meters.sign = addMeter('p-pass', () => $('p-email').value); meters.fresh = addMeter('n-pass', () => knownEmail || (pending && pending.email) || '');
    matchers = [addMatch('p-pass2', 'p-pass'), addMatch('n-pass2', 'n-pass')];
    $('p-pass').maxLength = window.EdvPassword.MAX; $('n-pass').maxLength = window.EdvPassword.MAX;

    $('b-google').addEventListener('click', () => oauth('google')); $('b-github').addEventListener('click', () => oauth('github'));
    $('t-in').addEventListener('click', () => setMode('in')); $('t-up').addEventListener('click', () => setMode('up'));
    $('f-pass').addEventListener('submit', submitPass); $('f-mail').addEventListener('submit', submitMail); $('f-new').addEventListener('submit', submitNew); $('f-code').addEventListener('submit', submitCode);
    $('l-forgot').addEventListener('click', () => showMail('reset')); $('l-link').addEventListener('click', () => showMail('link'));
    $('m-back').addEventListener('click', () => { notice(''); clearErrors(); showPass(); $('p-email').focus(); });
    $('c-resend').addEventListener('click', resendCode); $('c-other').addEventListener('click', () => { notice(''); showSignedOut(); });
    $('b-newpass').addEventListener('click', () => { notice(''); title('Change your password.', ''); view('f-new'); meters.fresh.show(true); $('n-pass').focus(); });
    $('b-out').addEventListener('click', async () => { await auth.signOut(); notice('You are signed out.', 'ok'); showSignedOut(); });

    // coming back from Google, GitHub or an emailed link: ?code=… (or ?error=…)
    const q = new URLSearchParams(window.location.search);
    if (q.has('code') || q.has('error')) {
      history.replaceState(null, '', window.location.pathname); // the code is single-use and must not stay in the address bar or history
      if (q.has('error')) { notice('That did not work. ' + (q.get('error_description') ? 'Please try again.' : ''), 'error'); }
      else {
        const r = await auth.finishFromCode(q.get('code'));
        if (!r.ok) notice(r.message, 'error');
        else if (r.kind === 'recovery') { title('Choose a new password.', ''); view('f-new'); meters.fresh.show(true); $('n-pass').focus(); return; }
      }
    }
    const who = await auth.current();
    who ? showSignedIn(who) : showSignedOut();
  }
  start();
})();
