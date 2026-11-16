/** Client previews Worker (plan 2026-11-16-previews-subdomain-worker.md): host parsing, folder lookup, 404s, headers, odd paths. Real code, in-memory asset store. */
const assert = require('assert');
const { createPreviewServer, labelOf } = require('../functions/lib/previews-serve.js');
const names = require('../site/js/site-names.js');

const TOKEN = 'e90af850009a0d05', OTHER = 'bf5c3b4aa77ca77b';
const FILES = {
  '/_hosts.json': JSON.stringify({ 'diadents-7k2m': TOKEN, paegle: OTHER, __proto__: TOKEN, short: 'abc' }),
  ['/' + TOKEN + '/index.html']: '<p>Diadents shell</p>',
  ['/' + TOKEN + '/dental-x/index.html']: '<p>variant</p>',
  ['/' + TOKEN + '/dental-x/style.css']: 'body{}',
  ['/' + OTHER + '/index.html']: '<p>Paegle shell</p>',
  '/assets/library/a.svg': '<svg/>',
  '/secret.txt': 'root file',
};
const requested = [];
const assets = { fetch: async req => { const p = decodeURI(new URL(req.url).pathname); requested.push(p); return FILES[p] !== undefined ? new Response(FILES[p], { headers: { 'Content-Type': p.endsWith('.css') ? 'text/css' : 'text/html' } }) : new Response('nope', { status: 404 }); } };
const server = createPreviewServer({ assets });
const get = (url, init) => server.handle(new Request(url, init));
const H = 'https://diadents-7k2m--pv.edvlabs.com';

(async () => {
  // host parsing
  assert.strictEqual(labelOf('diadents-7k2m--pv.edvlabs.com', 'edvlabs.com'), 'diadents-7k2m');
  assert.strictEqual(labelOf('DIADENTS--pv.EDVLABS.com.', 'edvlabs.com'), 'diadents');
  for (const h of ['edvlabs.com', 'bakery-anna.edvlabs.com', '--pv.edvlabs.com', 'a--pv.edvlabs.com.evil.com', 'a.b--pv.edvlabs.com', 'a--pv.example.com', 'a---pv.edvlabs.com', '-a--pv.edvlabs.com', '']) assert.strictEqual(labelOf(h, 'edvlabs.com'), '', h);
  assert.strictEqual(names.check('anna--pv').reason, 'hyphen', 'a customer site can never end in --pv');

  // pages
  let r = await get(H + '/');
  assert.strictEqual(r.status, 200); assert(/Diadents shell/.test(await r.text()));
  assert.strictEqual((await get(H + '/dental-x/index.html')).status, 200);
  assert.strictEqual((await get(H + '/dental-x/')).status, 200, 'a folder answers with its index');
  assert.strictEqual((await get(H + '/empty/')).status, 404, 'a folder without an index');
  assert.strictEqual((await get(H + '/dental-x/style.css')).headers.get('Content-Type'), 'text/css');
  assert.strictEqual((await get(H + '/assets/library/a.svg')).status, 200, 'shared library');
  assert(/Paegle/.test(await (await get('https://paegle--pv.edvlabs.com/')).text()), 'each host sees its own folder');
  r = await get(H + '/dental-x?v=1'); assert.strictEqual(r.status, 308); assert.strictEqual(r.headers.get('Location'), '/dental-x/?v=1');
  r = await get(H + '/', { method: 'HEAD' }); assert.strictEqual(r.status, 200);

  // headers on answers and on 404s
  for (const res of [await get(H + '/'), await get(H + '/nope.html'), await get('https://unknown--pv.edvlabs.com/')]) {
    assert.strictEqual(res.headers.get('X-Robots-Tag'), 'noindex, nofollow'); assert.strictEqual(res.headers.get('Referrer-Policy'), 'no-referrer'); assert(res.headers.get('Cache-Control').includes('max-age=60'));
  }

  // not found
  assert.strictEqual((await get('https://unknown--pv.edvlabs.com/')).status, 404, 'unknown label');
  assert.strictEqual((await get('https://bakery-anna.edvlabs.com/')).status, 404, 'not a preview host: nothing served');
  assert.strictEqual((await get('https://__proto__--pv.edvlabs.com/')).status, 404, 'label __proto__ is not a lookup into Object');
  assert.strictEqual((await get('https://short--pv.edvlabs.com/')).status, 404, 'a bad folder name in the map is refused');
  assert.strictEqual((await get(H + '/missing.html')).status, 404);
  assert.strictEqual((await get(H, { method: 'POST' })).status, 405);

  // path tricks never leave the client's folder
  requested.length = 0;
  for (const p of ['/_hosts.json', '/secret.txt', '/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%2e%2e%2f' + OTHER + '/index.html', '/' + OTHER + '/index.html', '/assets/../' + OTHER + '/index.html', '/assets/%2e%2e/' + OTHER + '/index.html', '/a\\..\\x.html', '//' + OTHER + '/index.html', '/x%00.html', '/%E0%A4%A.html']) {
    const res = await get(H + p);
    const body = await res.text();
    assert(!/Paegle|root file/.test(body), p + ' leaked: ' + body);
  }
  assert(requested.every(p => p === '/_hosts.json' || p.startsWith('/' + TOKEN + '/') || p.startsWith('/assets/')), 'only the client folder, the library and the host map were asked for: ' + requested.join(' '));
  assert(!requested.includes('/' + OTHER + '/index.html'), "another client's folder was never asked for");

  // a missing or broken host map answers 404, not an error
  for (const body of [null, 'not json']) { const s = createPreviewServer({ assets: { fetch: async () => (body === null ? new Response('', { status: 404 }) : new Response(body)) } }); assert.strictEqual((await s.handle(new Request(H + '/'))).status, 404); }

  console.log('previews worker ok');
})().catch(e => { console.error(e); process.exit(1); });
