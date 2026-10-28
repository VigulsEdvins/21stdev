/** Signed in, with answers saved to the account but none in this browser: the builder restores them and offers "We have your answers".
    Not signed in: no request to any sign-in service is made. The builder's own policy only allows https: addresses, so the pretend Supabase is
    reached through a made-up https address that the test forwards. */
const assert = require('assert');
const { startServer, launchBrowser } = require('../../scripts/lib/browser');
const { start } = require('../lib/fake-supabase.js');
const A = require('../../site/js/auth.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, m }; };

(async () => {
  const srv = await startServer();
  const fake = await start({ confirmEmails: false });
  const host = 'https://fake-supabase.test';
  const storage = mem();
  const auth = A.createAuth({ url: fake.url, anonKey: fake.anonKey, storage, tempStorage: mem(), origin: 'http://x.test' });
  assert((await auth.signUp('dana@example.com', 'Correct-Horse-1!')).ok); assert((await auth.signIn('dana@example.com', 'Correct-Horse-1!')).ok);
  const who = await auth.current();
  fake.briefs.set(who.id, { brief: { v: 1, path: 'self', answers: { purpose: { value: 'business', unknown: false }, blocks: { value: ['gallery', 'contact'], unknown: false } } } });

  const browser = await launchBrowser();
  const open = async (session) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((sess) => { try { localStorage.setItem('web_builder_mode', 'guided'); localStorage.setItem('web_builder_tour_done', '1'); if (sess && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('edvlabs.session', sess); } } catch (e) { /* storage blocked */ } }, session);
    const page = await ctx.newPage();
    const calls = [], errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
    await page.route('**/api/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ supabaseUrl: host, anonKey: fake.anonKey }) }));
    await page.route(host + '/**', async (r) => {
      const req = r.request(); calls.push(req.method() + ' ' + new URL(req.url()).pathname);
      const res = await fetch(fake.url + new URL(req.url()).pathname + new URL(req.url()).search, { method: req.method(), headers: req.headers(), body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
      await r.fulfill({ status: res.status, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Content-Type': 'application/json' }, body: await res.text() });
    });
    await page.goto(srv.url + '/builder.html');
    return { ctx, page, calls, errors };
  };
  console.log('Builder and the account answers');

  const s = await open(storage.getItem('edvlabs.session'));
  await s.page.waitForSelector('#briefOffer:not([hidden])', { timeout: 10000 });
  assert(/chose|suggest/.test(await s.page.textContent('#briefOffer .bo-lead')), 'the offer shows');
  assert(await s.page.evaluate(() => JSON.parse(localStorage.getItem('edvlabs.brief_v1')).answers.purpose.value) === 'business', 'the answers are back in this browser');
  assert(!s.calls.some((c) => /^(POST|PUT|PATCH|DELETE) \/rest/.test(c)), 'opening the builder never writes to the account: ' + s.calls.join(', '));
  assert.deepStrictEqual(s.errors, [], s.errors.join(' | '));
  console.log('  ✓ signed in with no local answers: restored, offered, nothing written');
  await s.ctx.close();

  const n = await open(null);
  await n.page.waitForSelector('#blockPicker', { state: 'attached' }); await n.page.waitForTimeout(800);
  assert.strictEqual(n.calls.length, 0, 'not signed in: no request to the sign-in service');
  assert(!(await n.page.$('#briefOffer')), 'and no offer without answers');
  console.log('  ✓ not signed in: no requests, no offer');

  await browser.close(); await fake.close(); srv.close && srv.close();
  console.log('✅ Builder account answers passed!');
})().catch((e) => { console.error(e); process.exit(1); });
