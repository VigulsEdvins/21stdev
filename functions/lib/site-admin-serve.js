/* The admin panel on a published site's own address (plan 2026-10-31-site-admin-panel.md, steps 4 and 5). Used by the sites Worker (sites-serve.js).
   createAdminServer({ kv, bucket, secret, now, insecure }).handle(request, url, site) -> Response, or null when this is not an admin address of this site.
   `site` is the live record { id, version } the lookup gave. Nothing here answers unless the ten digits in the address are the site's own, so every other
   /admin… address is the ordinary "page not found". Routes under /admin<digits>:
     GET  /            the login page, or the editor when the signed cookie is valid
     POST /login       username and password (form); five wrong tries per visitor per 15 minutes lock that visitor out for the rest of the window
     POST /logout      ends the session in this browser
     POST /save        { values } the customer's edits, checked and kept apart from the published files
     GET  /<file>      the editor's files, the content, and the site's own pages (for the preview frame), only with a valid cookie
   The cookie is host-only (never Domain=edvlabs.com): one customer's site cannot see another's. */
const SA = require('./site-admin.js');

const EDITOR_FILES = ['admin.css', 'admin.js', 'cms.js', 'form-rules.js'];
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json' };
const WINDOW_MS = 15 * 60 * 1000, IP_TRIES = 5, SITE_TRIES = 30, MAX_SAVE = 400 * 1024;
const ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
const ADMIN_CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";
const FRAMEABLE_CSP = "script-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"; // the site's own pages inside the editor's preview: framed by the same address only
const BASE = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Strict-Transport-Security': 'max-age=31536000', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' };

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = (status, body, type, extra) => new Response(body, { status, headers: Object.assign({ 'Content-Type': type || 'text/html; charset=utf-8', 'Content-Security-Policy': ADMIN_CSP }, BASE, extra || {}) });
const json = (status, body) => say(status, JSON.stringify(body), 'application/json');

function loginPage(base, message) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Sign in</title>'
    + '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f5efe0;color:#1d2b2a;padding:24px}form{background:#fff;border-radius:12px;padding:28px;max-width:22em;width:100%;box-shadow:0 2px 12px #0002}'
    + 'h1{font-size:1.3rem;margin:0 0 1rem}label{display:block;margin:.8rem 0 .2rem;font-size:.9rem}input{width:100%;box-sizing:border-box;padding:.6rem;border:1px solid #9aa;border-radius:6px;font:inherit}'
    + 'button{margin-top:1.2rem;width:100%;padding:.7rem;border:0;border-radius:6px;background:#1f6f6b;color:#fff;font:inherit;cursor:pointer}.bad{color:#a02020;margin:.8rem 0 0}</style></head>'
    + '<body><form method="post" action="' + esc(base) + '/login"><h1>Sign in to edit your website</h1>' + (message ? '<p class="bad" role="alert">' + esc(message) + '</p>' : '')
    + '<label for="u">Username</label><input id="u" name="username" autocomplete="username" required maxlength="40" autofocus>'
    + '<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required maxlength="100">'
    + '<button type="submit">Sign in</button></form></body></html>';
}

const enc = (t) => new TextEncoder().encode(t);
const text = async (obj) => (obj ? new Response(obj.body).text() : null);
const parseCookies = (header) => { const out = {}; for (const part of String(header || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); } return out; };

/** Checks what the editor sends before it is kept. Returns { values } (a clean copy) or { error }. `structure` is the site's own field list: only fields it has can be set. */
function cleanValues(input, structure) {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (!isObj(input)) return { error: 'The changes were not in the expected form.' };
  const known = {}; // page file -> section id -> field id -> type
  for (const pg of (structure && structure.pages) || []) for (const sec of pg.sections || []) for (const f of sec.fields || []) ((known[pg.file] = known[pg.file] || {})[sec.id] = known[pg.file][sec.id] || {})[f.id] = f.type;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === '__form') {
      if (!isObj(v)) return { error: 'The form setting was not valid.' };
      out.__form = { method: String(v.method || '').slice(0, 40), target: String(v.target || '').slice(0, 300) };
    } else if (k === '__langs') {
      if (!Array.isArray(v) || v.length > 30 || v.some((x) => typeof x !== 'string' || !/^[A-Za-z0-9-]{2,12}$/.test(x))) return { error: 'The language list was not valid.' };
      out.__langs = v.slice();
    } else if (k === '__mode') {
      if (v !== 'off') return { error: 'The light/dark setting was not valid.' };
      out.__mode = 'off';
    } else if (Object.prototype.hasOwnProperty.call(known, k)) {
      if (!isObj(v)) return { error: 'A page was not in the expected form.' };
      for (const [sid, fields] of Object.entries(v)) {
        if (!Object.prototype.hasOwnProperty.call(known[k], sid) || !isObj(fields)) return { error: 'A section was not recognised. Reload the editor and try again.' };
        for (const [fid, val] of Object.entries(fields)) {
          const base = fid.replace(/__(fit|hide|move|shift)$/, '');
          if (!ID_RE.test(fid) || !Object.prototype.hasOwnProperty.call(known[k][sid], base)) return { error: 'A field was not recognised. Reload the editor and try again.' };
          if (typeof val !== 'string' || val.length > 20000) return { error: 'A value was too long or not text.' };
          const type = known[k][sid][base];
          if ((type === 'link' || type === 'image') && fid === base && /^(?:javascript|vbscript|livescript):|^data:(?:text\/html|image\/svg|application)/.test(val.replace(/[\u0000- \u007f-\u009f​-‏﻿]/g, '').toLowerCase())) return { error: 'A link or picture address was not allowed.' };
          if (Object.prototype.hasOwnProperty.call(Object.prototype, fid) || fid === '__proto__') return { error: 'A field was not recognised.' };
          ((out[k] = out[k] || {})[sid] = out[k][sid] || {})[fid] = val;
        }
      }
    } else return { error: 'Something in the changes was not recognised. Reload the editor and try again.' };
  }
  return { values: out };
}

function createAdminServer({ kv, bucket, secret, now, insecure }) {
  const clock = () => (now ? new Date(now()).getTime() : Date.now());
  const cookieName = insecure ? 'edv_admin' : '__Host-edv_admin';
  const adminFile = (site, name) => 'sites/' + site.id + '/admin/' + name;

  async function record(site) { try { return JSON.parse(await kv.get(SA.adminKey(site.id))); } catch (e) { return null; } }
  async function loggedIn(request, site, rec) {
    const v = parseCookies(request.headers.get('Cookie'))[cookieName];
    return !!rec && await SA.checkSession(secret, v, site.id, rec.v, clock());
  }

  /** window.EDV_CMS for this site: the field list made at publish time, with the customer's saved values in place of the ones it was published with. */
  async function contentJs(site) {
    const struct = await text(await bucket.get(adminFile(site, 'structure.json')));
    if (!struct) return null;
    let s, saved = null;
    try { s = JSON.parse(struct); saved = JSON.parse(await text(await bucket.get(adminFile(site, 'content.json')))); } catch (e) { if (!s) return null; }
    if (saved && saved.values) { s.published = saved.values; s.updatedAt = saved.savedAt || s.updatedAt || 0; }
    return '/* Content of this website. */\nwindow.EDV_CMS = ' + JSON.stringify(s) + ';\n';
  }

  /** The two files the live pages load when the site has an admin panel: public, short cache. Returns a Response or null. */
  async function publicFile(path, site) {
    if (path !== '/cms.js' && path !== '/cms-content.js') return null;
    if (!(await kv.get(SA.adminKey(site.id)))) return null;
    const body = path === '/cms.js' ? await text(await bucket.get(adminFile(site, 'cms.js'))) : await contentJs(site);
    if (body == null) return null;
    return new Response(body, { status: 200, headers: Object.assign({ 'Content-Type': TYPES.js, 'Cache-Control': 'public, max-age=60' }, { 'X-Content-Type-Options': 'nosniff' }) });
  }

  async function tooMany(request, site) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown', w = Math.floor(clock() / WINDOW_MS);
    const kIp = 'adminfail:ip:' + ip + ':' + w, kSite = 'adminfail:site:' + site.id + ':' + w;
    const [a, b] = await Promise.all([kv.get(kIp), kv.get(kSite)]);
    return { locked: Number(a) >= IP_TRIES || Number(b) >= SITE_TRIES, fail: async () => { await kv.put(kIp, String(Number(a || 0) + 1), { expirationTtl: 1000 }); await kv.put(kSite, String(Number(b || 0) + 1), { expirationTtl: 1000 }); } };
  }

  async function handle(request, url, site) {
    const head = /^\/admin(\d{10})/.exec(url.pathname); // then either nothing or a slash
    const rest = head ? url.pathname.slice(head[0].length) : '';
    if (!head || (rest !== '' && rest[0] !== '/')) return null;
    const m = [null, head[1], rest]; // m[2] is '' for the bare address
    const rec = await record(site);
    if (!rec || rec.digits !== m[1]) return null; // not this site's address: an ordinary missing page
    const base = '/admin' + m[1], sub = m[2] || '/', method = request.method;
    const sameOrigin = request.headers.get('Origin') === url.origin;

    if (method === 'POST') {
      if (!sameOrigin) return say(403, 'Not allowed.', 'text/plain; charset=utf-8');
      if (sub === '/login') {
        const guard = await tooMany(request, site);
        if (guard.locked) return say(429, loginPage(base, 'Too many tries. Please wait 15 minutes and try again.'), null, { 'Retry-After': '900' });
        const raw = await request.text();
        const form = raw.length <= 2000 ? new URLSearchParams(raw) : new URLSearchParams();
        const user = SA.cleanUsername(form.get('username')), okPassword = await SA.checkPassword(String(form.get('password') || '').slice(0, 200), rec); // always one hash, so the time says nothing
        if (!user || user !== rec.user || !okPassword) { await guard.fail(); return say(401, loginPage(base, 'Wrong username or password.')); }
        try { await kv.put('adminlast:' + site.id, new Date(clock()).toISOString()); } catch (e) { /* the sign-in does not depend on it */ } // shown in the account; kept in KV so this Worker never needs the database key
        const token = await SA.makeSession(secret, site.id, rec.v, clock());
        return new Response(null, { status: 303, headers: Object.assign({ Location: base + '/', 'Set-Cookie': cookieName + '=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + SA.SESSION_HOURS * 3600 + (insecure ? '' : '; Secure') }, BASE) });
      }
      if (sub === '/logout') return new Response(null, { status: 303, headers: Object.assign({ Location: base + '/', 'Set-Cookie': cookieName + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (insecure ? '' : '; Secure') }, BASE) });
      if (sub === '/save') {
        if (!(await loggedIn(request, site, rec))) return json(401, { ok: false, errors: ['Please sign in again.'] });
        if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { ok: false, errors: ['Send JSON.'] });
        const raw = await request.text();
        if (raw.length > MAX_SAVE) return json(413, { ok: false, errors: ['That is too large.'] });
        let body; try { body = JSON.parse(raw); } catch (e) { return json(400, { ok: false, errors: ['That was not valid JSON.'] }); }
        let struct = null; try { struct = JSON.parse(await text(await bucket.get(adminFile(site, 'structure.json')))); } catch (e) { struct = null; }
        if (!struct) return json(409, { ok: false, errors: ['This site has no editable content yet. Put it online again from the builder.'] });
        const c = cleanValues(body && body.values, struct);
        if (c.error) return json(400, { ok: false, errors: [c.error] });
        const prev = await bucket.get(adminFile(site, 'content.json'));
        if (prev) await bucket.put(adminFile(site, 'content.prev.json'), new TextEncoder().encode(await text(prev)), { httpMetadata: { contentType: TYPES.json } }); // one step back
        const savedAt = clock();
        await bucket.put(adminFile(site, 'content.json'), new TextEncoder().encode(JSON.stringify({ values: c.values, savedAt })), { httpMetadata: { contentType: TYPES.json } });
        return json(200, { ok: true, savedAt });
      }
      if (sub === '/restore') { // swaps what is saved with the version saved before it (pressing it again swaps back)
        if (!(await loggedIn(request, site, rec))) return json(401, { ok: false, errors: ['Please sign in again.'] });
        const prev = await text(await bucket.get(adminFile(site, 'content.prev.json'))), cur = await text(await bucket.get(adminFile(site, 'content.json')));
        if (!prev) return json(409, { ok: false, errors: ['There is no earlier saved version yet.'] });
        const swapped = JSON.parse(prev); swapped.savedAt = clock();
        await bucket.put(adminFile(site, 'content.json'), enc(JSON.stringify(swapped)), { httpMetadata: { contentType: TYPES.json } });
        if (cur) await bucket.put(adminFile(site, 'content.prev.json'), enc(cur), { httpMetadata: { contentType: TYPES.json } });
        return json(200, { ok: true });
      }
      return say(404, 'Not found', 'text/plain; charset=utf-8');
    }

    if (method !== 'GET' && method !== 'HEAD') return say(405, 'Method not allowed', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD, POST' });
    if (!(await loggedIn(request, site, rec))) return sub === '/' ? say(200, loginPage(base, '')) : say(404, 'Not found', 'text/plain; charset=utf-8');

    const serve = (body, type, csp) => new Response(method === 'HEAD' ? null : body, { status: 200, headers: Object.assign({ 'Content-Type': type, 'Content-Security-Policy': csp || ADMIN_CSP }, BASE) });
    if (sub === '/') {
      const html = await text(await bucket.get(adminFile(site, 'admin.html')));
      return html == null ? say(503, loginPage(base, 'The editor is not installed on this site yet. Put the site online again from the builder.')) : serve(html, TYPES.html);
    }
    const file = sub.slice(1);
    if (EDITOR_FILES.includes(file)) { const body = await text(await bucket.get(adminFile(site, file))); return body == null ? say(404, 'Not found', 'text/plain; charset=utf-8') : serve(body, TYPES[file.slice(file.lastIndexOf('.') + 1)]); }
    if (file === 'cms-content.js') { const body = await contentJs(site); return body == null ? say(404, 'Not found', 'text/plain; charset=utf-8') : serve(body, TYPES.js); }
    // the site's own pages, so the preview frame next to the editor (which asks for index.html beside itself) works on this address
    if (/^[A-Za-z0-9._\-/]+$/.test(file) && !file.split('/').some((s) => !s || s.startsWith('.')) && /\.(html|css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2)$/i.test(file) && site.version >= 1) {
      const o = await bucket.get('sites/' + site.id + '/' + site.version + '/' + file);
      if (o) { const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase(); return new Response(method === 'HEAD' ? null : o.body, { status: 200, headers: Object.assign({}, BASE, { 'Content-Type': (o.httpMetadata && o.httpMetadata.contentType) || TYPES[ext] || 'application/octet-stream', 'Content-Security-Policy': FRAMEABLE_CSP }) }); }
    }
    return say(404, 'Not found', 'text/plain; charset=utf-8');
  }

  return { handle, publicFile, contentJs };
}

module.exports = { createAdminServer, cleanValues, EDITOR_FILES, ADMIN_CSP };
