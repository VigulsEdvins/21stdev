/* The HTTP side of paying for a publishing place, in the main Worker (plan 2026-10-31-stripe-publish-places.md). Two endpoints:
     POST /api/quote           signed in; { projectId, destination, editor, hosting, deployHelp }; answers the price lines for the overlay, worked out from the saved page
     POST /api/checkout        signed in; the same body (+ siteName); answers { ok, url, testMode }: the one Stripe page for the whole order
     GET  /api/my-purchases    signed in; what this person has bought, for the builder
     POST /api/deploy-request  signed in; { purchaseId, domain, notes }: the details for "we put it online for you", sent once
     POST /api/billing-portal  signed in; answers { ok, url }: the Stripe page to cancel, switch plan or change the card
     POST /api/stripe-webhook  only Stripe: the raw body is checked against the Stripe-Signature header, then a payment makes a place
   All the rules are in ./payment.js; the storage is in ./sites-store.js. Settings (never in git): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (secrets),
   STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, and the same SUPABASE_* settings as publishing. Without them the endpoints answer 503 naming what is missing, and nothing else changes. */
const Payment = require('./payment.js');
const store = require('./sites-store.js');

const SUPABASE = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const MAX_EVENT = 512 * 1024; // Stripe events are a few KB; this only stops abuse

/** deps (tests): { user(token), db, fetchImpl, nowSec() }. The real ones are built from the Worker's settings. */
async function route(request, env, json, deps) {
  const url = new URL(request.url), path = url.pathname;
  if (!['/api/checkout', '/api/quote', '/api/billing-portal', '/api/stripe-webhook', '/api/deploy-request', '/api/my-purchases'].includes(path)) return null;
  if (request.method !== (path === '/api/my-purchases' ? 'GET' : 'POST')) return json(405, { ok: false, errors: ['Use POST.'] }, { Allow: path === '/api/my-purchases' ? 'GET' : 'POST' });
  const d = deps || {};
  const db = d.db || (SUPABASE.every((k) => env[k]) ? store.createDb(env) : null);

  if (path !== '/api/stripe-webhook') {
    const need = path === '/api/checkout' || path === '/api/billing-portal' ? ['STRIPE_SECRET_KEY'] : [];
    const absent = [...SUPABASE, ...need].filter((k) => !env[k]);
    if (absent.length && !d.user) return json(503, { ok: false, errors: ['Payment is not switched on yet.'], missing: absent });
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json(403, { ok: false, errors: ['Not allowed.'] });
    const m = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') || '');
    const user = m ? await (d.user ? d.user(m[1]) : store.verifyUser(env, m[1])) : null;
    if (!user) return json(401, { ok: false, errors: ['Please sign in.'] });
    let r;
    if (path === '/api/my-purchases') r = await Payment.listPurchases({ db, user, env });
    else if (path === '/api/billing-portal') r = await Payment.createPortal({ env, db, user, origin: url.origin, fetchImpl: d.fetchImpl });
    else {
      let body = null; try { body = JSON.parse(await request.text()); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') return json(400, { ok: false, errors: ['That was not valid JSON.'] });
      r = path === '/api/quote' ? await Payment.createQuote({ db, user, body, env }) : path === '/api/deploy-request' ? await Payment.submitDeployRequest({ db, user, body }) : await Payment.createOrderCheckout({ env, db, user, origin: url.origin, body, fetchImpl: d.fetchImpl, kv: d.kv || env.SITES });
    }
    return json(r.status, r.json);
  }

  // the webhook: no sign-in and no Origin rule (Stripe is not a browser); the signature is the only way in
  if (!env.STRIPE_WEBHOOK_SECRET || !db) return json(503, { ok: false, errors: ['Payment is not switched on yet.'], missing: [...(env.STRIPE_WEBHOOK_SECRET ? [] : ['STRIPE_WEBHOOK_SECRET']), ...(db ? [] : SUPABASE.filter((k) => !env[k]))] });
  if (Number(request.headers.get('Content-Length') || 0) > MAX_EVENT) return json(413, { ok: false, errors: ['That is too large.'] });
  const raw = await request.text();
  if (raw.length > MAX_EVENT) return json(413, { ok: false, errors: ['That is too large.'] });
  const nowSec = d.nowSec ? d.nowSec() : Math.floor(Date.now() / 1000);
  if (!(await Payment.verifySignature(raw, request.headers.get('Stripe-Signature') || '', env.STRIPE_WEBHOOK_SECRET, nowSec))) return json(400, { ok: false, errors: ['Bad signature.'] });
  let event; try { event = JSON.parse(raw); } catch (e) { return json(400, { ok: false, errors: ['That was not valid JSON.'] }); }
  try {
    const r = await Payment.createPayments({ db, env, now: () => (d.nowSec ? new Date(d.nowSec() * 1000) : new Date()).toISOString() }).handleEvent(event);
    return json(r.status, r.json);
  } catch (e) {
    console.error('stripe webhook failed: ' + (e && e.message)); // names the problem, never the keys; a 500 makes Stripe retry
    return json(500, { ok: false, errors: ['Could not record that just now.'] });
  }
}

module.exports = { route };
