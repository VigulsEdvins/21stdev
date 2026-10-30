/* Publishing a page at <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md). Pure rules plus injected storage, so tests need no network.
   createPublisher({ db, bucket, kv, now, domain }) returns the actions; the HTTP side (sign-in token, JSON) is added around it later.
   db:     the Supabase tables, written with the service key (published_sites, site_name_holds, site_entitlements); see the interface listed in tests/lib/fake-sites.js
   bucket: R2 (put/get/list/delete). kv: KV (get/put). now: () => ISO time.
   Every action returns { status, json }, the same shape as lead.js. Customers' files are untrusted: the browser is not believed, everything is checked here. */
const Names = require('../../site/js/site-names.js');

const LIMITS = { files: 500, totalBytes: 20 * 1024 * 1024, fileBytes: 5 * 1024 * 1024, pathLength: 200, publishesPerHour: 10, graceDays: 14, keepVersions: 5 };

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', ico: 'image/x-icon', woff2: 'font/woff2', txt: 'text/plain; charset=utf-8',
  xml: 'application/xml', webmanifest: 'application/manifest+json' };

const fail = (status, error, extra) => ({ status, json: Object.assign({ ok: false, errors: [error] }, extra || {}) });
const extOf = (p) => (p.includes('.') ? p.slice(p.lastIndexOf('.') + 1).toLowerCase() : '');

/** Turns the character tricks an attacker uses in an address (&#106;avascript:, tabs and line breaks inside the word) back into plain text. */
function plainUrl(value) {
  const named = { colon: ':', tab: '\t', newline: '\n', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", sol: '/' };
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (m, h) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);?/g, (m, d) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&(\w+);/g, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m))
    .replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '')
    .toLowerCase();
}
const isAbsolute = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\)/.test(u);

const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster']);
const CHECKED_TAGS = new Set(['script', 'iframe', 'form', 'meta', 'link', 'img', 'a', 'area', 'source', 'video', 'audio', 'track', 'input', 'button', 'svg', 'image', 'use']);
const BANNED_TAGS = new Set(['base', 'object', 'embed', 'applet']);
const isSpace = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const isAlnum = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');

/** Walks the page once, left to right, and calls back with each start tag: its name and its attributes as [name, value] pairs. No backtracking, so a hostile page cannot make it slow. */
function eachTag(text, callback) {
  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt < 0 || lt + 1 >= n) return;
    let j = lt + 1;
    const start = j;
    while (j < n && isAlnum(text[j])) j++;
    if (j === start) { i = lt + 1; continue; }
    const tag = text.slice(start, j).toLowerCase(), attrs = [];
    for (;;) {
      while (j < n && (isSpace(text[j]) || text[j] === '/')) j++;
      if (j >= n) break;
      if (text[j] === '>') { j++; break; }
      const nameStart = j;
      while (j < n && !isSpace(text[j]) && text[j] !== '=' && text[j] !== '>' && text[j] !== '/') j++;
      if (j === nameStart) { j++; continue; }
      const name = text.slice(nameStart, j).toLowerCase();
      while (j < n && isSpace(text[j])) j++;
      let value = '';
      if (text[j] === '=') {
        j++;
        while (j < n && isSpace(text[j])) j++;
        const q = text[j];
        if (q === '"' || q === "'") {
          const end = text.indexOf(q, j + 1);
          value = text.slice(j + 1, end < 0 ? n : end);
          j = end < 0 ? n : end + 1;
        } else {
          const vs = j;
          while (j < n && !isSpace(text[j]) && text[j] !== '>') j++;
          value = text.slice(vs, j);
        }
      }
      attrs.push([name, value]);
    }
    callback(tag, attrs);
    i = j;
  }
}

/** Problems in one page that would make a published site unsafe. An empty list means nothing was found. */
function scanHtml(html) {
  const problems = [];
  const add = (m) => { if (!problems.includes(m)) problems.push(m); };
  eachTag(String(html), (tag, attrs) => {
    if (BANNED_TAGS.has(tag)) add('The <' + tag + '> element is not allowed.');
    if (!CHECKED_TAGS.has(tag)) return;
    for (const [name, raw] of attrs) {
      const value = plainUrl(raw);
      if (URL_ATTRS.has(name)) {
        if (/^(?:javascript|vbscript|livescript):/.test(value) || /^data:(?:text\/html|image\/svg|application)/.test(value)) add('A link or source uses a script address.');
        else if (tag === 'script' && name === 'src' && isAbsolute(value)) add('A script is loaded from another website.');
        else if (tag === 'iframe' && name === 'src' && isAbsolute(value)) add('A frame shows another website.');
        else if (name === 'action' && isAbsolute(value)) add('A form sends its data to another website.');
        else if (name === 'formaction' && isAbsolute(value)) add('A button sends form data to another website.');
      }
      if (tag === 'meta' && name === 'content' && value.includes('url=') && attrs.some(([k, v]) => k === 'http-equiv' && plainUrl(v) === 'refresh')) add('A page redirects on its own.');
    }
  });
  return problems;
}

/** An SVG image runs in the site's own address, so any script inside it is refused. */
function scanSvg(svg) {
  const t = String(svg), problems = [];
  if (/<script\b/i.test(t)) problems.push('An SVG image contains a script.');
  if (/<foreignObject\b/i.test(t)) problems.push('An SVG image contains embedded page content.');
  if (/\son[a-z]+\s*=/i.test(t)) problems.push('An SVG image has an event handler.');
  if (/javascript:/.test(plainUrl(t))) problems.push('An SVG image has a script address.');
  return problems;
}

function decode(file) {
  if (file.encoding === 'base64') {
    if (typeof file.content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content) || file.content.length % 4 === 1) return null;
    if (file.content.length > Math.ceil(LIMITS.fileBytes * 4 / 3) + 4) return null;
    const bin = atob(file.content), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  if (typeof file.content !== 'string' || file.content.length > LIMITS.fileBytes) return null;
  return new TextEncoder().encode(file.content);
}

const MAGIC = { png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], jpeg: [0xff, 0xd8, 0xff], gif: [0x47, 0x49, 0x46, 0x38], woff2: [0x77, 0x4f, 0x46, 0x32] };

/** Checks the whole list of files a customer sends. Returns { ok: true, files: [{ path, bytes, type }], total } or { ok: false, errors }. */
function checkFiles(list) {
  const errors = [];
  if (!Array.isArray(list) || !list.length) return { ok: false, errors: ['There are no files to publish.'] };
  if (list.length > LIMITS.files) return { ok: false, errors: ['Too many files: at most ' + LIMITS.files + '.'] };
  const seen = new Set(), files = [];
  let total = 0;
  for (const f of list) {
    const p = f && typeof f.path === 'string' ? f.path : '';
    const label = p.slice(0, 60) || '(no name)';
    if (!p || p.length > LIMITS.pathLength || !/^[A-Za-z0-9._\-/]+$/.test(p) || p.startsWith('/') || p.endsWith('/') || p.split('/').some((s) => !s || s === '.' || s === '..' || s.startsWith('.'))) { errors.push('“' + label + '” is not an allowed file name.'); continue; }
    const ext = extOf(p);
    if (!Object.prototype.hasOwnProperty.call(TYPES, ext)) { errors.push('“' + label + '”: this kind of file cannot be published.'); continue; }
    if (seen.has(p.toLowerCase())) { errors.push('“' + label + '” appears twice.'); continue; }
    seen.add(p.toLowerCase());
    let bytes;
    try { bytes = decode(f); } catch (e) { bytes = null; }
    if (!bytes) { errors.push('“' + label + '” could not be read or is larger than ' + LIMITS.fileBytes / 1024 / 1024 + ' MB.'); continue; }
    if (bytes.length > LIMITS.fileBytes) { errors.push('“' + label + '” is larger than ' + LIMITS.fileBytes / 1024 / 1024 + ' MB.'); continue; }
    if (MAGIC[ext] && !MAGIC[ext].every((b, i) => bytes[i] === b)) { errors.push('“' + label + '” is not a real ' + ext + ' file.'); continue; }
    if (ext === 'html' || ext === 'svg') {
      const text = new TextDecoder().decode(bytes);
      const found = ext === 'html' ? scanHtml(text) : scanSvg(text);
      if (found.length) { errors.push('“' + label + '”: ' + found.join(' ')); continue; }
    }
    total += bytes.length;
    files.push({ path: p, bytes, type: TYPES[ext] });
  }
  if (total > LIMITS.totalBytes) errors.push('The site is larger than ' + LIMITS.totalBytes / 1024 / 1024 + ' MB in total.');
  if (!errors.length && !files.some((f) => f.path === 'index.html')) errors.push('The site needs an index.html (the home page).');
  return errors.length ? { ok: false, errors } : { ok: true, files, total };
}

/** 'active' until paid_until, 'grace' for 14 days after, then 'ended'. A refunded or ended row is never active. */
function entitlementState(ent, now) {
  if (!ent || ent.status !== 'active') return 'ended';
  const t = new Date(now).getTime(), until = new Date(ent.paid_until).getTime();
  if (!Number.isFinite(until)) return 'ended';
  if (t <= until) return 'active';
  return t <= until + LIMITS.graceDays * 86400000 ? 'grace' : 'ended';
}

const key = (siteId, version, path) => 'sites/' + siteId + '/' + version + '/' + path;
const kvKey = (name) => 'site:' + name;

function createPublisher({ db, bucket, kv, now, domain }) {
  const host = domain || 'edvlabs.com';
  const address = (name) => 'https://' + name + '.' + host + '/';

  async function rateLimited(userId) {
    const k = 'publishes:' + userId + ':' + String(now()).slice(0, 13); // one counter per clock hour
    const n = Number(await kv.get(k)) || 0;
    if (n >= LIMITS.publishesPerHour) return true;
    await kv.put(k, String(n + 1), { expirationTtl: 3700 });
    return false;
  }

  /** Is this name usable by this person? Does not reserve anything. */
  async function nameStatus(userId, input) {
    const c = Names.check(input);
    if (!c.ok) return { status: 200, json: { ok: true, available: false, reason: c.reason, message: c.message } };
    const site = await db.siteByName(c.name);
    if (site) return { status: 200, json: { ok: true, available: false, name: c.name, yours: site.user_id === userId, reason: site.user_id === userId ? 'yours' : 'taken', message: site.user_id === userId ? 'You already use this name.' : 'This name is taken.' } };
    const hold = await db.holdByName(c.name);
    if (hold && hold.user_id !== userId && new Date(hold.expires_at).getTime() > new Date(now()).getTime()) return { status: 200, json: { ok: true, available: false, name: c.name, reason: 'taken', message: 'This name is taken.' } };
    return { status: 200, json: { ok: true, available: true, name: c.name, address: address(c.name) } };
  }

  /** Publishes (a new site) or updates (a site the person already has, by its name). */
  async function publish({ userId, name, files, projectId }) {
    if (!userId) return fail(401, 'Please sign in.');
    const c = Names.check(name);
    if (!c.ok) return fail(400, c.message, { reason: c.reason });
    const checked = checkFiles(files);
    if (!checked.ok) return fail(400, checked.errors[0], { details: checked.errors, reason: 'files' });
    if (await rateLimited(userId)) return fail(429, 'Too many publishes this hour. Please try again later.', { reason: 'rate' });

    let site = await db.siteByName(c.name), created = false, entitlement;
    if (site && site.user_id !== userId) return fail(409, 'This name is taken.', { reason: 'taken' });
    if (site && site.status === 'blocked') return fail(403, 'This site has been blocked. Please contact edvlabs.', { reason: 'blocked' });
    if (site) {
      entitlement = await db.entitlementForSite(site.id);
      if (entitlementState(entitlement, now()) === 'ended') return fail(402, 'Publishing for this site has ended. Please renew it.', { reason: 'payment-needed' });
    } else {
      const hold = await db.holdByName(c.name);
      if (hold && hold.user_id !== userId && new Date(hold.expires_at).getTime() > new Date(now()).getTime()) return fail(409, 'This name is taken.', { reason: 'taken' });
      const free = (await db.freeEntitlements(userId)).filter((e) => entitlementState(e, now()) === 'active');
      if (!free.length) return fail(402, 'Publishing on an edvlabs address is a paid extra. Please add it to your account first.', { reason: 'payment-needed' });
      try { site = await db.insertSite({ user_id: userId, name: c.name, project_id: projectId || null }); } catch (e) {
        if (e && e.code === 'name-taken') return fail(409, 'This name is taken.', { reason: 'taken' });
        if (e && e.code === 'too-many') return fail(409, 'You have reached the most sites one account can have.', { reason: 'too-many' });
        throw e;
      }
      created = true;
      if (!(await db.claimEntitlement(free[0].id, site.id))) { await db.deleteSite(site.id); return fail(409, 'That paid place was just used. Please try again.', { reason: 'race' }); }
    }

    const version = await db.reserveVersion(site.id);
    const written = [];
    try {
      for (const f of checked.files) {
        await bucket.put(key(site.id, version, f.path), f.bytes, { httpMetadata: { contentType: f.type } });
        written.push(key(site.id, version, f.path));
      }
      await db.goLive(site.id, version, { project_id: projectId || site.project_id || null });
      await kv.put(kvKey(c.name), JSON.stringify({ id: site.id, version, status: 'live' }));
    } catch (e) {
      for (const k of written) { try { await bucket.delete(k); } catch (e2) { /* the next publish removes leftovers */ } }
      if (created) { try { await db.releaseEntitlement(site.id); await db.deleteSite(site.id); } catch (e2) { /* nothing more can be done here */ } }
      return fail(500, 'Publishing did not finish. Your earlier version is still live. Please try again.', { reason: 'storage' });
    }
    await prune(site.id, version);
    return { status: 200, json: { ok: true, name: c.name, address: address(c.name), version, siteId: site.id, created } };
  }

  /** Removes folders older than the last few versions. */
  async function prune(siteId, live) {
    const keep = live - LIMITS.keepVersions + 1; // keeps `live` and the four before it
    const listed = await bucket.list({ prefix: 'sites/' + siteId + '/' });
    for (const o of listed.objects || []) {
      const v = Number(o.key.split('/')[2]);
      if (Number.isInteger(v) && v < keep) await bucket.delete(o.key);
    }
  }

  /** Takes the site offline. The files and the name stay, so publishing again brings it back. */
  async function unpublish({ userId, siteId }) {
    if (!userId) return fail(401, 'Please sign in.');
    const site = await db.siteById(siteId);
    if (!site || site.user_id !== userId) return fail(404, 'That site was not found.');
    if (site.status === 'blocked') return fail(403, 'This site has been blocked. Please contact edvlabs.', { reason: 'blocked' });
    await db.setStatus(site.id, 'unpublished');
    await kv.put(kvKey(site.name), JSON.stringify({ id: site.id, version: site.version, status: 'unpublished' }));
    return { status: 200, json: { ok: true, name: site.name } };
  }

  return { nameStatus, publish, unpublish };
}

module.exports = { createPublisher, checkFiles, scanHtml, scanSvg, entitlementState, plainUrl, LIMITS, TYPES, key, kvKey };
