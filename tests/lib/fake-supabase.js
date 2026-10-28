/* A stand-in for Supabase Auth (GoTrue) for tests: accounts, passwords, emailed links, social sign-in redirects, PKCE checks, sessions.
   It speaks the same paths and answers as the real service for the calls site/js/auth.js makes. No network, no real keys.
   start({ confirmEmails }) -> { url, close, users, outbox, anonKey, sessions } */
const http = require('http');
const crypto = require('crypto');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = (s) => b64url(crypto.createHash('sha256').update(s).digest());
const id = () => crypto.randomUUID();

function start(opts = {}) {
  const anonKey = 'anon-test-key';
  const state = { confirmEmails: opts.confirmEmails !== false, requireCaptcha: !!opts.requireCaptcha, captchaToken: 'test-captcha-token', otps: new Map(), users: new Map(), outbox: [], codes: new Map(), sessions: new Map(), refresh: new Map(), anonKey, calls: [] };
  const err = (res, status, error_code, msg) => send(res, status, { code: status, error_code, msg });
  function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  }
  const publicUser = (u) => ({ id: u.id, email: u.email, app_metadata: { provider: u.provider, providers: [u.provider] }, email_confirmed_at: u.confirmed ? 'now' : null });
  function newSession(u) {
    const access = 'access-' + id(), refresh = 'refresh-' + id();
    state.sessions.set(access, u.email); state.refresh.set(refresh, u.email);
    return { access_token: access, refresh_token: refresh, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: publicUser(u) };
  }
  // a one-time code tied to the PKCE challenge the browser sent
  function issueCode(email, challenge) { const code = 'code-' + id(); state.codes.set(code, { email, challenge }); return code; }
  // a 6-digit code per person and kind, like the real service (signup, email = emailed sign-in, recovery)
  function issueOtp(email, type) { const code = String(Math.floor(100000 + Math.random() * 900000)); state.otps.set(email + '|' + type, code); return code; }
  const captchaBad = (body) => state.requireCaptcha && !(body.gotrue_meta_security && body.gotrue_meta_security.captcha_token === state.captchaToken);
  const upsert = (email, provider, password, confirmed) => { let u = state.users.get(email); if (!u) { u = { id: id(), email, provider, password, confirmed: !!confirmed }; state.users.set(email, u); } return u; };

  const server = http.createServer((req, res) => {
    let raw = ''; req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      state.calls.push(req.method + ' ' + url.pathname + url.search);
      if (req.method === 'OPTIONS') return send(res, 204);
      if (url.pathname.startsWith('/__')) { // test helpers
        if (url.pathname === '/__outbox') return send(res, 200, state.outbox);
        return send(res, 404, {});
      }
      if (url.pathname !== '/auth/v1/authorize' && req.headers.apikey !== anonKey) return err(res, 401, 'no_authorization', 'No API key found in request');
      let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (_) { return err(res, 400, 'bad_json', 'Could not parse request body as JSON'); }
      const redirectTo = url.searchParams.get('redirect_to') || '';
      const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');

      if (url.pathname === '/auth/v1/authorize' && req.method === 'GET') { // Google or GitHub: pretend the visitor approved
        const provider = url.searchParams.get('provider');
        if (!['google', 'github'].includes(provider)) return err(res, 400, 'validation_failed', 'Unsupported provider');
        const u = upsert(provider + '.user@example.com', provider, null, true);
        const code = issueCode(u.email, url.searchParams.get('code_challenge'));
        res.writeHead(302, { Location: redirectTo + (redirectTo.includes('?') ? '&' : '?') + 'code=' + code });
        return res.end();
      }
      const guarded = ['/auth/v1/signup', '/auth/v1/otp', '/auth/v1/recover', '/auth/v1/resend'].includes(url.pathname) || (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password');
      if (req.method === 'POST' && guarded && captchaBad(body)) return err(res, 400, 'captcha_failed', 'captcha protection: request disallowed (invalid-input-response)');
      if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
        if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return err(res, 422, 'validation_failed', 'Unable to validate email address: invalid format');
        if (!body.password || body.password.length < 8) return err(res, 422, 'weak_password', 'Password should be at least 8 characters.');
        if (state.users.has(body.email) && state.users.get(body.email).confirmed) return err(res, 422, 'user_already_exists', 'User already registered');
        const u = upsert(body.email, 'email', body.password, !state.confirmEmails);
        if (!state.confirmEmails) return send(res, 200, newSession(u));
        state.outbox.push({ to: u.email, kind: 'confirm', link: redirectTo + '?code=' + issueCode(u.email, body.code_challenge), code: issueOtp(u.email, 'signup'), confirmUser: u.email });
        return send(res, 200, publicUser(u));
      }
      if (url.pathname === '/auth/v1/otp' && req.method === 'POST') {
        const u = upsert(body.email, 'email', null, true);
        state.outbox.push({ to: u.email, kind: 'link', link: redirectTo + '?code=' + issueCode(u.email, body.code_challenge), code: issueOtp(u.email, 'email') });
        return send(res, 200, {});
      }
      if (url.pathname === '/auth/v1/recover' && req.method === 'POST') {
        const u = state.users.get(body.email);
        if (u) state.outbox.push({ to: u.email, kind: 'recovery', link: redirectTo + '?code=' + issueCode(u.email, body.code_challenge), code: issueOtp(u.email, 'recovery') });
        return send(res, 200, {}); // same answer whether or not the address has an account
      }
      if (url.pathname === '/auth/v1/verify' && req.method === 'POST') {
        const want = state.otps.get(body.email + '|' + body.type);
        if (!want || want !== body.token) return err(res, 403, 'otp_expired', 'Token has expired or is invalid');
        state.otps.delete(body.email + '|' + body.type);
        const u = state.users.get(body.email); if (!u) return err(res, 403, 'otp_expired', 'Token has expired or is invalid');
        u.confirmed = true; return send(res, 200, newSession(u));
      }
      if (url.pathname === '/auth/v1/resend' && req.method === 'POST') {
        const u = state.users.get(body.email); if (!u) return send(res, 200, {});
        state.outbox.push({ to: u.email, kind: 'confirm', link: redirectTo + '?code=' + issueCode(u.email, body.code_challenge), code: issueOtp(u.email, 'signup'), confirmUser: u.email });
        return send(res, 200, { message_id: id() });
      }
      if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
        const grant = url.searchParams.get('grant_type');
        if (grant === 'password') {
          const u = state.users.get(body.email);
          if (!u || u.password !== body.password) return err(res, 400, 'invalid_credentials', 'Invalid login credentials');
          if (!u.confirmed) return err(res, 400, 'email_not_confirmed', 'Email not confirmed');
          return send(res, 200, newSession(u));
        }
        if (grant === 'pkce') {
          const c = state.codes.get(body.auth_code);
          if (!c || sha256(body.code_verifier || '') !== c.challenge) return err(res, 400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
          state.codes.delete(body.auth_code);
          const u = state.users.get(c.email); u.confirmed = true;
          return send(res, 200, newSession(u));
        }
        if (grant === 'refresh_token') {
          const email = state.refresh.get(body.refresh_token);
          if (!email) return err(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
          state.refresh.delete(body.refresh_token);
          return send(res, 200, newSession(state.users.get(email)));
        }
        return err(res, 400, 'validation_failed', 'unsupported grant_type');
      }
      if (url.pathname === '/auth/v1/user') {
        const email = state.sessions.get(bearer);
        if (!email) return err(res, 401, 'bad_jwt', 'invalid JWT');
        const u = state.users.get(email);
        if (req.method === 'GET') return send(res, 200, publicUser(u));
        if (req.method === 'PUT') {
          if (body.password && body.password.length < 8) return err(res, 422, 'weak_password', 'Password should be at least 8 characters.');
          if (body.password) u.password = body.password;
          return send(res, 200, publicUser(u));
        }
      }
      if (url.pathname === '/auth/v1/logout' && req.method === 'POST') { state.sessions.delete(bearer); return send(res, 204); }
      return err(res, 404, 'not_found', 'not found');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(Object.assign(state, {
    url: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((r) => server.close(r)),
    confirm(email) { const u = state.users.get(email); if (u) u.confirmed = true; }
  }))));
}
module.exports = { start, sha256 };
