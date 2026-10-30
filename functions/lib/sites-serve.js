/* Serving published sites at <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md, step 4). Used by the sites Worker (src/sites-worker.js).
   createSiteServer({ bucket, kv, domain }).handle(request) -> Response. Reads only: KV tells which version of which site is live, R2 holds the files.
   Nothing here reads the database, so a visitor never waits for it. What KV holds for a name (written by functions/lib/publish.js):
     { id, version, status: 'live' | 'unpublished' | 'blocked' }   or   { redirect: '<new name>' } after a rename. */
const { TYPES, key, kvKey } = require('./publish.js');

/** A site name: 3 to 30 pieces of letters and digits joined by single hyphens (same rule as site/js/site-names.js). */
const isLabel = (t) => typeof t === 'string' && t.length >= 3 && t.length <= 30 && t.split('-').every((piece) => /^[a-z0-9]+$/.test(piece));

/* Scripts may only come from the site's own files, whatever the page says: no inline scripts, no event handlers, no scripts from other sites. Every block
   of the library works that way (measured on all of them), and the publish check already refuses anything else. The page's own policy tag (written by
   the export) adds the finer limits (where forms may send, which images load); two policies together mean the stricter one wins. */
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()', 'Content-Security-Policy': "script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'" };

const page = (title, text, link) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + title + '</title>'
  + '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:18px/1.5 system-ui,sans-serif;background:#f5efe0;color:#1d2b2a;text-align:center;padding:24px}main{max-width:30em}h1{font-size:1.6rem;margin:0 0 .5em}a{color:#1f6f6b}</style></head>'
  + '<body><main><h1>' + title + '</h1><p>' + text + '</p>' + (link ? '<p><a href="https://edvlabs.com/' + link[0] + '">' + link[1] + '</a></p>' : '') + '</main></body></html>';

const NOT_AVAILABLE = page('This site is not available', 'The address exists, but the page is not online right now.', ['', 'Go to edvlabs']);
const FREE_ADDRESS = page('Nothing here yet', 'No website uses this address. You could build one in a few minutes.', ['builder/', 'Build your page']);
const NOT_FOUND = page('Page not found', 'This page does not exist on this site.', null);

function respond(status, body, type, extra) {
  return new Response(body, { status, headers: Object.assign({ 'Content-Type': type || 'text/html; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store' }, SECURITY, extra || {}) });
}

/** The files to try, in order, for a request path. A path with a file ending is exact; any other path is a page. */
function candidates(pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch (e) { return null; }
  if (p.includes('\0') || p.includes('\\') || !p.startsWith('/')) return null;
  const parts = p.split('/').slice(1);
  if (parts.some((s, i) => s === '..' || s === '.' || (s === '' && i < parts.length - 1))) return null;
  if (p === '/' || p.endsWith('/')) return [p.slice(1) + 'index.html'];
  const last = parts[parts.length - 1];
  return last.includes('.') ? [p.slice(1)] : [p.slice(1) + '.html', p.slice(1) + '/index.html'];
}

const extOf = (p) => (p.includes('.') ? p.slice(p.lastIndexOf('.') + 1).toLowerCase() : '');

function createSiteServer({ bucket, kv, domain }) {
  const host = domain || 'edvlabs.com';

  /** The site name in a request's host name, or null when it is not a one-piece name under our domain. */
  function nameOf(hostname) {
    const h = hostname.toLowerCase().replace(/\.$/, '');
    if (!h.endsWith('.' + host)) return null;
    const label = h.slice(0, -(host.length + 1));
    return isLabel(label) ? label : null;
  }

  async function file(site, path) {
    const o = await bucket.get(key(site.id, site.version, path));
    return o || null;
  }

  async function handle(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return respond(405, 'Method not allowed', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' });
    const url = new URL(request.url), name = nameOf(url.hostname);
    if (!name) return respond(404, NOT_FOUND);
    let record = null;
    const raw = await kv.get(kvKey(name));
    if (raw) { try { record = JSON.parse(raw); } catch (e) { record = null; } }
    if (!record) return respond(404, FREE_ADDRESS);
    if (record.redirect && isLabel(record.redirect)) return new Response(null, { status: 301, headers: Object.assign({ Location: 'https://' + record.redirect + '.' + host + url.pathname + url.search, 'Cache-Control': 'public, max-age=3600' }, SECURITY) });
    if (record.status !== 'live' || !record.id || !Number.isInteger(record.version)) return respond(404, NOT_AVAILABLE);

    const wanted = candidates(url.pathname);
    if (!wanted) return respond(404, NOT_FOUND);
    let obj = null, used = null;
    for (const c of wanted) { obj = await file(record, c); if (obj) { used = c; break; } }
    let status = 200;
    if (!obj) {
      const own404 = await file(record, '404.html');
      if (!own404) return respond(404, NOT_FOUND);
      obj = own404; used = '404.html'; status = 404;
    }
    /* The type comes from the file ending we accepted at publish time, never from anything the visitor sent. */
    const type = TYPES[extOf(used)] || 'application/octet-stream';
    const headers = Object.assign({ 'Content-Type': type, 'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store' }, SECURITY);
    if (obj.httpEtag) headers.ETag = obj.httpEtag;
    if (status === 200 && obj.httpEtag && request.headers.get('If-None-Match') === obj.httpEtag) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : obj.body, { status, headers });
  }

  return { handle, nameOf };
}

module.exports = { createSiteServer, candidates, SECURITY };
