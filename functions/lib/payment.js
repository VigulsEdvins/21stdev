/* Paying for a publishing place with Stripe (plan 2026-10-31-stripe-publish-places.md). No Stripe library: the Checkout Session is created with fetch,
   and the webhook's signature is checked with Web Crypto, so the same code runs in the Worker and in the tests.
     createCheckout({ env, user, origin, plan, fetchImpl }) -> { status, json }   a Stripe Checkout page for hosting, monthly or yearly, first month free
     createPortal({ env, db, user, origin, fetchImpl })     -> { status, json }   the Stripe page to cancel, switch plan or change the card
     verifySignature(rawBody, header, secret, nowSec)        -> true / false        Stripe-Signature: t=…,v1=…
     createPayments({ db, now }).handleEvent(event)         -> { status, json }   what the webhook does with one event
   Settings (never in git): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (secrets), STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY (the two recurring prices, made in the Stripe dashboard), optional STRIPE_TRIAL_DAYS (default 30).
   The browser never says what was paid: only a signed event creates a place. db: placeBySession, insertPlace (throws code 'duplicate'), extendBySubscription, endBySubscription, refundByIntent, customerForUser. */

const TRIAL_DAYS = 30; // the first month is free (Stripe collects the card now and charges when the trial ends)
const TOLERANCE_S = 300; // a signed event older than this is refused, so a captured request cannot be replayed later
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLANS = { monthly: 'STRIPE_PRICE_MONTHLY', yearly: 'STRIPE_PRICE_YEARLY' };
const NEEDED = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY'];
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

const iso = (sec) => new Date(sec * 1000).toISOString();
const trialDays = (env) => { const n = Number(env.STRIPE_TRIAL_DAYS); return Number.isInteger(n) && n >= 0 && n <= 90 ? n : TRIAL_DAYS; };

/** One call to Stripe. Returns { ok, json }; the reason of a failure stays in the Worker's log (the code only: Stripe's message can echo what was sent). */
async function stripePost(env, fetchImpl, path, form) {
  const f = fetchImpl || fetch;
  let r;
  try { r = await f('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form }); } catch (e) { return { ok: false, json: null }; }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) console.error('stripe ' + path + ' failed: ' + r.status + ' ' + (j && j.error && (j.error.code || j.error.type)));
  return { ok: r.ok, json: j };
}
const sorry = (what) => ({ status: 502, json: { ok: false, errors: [what + ' just now. Please try again.'] } });

/** A Checkout Session for hosting: plan is 'monthly' or 'yearly'; the first month is free. Returns { status, json: { ok, url, testMode } }. */
async function createCheckout({ env, user, origin, plan, fetchImpl }) {
  const absent = missing(env);
  if (absent.length) return { status: 503, json: { ok: false, errors: ['Payment is not switched on yet.'], missing: absent } }; // names only, never values
  if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) return { status: 400, json: { ok: false, errors: ['Choose monthly or yearly.'] } };
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', env[PLANS[plan]]);
  form.set('line_items[0][quantity]', '1');
  const days = trialDays(env);
  if (days > 0) form.set('subscription_data[trial_period_days]', String(days));
  form.set('subscription_data[metadata][user_id]', user.id);
  form.set('client_reference_id', user.id);
  form.set('metadata[user_id]', user.id);
  if (user.email) form.set('customer_email', user.email);
  form.set('success_url', origin + '/builder/?paid=1');
  form.set('cancel_url', origin + '/builder/?paid=0');
  const r = await stripePost(env, fetchImpl, 'checkout/sessions', form);
  if (!r.ok || !r.json || typeof r.json.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(r.json.url)) return sorry('Payment could not be started');
  return { status: 200, json: { ok: true, url: r.json.url, testMode: isTestKey(env.STRIPE_SECRET_KEY) } };
}

/** The Stripe page where a customer cancels, switches plan or changes the card. `db.customerForUser(userId)` finds the customer. */
async function createPortal({ env, db, user, origin, fetchImpl }) {
  const absent = missing(env, ['STRIPE_SECRET_KEY']);
  if (absent.length) return { status: 503, json: { ok: false, errors: ['Payment is not switched on yet.'], missing: absent } };
  const customer = await db.customerForUser(user.id);
  if (!customer) return { status: 404, json: { ok: false, errors: ['There is no subscription on this account yet.'] } };
  const form = new URLSearchParams(); form.set('customer', customer); form.set('return_url', origin + '/builder/');
  const r = await stripePost(env, fetchImpl, 'billing_portal/sessions', form);
  if (!r.ok || !r.json || typeof r.json.url !== 'string' || !/^https:\/\/billing\.stripe\.com\//.test(r.json.url)) return sorry('The billing page could not be opened');
  return { status: 200, json: { ok: true, url: r.json.url } };
}

function createPayments({ db, now, env }) {
  const ok = (extra) => ({ status: 200, json: Object.assign({ ok: true }, extra || {}) });
  const id = (v) => (typeof v === 'string' ? v : v && typeof v.id === 'string' ? v.id : null); // Stripe sends an id, or the whole object when expanded

  /* The person has paid for hosting (a card is on file and the trial has begun). Make the place; until the first invoice says otherwise it lasts the trial plus a day. */
  async function subscribed(session) {
    if (!session || session.mode !== 'subscription') return ok({ ignored: 'not-subscription' });
    const userId = (session.metadata && session.metadata.user_id) || session.client_reference_id, sub = id(session.subscription);
    if (typeof session.id !== 'string' || !sub || typeof userId !== 'string' || !UUID.test(userId)) { console.error('stripe: session ' + session.id + ' has no valid user or subscription'); return { status: 400, json: { ok: false, errors: ['No account on this payment.'] } }; }
    if (await db.placeBySession(session.id)) return ok({ duplicate: true });
    const until = new Date(new Date(now()).getTime() + (trialDays(env || {}) + 1) * 86400000).toISOString();
    try {
      await db.insertPlace({ user_id: userId, status: 'active', paid_until: until, granted_by: 'payment', stripe_session_id: session.id, stripe_subscription_id: sub, stripe_customer_id: id(session.customer) });
    } catch (e) {
      if (e && e.code === 'duplicate') return ok({ duplicate: true }); // two deliveries at the same moment: the unique index let one through
      throw e; // a 500 makes Stripe try again later
    }
    return ok({ created: true });
  }

  /* An invoice was paid (the free first one, or a renewal): the place now lasts to the end of the period that was paid. A failed renewal sends no such event, so the place simply runs into the 14 days of grace. */
  async function invoicePaid(invoice) {
    const sub = id(invoice && invoice.subscription), line = invoice && invoice.lines && Array.isArray(invoice.lines.data) ? invoice.lines.data[0] : null;
    const end = line && line.period && Number.isFinite(line.period.end) ? line.period.end : null;
    if (!sub || !end) return ok({ ignored: 'no-period' });
    await db.extendBySubscription(sub, iso(end));
    return ok({ extended: true });
  }

  async function cancelled(subscription) {
    const sub = id(subscription);
    if (!sub) return ok({ ignored: 'no-subscription' });
    await db.endBySubscription(sub);
    return ok({ ended: true });
  }

  async function refunded(charge) {
    if (!charge || charge.refunded !== true || typeof charge.payment_intent !== 'string') return ok({ ignored: 'partial' }); // only a full refund takes the place away
    await db.refundByIntent(charge.payment_intent);
    return ok({ refunded: true });
  }

  return {
    async handleEvent(event) {
      if (!event || typeof event.type !== 'string' || !event.data || typeof event.data.object !== 'object' || !event.data.object) return { status: 400, json: { ok: false, errors: ['Not an event.'] } };
      const o = event.data.object;
      if (event.type === 'checkout.session.completed') return subscribed(o);
      if (event.type === 'invoice.paid') return invoicePaid(o);
      if (event.type === 'customer.subscription.deleted') return cancelled(o);
      if (event.type === 'charge.refunded') return refunded(o);
      return ok({ ignored: event.type });
    }
  };
}

module.exports = { createCheckout, createPortal, createPayments, verifySignature, hmacHex, isTestKey, missing, NEEDED, PLANS, TRIAL_DAYS };
