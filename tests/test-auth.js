/* The sign-in library against a pretend Supabase (tests/lib/fake-supabase.js): sign up, confirm, sign in, emailed link, reset, social redirects,
   PKCE checks, session handling, plain-words errors. No network, no real keys. */
const assert = require('assert');
const { start, sha256 } = require('./lib/fake-supabase.js');
const A = require('../site/js/auth.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, m }; };
const outbox = async (fake) => (await fetch(fake.url + '/__outbox')).json();
const codeOf = (link) => new URL(link).searchParams.get('code');

(async () => {
  // helper maths
  assert.strictEqual(A.b64url(Buffer.from([251, 255, 254])), '-__-', 'url-safe base64, no padding');
  assert.strictEqual(await A.challengeOf('abc'), sha256('abc'), 'the PKCE challenge is the SHA-256 of the verifier');
  const v1 = A.randomVerifier(), v2 = A.randomVerifier(); assert(v1.length >= 43 && v1 !== v2 && /^[A-Za-z0-9_-]+$/.test(v1), 'verifiers are long, random and url-safe');
  console.log('  ✓ PKCE helpers');

  const fake = await start({ confirmEmails: true });
  const mk = () => { const storage = mem(), tempStorage = mem(); return { storage, tempStorage, auth: A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage, tempStorage, origin: 'https://edvlabs.test' }) }; };
  let { auth, storage, tempStorage } = mk();

  // checks done in the browser before anything is sent
  let r = await auth.signUp('nope', 'longenough1'); assert(!r.ok && r.field === 'email' && /name@example\.com/.test(r.message));
  r = await auth.signUp('a@example.com', 'short'); assert(!r.ok && r.field === 'password' && /still needs: at least 10 characters/.test(r.message));
  r = await auth.signIn('a@example.com', ''); assert(!r.ok && r.field === 'password');
  assert.strictEqual(fake.calls.length, 0, 'nothing was sent for obviously wrong input');
  console.log('  ✓ obvious mistakes are named without calling the service');

  // sign up: needs the email confirmed
  r = await auth.signUp('anna@example.com', 'Correct-Horse-1!'); assert(r.ok && r.checkEmail, 'asks the person to check their email');
  assert(!storage.getItem(A.SESSION_KEY), 'no session until the address is confirmed');
  r = await auth.signIn('anna@example.com', 'Correct-Horse-1!'); assert(!r.ok && r.field === 'email' && /not confirmed/.test(r.message), r.message);
  let mails = await outbox(fake); assert.strictEqual(mails.length, 1); assert(mails[0].link.startsWith('https://edvlabs.test/account/?code='));
  r = await auth.finishFromCode(codeOf(mails[0].link)); assert(r.ok && r.kind === 'signup' && r.session.user.email === 'anna@example.com', 'the confirmation link signs the person in');
  assert(storage.getItem(A.SESSION_KEY), 'session kept'); assert(!tempStorage.getItem(A.PKCE_KEY), 'the verifier is used up');
  console.log('  ✓ sign up, confirm by the emailed link, signed in');

  // the code only works in the browser that asked, and only once
  r = await auth.signUp('ben@example.com', 'Another-Pass-22!'); mails = await outbox(fake);
  const benCode = codeOf(mails[mails.length - 1].link);
  const other = mk(); r = await other.auth.finishFromCode(benCode); assert(!r.ok && /different browser/.test(r.message), 'a different browser has no verifier: ' + r.message);
  r = await auth.finishFromCode('code-made-up'); assert(!r.ok, 'a made-up code fails');
  // with the right verifier but a wrong code, the service refuses and the message is plain
  tempStorage.setItem(A.PKCE_KEY, JSON.stringify({ verifier: 'x'.repeat(50), kind: 'login' }));
  r = await auth.finishFromCode(benCode); assert(!r.ok && /expired|different browser/.test(r.message), r.message);
  console.log('  ✓ a sign-in code works only with the verifier of the browser that asked');

  // password sign in, wrong password, duplicate sign up
  ({ auth, storage } = mk());
  r = await auth.signIn('anna@example.com', 'wrong wrong 1'); assert(!r.ok && r.field === 'password' && /do not match/.test(r.message) && !/invalid_credentials/.test(r.message));
  r = await auth.signIn('anna@example.com', 'Correct-Horse-1!'); assert(r.ok && r.session.access_token);
  let who = await auth.current(); assert.strictEqual(who.email, 'anna@example.com'); assert.strictEqual(who.provider, 'email');
  r = await mk().auth.signUp('anna@example.com', 'Correct-Horse-1!'); assert(!r.ok && r.field === 'email' && /already an account/.test(r.message));
  console.log('  ✓ password sign in, wrong password and duplicate account are told in plain words');

  // session: tampered local copy is not trusted, expiry triggers a refresh, sign out ends it
  const s = JSON.parse(storage.getItem(A.SESSION_KEY)); s.access_token = 'forged'; s.expires_at = Math.floor(Date.now() / 1000) + 3600; storage.setItem(A.SESSION_KEY, JSON.stringify(s));
  assert.strictEqual(await auth.current(), null, 'a forged token is refused by the server and the session is dropped'); assert(!storage.getItem(A.SESSION_KEY));
  await auth.signIn('anna@example.com', 'Correct-Horse-1!');
  const s2 = JSON.parse(storage.getItem(A.SESSION_KEY)); s2.expires_at = Math.floor(Date.now() / 1000) + 5; storage.setItem(A.SESSION_KEY, JSON.stringify(s2));
  const before = s2.access_token; who = await auth.current(); assert(who && who.email === 'anna@example.com');
  assert.notStrictEqual(JSON.parse(storage.getItem(A.SESSION_KEY)).access_token, before, 'an about-to-expire session is refreshed');
  const kept = JSON.parse(storage.getItem(A.SESSION_KEY)).access_token;
  await auth.signOut(); assert(!storage.getItem(A.SESSION_KEY)); assert(!fake.sessions.has(kept), 'the service ended the session too');
  assert.strictEqual(await auth.current(), null);
  console.log('  ✓ the server decides who is signed in; sessions refresh; sign out ends them everywhere');

  // emailed sign-in link (also creates an account)
  ({ auth, storage } = mk());
  r = await auth.emailLink('carl@example.com'); assert(r.ok);
  mails = await outbox(fake); const carl = mails.filter((m) => m.to === 'carl@example.com')[0];
  r = await auth.finishFromCode(codeOf(carl.link)); assert(r.ok && r.kind === 'link' && r.session.user.email === 'carl@example.com');
  console.log('  ✓ emailed sign-in link');

  // forgot password: same answer for unknown addresses; recovery code signs in, then a new password can be set
  ({ auth, storage } = mk());
  const before2 = (await outbox(fake)).length;
  r = await auth.forgotPassword('nobody@example.com'); assert(r.ok, 'does not reveal whether an address has an account'); assert.strictEqual((await outbox(fake)).length, before2, 'and sends nothing for it');
  r = await auth.forgotPassword('anna@example.com'); assert(r.ok);
  mails = await outbox(fake); r = await auth.finishFromCode(codeOf(mails[mails.length - 1].link)); assert(r.ok && r.kind === 'recovery');
  r = await auth.setPassword('short'); assert(!r.ok && r.field === 'password');
  r = await auth.setPassword('A-Brand-New-Pass-9!'); assert(r.ok);
  r = await mk().auth.signIn('anna@example.com', 'Correct-Horse-1!'); assert(!r.ok, 'the old password stops working');
  r = await mk().auth.signIn('anna@example.com', 'A-Brand-New-Pass-9!'); assert(r.ok, 'the new one works');
  console.log('  ✓ forgot password: neutral answer, recovery link, new password');

  // Google and GitHub: the address to go to carries only the challenge, never the verifier; the redirect brings a code
  ({ auth, storage, tempStorage } = mk());
  r = await auth.oauthUrl('google'); assert(r.ok);
  const u = new URL(r.url); assert.strictEqual(u.searchParams.get('provider'), 'google'); assert.strictEqual(u.searchParams.get('redirect_to'), 'https://edvlabs.test/account/');
  const verifier = JSON.parse(tempStorage.getItem(A.PKCE_KEY)).verifier;
  assert.strictEqual(u.searchParams.get('code_challenge'), sha256(verifier)); assert(!r.url.includes(verifier), 'the verifier never leaves the browser');
  const hop = await fetch(r.url.replace('https://edvlabs.test', 'https://edvlabs.test'), { redirect: 'manual' }); assert.strictEqual(hop.status, 302);
  const back = new URL(hop.headers.get('location')); assert.strictEqual(back.origin + back.pathname, 'https://edvlabs.test/account/');
  r = await auth.finishFromCode(back.searchParams.get('code')); assert(r.ok && r.session.user.email === 'google.user@example.com');
  who = await auth.current(); assert.strictEqual(who.provider, 'google');
  r = await auth.oauthUrl('facebook'); assert(!r.ok, 'only the providers we turned on');
  r = await mk().auth.oauthUrl('github'); assert(r.ok && /provider=github/.test(r.url));
  console.log('  ✓ Google and GitHub redirects: only the challenge is sent, the code is swapped for a session');

  // service down, and plain error mapping
  const dead = A.createAuth({ url: 'http://127.0.0.1:1', anonKey: 'x', storage: mem(), tempStorage: mem(), origin: 'https://edvlabs.test' });
  r = await dead.signIn('a@example.com', 'whatever1'); assert(!r.ok && /could not reach/.test(r.message));
  assert(/Too many tries/.test(A.friendly(429, {}).message)); assert(/our side/.test(A.friendly(503, {}).message)); assert(/did not work/.test(A.friendly(400, { foo: 1 }).message));
  for (const m of ['invalid_credentials', 'weak_password', 'user_already_exists', 'email_not_confirmed']) assert(!/_/.test(A.friendly(400, { error_code: m }).message), 'no codes in messages');
  console.log('  ✓ service down and rate limits give plain messages, never raw codes');

  // the public key is sent as apikey only; Authorization appears only with a person's own token (works for both anon and sb_publishable_ keys)
  const seen = [];
  const spy = A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage: mem(), tempStorage: mem(), origin: 'https://edvlabs.test', fetchImpl: (u, i) => { seen.push({ u, h: i.headers }); return fetch(u, i); } });
  await spy.signIn('anna@example.com', 'A-Brand-New-Pass-9!'); await spy.current();
  assert(seen[0].u.includes('grant_type=password') && seen[0].h.apikey === fake.anonKey && !('Authorization' in seen[0].h), 'anonymous calls send the key as apikey only');
  const userCalls = seen.filter((c) => /\/auth\/v1\/user$/.test(c.u)); assert(userCalls.length === 1 && /^Bearer access-/.test(userCalls[0].h.Authorization) && userCalls[0].h.Authorization !== 'Bearer ' + fake.anonKey, 'the signed-in call carries the person\'s own token');
  console.log('  ✓ the public key goes in apikey only, so both key styles work');

  let c0, mine;
  // the rules are enforced by the library itself, before anything is sent
  c0 = fake.calls.length; mine = mk();
  r = await mine.auth.signUp('rule@example.com', 'abcdefghijkl'); assert(!r.ok && r.field === 'password' && /capital letter/.test(r.message) && /number/.test(r.message) && /symbol/.test(r.message), r.message);
  r = await mine.auth.signUp('rule@example.com', 'Password123!'); assert(!r.ok && /too easy to guess/.test(r.message), r.message);
  r = await mine.auth.setPassword('Password123!'); assert(!r.ok && r.field === 'password');
  assert.strictEqual(fake.calls.length, c0, 'nothing was sent for a password that breaks the rules');
  console.log('  ✓ weak passwords are refused with what is missing, before anything is sent');

  // repeat password: both boxes must match, and nothing is sent when they do not
  mine = mk(); c0 = fake.calls.length;
  r = await mine.auth.signUp('dora@example.com', 'A-Long-Enough-Pass-1!', { repeat: 'A-Long-Enough-Pass-2!' });
  assert(!r.ok && r.field === 'password2' && /not the same/.test(r.message) && fake.calls.length === c0, 'a mismatch is named under the repeat box and sends nothing');
  r = await mine.auth.signUp('dora@example.com', 'A-Long-Enough-Pass-1!', { repeat: 'A-Long-Enough-Pass-1!' }); assert(r.ok && r.checkEmail);
  console.log('  ✓ repeat password must match before anything is sent');

  // the emailed code: wrong code, right code, only digits, per-kind
  let mails2 = await outbox(fake); const dora = mails2.filter((m) => m.to === 'dora@example.com').pop();
  assert(/^\d{8}$/.test(dora.code), 'the email carries a code');
  r = await mine.auth.verifyCode('dora@example.com', 'abc123', 'signup'); assert(!r.ok && r.field === 'code' && /digits only/.test(r.message));
  r = await mine.auth.verifyCode('dora@example.com', dora.code === '11111111' ? '22222222' : '11111111', 'signup'); assert(!r.ok && r.field === 'code' && /wrong or has expired/.test(r.message) && !/otp/i.test(r.message), r.message);
  r = await mine.auth.verifyCode('dora@example.com', ' ' + dora.code.slice(0, 4) + ' ' + dora.code.slice(4) + ' ', 'signup'); assert(r.ok && r.kind === 'signup' && r.session.user.email === 'dora@example.com', 'spaces in a pasted code are ignored');
  assert((await mine.auth.current()).email === 'dora@example.com');
  r = await mine.auth.verifyCode('dora@example.com', dora.code, 'signup'); assert(!r.ok, 'a code works once');
  r = await mine.auth.verifyCode('dora@example.com', dora.code, 'nonsense'); assert(!r.ok);
  console.log('  ✓ the emailed code signs in, once, with a plain message when wrong');

  // emailed sign-in code and recovery code, and resend gives a fresh one
  mine = mk(); await mine.auth.emailLink('eve@example.com');
  let e1 = (await outbox(fake)).filter((m) => m.to === 'eve@example.com').pop();
  r = await mine.auth.resend('eve@example.com', 'link'); assert(r.ok); const e2 = (await outbox(fake)).filter((m) => m.to === 'eve@example.com').pop();
  assert(e2 !== e1, 'resend sends another email');
  r = await mine.auth.verifyCode('eve@example.com', e2.code, 'link'); assert(r.ok && r.session.user.email === 'eve@example.com');
  mine = mk(); await mine.auth.forgotPassword('eve@example.com'); const rec = (await outbox(fake)).filter((m) => m.to === 'eve@example.com' && m.kind === 'recovery').pop();
  r = await mine.auth.verifyCode('eve@example.com', rec.code, 'recovery'); assert(r.ok && r.kind === 'recovery');
  r = await mine.auth.setPassword('A-New-Garden-33!', { repeat: 'Another-One-44!' }); assert(!r.ok && r.field === 'password2');
  r = await mine.auth.setPassword('A-New-Garden-33!', { repeat: 'A-New-Garden-33!' }); assert(r.ok);
  mine = mk(); await mine.auth.signUp('fay@example.com', 'A-Long-Enough-Pass-1!'); r = await mine.auth.resend('fay@example.com', 'signup'); assert(r.ok);
  const fay = (await outbox(fake)).filter((m) => m.to === 'fay@example.com'); assert.strictEqual(fay.length, 2, 'resend for a new account sends a second email');
  r = await mine.auth.verifyCode('fay@example.com', fay[1].code, 'signup'); assert(r.ok, 'the newest code works');
  console.log('  ✓ emailed sign-in code, recovery code with a repeated new password, and resend');

  // spam check: the token travels in the body Supabase checks, and a missing one is refused in plain words
  const guarded = await start({ confirmEmails: false, requireCaptcha: true });
  const g = A.createAuth({ url: guarded.url, anonKey: guarded.anonKey, storage: mem(), tempStorage: mem(), origin: 'https://edvlabs.test' });
  r = await g.signUp('gina@example.com', 'A-Long-Enough-Pass-1!'); assert(!r.ok && /spam check did not pass/.test(r.message) && !/captcha/i.test(r.message), 'no token: ' + r.message);
  r = await g.signUp('gina@example.com', 'A-Long-Enough-Pass-1!', { captchaToken: guarded.captchaToken }); assert(r.ok, 'with the token it works');
  r = await g.signIn('gina@example.com', 'A-Long-Enough-Pass-1!'); assert(!r.ok); r = await g.signIn('gina@example.com', 'A-Long-Enough-Pass-1!', { captchaToken: guarded.captchaToken }); assert(r.ok);
  r = await g.emailLink('gina@example.com'); assert(!r.ok); r = await g.emailLink('gina@example.com', { captchaToken: guarded.captchaToken }); assert(r.ok);
  r = await g.forgotPassword('gina@example.com'); assert(!r.ok); r = await g.forgotPassword('gina@example.com', { captchaToken: guarded.captchaToken }); assert(r.ok);
  await guarded.close();
  console.log('  ✓ the spam-check token is sent with sign up, sign in, emailed link and reset');

  await fake.close();
  console.log('auth ok');
})().catch((e) => { console.error(e); process.exit(1); });
