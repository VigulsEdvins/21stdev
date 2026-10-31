/* Paying for a publishing place with Stripe (plan 2026-10-31-stripe-publish-places.md). No Stripe library: the Checkout Session is created with fetch,
   and the webhook's signature is checked with Web Crypto, so the same code runs in the Worker and in the tests.
     createCheckout({ env, user, origin, fetchImpl })       -> { status, json }   a Stripe Checkout page address for one place
     verifySignature(rawBody, header, secret, nowSec)        -> true / false        Stripe-Signature: t=…,v1=…
     createPayments({ db, now }).handleEvent(event)         -> { status, json }   what the webhook does with one event
   Settings (never in git): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (secrets), STRIPE_PRICE_ID (the one-off price of a place, made in the Stripe dashboard).
   The browser never says what was paid: only a signed event creates a place. db: placeBySession, insertPlace (throws code 'duplicate'), refundByIntent. */

const MONTHS = 12;
const TOLERANCE_S = 300; // a signed event older than this is refused, so a captured request cannot be replayed later
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NEEDED = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'];
const missing = (env, keys) => (keys || NEEDED).filter((k) => !env[k]);
const isTestKey = (key) => /^(sk|rk)_test_/.test(String(key || ''));

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
async function hmacHex(secret, text) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
function sameText(a, b) { // the time must not depend on how many leading characters match
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Stripe-Signature is "t=<unix>,v1=<hex>[,v1=<hex>…]"; v1 is HMAC-SHA256 of "<t>.<raw body>". Any v1 may match (Stripe sends two while a secret is being rolled). */
async function verifySignature(rawBody, header, secret, nowSec) {
  if (typeof rawBody !== 'string' || typeof header !== 'string' || !secret) return false;
  let t = null; const v1 = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('='); if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't') t = v; else if (k === 'v1') v1.push(v);
  }
  if (!t || !/^\d{1,12}$/.test(t) || !v1.length) return false;
  if (Math.abs(nowSec - Number(t)) > TOLERANCE_S) return false;
  const expected = await hmacHex(secret, t + '.' + rawBody);
  return v1.some((v) => sameText(v, expected));
}

const addMonths = (iso, m) => { const d = new Date(iso); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString(); };

/** A Checkout Session for one place. Returns { status, json: { ok, url, testMode } }. */
async function createCheckout({ env, user, origin, fetchImpl }) {
  const absent = missing(env);
  if (absent.length) return { status: 503, json: { ok: false, errors: ['Payment is not switched on yet.'], missing: absent } }; // names only, never values
  const f = fetchImpl || fetch;
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price]', env.STRIPE_PRICE_ID);
  form.set('line_items[0][quantity]', '1');
  form.set('client_reference_id', user.id);
  form.set('metadata[user_id]', user.id);
  form.set('payment_intent_data[metadata][user_id]', user.id);
  if (user.email) form.set('customer_email', user.email);
  form.set('success_url', origin + '/builder/?paid=1');
  form.set('cancel_url', origin + '/builder/?paid=0');
  let r;
  try {
    r = await f('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  } catch (e) { return { status: 502, json: { ok: false, errors: ['Payment could not be reached just now. Please try again.'] } }; }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || typeof j.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(j.url)) {
    console.error('stripe checkout failed: ' + r.status + ' ' + (j && j.error && (j.error.code || j.error.type))); // the code stays in the Worker's log; Stripe's message is not logged because it can echo what was sent
    return { status: 502, json: { ok: false, errors: ['Payment could not be started just now. Please try again.'] } };
  }
  return { status: 200, json: { ok: true, url: j.url, testMode: isTestKey(env.STRIPE_SECRET_KEY) } };
}

function createPayments({ db, now }) {
  const ok = (extra) => ({ status: 200, json: Object.assign({ ok: true }, extra || {}) });

  async function paid(session) {
    if (!session || session.mode !== 'payment' || session.payment_status !== 'paid') return ok({ ignored: 'not-paid' }); // async methods send a second event once the money arrives
    const userId = (session.metadata && session.metadata.user_id) || session.client_reference_id;
    if (typeof session.id !== 'string' || typeof userId !== 'string' || !UUID.test(userId)) { console.error('stripe: paid session ' + session.id + ' has no valid user'); return { status: 400, json: { ok: false, errors: ['No account on this payment.'] } }; }
    if (await db.placeBySession(session.id)) return ok({ duplicate: true });
    try {
      await db.insertPlace({ user_id: userId, status: 'active', paid_until: addMonths(now(), MONTHS), granted_by: 'payment', stripe_session_id: session.id, stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null });
    } catch (e) {
      if (e && e.code === 'duplicate') return ok({ duplicate: true }); // two deliveries at the same moment: the unique index let one through
      throw e; // a 500 makes Stripe try again later
    }
    return ok({ created: true });
  }

  async function refunded(charge) {
    if (!charge || charge.refunded !== true || typeof charge.payment_intent !== 'string') return ok({ ignored: 'partial' }); // only a full refund takes the place away
    await db.refundByIntent(charge.payment_intent);
    return ok({ refunded: true });
  }

  return {
    async handleEvent(event) {
      if (!event || typeof event.type !== 'string' || !event.data || typeof event.data.object !== 'object') return { status: 400, json: { ok: false, errors: ['Not an event.'] } };
      const o = event.data.object;
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') return paid(o);
      if (event.type === 'charge.refunded') return refunded(o);
      return ok({ ignored: event.type });
    }
  };
}

module.exports = { createCheckout, createPayments, verifySignature, hmacHex, isTestKey, missing, NEEDED, MONTHS };
