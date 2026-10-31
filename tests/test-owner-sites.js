/** The owner's tools (scripts/owner-sites.js): exact requests, refusals, and that the service key is only ever sent to the Supabase address. A stand-in fetch records every call. */
const assert = require('assert');
const O = require('../scripts/owner-sites.js');

const ENV = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key-SECRET' };
const UID = '11111111-1111-4111-8111-111111111111';
function stub(replies) {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, method: (init && init.method) || 'GET', body: init && init.body, headers: (init && init.headers) || {} }); const r = replies.shift() || { status: 200, body: [] }; return { ok: r.status < 300, status: r.status, text: async () => JSON.stringify(r.body === undefined ? null : r.body), json: async () => r.body }; };
  return { calls, fetchImpl };
}
const out = () => { const lines = []; return { lines, say: (l) => lines.push(l) }; };
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  await test('usage and missing settings are explained and send nothing', async () => {
    const s = stub([]), o = out();
    assert.strictEqual(await O.run([], ENV, o.say, s.fetchImpl), 2); assert.strictEqual(await O.run(['explode'], ENV, o.say, s.fetchImpl), 2);
    assert.strictEqual(await O.run(['list'], {}, o.say, s.fetchImpl), 2); assert(/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/.test(o.lines.join(' ')) && !o.lines.join(' ').includes('SECRET'));
    assert.strictEqual(await O.run(['block'], ENV, o.say, s.fetchImpl), 2); assert.strictEqual(await O.run(['block', 'Bad Name!'], ENV, o.say, s.fetchImpl), 2); assert.strictEqual(await O.run(['grant'], ENV, o.say, s.fetchImpl), 2);
    assert.strictEqual(s.calls.length, 0);
  });

  await test('block: marks the site blocked in the database and prints the command for doing it at once; unknown names are reported', async () => {
    const s = stub([{ status: 200, body: [{ id: 'sid-1', name: 'bad-shop', version: 4 }] }, { status: 204 }, { status: 200, body: [] }]), o = out();
    assert.strictEqual(await O.run(['block', 'bad-shop'], ENV, o.say, s.fetchImpl), 0);
    assert(s.calls[0].url.includes('name=eq.bad-shop')); assert.strictEqual(s.calls[1].method, 'PATCH'); assert.strictEqual(JSON.parse(s.calls[1].body).status, 'blocked'); assert(s.calls[1].url.endsWith('published_sites?id=eq.sid-1'));
    const text = o.lines.join('\n'); assert(/within the hour/.test(text) && text.includes(`'{"id":"sid-1","version":4,"status":"blocked"}'`) && text.includes("'site:bad-shop'"), text);
    assert(!text.includes('SECRET'), 'the key is never printed');
    const o2 = out(); assert.strictEqual(await O.run(['block', 'nobody-here'], ENV, o2.say, s.fetchImpl), 1); assert(/No site is called/.test(o2.lines[0]));
  });

  await test('unblock: back to unpublished, never straight to live', async () => {
    const s = stub([{ status: 200, body: [{ id: 'sid-1', name: 'bad-shop', version: 4 }] }, { status: 204 }]), o = out();
    assert.strictEqual(await O.run(['unblock', 'bad-shop'], ENV, o.say, s.fetchImpl), 0);
    assert.strictEqual(JSON.parse(s.calls[1].body).status, 'unpublished'); assert(/stays offline/.test(o.lines[0]));
  });

  await test('grant: finds the account by email (all pages) or takes an id, adds the places, limits the numbers', async () => {
    const page1 = Array.from({ length: 200 }, (_, i) => ({ id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'), email: 'p' + i + '@example.com' }));
    const s = stub([{ status: 200, body: { users: page1 } }, { status: 200, body: { users: [{ id: UID, email: 'Anna@Example.com' }] } }, { status: 201, body: [{ id: 'e1' }] }, { status: 201, body: [{ id: 'e2' }] }]), o = out();
    assert.strictEqual(await O.run(['grant', 'anna@example.com', '--count', '2', '--years', '2'], ENV, o.say, s.fetchImpl), 0);
    assert(s.calls[0].url.includes('/auth/v1/admin/users?per_page=200&page=1') && s.calls[1].url.includes('page=2'));
    const rows = s.calls.slice(2).map((c) => JSON.parse(c.body)); assert.strictEqual(rows.length, 2);
    for (const r of rows) { assert.strictEqual(r.user_id, UID); assert.strictEqual(r.status, 'active'); assert.strictEqual(r.granted_by, 'owner'); assert(new Date(r.paid_until) > new Date(Date.now() + 700 * 86400000)); }
    assert(/Added 2 paid places for anna@example.com/.test(o.lines[0]));
    const byId = stub([{ status: 201, body: [{ id: 'e' }] }]); assert.strictEqual(await O.run(['grant', UID], ENV, out().say, byId.fetchImpl), 0); assert.strictEqual(byId.calls.length, 1, 'an id needs no lookup');
    const none = stub([{ status: 200, body: { users: [] } }]), o3 = out(); assert.strictEqual(await O.run(['grant', 'ghost@example.com'], ENV, o3.say, none.fetchImpl), 1); assert(/No account found/.test(o3.lines[0])); assert.strictEqual(none.calls.length, 1, 'nothing is granted to nobody');
    for (const bad of [['--count', '0'], ['--count', '99'], ['--count', 'x'], ['--years', '0'], ['--years', '50']]) assert.strictEqual(await O.run(['grant', UID, ...bad], ENV, out().say, stub([]).fetchImpl), 2, bad.join(' '));
  });

  await test('limits: show what applies, set an upgrade (only the numbers given), reset, refuse bad numbers', async () => {
    const row = { user_id: UID, renames_per_30_days: 6, max_site_mb: null, publishes_per_hour: null, note: 'paid 2026-11-02' };
    const s = stub([{ status: 200, body: [row] }, // accountLimits for "limits"
      { status: 201, body: [row] }, { status: 200, body: [row] }, // set + read back
      { status: 204 }, // reset
      { status: 200, body: [] }]), o = out();
    assert.strictEqual(await O.run(['limits', UID], ENV, o.say, s.fetchImpl), 0);
    const text = o.lines.join('\n'); assert(/Renames of a site\s+6 per 30 days\s+\(everyone: 2, upgrade: 6\)/.test(text) && /Size of a site\s+10 MB\s+\(everyone: 10, no upgrade\)/.test(text) && /Note: paid 2026-11-02/.test(text), text);
    const o2 = out(); assert.strictEqual(await O.run(['limit', UID, '--renames', '6', '--note', 'paid 2026-11-02'], ENV, o2.say, s.fetchImpl), 0);
    assert(s.calls[1].url.includes('/rest/v1/account_limits?on_conflict=user_id') && s.calls[1].method === 'POST' && /merge-duplicates/.test(s.calls[1].headers.Prefer), 'an upsert');
    const sent = JSON.parse(s.calls[1].body); assert.strictEqual(sent.user_id, UID); assert.strictEqual(sent.renames_per_30_days, 6); assert.strictEqual(sent.note, 'paid 2026-11-02'); assert(!('max_site_mb' in sent) && !('publishes_per_hour' in sent), 'only the numbers given are sent: ' + Object.keys(sent));
    const o3 = out(); assert.strictEqual(await O.run(['limit', UID, '--reset'], ENV, o3.say, s.fetchImpl), 0); assert.strictEqual(s.calls[3].method, 'DELETE'); assert(/Back to the defaults/.test(o3.lines[0]));
    const before = s.calls.length;
    for (const bad of [['--renames', '101'], ['--renames', 'x'], ['--site-mb', '21'], ['--site-mb', '0'], ['--publishes', '201'], ['--publishes', '1.5'], []]) { const ob = out(); assert.strictEqual(await O.run(['limit', UID, ...bad], ENV, ob.say, s.fetchImpl), 2, bad.join(' ') || '(no numbers)'); }
    assert.strictEqual(s.calls.length, before, 'nothing is sent for a bad number');
    assert.strictEqual(await O.run(['limit'], ENV, out().say, s.fetchImpl), 2); assert.strictEqual(await O.run(['limits', 'ghost@example.com'], ENV, out().say, stub([{ status: 200, body: { users: [] } }]).fetchImpl), 1);
    // defaults shown follow the Worker settings when they are in the shell
    const s2 = stub([{ status: 200, body: [] }]), o4 = out(); await O.run(['limits', UID], Object.assign({ DEFAULT_RENAMES_PER_30_DAYS: '3' }, ENV), o4.say, s2.fetchImpl);
    assert(/\(everyone: 3, no upgrade\)/.test(o4.lines[0]), o4.lines[0]);
  });

  await test('list prints the sites; a database error is reported without the key', async () => {
    const s = stub([{ status: 200, body: [{ name: 'bakery-anna', status: 'live', version: 3, user_id: UID }] }, { status: 500, body: {} }]), o = out();
    assert.strictEqual(await O.run(['list'], ENV, o.say, s.fetchImpl), 0); assert(/bakery-anna\s+live\s+v3/.test(o.lines[0]));
    const o2 = out(); assert.strictEqual(await O.run(['list'], ENV, o2.say, s.fetchImpl), 1); assert(!o2.lines.join('').includes('SECRET'));
    for (const c of s.calls) { assert(c.url.startsWith('https://proj.supabase.co/'), 'only the Supabase address is ever called'); }
  });

  await test('deploy-requests: lists open requests with the buyer\'s email, domain and note; --done marks one finished; nothing prints the key', async () => {
    const R1 = '55555555-5555-4555-8555-555555555555';
    const s = stub([{ status: 200, body: [{ id: R1, user_id: UID, domain: 'shop.example.com', notes: 'Namecheap', status: 'open', project_purchases: { created_at: '2026-11-02T10:00:00Z', destination: 'domain' } }, { id: 'r2', user_id: UID, domain: null, notes: null, status: 'open', project_purchases: { created_at: '2026-11-03T10:00:00Z', destination: 'download' } }] },
      { status: 200, body: { id: UID, email: 'anna@example.com' } }, { status: 200, body: [] }]), o = out();
    assert.strictEqual(await O.run(['deploy-requests'], ENV, o.say, s.fetchImpl), 0);
    const text = o.lines.join('\n');
    assert(text.includes(R1) && text.includes('anna@example.com') && text.includes('shop.example.com') && text.includes('Namecheap') && text.includes('2026-11-02'), text);
    assert(/details not sent yet/.test(text), 'a request without details says so'); assert(!text.includes('SECRET'));
    assert(s.calls[0].url.includes('deploy_requests?') && s.calls[0].url.includes('status=eq.open')); assert(s.calls[1].url.endsWith('/auth/v1/admin/users/' + UID), 'the email is looked up once per person');
    assert.strictEqual(s.calls.length, 2, 'one person, one lookup');
    const d = stub([{ status: 200, body: [] }]), o2 = out();
    assert.strictEqual(await O.run(['deploy-requests', '--done', R1], ENV, o2.say, d.fetchImpl), 0);
    assert.strictEqual(d.calls[0].method, 'PATCH'); assert(d.calls[0].url.endsWith('deploy_requests?id=eq.' + R1)); assert.deepStrictEqual(JSON.parse(d.calls[0].body), { status: 'done' });
    assert.strictEqual(await O.run(['deploy-requests', '--done', 'not-an-id'], ENV, o2.say, d.fetchImpl), 2); assert.strictEqual(d.calls.length, 1);
  });

  console.log(`✓ owner sites: ${count} groups (usage, block, unblock, grant, list)`);
})().catch((e) => { console.error(e); process.exit(1); });
