/* Client design previews at <name>--pv.edvlabs.com (plan 2026-11-16-previews-subdomain-worker.md).
   The host label before "--pv" is looked up in previews/_hosts.json ({"diadents-7k2m": "<16 hex folder>"}); the folder is served from the static assets.
   Customer sites can never end in "--pv" (siteNameOk in payment.js refuses "--"), so this cannot shadow a customer. Read only; no keys, no KV, no database. */

const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN = /^[a-f0-9]{16,64}$/;
const HEADERS = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }; // the address is the secret: never send it on in a Referer

const text = (status, body, extra) => new Response(body, { status, headers: { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
const notFound = () => text(404, 'Not found');

/** The label in front of "--pv.<domain>", or '' when the host is anything else. */
function labelOf(host, domain, suffix = 'pv') {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  const tail = '--' + suffix + '.' + domain;
  if (!h.endsWith(tail)) return '';
  const label = h.slice(0, -tail.length);
  return label.length <= 63 && LABEL.test(label) ? label : '';
}

/** The asset path for a request path, or '' when it is not allowed. /assets/ is the shared library every page uses; everything else lives under the client's folder. */
function assetPath(pathname, token) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { return ''; }
  if (/[\\\0]|\/\.{1,2}(\/|$)|\/\//.test(p)) return ''; // backslash, NUL, dot segments, empty segments: nothing odd reaches the asset store
  if (p.endsWith('/')) p += 'index.html';
  return p.startsWith('/assets/') ? p : '/' + token + p;
}

// suffix is only ever changed for the throw-away route test (--pvtest); production keeps "pv"
function createPreviewServer({ assets, domain = 'edvlabs.com', suffix = 'pv' }) {
  async function hosts() {
    const r = await assets.fetch(new Request('https://assets.invalid/_hosts.json'));
    if (!r.ok) return new Map();
    try { return new Map(Object.entries(await r.json())); } catch { return new Map(); } // Map: a label like "__proto__" is only ever a key
  }

  async function handle(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return text(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    const url = new URL(request.url);
    const label = labelOf(url.hostname, domain, suffix);
    if (!label) return notFound();
    const token = (await hosts()).get(label);
    if (typeof token !== 'string' || !TOKEN.test(token)) return notFound();
    if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.startsWith('/assets/')) return text(308, '', { Location: url.pathname + '/' + url.search }); // a folder without its slash
    const p = assetPath(url.pathname, token);
    if (!p) return notFound();
    const r = await assets.fetch(new Request('https://assets.invalid' + encodeURI(p), { method: request.method }));
    if (r.status !== 200) return notFound();
    const out = new Response(r.body, r);
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
    return out;
  }
  return { handle, labelOf };
}

module.exports = { createPreviewServer, labelOf, assetPath, HEADERS };
