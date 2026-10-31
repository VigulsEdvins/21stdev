/* The admin panel of a published site (plan 2026-10-31-site-admin-panel.md): the rules for the username and password, the password hash, the signed
   session cookie, and the account actions (turn the panel on, change it, remove it). The login itself, on the site's own address, is in site-admin-serve.js.
   createSiteAdmin({ db, kv, now, rounds, address }) returns { status, enable, change, remove }. Same answer shape as publish.js: { status, json }.
   db:  the table site_admins (adminBySite, adminsBySites, upsertAdmin, deleteAdmin) and published_sites (siteById, sitesByUser); see tests/lib/fake-sites.js.
   kv:  KV. The record visitors' logins read is `admin:<site id>`: { digits, user, hash, salt, rounds, v }. Keyed by the site id, not the name, so a rename moves nothing.
   The password is never stored, logged, returned or put in an address: only a salted hash. */
const Password = require('../../site/js/password.js');

const ROUNDS = 100000; // the most a Worker's built-in crypto accepts for PBKDF2
const USER_RE = /^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$/; // 4 to 32 characters
const SESSION_HOURS = 8;
const CHANGES_PER_HOUR = 20;

const fail = (status, error, extra) => ({ status, json: Object.assign({ ok: false, errors: [error] }, extra || {}) });
const adminKey = (siteId) => 'admin:' + siteId;

const subtle = () => globalThis.crypto.subtle;
const toB64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Equal bytes? Takes the same time wherever the first difference is. */
function sameBytes(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

/** The username in its stored form (lower case), or '' when it is not allowed. */
function cleanUsername(input) {
  const u = String(input == null ? '' : input).trim().toLowerCase();
  return USER_RE.test(u) && !/[._-]{2}/.test(u) ? u : '';
}

const USER_WORDS = 'The username needs 4 to 32 letters, numbers, dots, dashes or underscores, starting and ending with a letter or number.';

/** A plain-words problem with a new username and password, or ''. The browser shows the same words, but is never believed. */
function problem(username, password) {
  if (!cleanUsername(username)) return USER_WORDS;
  const p = String(password == null ? '' : password);
  const why = Password.problem(p, { email: '' });
  if (why) return why;
  const u = cleanUsername(username);
  if (p.toLowerCase().includes(u)) return 'The password must not contain the username.';
  return '';
}

/** Ten random digits for the secret address: /admin + these. */
function newDigits() {
  let out = '';
  while (out.length < 10) {
    const b = globalThis.crypto.getRandomValues(new Uint8Array(1))[0];
    if (b < 250) out += String(b % 10); // 250 is a multiple of 10, so every digit is equally likely
  }
  return out;
}

async function derive(password, salt, rounds) {
  const k = await subtle().importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, k, 256));
}

/** { hash, salt, rounds } for a password; salt is random for each one. */
async function hashPassword(password, rounds) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), r = rounds || ROUNDS;
  return { hash: toB64(await derive(password, salt, r)), salt: toB64(salt), rounds: r };
}

/** Is this the password for the stored record? Always does the work of one hash, also when there is no record, so the answer time says nothing. */
async function checkPassword(password, rec) {
  const salt = rec ? fromB64(rec.salt) : new Uint8Array(16), rounds = rec ? rec.rounds : ROUNDS;
  const got = await derive(password, salt, rounds);
  return !!rec && sameBytes(got, fromB64(rec.hash));
}

/* The session: `<site id>.<expires>.<credential version>.<signature>`; the signature is an HMAC over the first three parts with a secret only the Worker has,
   so nothing needs to be stored (KV is not instant across the world). Changing the username or password raises the version and ends every open session. */
async function mac(secret, text) {
  const k = await subtle().importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(new Uint8Array(await subtle().sign('HMAC', k, new TextEncoder().encode(text))));
}
async function makeSession(secret, siteId, version, nowMs) {
  const body = siteId + '.' + Math.floor(nowMs / 1000 + SESSION_HOURS * 3600) + '.' + version;
  return body + '.' + await mac(secret, body);
}
/** True when the cookie value was made by us for this site, has not run out, and still matches the credential version. */
async function checkSession(secret, value, siteId, version, nowMs) {
  const parts = String(value || '').split('.');
  if (!secret || parts.length !== 4 || parts[0] !== siteId || Number(parts[1]) * 1000 < nowMs || Number(parts[2]) !== version) return false;
  const want = await mac(secret, parts.slice(0, 3).join('.'));
  return sameBytes(new TextEncoder().encode(want), new TextEncoder().encode(parts[3]));
}

/* The field list the editor works from (the part of cms-content.js the builder makes at publish time). It arrives from the browser, so it is rebuilt here from
   known keys only, with limits, and anything else is dropped. Returns the clean object, or null when it cannot be used. */
const FILE_RE = /^[A-Za-z0-9._-]{1,80}\.html$/, ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null);
function cleanStructure(input) {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (!isObj(input) || !Array.isArray(input.pages) || !input.pages.length || input.pages.length > 60) return null;
  const pages = [];
  for (const p of input.pages) {
    if (!isObj(p) || !FILE_RE.test(String(p.file)) || !Array.isArray(p.sections) || p.sections.length > 200) return null;
    const sections = [];
    for (const s of p.sections) {
      if (!isObj(s) || !ID_RE.test(String(s.id)) || !Array.isArray(s.fields) || s.fields.length > 150) return null;
      const fields = [];
      for (const f of s.fields) {
        if (!isObj(f) || !ID_RE.test(String(f.id)) || !/^[a-z]{2,12}$/.test(String(f.type)) || str(f.label, 300) === null || str(f.selector, 600) === null) return null;
        const out = { id: f.id, label: f.label, type: f.type, selector: f.selector, value: f.value == null ? '' : str(f.value, 20000) };
        if (out.value === null) return null;
        if (f.attr !== undefined) { if (!/^(?:--[a-z0-9-]{1,40}|[a-z][a-z0-9-]{0,30})$/.test(String(f.attr)) || /^on|^(style|srcdoc|action|formaction)$/.test(f.attr)) return null; out.attr = f.attr; } // an HTML attribute or a CSS variable such as --accent; never one that runs code or sends a form somewhere
        if (f.fit !== undefined) { const v = str(f.fit, 60); if (v === null) return null; out.fit = v; }
        if (Number.isInteger(f.pos) && Number.isInteger(f.sibs) && f.sibs > 1 && f.sibs < 1000 && f.pos >= 0) { out.pos = f.pos; out.sibs = f.sibs; }
        fields.push(out);
      }
      const sec = { id: s.id, slug: str(s.slug, 100) || '', title: str(s.title, 300) || '', fields };
      if (s.anchor !== undefined && str(s.anchor, 100)) sec.anchor = s.anchor;
      if (s.form === true) sec.form = true;
      sections.push(sec);
    }
    const page = { file: p.file, title: str(p.title, 300) || '', sections };
    if (p.lang !== undefined && /^[A-Za-z0-9-]{2,12}$/.test(String(p.lang))) { page.lang = p.lang; page.group = str(p.group, 100) || p.file; }
    pages.push(page);
  }
  const forms = isObj(input.forms) ? { method: str(input.forms.method, 40) || '', target: str(input.forms.target, 300) || '', has: input.forms.has === true } : { method: '', target: '', has: false };
  const out = { v: 1, site: str(input.site, 200) || 'Website', updatedAt: 0, pages, forms, published: {} };
  if (/^[A-Za-z0-9-]{2,12}$/.test(String(input.siteLang))) out.siteLang = input.siteLang;
  if (isObj(input.mode) && input.mode.has === true) out.mode = { has: true };
  const text = JSON.stringify(out);
  return text.length <= 1500000 ? out : null;
}

function createSiteAdmin({ db, kv, bucket, now, rounds, address, editorFiles }) {
  const addressOf = address || ((name) => 'https://' + name + '.edvlabs.com/');
  const clock = () => (now ? now() : new Date().toISOString());

  async function limited(userId) {
    const k = 'adminchanges:' + userId + ':' + String(clock()).slice(0, 13);
    const n = Number(await kv.get(k)) || 0;
    if (n >= CHANGES_PER_HOUR) return true;
    await kv.put(k, String(n + 1), { expirationTtl: 3700 });
    return false;
  }

  /** The person's own site, or a failure to hand back. */
  async function owned(userId, siteId) {
    if (!userId) return { error: fail(401, 'Please sign in.') };
    const site = await db.siteById(siteId);
    if (!site || site.user_id !== userId) return { error: fail(404, 'That site was not found.') };
    if (site.status === 'blocked') return { error: fail(403, 'This site has been blocked. Please contact edvlabs.', { reason: 'blocked' }) };
    return { site };
  }

  const view = (site, row) => (row ? { on: true, username: row.username, digits: row.path_digits, address: addressOf(site.name) + 'admin' + row.path_digits, lastLoginAt: row.last_login_at || null } : { on: false });

  /** { siteId: view } for the signed-in person's sites, for the account page. The hash is not in it. */
  async function status(userId, sites) {
    const rows = sites.length ? await db.adminsBySites(sites.map((s) => s.id)) : [];
    const out = {};
    for (const s of sites) {
      const row = rows.find((r) => r.site_id === s.id);
      out[s.id] = view(s, row ? Object.assign({}, row, { last_login_at: (await kv.get('adminlast:' + s.id)) || null }) : null); // the sites Worker notes each sign-in in KV
    }
    return out;
  }

  /** Writes the database row and the record the login reads. The database comes first: if the second step fails, the person tries again and the first is replaced. */
  async function save(site, row, version) {
    const saved = await db.upsertAdmin(row);
    await kv.put(adminKey(site.id), JSON.stringify({ digits: row.path_digits, user: row.username, hash: row.password_hash, salt: row.salt, rounds: row.rounds, v: version }));
    return saved || row;
  }

  /** Puts the editor's own files in the site's private folder (from the builder's published copy, never from the customer). */
  async function installEditor(siteId) {
    if (!bucket || !editorFiles) return false;
    const files = await editorFiles();
    for (const [name, body] of Object.entries(files || {})) await bucket.put('sites/' + siteId + '/admin/' + name, new TextEncoder().encode(body), { httpMetadata: { contentType: name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8' } });
    return true;
  }

  /** After a publish: a site with an admin panel keeps the field list that came with the files, and has the editor refreshed. Returns { ok, note? }. */
  async function afterPublish(siteId, structure) {
    if (!(await db.adminBySite(siteId))) return { ok: true, admin: false };
    await installEditor(siteId);
    if (structure === undefined || structure === null) return { ok: true, admin: true, note: 'no-structure' };
    const clean = cleanStructure(structure);
    if (!clean) return { ok: false, admin: true, note: 'bad-structure' };
    await bucket.put('sites/' + siteId + '/admin/structure.json', new TextEncoder().encode(JSON.stringify(clean)), { httpMetadata: { contentType: 'application/json' } });
    return { ok: true, admin: true };
  }

  async function place(site, row, version) {
    for (let tries = 0; ; tries++) {
      try { return await save(site, Object.assign({}, row, { path_digits: row.path_digits || newDigits() }), version); } catch (e) {
        if (e && e.code === 'digits-taken' && tries < 3 && !row.path_digits) continue;
        throw e;
      }
    }
  }

  async function enable({ userId, siteId, username, password }) {
    const o = await owned(userId, siteId); if (o.error) return o.error;
    if (await db.adminBySite(siteId)) return fail(409, 'This site already has an admin panel.');
    const why = problem(username, password); if (why) return fail(400, why);
    if (await limited(userId)) return fail(429, 'That is too many changes for now. Please try again in an hour.');
    const h = await hashPassword(password, rounds);
    const t = clock();
    const row = await place(o.site, { site_id: siteId, user_id: userId, username: cleanUsername(username), password_hash: h.hash, salt: h.salt, rounds: h.rounds, credential_version: 1, created_at: t, changed_at: t }, 1);
    try { await installEditor(siteId); } catch (e) { /* the panel is on; the editor is installed again by the next publish */ }
    const hasContent = bucket ? !!(await bucket.get('sites/' + siteId + '/admin/structure.json')) : false;
    return { status: 200, json: { ok: true, admin: view(o.site, row), needsPublish: !hasContent } };
  }

  /** Changes the username, the password or the secret address (any of them). Open sessions end. */
  async function change({ userId, siteId, username, password, newAddress }) {
    const o = await owned(userId, siteId); if (o.error) return o.error;
    const cur = await db.adminBySite(siteId);
    if (!cur) return fail(404, 'This site has no admin panel yet.');
    if (username === undefined && password === undefined && !newAddress) return fail(400, 'Nothing to change.');
    const row = Object.assign({}, cur);
    const nextUser = username !== undefined ? username : cur.username;
    if (username !== undefined || password !== undefined) {
      if (password === undefined) { if (!cleanUsername(nextUser)) return fail(400, USER_WORDS); } // only the username is checked
      else { const why = problem(nextUser, password); if (why) return fail(400, why); }
    }
    if (await limited(userId)) return fail(429, 'That is too many changes for now. Please try again in an hour.');
    row.username = cleanUsername(nextUser);
    if (password !== undefined) { const h = await hashPassword(password, rounds); row.password_hash = h.hash; row.salt = h.salt; row.rounds = h.rounds; }
    if (newAddress) row.path_digits = newDigits();
    row.credential_version = (cur.credential_version || 1) + 1;
    row.changed_at = clock();
    const saved = await place(o.site, row, row.credential_version);
    return { status: 200, json: { ok: true, admin: view(o.site, saved) } };
  }

  async function remove({ userId, siteId }) {
    const o = await owned(userId, siteId); if (o.error) return o.error;
    await db.deleteAdmin(siteId);
    await kv.delete(adminKey(siteId));
    await kv.delete('adminlast:' + siteId);
    if (bucket) { for (const n of ['admin.html', 'admin.css', 'admin.js', 'cms.js', 'form-rules.js', 'structure.json', 'content.json', 'content.prev.json']) { try { await bucket.delete('sites/' + siteId + '/admin/' + n); } catch (e) { /* the clean-up of leftovers removes them */ } } } // the customer's saved edits go with it
    return { status: 200, json: { ok: true } };
  }

  return { status, enable, change, remove, afterPublish, installEditor };
}

module.exports = { createSiteAdmin, cleanStructure, cleanUsername, problem, newDigits, hashPassword, checkPassword, makeSession, checkSession, adminKey, ROUNDS, SESSION_HOURS, USER_RE };
