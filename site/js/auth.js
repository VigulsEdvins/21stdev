/* Sign-in for edvlabs accounts, talking straight to Supabase Auth (GoTrue) over fetch: no third-party library.
   Social sign-in, emailed links and password reset use PKCE: the browser keeps a random verifier, sends only its hash,
   and swaps the one-time ?code= it gets back for a session. No token ever travels in a web address.
   The Supabase address and the public (anon) key come from /api/config at run time, so nothing is in git.
   Every method returns { ok: true, ... } or { ok: false, message, field? } with a plain-words message. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvAuth = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const SESSION_KEY = 'edvlabs.session', PKCE_KEY = 'edvlabs.pkce';
  const PROVIDERS = ['google', 'github'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const b64url = (bytes) => btoa(String.fromCharCode.apply(null, Array.from(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const randomVerifier = () => { const a = new Uint8Array(48); crypto.getRandomValues(a); return b64url(a); };
  async function challengeOf(verifier) { return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))); }

  /** Plain-words message for what Supabase said. `body` is its JSON error, if any. */
  function friendly(status, body) {
    const code = String((body && (body.error_code || body.code)) || '').toLowerCase();
    const msg = String((body && (body.msg || body.message || body.error_description || body.error)) || '').toLowerCase();
    if (code === 'invalid_credentials' || /invalid login credentials/.test(msg)) return { message: 'That email and password do not match. Check them, or use “Forgot your password?”.', field: 'password' };
    if (code === 'email_not_confirmed' || /not confirmed/.test(msg)) return { message: 'Your email address is not confirmed yet. Open the email we sent you and press the link in it.', field: 'email' };
    if (code === 'user_already_exists' || /already registered/.test(msg)) return { message: 'There is already an account with that email address. Sign in instead, or use “Forgot your password?”.', field: 'email' };
    if (code === 'weak_password' || /password should be|weak/.test(msg)) return { message: 'Choose a longer password: at least 8 characters, and not one that is easy to guess.', field: 'password' };
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return { message: 'Too many tries just now. Wait a few minutes and try again.' };
    if (code === 'validation_failed' || /unable to validate email|invalid email/.test(msg)) return { message: 'That does not look like an email address. It should look like name@example.com.', field: 'email' };
    if (code === 'bad_code_verifier' || code === 'flow_state_not_found' || code === 'flow_state_expired' || /code verifier|flow state/.test(msg)) return { message: 'That sign-in link has expired or was opened in a different browser. Please start again.' };
    if (code === 'signup_disabled' || /signups not allowed/.test(msg)) return { message: 'New accounts are not open yet.' };
    if (status >= 500) return { message: 'Something went wrong on our side. Please try again in a minute.' };
    return { message: 'That did not work. Please try again.' };
  }

  /**
   * deps: { url, anonKey, fetchImpl, storage (kept between visits), tempStorage (this tab only), now, origin }
   * The pages pass the real browser ones; the tests pass fakes.
   */
  function createAuth(deps) {
    const base = String(deps.url || '').replace(/\/+$/, '');
    const f = deps.fetchImpl || ((...a) => fetch(...a));
    const store = deps.storage, temp = deps.tempStorage;
    const now = deps.now || (() => Math.floor(Date.now() / 1000));
    const origin = deps.origin;
    const headers = (token) => ({ 'Content-Type': 'application/json', apikey: deps.anonKey, Authorization: 'Bearer ' + (token || deps.anonKey) });
    const read = (s, k) => { try { return JSON.parse(s.getItem(k)); } catch (_) { return null; } };
    const write = (s, k, v) => { try { s.setItem(k, JSON.stringify(v)); } catch (_) { /* private window: the session lasts until the page closes */ } };
    const drop = (s, k) => { try { s.removeItem(k); } catch (_) { /* nothing to drop */ } };

    async function call(method, path, body, token) {
      let r;
      try { r = await f(base + path, { method, headers: headers(token), body: body === undefined ? undefined : JSON.stringify(body) }); }
      catch (_) { return { ok: false, message: 'We could not reach the sign-in service. Check your connection and try again.' }; }
      let json = null; try { json = await r.json(); } catch (_) { /* some answers are empty */ }
      if (!r.ok) return Object.assign({ ok: false }, friendly(r.status, json));
      return { ok: true, json };
    }
    const toSession = (j) => (j && j.access_token ? { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (now() + (j.expires_in || 3600)), user: j.user || null } : null);
    function saveSession(j) { const s = toSession(j); if (s) write(store, SESSION_KEY, s); return s; }

    async function newPkce(extra) {
      const verifier = randomVerifier();
      write(temp, PKCE_KEY, { verifier, kind: extra || 'login' });
      return { verifier, challenge: await challengeOf(verifier), method: 's256' };
    }
    // where Supabase sends the visitor back to: this account page (deps.returnTo), or origin + /account/
    const back = () => encodeURIComponent(deps.returnTo || (origin + '/account/'));

    return {
      /** Where to send the browser to sign in with Google or GitHub. */
      async oauthUrl(provider) {
        if (!PROVIDERS.includes(provider)) return { ok: false, message: 'That way of signing in is not available.' };
        const p = await newPkce('login');
        return { ok: true, url: base + '/auth/v1/authorize?provider=' + provider + '&redirect_to=' + back() + '&code_challenge=' + p.challenge + '&code_challenge_method=' + p.method };
      },
      async signUp(email, password) {
        if (!EMAIL_RE.test(email || '')) return { ok: false, message: 'That does not look like an email address. It should look like name@example.com.', field: 'email' };
        if (!password || password.length < 8) return { ok: false, message: 'Choose a longer password: at least 8 characters.', field: 'password' };
        const p = await newPkce('signup');
        const r = await call('POST', '/auth/v1/signup?redirect_to=' + back(), { email, password, code_challenge: p.challenge, code_challenge_method: p.method });
        if (!r.ok) return r;
        const s = saveSession(r.json); // confirmation switched off: signed in at once
        return s ? { ok: true, session: s } : { ok: true, checkEmail: true };
      },
      async signIn(email, password) {
        if (!EMAIL_RE.test(email || '')) return { ok: false, message: 'That does not look like an email address. It should look like name@example.com.', field: 'email' };
        if (!password) return { ok: false, message: 'Type your password.', field: 'password' };
        const r = await call('POST', '/auth/v1/token?grant_type=password', { email, password });
        if (!r.ok) return r;
        return { ok: true, session: saveSession(r.json) };
      },
      async emailLink(email) {
        if (!EMAIL_RE.test(email || '')) return { ok: false, message: 'That does not look like an email address. It should look like name@example.com.', field: 'email' };
        const p = await newPkce('link');
        const r = await call('POST', '/auth/v1/otp?redirect_to=' + back(), { email, create_user: true, code_challenge: p.challenge, code_challenge_method: p.method });
        return r.ok ? { ok: true } : r;
      },
      async forgotPassword(email) {
        if (!EMAIL_RE.test(email || '')) return { ok: false, message: 'That does not look like an email address. It should look like name@example.com.', field: 'email' };
        const p = await newPkce('recovery');
        const r = await call('POST', '/auth/v1/recover?redirect_to=' + back(), { email, code_challenge: p.challenge, code_challenge_method: p.method });
        return r.ok ? { ok: true } : r; // the answer does not say whether the address has an account
      },
      /** Called on the account page when the address carries ?code=…: swaps it for a session. kind says what the visitor was doing. */
      async finishFromCode(code) {
        const kept = read(temp, PKCE_KEY); drop(temp, PKCE_KEY);
        if (!code || !kept || !kept.verifier) return { ok: false, message: 'That sign-in link has expired or was opened in a different browser. Please start again.' };
        const r = await call('POST', '/auth/v1/token?grant_type=pkce', { auth_code: code, code_verifier: kept.verifier });
        if (!r.ok) return r;
        return { ok: true, session: saveSession(r.json), kind: kept.kind };
      },
      async setPassword(password) {
        const s = read(store, SESSION_KEY);
        if (!s) return { ok: false, message: 'Please sign in again first.' };
        if (!password || password.length < 8) return { ok: false, message: 'Choose a longer password: at least 8 characters.', field: 'password' };
        const r = await call('PUT', '/auth/v1/user', { password }, s.access_token);
        return r.ok ? { ok: true } : r;
      },
      /** The signed-in visitor, refreshing the session when it is about to run out. null when nobody is signed in. */
      async current() {
        let s = read(store, SESSION_KEY);
        if (!s || !s.access_token) return null;
        if (s.expires_at - now() < 60) {
          const r = await call('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token });
          if (!r.ok) { drop(store, SESSION_KEY); return null; }
          s = saveSession(r.json);
        }
        const u = await call('GET', '/auth/v1/user', undefined, s.access_token); // the server decides; the stored copy is not trusted
        if (!u.ok) { drop(store, SESSION_KEY); return null; }
        return { email: u.json.email, provider: (u.json.app_metadata && u.json.app_metadata.provider) || 'email', id: u.json.id };
      },
      async signOut() {
        const s = read(store, SESSION_KEY); drop(store, SESSION_KEY); drop(temp, PKCE_KEY);
        if (s && s.access_token) await call('POST', '/auth/v1/logout', undefined, s.access_token); // best effort: the local session is already gone
        return { ok: true };
      }
    };
  }

  return { createAuth, friendly, challengeOf, randomVerifier, b64url, EMAIL_RE, PROVIDERS, SESSION_KEY, PKCE_KEY };
});
