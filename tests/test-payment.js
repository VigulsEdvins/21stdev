/** Hosting subscription: the webhook signature, replays, renewals, cancelling, refunds, the Checkout and portal calls and the two endpoints. Nothing touches the network or Stripe. */
const assert = require('assert');
const http = require('../functions/lib/lead-http.js');
const Pay = require('../functions/lib/payment.js');

const U1 = '11111111-1111-4111-8111-111111111111';
const SECRET = 'whsec' + '_' + 'fake'.repeat(6), NOW_S = 1798800000; // the secret is a made-up value built in pieces, not a real one; // 2027-01-01T10:40:00Z
const ENV = { STRIPE_SECRET_KEY: 'sk_test_' + 'a'.repeat(24), STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' };
const asset = async () => new Response('static');
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

function fakeDb() {
  const rows = [];
  return {
    rows,
    async placeBySession(id) { return rows.find((r) => r.stripe_session_id === id) || null; },
    async insertPlace(row) { if (rows.some((r) => r.stripe_session_id === row.stripe_session_id || (row.stripe_subscription_id && r.stripe_subscription_id === row.stripe_subscription_id))) throw Object.assign(new Error('dup'), { code: 'duplicate' }); rows.push(Object.assign({ id: 'ent-' + (rows.length + 1) }, row)); return row; },
    async extendBySubscription(sub, until) { rows.filter((r) => r.stripe_subscription_id === sub && r.status === 'active').forEach((r) => { r.paid_until = until; }); },
    async endBySubscription(sub) { rows.filter((r) => r.stripe_subscription_id === sub).forEach((r) => { r.status = 'ended'; }); },
    async customerForUser(u) { const r = rows.find((x) => x.user_id === u && x.stripe_customer_id); return r ? r.stripe_customer_id : null; },
    async refundByIntent(intent) { rows.filter((r) => r.stripe_payment_intent === intent).forEach((r) => { r.status = 'refunded'; }); }
  };
}
const session = (over) => ({ id: 'cs_test_1', mode: 'subscription', subscription: 'sub_1', customer: 'cus_1', client_reference_id: U1, metadata: { user_id: U1 }, ...over });
const invoice = (over) => ({ id: 'in_1', subscription: 'sub_1', lines: { data: [{ period: { start: NOW_S, end: NOW_S + 30 * 86400 } }] }, ...over });
const event = (type, object) => ({ id: 'evt_1', type, data: { object } });
async function signed(body, t, secret) { return 't=' + t + ',v1=' + (await Pay.hmacHex(secret || SECRET, t + '.' + body)); }

function world(env) {
  const db = fakeDb(), calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ id: 'cs_test_9', url: 'https://checkout.stripe.com/c/pay/cs_test_9' }), { status: 200 }); };
  const deps = { payment: { db, user: async (t) => (t === 'token-for-user-one-aaaaaaaa' ? { id: U1, email: 'a@example.com' } : null), fetchImpl, nowSec: () => NOW_S } };
  const call = (path, init, headers) => http.route(new Request('https://edvlabs.test' + path, Object.assign({ method: 'POST' }, init, { headers: headers || {} })), env || ENV, asset, deps);
  const hook = async (obj, over) => { const body = JSON.stringify(obj); return call('/api/stripe-webhook', { body }, { 'Stripe-Signature': await signed(body, NOW_S, over && over.secret), 'Content-Type': 'application/json' }); };
  return { db, calls, call, hook };
}

(async () => {
  await test('signature: right one passes; wrong secret, edited body, old timestamp, junk header and a rolled second v1 are handled', async () => {
    const body = '{"a":1}', good = await signed(body, NOW_S);
    assert.strictEqual(await Pay.verifySignature(body, good, SECRET, NOW_S), true);
    assert.strictEqual(await Pay.verifySignature(body, await signed(body, NOW_S, 'whsec' + '_other'), SECRET, NOW_S), false);
    assert.strictEqual(await Pay.verifySignature('{"a":2}', good, SECRET, NOW_S), false);
    assert.strictEqual(await Pay.verifySignature(body, await signed(body, NOW_S - 301), SECRET, NOW_S), false, 'older than 5 minutes');
    assert.strictEqual(await Pay.verifySignature(body, await signed(body, NOW_S - 299), SECRET, NOW_S), true);
    for (const h of ['', 'junk', 't=abc,v1=00', 't=' + NOW_S, 'v1=00']) assert.strictEqual(await Pay.verifySignature(body, h, SECRET, NOW_S), false, h);
    assert.strictEqual(await Pay.verifySignature(body, 'v1=deadbeef,' + good, SECRET, NOW_S), true, 'two v1 values while a secret is rolled');
  });

  await test('starting hosting makes one place for the right person, lasting the trial and a day; replaying the event ten times changes nothing', async () => {
    const { db, hook } = world();
    for (let i = 0; i < 10; i++) assert.strictEqual((await hook(event('checkout.session.completed', session()))).status, 200);
    assert.strictEqual(db.rows.length, 1);
    const p = db.rows[0];
    assert.strictEqual(p.user_id, U1); assert.strictEqual(p.granted_by, 'payment'); assert.strictEqual(p.status, 'active');
    assert.strictEqual(p.paid_until.slice(0, 10), '2027-02-01'); assert.strictEqual(p.stripe_subscription_id, 'sub_1'); assert.strictEqual(p.stripe_customer_id, 'cus_1');
  });

  await test('two deliveries at the same moment still make one place (the unique index answers duplicate)', async () => {
    const slow = world(); slow.db.placeBySession = async () => null;
    await Promise.all([slow.hook(event('checkout.session.completed', session())), slow.hook(event('checkout.session.completed', session()))]);
    assert.strictEqual(slow.db.rows.length, 1);
  });

  await test('other events and sessions without a valid person or subscription make no place', async () => {
    const { db, hook } = world();
    assert.strictEqual((await hook(event('checkout.session.completed', session({ mode: 'payment' })))).status, 200);
    assert.strictEqual((await hook(event('customer.created', { id: 'cus_1' }))).status, 200);
    assert.strictEqual((await hook(event('checkout.session.completed', session({ metadata: {}, client_reference_id: 'nope' })))).status, 400);
    assert.strictEqual((await hook(event('checkout.session.completed', session({ subscription: null })))).status, 400);
    assert.strictEqual(db.rows.length, 0);
  });

  await test('a paid invoice moves the place to the end of the paid period; an invoice for an unknown subscription does nothing; a missed renewal changes nothing (grace applies)', async () => {
    const { db, hook } = world();
    await hook(event('checkout.session.completed', session()));
    assert.strictEqual((await hook(event('invoice.paid', invoice()))).status, 200);
    assert.strictEqual(db.rows[0].paid_until, new Date((NOW_S + 30 * 86400) * 1000).toISOString());
    await hook(event('invoice.paid', invoice({ subscription: 'sub_other', lines: { data: [{ period: { end: NOW_S + 999999 } }] } })));
    assert.strictEqual(db.rows[0].paid_until, new Date((NOW_S + 30 * 86400) * 1000).toISOString());
    const before = db.rows[0].paid_until;
    assert.strictEqual((await hook(event('invoice.payment_failed', invoice()))).status, 200);
    assert.strictEqual(db.rows[0].paid_until, before); assert.strictEqual(db.rows[0].status, 'active');
    assert.strictEqual((await hook(event('invoice.paid', invoice({ lines: { data: [] } })))).status, 200);
    assert.strictEqual(db.rows[0].paid_until, before);
  });

  await test('cancelling the subscription ends the place; a full refund ends it too; a partial refund does not', async () => {
    const { db, hook } = world();
    await hook(event('checkout.session.completed', session()));
    await hook(event('customer.subscription.deleted', { id: 'sub_other' }));
    assert.strictEqual(db.rows[0].status, 'active');
    await hook(event('customer.subscription.deleted', { id: 'sub_1' }));
    assert.strictEqual(db.rows[0].status, 'ended');
    db.rows[0].status = 'active'; db.rows[0].stripe_payment_intent = 'pi_1';
    await hook(event('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: false }));
    assert.strictEqual(db.rows[0].status, 'active');
    await hook(event('charge.refunded', { id: 'ch_1', payment_intent: 'pi_1', refunded: true }));
    assert.strictEqual(db.rows[0].status, 'refunded');
  });

  await test('the webhook refuses a bad signature, a missing one, a stale one, bad JSON and a huge body; a database failure is a 500 so Stripe retries', async () => {
    const { db, call, hook } = world();
    const body = JSON.stringify(event('checkout.session.completed', session()));
    assert.strictEqual((await call('/api/stripe-webhook', { body })).status, 400, 'no signature');
    assert.strictEqual((await call('/api/stripe-webhook', { body }, { 'Stripe-Signature': await signed(body, NOW_S, 'whsec' + '_other') })).status, 400);
    assert.strictEqual((await call('/api/stripe-webhook', { body }, { 'Stripe-Signature': await signed(body, NOW_S - 1000) })).status, 400);
    assert.strictEqual((await call('/api/stripe-webhook', { body: 'not json' }, { 'Stripe-Signature': await signed('not json', NOW_S) })).status, 400);
    const big = 'x'.repeat(600 * 1024);
    assert.strictEqual((await call('/api/stripe-webhook', { body: big }, { 'Stripe-Signature': await signed(big, NOW_S) })).status, 413);
    assert.strictEqual(db.rows.length, 0);
    db.insertPlace = async () => { throw new Error('database down'); };
    assert.strictEqual((await hook(event('checkout.session.completed', session()))).status, 500);
  });

  await test('checkout: sign-in required, POST only, same-site only, a known plan only; it asks Stripe for a subscription with a free month and answers the Stripe address', async () => {
    const { calls, call } = world();
    const tok = { Authorization: 'Bearer token-for-user-one-aaaaaaaa' }, body = (plan) => ({ body: JSON.stringify({ plan }) });
    assert.strictEqual((await call('/api/checkout', body('monthly'), {})).status, 401);
    assert.strictEqual((await call('/api/checkout', body('monthly'), { Authorization: 'Bearer wrong-token-wrong-token' })).status, 401);
    assert.strictEqual((await call('/api/checkout', { method: 'GET' }, {})).status, 405);
    assert.strictEqual((await call('/api/stripe-webhook', { method: 'GET' }, {})).status, 405);
    assert.strictEqual((await call('/api/checkout', body('monthly'), Object.assign({ Origin: 'https://evil.example' }, tok))).status, 403);
    for (const bad of ['weekly', '', undefined, 'price_year']) assert.strictEqual((await call('/api/checkout', body(bad), tok)).status, 400, String(bad));
    assert.strictEqual((await call('/api/checkout', { body: 'junk' }, tok)).status, 400);
    assert.strictEqual(calls.length, 0, 'nothing was sent to Stripe for those');
    const r = await call('/api/checkout', body('yearly'), Object.assign({ Origin: 'https://edvlabs.test' }, tok)); const j = await r.json();
    assert.strictEqual(r.status, 200); assert(j.ok && j.url === 'https://checkout.stripe.com/c/pay/cs_test_9' && j.testMode === true);
    assert.strictEqual(calls.length, 1); assert.strictEqual(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer ' + ENV.STRIPE_SECRET_KEY);
    const f = new URLSearchParams(String(calls[0].init.body));
    assert.strictEqual(f.get('mode'), 'subscription'); assert.strictEqual(f.get('line_items[0][price]'), 'price_year'); assert.strictEqual(f.get('line_items[0][quantity]'), '1');
    assert.strictEqual(f.get('subscription_data[trial_period_days]'), '30'); assert.strictEqual(f.get('subscription_data[metadata][user_id]'), U1);
    assert.strictEqual(f.get('metadata[user_id]'), U1); assert.strictEqual(f.get('client_reference_id'), U1);
    assert.strictEqual(f.get('success_url'), 'https://edvlabs.test/builder/?paid=1'); assert.strictEqual(f.get('cancel_url'), 'https://edvlabs.test/builder/?paid=0');
    await call('/api/checkout', body('monthly'), tok);
    assert.strictEqual(new URLSearchParams(String(calls[1].init.body)).get('line_items[0][price]'), 'price_month');
  });

  await test('billing portal: sign-in required; no customer yet is a plain 404; with one it answers the Stripe billing address for that customer only', async () => {
    const w = world(), tok = { Authorization: 'Bearer token-for-user-one-aaaaaaaa' };
    assert.strictEqual((await w.call('/api/billing-portal', {}, {})).status, 401);
    assert.strictEqual((await w.call('/api/billing-portal', {}, tok)).status, 404);
    await w.hook(event('checkout.session.completed', session()));
    const portal = async (url, init) => { w.calls.push({ url, init }); return new Response(JSON.stringify({ url: 'https://billing.stripe.com/p/session/x' }), { status: 200 }); };
    const r = await http.route(new Request('https://edvlabs.test/api/billing-portal', { method: 'POST', headers: tok }), ENV, asset, { payment: { db: w.db, user: async () => ({ id: U1 }), fetchImpl: portal } });
    assert.strictEqual(r.status, 200); assert.strictEqual((await r.json()).url, 'https://billing.stripe.com/p/session/x');
    const sent = w.calls[w.calls.length - 1]; assert.strictEqual(sent.url, 'https://api.stripe.com/v1/billing_portal/sessions');
    const f = new URLSearchParams(String(sent.init.body)); assert.strictEqual(f.get('customer'), 'cus_1'); assert.strictEqual(f.get('return_url'), 'https://edvlabs.test/builder/');
  });

  await test('Stripe trouble gives a plain 502 that does not leak the key or the reason; a live key is reported as not test mode', async () => {
    const hdr = { Authorization: 'Bearer token-for-user-one-aaaaaaaa' };
    const w = world();
    let r = await http.route(new Request('https://edvlabs.test/api/checkout', { method: 'POST', headers: hdr, body: '{"plan":"monthly"}' }), ENV, asset, { payment: { user: async () => ({ id: U1, email: '' }), db: w.db, fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'No such price: ' + ENV.STRIPE_SECRET_KEY } }), { status: 400 }) } });
    let text = await r.text(); assert.strictEqual(r.status, 502); assert(!text.includes(ENV.STRIPE_SECRET_KEY) && !text.includes('No such'));
    r = await http.route(new Request('https://edvlabs.test/api/checkout', { method: 'POST', headers: hdr, body: '{"plan":"monthly"}' }), ENV, asset, { payment: { user: async () => ({ id: U1 }), db: w.db, fetchImpl: async () => { throw new Error('network'); } } });
    assert.strictEqual(r.status, 502);
    assert.strictEqual(Pay.isTestKey('sk_live_' + 'a'.repeat(24)), false); assert.strictEqual(Pay.isTestKey(ENV.STRIPE_SECRET_KEY), true);
  });

  await test('with nothing set up both endpoints say 503 and name only the missing settings', async () => {
    for (const p of ['/api/checkout', '/api/billing-portal', '/api/stripe-webhook']) {
      const r = await http.route(new Request('https://edvlabs.test' + p, { method: 'POST', headers: { Authorization: 'Bearer token-for-user-one-aaaaaaaa' }, body: '{}' }), {}, asset);
      const j = await r.json(); assert.strictEqual(r.status, 503, p); assert(Array.isArray(j.missing) && j.missing.length, p);
      assert(!JSON.stringify(j).includes('sk_'), p);
    }
  });

  console.log('payment: ' + count + ' tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
