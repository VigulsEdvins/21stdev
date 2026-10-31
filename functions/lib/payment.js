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
const Quote = require('./quote.js');
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

const siteNameOk = (n) => typeof n === 'string' && n.length >= 3 && n.length <= 30 && /^[a-z0-9-]+$/.test(n) && !n.startsWith('-') && !n.endsWith('-') && !n.includes('--'); // the shape only; the name itself is checked again when the site is published
const bad = (status, message) => ({ status, json: { ok: false, errors: [message] } });
const REFUSED = { 'no-blocks': 'Add at least one block to your page first.', 'bad-combination': 'Those options are not available together. Please check your choices.' };

/** What the person asked for, with every value strictly checked: only a real `true` counts as true, so a forged or odd value can only ever make the order cheaper to refuse, never cheaper to pay. */
function readOrder(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (typeof b.projectId !== 'string' || !UUID.test(b.projectId)) return null;
  return { projectId: b.projectId, destination: typeof b.destination === 'string' ? b.destination : '', editor: b.editor === true, hosting: typeof b.hosting === 'string' ? b.hosting : null, deployHelp: b.deployHelp === true,
    siteName: siteNameOk(b.siteName) ? b.siteName : '' };
}

/** The price of one order, from the person's own saved page and prices.js, never from the browser. Returns { status, json } for a refusal, or { status: 200, q, project, order }. */
async function quoteOrder({ db, user, body, env }) {
  const order = readOrder(body);
  if (!order) return bad(400, 'Which page do you want to buy?');
  const project = await db.projectForUser(order.projectId, user.id);
  if (!project) return bad(404, 'We could not find that page in your account.');
  const latest = await db.purchaseForProject(order.projectId);
  const q = Quote.quote({ blocks: Quote.countProjectBlocks(project.state), editor: order.editor, destination: order.destination, hosting: order.hosting, deployHelp: order.deployHelp, trialDays: trialDays(env || {}),
    paid: latest ? { allowance: latest.allowance, editor: latest.editor, version: latest.price_version } : undefined });
  if (!q.ok && q.reason === 'nothing-to-pay') return { status: 409, json: { ok: false, alreadyBought: true, errors: ['You have already bought this page. Nothing more to pay.'] } };
  if (!q.ok) return bad(400, REFUSED[q.reason] || 'That order could not be priced.');
  return { status: 200, q, project, order, latest };
}

/** The price lines for the overlay: { status, json }. */
async function createQuote({ db, user, body, env }) {
  const r = await quoteOrder({ db, user, body, env });
  if (r.status !== 200) return r;
  return { status: 200, json: { ok: true, lines: r.q.lines, payToday: r.q.payToday, hosting: r.q.hosting, blocks: r.q.newAllowance, testMode: isTestKey(env && env.STRIPE_SECRET_KEY) } };
}

/** One Stripe Checkout Session for the whole order. With hosting: a subscription (free first month) that also carries the one-time items; without: a plain payment. Returns { status, json: { ok, url, testMode } }. */
async function createOrderCheckout({ env, db, user, origin, body, fetchImpl }) {
  const r = await quoteOrder({ db, user, body, env });
  if (r.status !== 200) return r;
  const { q, order, latest } = r;
  const absent = missing(env, q.hosting ? ['STRIPE_SECRET_KEY', PLANS[q.hosting.plan]] : ['STRIPE_SECRET_KEY']);
  if (absent.length) return { status: 503, json: { ok: false, errors: ['Payment is not switched on yet.'], missing: absent } }; // names only, never values
  const form = new URLSearchParams();
  let i = 0;
  if (q.hosting) { form.set('line_items[0][price]', env[PLANS[q.hosting.plan]]); form.set('line_items[0][quantity]', '1'); i = 1; }
  for (const line of q.lines) {
    const qty = line.qty || 1;
    form.set('line_items[' + i + '][price_data][currency]', 'eur');
    form.set('line_items[' + i + '][price_data][product_data][name]', line.label);
    form.set('line_items[' + i + '][price_data][unit_amount]', String(Math.round(line.amount / qty * 100)));
    form.set('line_items[' + i + '][quantity]', String(qty));
    i++;
  }
  form.set('mode', q.hosting ? 'subscription' : 'payment');
  if (q.hosting && q.hosting.trialDays > 0) form.set('subscription_data[trial_period_days]', String(q.hosting.trialDays));
  const meta = { user_id: user.id, project_id: order.projectId, destination: order.destination, editor: order.editor || (latest && latest.editor) ? '1' : '0', blocks: String(q.newAllowance), price_version: q.priceVersion, deploy_help: order.deployHelp ? '1' : '0', site_name: order.siteName };
  for (const [k, v] of Object.entries(meta)) { form.set('metadata[' + k + ']', v); if (q.hosting) form.set('subscription_data[metadata][' + k + ']', v); }
  form.set('client_reference_id', user.id);
  if (user.email) form.set('customer_email', user.email);
  form.set('success_url', origin + '/builder/?paid=1');
  form.set('cancel_url', origin + '/builder/?paid=0');
  const s = await stripePost(env, fetchImpl, 'checkout/sessions', form);
  if (!s.ok || !s.json || typeof s.json.url !== 'string' || !/^https:\/\/checkout\.stripe\.com\//.test(s.json.url)) return sorry('Payment could not be started');
  return { status: 200, json: { ok: true, url: s.json.url, testMode: isTestKey(env.STRIPE_SECRET_KEY) } };
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

/** The buying flow gates publishing only when the owner switches it on (Worker setting BUYING_FLOW=1) and Stripe is set up, so nobody who already publishes is locked out by a deploy. */
const buyingOn = (env) => !!env && env.BUYING_FLOW === '1' && !!env.STRIPE_SECRET_KEY;

/** What this person has bought, for the builder (no Stripe ids). */
async function listPurchases({ db, user, env }) {
  const rows = await db.purchasesByUser(user.id);
  return { status: 200, json: { ok: true, paymentOn: buyingOn(env), purchases: rows.map((r) => ({ id: r.id, projectId: r.project_id, allowance: r.allowance, editor: !!r.editor, destination: r.destination, createdAt: r.created_at })) } };
}

const domainOk = (d) => d.length >= 4 && d.length <= 253 && /^[a-z0-9.-]+$/.test(d) && d.includes('.') && !d.includes('..') && !/^[.-]|[.-]$/.test(d);

/** The details for "We put it online for you": the domain and a note, sent once by the person who bought it. */
async function submitDeployRequest({ db, user, body }) {
  const b = body && typeof body === 'object' ? body : {};
  const purchase = typeof b.purchaseId === 'string' ? await db.purchaseById(b.purchaseId) : null;
  const request = purchase && purchase.user_id === user.id ? await db.deployRequestForPurchase(purchase.id) : null;
  if (!request) return bad(404, 'We could not find that order.');
  const domain = typeof b.domain === 'string' ? b.domain.trim().toLowerCase() : '';
  if (!domainOk(domain)) return bad(400, 'Please type the domain name, like yourname.com.');
  if (b.notes !== undefined && (typeof b.notes !== 'string' || b.notes.length > 2000)) return bad(400, 'Your note is too long. Please keep it under 2000 characters.');
  if (!(await db.fillDeployRequest(purchase.id, { domain, notes: typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : '' }))) return bad(409, 'You have already sent the details. We will be in touch.');
  return { status: 200, json: { ok: true } };
}

function createPayments({ db, now, env }) {
  const ok = (extra) => ({ status: 200, json: Object.assign({ ok: true }, extra || {}) });
  const id = (v) => (typeof v === 'string' ? v : v && typeof v.id === 'string' ? v.id : null); // Stripe sends an id, or the whole object when expanded

  const DESTINATIONS = ['edvlabs', 'domain', 'download'];
  /* What the order metadata says, checked before anything is written. null means it is not an order from the buying flow (an older hosting-only session). */
  async function readOrderMeta(m, userId) {
    if (m.project_id === undefined) return null;
    const blocks = /^\d{1,3}$/.test(String(m.blocks)) ? Number(m.blocks) : 0;
    const good = typeof m.project_id === 'string' && UUID.test(m.project_id) && DESTINATIONS.includes(m.destination) && blocks >= 1 && blocks <= 500
      && typeof m.price_version === 'string' && m.price_version.length >= 1 && m.price_version.length <= 20 && (m.editor === '1' || m.editor === '0') && (m.deploy_help === '1' || m.deploy_help === '0');
    if (!good || !(await db.projectForUser(m.project_id, userId))) return { bad: true };
    return { projectId: m.project_id, destination: m.destination, allowance: blocks, editor: m.editor === '1', version: m.price_version, deployHelp: m.deploy_help === '1' };
  }

  /* The client has paid for an order (a subscription with a free first month, or a one-time payment). Each part is written on its own and is safe to repeat, so a delivery that failed halfway
     is finished by Stripe's retry: the purchase (what was bought), the page marked paid, the deploy-help request, and for hosting the place. */
  async function completed(session) {
    if (!session || (session.mode !== 'subscription' && session.mode !== 'payment')) return ok({ ignored: 'not-ours' });
    const m = session.metadata || {}, userId = m.user_id || session.client_reference_id, sub = id(session.subscription);
    if (typeof session.id !== 'string' || typeof userId !== 'string' || !UUID.test(userId) || (session.mode === 'subscription' && !sub)) { console.error('stripe: session ' + session.id + ' has no valid user or subscription'); return { status: 400, json: { ok: false, errors: ['No account on this payment.'] } }; }
    if (session.mode === 'payment' && session.payment_status !== 'paid') return ok({ ignored: 'not-paid' }); // a delayed method sends this event unpaid first
    const order = await readOrderMeta(m, userId);
    if (order && order.bad) { console.error('stripe: session ' + session.id + ' has a bad order'); return { status: 400, json: { ok: false, errors: ['That order could not be read.'] } }; }
    if (session.mode === 'payment' && !order) return ok({ ignored: 'not-ours' });
    if (order) {
      let purchase = await db.purchaseBySession(session.id);
      if (!purchase) {
        try { purchase = await db.insertPurchase({ project_id: order.projectId, user_id: userId, allowance: order.allowance, editor: order.editor, price_version: order.version, destination: order.destination, stripe_session_id: session.id }); } catch (e) {
          if (!e || e.code !== 'duplicate') throw e; // a 500 makes Stripe try again later
          purchase = await db.purchaseBySession(session.id); // two deliveries at the same moment: the unique index let one through
        }
      }
      await db.markProjectPaid(order.projectId);
      if (order.deployHelp && purchase) {
        try { await db.insertDeployRequest({ purchase_id: purchase.id, user_id: userId, status: 'open' }); } catch (e) { if (!e || e.code !== 'duplicate') throw e; }
      }
    }
    if (session.mode !== 'subscription') return ok({ created: true });
    if (await db.placeBySession(session.id)) return ok({ duplicate: true });
    const until = new Date(new Date(now()).getTime() + (trialDays(env || {}) + 1) * 86400000).toISOString(); // until the first invoice says otherwise: the free month and a day
    try {
      await db.insertPlace({ user_id: userId, status: 'active', paid_until: until, granted_by: 'payment', stripe_session_id: session.id, stripe_subscription_id: sub, stripe_customer_id: id(session.customer) });
    } catch (e) {
      if (e && e.code === 'duplicate') return ok({ duplicate: true });
      throw e;
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
      if (event.type === 'checkout.session.completed') return completed(o);
      if (event.type === 'invoice.paid') return invoicePaid(o);
      if (event.type === 'customer.subscription.deleted') return cancelled(o);
      if (event.type === 'charge.refunded') return refunded(o);
      return ok({ ignored: event.type });
    }
  };
}

module.exports = { createOrderCheckout, createQuote, createPortal, listPurchases, submitDeployRequest, buyingOn, createPayments, verifySignature, hmacHex, isTestKey, missing, NEEDED, PLANS, TRIAL_DAYS };
