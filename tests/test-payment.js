/** Hosting subscription: the webhook signature, replays, renewals, cancelling, refunds, the Checkout and portal calls and the two endpoints. Nothing touches the network or Stripe. */
const assert = require('assert');
const http = require('../functions/lib/lead-http.js');
const Pay = require('../functions/lib/payment.js');

const U1 = '11111111-1111-4111-8111-111111111111';
const SECRET = 'whsec' + '_' + 'fake'.repeat(6), NOW_S = 1798800000; // the secret is a made-up value built in pieces, not a real one; // 2027-01-01T10:40:00Z
const ENV = { STRIPE_SECRET_KEY: 'sk_test_' + 'a'.repeat(24), STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' };
const PID = '33333333-3333-4333-8333-333333333333', U2 = '22222222-2222-4222-8222-222222222222';
const blocks = (n) => Array.from({ length: n }, (_, i) => ({ slug: 'hero-' + i }));
const asset = async () => new Response('static');
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

function fakeDb() {
  const rows = [];
  return {
    rows,
    projects: [], purchases: [],
    async projectForUser(id, userId) { return this.projects.find((x) => x.id === id && x.user_id === userId) || null; },
    async purchaseForProject(id) { return this.purchases.filter((x) => x.project_id === id).slice(-1)[0] || null; },
    deployRequests: [], paidMarks: [],
    async purchaseBySession(id) { return this.purchases.find((x) => x.stripe_session_id === id) || null; },
    async insertPurchase(row) { if (this.purchases.some((x) => x.stripe_session_id === row.stripe_session_id)) throw Object.assign(new Error('dup'), { code: 'duplicate' }); const r = Object.assign({ id: 'pur-' + (this.purchases.length + 1) }, row); this.purchases.push(r); return r; },
    async insertDeployRequest(row) { if (this.deployRequests.some((x) => x.purchase_id === row.purchase_id)) throw Object.assign(new Error('dup'), { code: 'duplicate' }); this.deployRequests.push(row); return row; },
    async markProjectPaid(id) { this.paidMarks.push(id); },
    async purchaseById(id) { return this.purchases.find((x) => x.id === id) || null; },
    async deployRequestForPurchase(id) { return this.deployRequests.find((x) => x.purchase_id === id) || null; },
    async fillDeployRequest(id, d) { const r = this.deployRequests.find((x) => x.purchase_id === id && x.domain == null && x.notes == null); if (!r) return false; Object.assign(r, d); return true; },
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
  db.projects.push({ id: PID, user_id: U1, name: 'Shop', status: 'draft', state: { stack: blocks(5) } });
  const order = (over) => JSON.stringify(Object.assign({ projectId: PID, destination: 'edvlabs', editor: true, hosting: 'monthly', deployHelp: false }, over || {}));
  return { db, calls, call, hook, order, tok: { Authorization: 'Bearer token-for-user-one-aaaaaaaa' } };
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

  const bought = (over) => session({ metadata: { user_id: U1, project_id: PID, destination: 'edvlabs', editor: '1', blocks: '5', price_version: 'v1', deploy_help: '0', site_name: 'bakery-anna' }, ...over });

  await test('an order paid on Stripe makes one purchase (allowance, admin panel, price table, destination), marks the page paid and makes the hosting place; ten replays and a race change nothing', async () => {
    const w = world(); const { db, hook } = w;
    for (let i = 0; i < 10; i++) assert.strictEqual((await hook(event('checkout.session.completed', bought()))).status, 200);
    assert.strictEqual(db.purchases.length, 1); assert.strictEqual(db.rows.length, 1); assert.deepStrictEqual(db.paidMarks.slice(0, 1), [PID]);
    const p = db.purchases[0];
    assert.strictEqual(p.project_id, PID); assert.strictEqual(p.user_id, U1); assert.strictEqual(p.allowance, 5); assert.strictEqual(p.editor, true); assert.strictEqual(p.price_version, 'v1'); assert.strictEqual(p.destination, 'edvlabs'); assert.strictEqual(p.stripe_session_id, 'cs_test_1');
    const racy = world(); racy.db.purchaseBySession = async () => null; racy.db.placeBySession = async () => null;
    await Promise.all([racy.hook(event('checkout.session.completed', bought())), racy.hook(event('checkout.session.completed', bought()))]);
    assert.strictEqual(racy.db.purchases.length, 1); assert.strictEqual(racy.db.rows.length, 1);
  });

  await test('a download-only payment makes a purchase and no hosting place; deploy help makes exactly one open request for that purchase', async () => {
    const { db, hook } = world();
    const dl = bought({ mode: 'payment', subscription: null, payment_status: 'paid', metadata: { ...bought().metadata, destination: 'download', deploy_help: '1', editor: '0' } });
    for (let i = 0; i < 3; i++) assert.strictEqual((await hook(event('checkout.session.completed', dl))).status, 200);
    assert.strictEqual(db.purchases.length, 1); assert.strictEqual(db.rows.length, 0, 'no hosting place'); assert.strictEqual(db.purchases[0].editor, false);
    assert.strictEqual(db.deployRequests.length, 1); assert.strictEqual(db.deployRequests[0].purchase_id, db.purchases[0].id); assert.strictEqual(db.deployRequests[0].user_id, U1);
  });

  await test('metadata that is wrong writes nothing: a project id that is not a uuid, a page that is not the buyer\'s, a made-up destination, a silly allowance', async () => {
    const { db, hook } = world();
    const m = (o) => bought({ metadata: { ...bought().metadata, ...o } });
    for (const o of [{ project_id: 'nope' }, { project_id: '44444444-4444-4444-8444-444444444444' }, { destination: 'moon' }, { blocks: '0' }, { blocks: '9999' }, { blocks: 'five' }, { user_id: 'x' }]) {
      assert.strictEqual((await hook(event('checkout.session.completed', m(o)))).status, 400, JSON.stringify(o));
    }
    assert.strictEqual(db.purchases.length + db.rows.length + db.deployRequests.length + db.paidMarks.length, 0);
  });

  await test('my purchases: sign-in required, only the caller\'s own, and it says whether the buying flow is switched on', async () => {
    const w = world(), { call, tok } = w;
    w.db.purchasesByUser = async (u) => w.db.purchases.filter((x) => x.user_id === u);
    w.db.deployRequestsByUser = async (u) => w.db.deployRequests.filter((x) => x.user_id === u);
    w.db.deployRequests.push({ purchase_id: 'pur-1', user_id: U1, status: 'open', domain: null, notes: null });
    w.db.purchases.push({ id: 'pur-1', project_id: PID, user_id: U1, allowance: 5, editor: true, destination: 'edvlabs', created_at: 'x', stripe_session_id: 'cs_secret' }, { id: 'pur-2', project_id: PID, user_id: U2, allowance: 9, editor: false, destination: 'download' });
    assert.strictEqual((await call('/api/my-purchases', { method: 'GET' }, {})).status, 401);
    assert.strictEqual((await call('/api/my-purchases', { method: 'POST' }, tok)).status, 405);
    const j = await (await call('/api/my-purchases', { method: 'GET' }, tok)).json();
    assert.strictEqual(j.ok, true); assert.strictEqual(j.purchases.length, 1); assert.strictEqual(j.purchases[0].projectId, PID); assert.strictEqual(j.purchases[0].id, 'pur-1'); assert.strictEqual(j.purchases[0].allowance, 5); assert.strictEqual(j.purchases[0].deployHelp, true, 'deploy help was bought'); assert.strictEqual(j.purchases[0].deployDetailsSent, false, 'and its details are still to come');
    assert(!JSON.stringify(j).includes('cs_secret'), 'Stripe ids are not sent to the browser'); assert.strictEqual(j.paymentOn, false, 'off until BUYING_FLOW is set to 1');
    const on = await (await http.route(new Request('https://edvlabs.test/api/my-purchases', { headers: tok }), Object.assign({ BUYING_FLOW: '1' }, ENV), asset, { payment: { db: w.db, user: async () => ({ id: U1 }) } })).json();
    assert.strictEqual(on.paymentOn, true);
  });

  await test('deploy-request: only the buyer, only if deploy help was bought, a good domain, once', async () => {
    const w = world(), { call, tok } = w;
    w.db.purchases.push({ id: 'pur-1', project_id: PID, user_id: U1 }, { id: 'pur-2', project_id: PID, user_id: U2 });
    w.db.deployRequests.push({ purchase_id: 'pur-1', user_id: U1, status: 'open', domain: null, notes: null }, { purchase_id: 'pur-2', user_id: U2, status: 'open', domain: null, notes: null });
    const send = (b, h) => call('/api/deploy-request', { body: JSON.stringify(b) }, h || tok);
    assert.strictEqual((await send({ purchaseId: 'pur-1', domain: 'shop.example.com' }, {})).status, 401);
    assert.strictEqual((await send({ purchaseId: 'pur-2', domain: 'shop.example.com' })).status, 404, 'somebody else\'s purchase');
    for (const domain of ['', 'nodots', 'a..b.com', 'bad domain.com', 'x'.repeat(260) + '.com', 5, undefined]) assert.strictEqual((await send({ purchaseId: 'pur-1', domain })).status, 400, String(domain).slice(0, 12));
    assert.strictEqual((await send({ purchaseId: 'pur-1', domain: 'shop.example.com', notes: 'x'.repeat(2001) })).status, 400);
    assert.strictEqual(w.db.deployRequests[0].domain, null, 'nothing was saved by the refusals');
    assert.strictEqual((await send({ purchaseId: 'pur-1', domain: 'Shop.Example.com', notes: 'Registered at Namecheap' })).status, 200);
    assert.strictEqual(w.db.deployRequests[0].domain, 'shop.example.com'); assert.strictEqual(w.db.deployRequests[0].notes, 'Registered at Namecheap');
    assert.strictEqual((await send({ purchaseId: 'pur-1', domain: 'other.example.com' })).status, 409, 'details are sent once');
    w.db.purchases.push({ id: 'pur-3', project_id: PID, user_id: U1 });
    assert.strictEqual((await send({ purchaseId: 'pur-3', domain: 'shop.example.com' })).status, 404, 'no deploy help was bought with that purchase');
  });

  await test('adding blocks to a bought page on an edvlabs address is one plain payment, no second subscription; asking twice with the same order reuses one Stripe session (same idempotency key), a different order does not', async () => {
    const w = world(), { calls, call, order, tok } = w;
    w.db.purchases.push({ id: 'pur-1', project_id: PID, user_id: U1, allowance: 3, editor: true, price_version: 'v1', created_at: 'x' });
    const more = order({ hosting: null });
    assert.strictEqual((await call('/api/checkout', { body: more }, tok)).status, 200);
    const f = new URLSearchParams(String(calls[0].init.body));
    assert.strictEqual(f.get('mode'), 'payment'); assert.strictEqual(f.get('subscription_data[trial_period_days]'), null); assert(![...f.keys()].some((k) => /\[price\]$/.test(k)), 'no recurring price');
    await call('/api/checkout', { body: more }, tok); await call('/api/checkout', { body: order({ hosting: null, destination: 'domain' }) }, tok);
    const key = (i) => calls[i].init.headers['Idempotency-Key'];
    assert(key(0) && key(0).length >= 32); assert.strictEqual(key(0), key(1), 'the same order twice is one session'); assert.notStrictEqual(key(0), key(2), 'another order is another session');
    w.db.purchases[0].allowance = 5;
    assert.strictEqual((await call('/api/checkout', { body: order({ hosting: null }) }, tok)).status, 409, 'nothing left to pay on a hosted page');
  });

  await test('Stripe Tax is off unless STRIPE_TAX=1; on, the session collects the address and VAT id, prices include VAT, every item has the digital-services tax code, and a one-time payment still makes an invoice', async () => {
    const asForm = async (env, body) => { const w = world(env); await w.call('/api/checkout', { body: w.order(body) }, w.tok); return new URLSearchParams(String(w.calls[0].init.body)); };
    const off = await asForm(ENV, {});
    assert(![...off.keys()].some((k) => /automatic_tax|tax_id_collection|billing_address_collection|tax_behavior|tax_code|invoice_creation/.test(k)), 'nothing tax-related while the switch is off');
    const on = await asForm({ ...ENV, STRIPE_TAX: '1' }, {});
    assert.strictEqual(on.get('automatic_tax[enabled]'), 'true'); assert.strictEqual(on.get('billing_address_collection'), 'required'); assert.strictEqual(on.get('tax_id_collection[enabled]'), 'true');
    const oneTime = [...on.keys()].filter((k) => /\[price_data\]\[unit_amount\]$/.test(k));
    assert(oneTime.length >= 2, 'the one-time lines are there');
    for (const k of oneTime) { const base = k.replace('[unit_amount]', ''); assert.strictEqual(on.get(base + '[tax_behavior]'), 'inclusive', k + ' includes VAT'); assert.strictEqual(on.get(base + '[product_data][tax_code]'), 'txcd_10000000', k + ' is an electronically supplied service'); }
    const dl = await asForm({ ...ENV, STRIPE_TAX: '1' }, { destination: 'download', hosting: null });
    assert.strictEqual(dl.get('mode'), 'payment'); assert.strictEqual(dl.get('invoice_creation[enabled]'), 'true', 'a one-time payment gets an invoice too'); assert.strictEqual(dl.get('customer_creation'), 'always');
    assert.strictEqual(on.get('invoice_creation[enabled]'), null, 'a subscription makes its own invoices');
    const w1 = world({ ...ENV, STRIPE_TAX: '1' }), w0 = world(ENV);
    assert.strictEqual((await (await w1.call('/api/quote', { body: w1.order() }, w1.tok)).json()).vatIncluded, true, 'the overlay is told prices include VAT');
    assert.strictEqual((await (await w0.call('/api/quote', { body: w0.order() }, w0.tok)).json()).vatIncluded, false);
  });

  await test('a delayed payment method: an unpaid session waits, and the later "async payment succeeded" event makes the purchase; a failed one makes nothing', async () => {
    const { db, hook } = world();
    const unpaid = bought({ payment_status: 'unpaid' });
    assert.strictEqual((await hook(event('checkout.session.completed', unpaid))).status, 200); assert.strictEqual(db.purchases.length, 0); assert.strictEqual(db.rows.length, 0);
    assert.strictEqual((await hook(event('checkout.session.async_payment_failed', unpaid))).status, 200); assert.strictEqual(db.purchases.length, 0);
    assert.strictEqual((await hook(event('checkout.session.async_payment_succeeded', bought({ payment_status: 'paid' })))).status, 200);
    assert.strictEqual(db.purchases.length, 1); assert.strictEqual(db.rows.length, 1);
    const dl = bought({ id: 'cs_dl', mode: 'payment', subscription: null, payment_status: 'unpaid', metadata: { ...bought().metadata, destination: 'download' } });
    await hook(event('checkout.session.completed', dl)); assert.strictEqual(db.purchases.length, 1);
    await hook(event('checkout.session.async_payment_succeeded', { ...dl, payment_status: 'paid' })); assert.strictEqual(db.purchases.length, 2);
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

  await test('quote: sign-in required, POST only; the price comes from the stored project and ignores anything the browser says about prices or blocks', async () => {
    const { call, order, tok } = world();
    assert.strictEqual((await call('/api/quote', { body: order() }, {})).status, 401);
    assert.strictEqual((await call('/api/quote', { method: 'GET' }, tok)).status, 405);
    const forged = JSON.parse(order()); forged.blocks = 1; forged.price = 1; forged.payToday = 1; forged.amount = 1;
    const r = await call('/api/quote', { body: JSON.stringify(forged) }, tok), j = await r.json();
    assert.strictEqual(r.status, 200); assert.strictEqual(j.ok, true); assert.strictEqual(j.payToday, 96); assert.strictEqual(j.hosting.amount, 3); assert.strictEqual(j.testMode, true);
    assert.deepStrictEqual(j.lines.map((l) => l.key), ['base', 'extra', 'editor']);
  });

  await test('quote and checkout refuse: another person\'s project (404), a bad id, bad combinations, no blocks, anything not strictly true counts as false', async () => {
    const w = world(), { call, order, tok } = w;
    w.db.projects.push({ id: '44444444-4444-4444-8444-444444444444', user_id: U2, name: 'Theirs', state: { stack: blocks(3) } }, { id: '55555555-5555-4555-8555-555555555555', user_id: U1, name: 'Empty', state: { stack: [] } });
    for (const path of ['/api/quote', '/api/checkout']) {
      assert.strictEqual((await call(path, { body: order({ projectId: '44444444-4444-4444-8444-444444444444' }) }, tok)).status, 404, path + ' another person\'s project');
      assert.strictEqual((await call(path, { body: order({ projectId: 'nope' }) }, tok)).status, 400, path + ' bad id');
      assert.strictEqual((await call(path, { body: order({ deployHelp: true }) }, tok)).status, 400, path + ' deploy help on an edvlabs address');
      assert.strictEqual((await call(path, { body: order({ destination: 'download' }) }, tok)).status, 400, path + ' hosting on a download');
      assert.strictEqual((await call(path, { body: order({ projectId: '55555555-5555-4555-8555-555555555555' }) }, tok)).status, 400, path + ' no blocks');
      assert.strictEqual((await call(path, { body: 'junk' }, tok)).status, 400, path + ' not JSON');
    }
    assert.strictEqual((await (await call('/api/quote', { body: order({ editor: 'yes' }) }, tok)).json()).payToday, 57, '"yes" is not true, so no admin panel is charged');
    assert.strictEqual(w.calls.length, 0, 'nothing reached Stripe');
  });

  await test('checkout: same-site only; hosting asks Stripe for a subscription with the free month, the right recurring price and the one-time items in cents; metadata names the project and the order', async () => {
    const { calls, call, order, tok } = world();
    assert.strictEqual((await call('/api/checkout', { body: order() }, Object.assign({ Origin: 'https://evil.example' }, tok))).status, 403);
    assert.strictEqual((await call('/api/checkout', { body: order() }, {})).status, 401);
    assert.strictEqual(calls.length, 0);
    const r = await call('/api/checkout', { body: order({ hosting: 'yearly' }) }, Object.assign({ Origin: 'https://edvlabs.test' }, tok)), j = await r.json();
    assert.strictEqual(r.status, 200); assert(j.ok && j.url === 'https://checkout.stripe.com/c/pay/cs_test_9' && j.testMode === true);
    assert.strictEqual(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions'); assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer ' + ENV.STRIPE_SECRET_KEY);
    const f = new URLSearchParams(String(calls[0].init.body)), items = {};
    for (const [k, v] of f) { const m = /^line_items\[(\d+)\]\[(.+)\]$/.exec(k); if (m) (items[m[1]] = items[m[1]] || {})[m[2]] = v; }
    assert.strictEqual(f.get('mode'), 'subscription'); assert.strictEqual(f.get('subscription_data[trial_period_days]'), '30');
    const list = Object.values(items);
    assert(list.some((i) => i.price === 'price_year' && i.quantity === '1'), 'the yearly price');
    assert(list.some((i) => i['price_data][unit_amount'] === '3900' && i.quantity === '1'), 'base 39 EUR in cents');
    assert(list.some((i) => i['price_data][unit_amount'] === '900' && i.quantity === '2'), '2 extra blocks at 9 EUR');
    assert(list.every((i) => i.price || i['price_data][currency'] === 'eur'));
    for (const key of ['metadata', 'subscription_data[metadata]']) {
      assert.strictEqual(f.get(key + '[user_id]'), U1); assert.strictEqual(f.get(key + '[project_id]'), PID); assert.strictEqual(f.get(key + '[destination]'), 'edvlabs');
      assert.strictEqual(f.get(key + '[editor]'), '1'); assert.strictEqual(f.get(key + '[blocks]'), '5'); assert.strictEqual(f.get(key + '[price_version]'), 'v1'); assert.strictEqual(f.get(key + '[deploy_help]'), '0');
    }
    assert.strictEqual(f.get('client_reference_id'), U1); assert.strictEqual(f.get('success_url'), 'https://edvlabs.test/builder/?paid=1'); assert.strictEqual(f.get('cancel_url'), 'https://edvlabs.test/builder/?paid=0');
  });

  await test('checkout for a download is a single payment with no trial and no recurring price; a project already bought pays only the difference, and nothing-to-pay is a plain 409', async () => {
    const w = world(), { calls, call, order, tok } = w;
    const dl = { destination: 'download', hosting: null, deployHelp: true };
    await call('/api/checkout', { body: order(dl) }, tok);
    const f = new URLSearchParams(String(calls[0].init.body));
    assert.strictEqual(f.get('mode'), 'payment'); assert.strictEqual(f.get('subscription_data[trial_period_days]'), null); assert.strictEqual(f.get('metadata[deploy_help]'), '1');
    assert(![...f.keys()].some((k) => /\[price\]$/.test(k)), 'no recurring price id');
    w.db.purchases.push({ project_id: PID, user_id: U1, allowance: 5, editor: true, price_version: 'v1' });
    const q = await (await call('/api/quote', { body: order({ destination: 'download', hosting: null }) }, tok)).json();
    assert.strictEqual(q.status === undefined && q.ok, false); assert.strictEqual(q.alreadyBought, true);
    assert.strictEqual((await call('/api/checkout', { body: order({ destination: 'download', hosting: null }) }, tok)).status, 409);
    w.db.projects[0].state.stack = blocks(6);
    const more = await (await call('/api/quote', { body: order({ destination: 'download', hosting: null }) }, tok)).json();
    assert.strictEqual(more.payToday, 9, 'only the one new block');
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
    let r = await http.route(new Request('https://edvlabs.test/api/checkout', { method: 'POST', headers: hdr, body: w.order() }), ENV, asset, { payment: { user: async () => ({ id: U1, email: '' }), db: w.db, fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'No such price: ' + ENV.STRIPE_SECRET_KEY } }), { status: 400 }) } });
    let text = await r.text(); assert.strictEqual(r.status, 502); assert(!text.includes(ENV.STRIPE_SECRET_KEY) && !text.includes('No such'));
    r = await http.route(new Request('https://edvlabs.test/api/checkout', { method: 'POST', headers: hdr, body: w.order() }), ENV, asset, { payment: { user: async () => ({ id: U1 }), db: w.db, fetchImpl: async () => { throw new Error('network'); } } });
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
