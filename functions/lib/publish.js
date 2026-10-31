/* Publishing a page at <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md). Pure rules plus injected storage, so tests need no network.
   createPublisher({ db, bucket, kv, now, domain }) returns the actions; the HTTP side (sign-in token, JSON) is added around it later.
   db:     the Supabase tables, written with the service key (published_sites, site_name_holds, site_entitlements); see the interface listed in tests/lib/fake-sites.js
   bucket: R2 (put/get/list/delete). kv: KV (get/put). now: () => ISO time.
   Every action returns { status, json }, the same shape as lead.js. Customers' files are untrusted: the browser is not believed, everything is checked here. */
const Names = require('../../site/js/site-names.js');
const Limits = require('./limits.js');

const LIMITS = { files: 500, totalBytes: 10 * 1024 * 1024, fileBytes: 5 * 1024 * 1024, nameChecksPerHour: 60, pathLength: 200, publishesPerHour: 10, renamesPerHour: 10, graceDays: 14, keepVersions: 5, holdDays: 90, retentionDays: 90, maxPurgesPerRun: 25 };

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
    // Scripts live in the site's script files, which are checked separately. Nothing may run from inside the page itself.
    for (const [name] of attrs) {
      if (name.length > 2 && name.startsWith('on')) add('An element has an event handler (an “on…” attribute).');
      if (name === 'srcdoc') add('A frame carries its own page.');
    }
    if (tag === 'script' && !attrs.some(([n]) => n === 'src') && !attrs.some(([n, v]) => n === 'type' && plainUrl(v) === 'application/ld+json')) add('The page has a script written into it.');
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

function decode(file, fileBytes) {
  if (file.encoding === 'base64') {
    if (typeof file.content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content) || file.content.length % 4 === 1) return null;
    if (file.content.length > Math.ceil(fileBytes * 4 / 3) + 4) return null;
    const bin = atob(file.content), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  if (typeof file.content !== 'string' || file.content.length > fileBytes) return null;
  return new TextEncoder().encode(file.content);
}

const MAGIC = { png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], jpeg: [0xff, 0xd8, 0xff], gif: [0x47, 0x49, 0x46, 0x38], woff2: [0x77, 0x4f, 0x46, 0x32] };

/** Checks the whole list of files a customer sends. `caps` is { totalBytes, fileBytes, more } from the person's limits (built-in numbers when not given);
    `more` says a bigger limit can be bought, which the message then mentions.
    Returns { ok: true, files: [{ path, bytes, type }], total } or { ok: false, errors }. */
function checkFiles(list, caps) {
  const totalBytes = (caps && caps.totalBytes) || LIMITS.totalBytes, fileBytes = (caps && caps.fileBytes) || LIMITS.fileBytes;
  const mb = (n) => Math.round(n / 1024 / 1024 * 10) / 10;
  const hint = caps && caps.more ? ' A bigger limit is available: ask edvlabs.' : '';
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
    try { bytes = decode(f, fileBytes); } catch (e) { bytes = null; }
    if (!bytes) { errors.push('“' + label + '” could not be read or is larger than ' + mb(fileBytes) + ' MB.' + hint); continue; }
    if (bytes.length > fileBytes) { errors.push('“' + label + '” is larger than ' + mb(fileBytes) + ' MB.' + hint); continue; }
    if (MAGIC[ext] && !MAGIC[ext].every((b, i) => bytes[i] === b)) { errors.push('“' + label + '” is not a real ' + ext + ' file.'); continue; }
    if (ext === 'html' || ext === 'svg') {
      const text = new TextDecoder().decode(bytes);
      const found = ext === 'html' ? scanHtml(text) : scanSvg(text);
      if (found.length) { errors.push('“' + label + '”: ' + found.join(' ')); continue; }
    }
    total += bytes.length;
    files.push({ path: p, bytes, type: TYPES[ext] });
  }
  if (total > totalBytes) errors.push('The site is larger than ' + mb(totalBytes) + ' MB in total.' + hint);
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

function createPublisher({ db, bucket, kv, now, domain, addressOf, scripts, defaults, adminHook, paymentOn }) {
  // paymentOn: Stripe is switched on, so a page must have been bought (by the person who publishes it) before it can go online
  // adminHook: { afterPublish(siteId, structure) }, the admin panel of a site (site-admin.js); called after the new version is live
  const host = domain || 'edvlabs.com';
  /** What this person may do: the defaults for everyone, with any upgrade in their account_limits row applied. */
  const limitsFor = async (userId) => Limits.resolve(defaults, db.accountLimits ? await db.accountLimits(userId) : null);
  const address = addressOf || ((name) => 'https://' + name + '.' + host + '/'); // addressOf: the local demo (scripts/demo-publish.js) uses http://<name>.localhost:<port>/

  async function rateLimited(userId, what, limit) {
    const k = (what || 'publishes') + ':' + userId + ':' + String(now()).slice(0, 13); // one counter per clock hour
    const n = Number(await kv.get(k)) || 0;
    if (n >= (limit || LIMITS.publishesPerHour)) return true;
    await kv.put(k, String(n + 1), { expirationTtl: 3700 });
    return false;
  }

  /** Every .js file must be exactly what the builder makes (functions/lib/script-check.js). Without a checker no script is accepted. Returns a message or ''. */
  async function checkScripts(list) {
    for (const f of list) {
      if (!f.path.endsWith('.js')) continue;
      if (!scripts) return '“' + f.path.slice(0, 60) + '”: scripts cannot be published here.';
      const r = await scripts.check(new TextDecoder().decode(f.bytes));
      if (!r.ok) return '“' + f.path.slice(0, 60) + '”: ' + r.problem + ' Reload the builder and put the page online again.';
    }
    return '';
  }

  /** Is this name usable by this person? Does not reserve anything. */
  async function nameStatus(userId, input) {
    if (userId && await rateLimited(userId, 'names', LIMITS.nameChecksPerHour)) return fail(429, 'Too many name checks this hour. Please try again later.', { reason: 'rate' }); // the check shows which names are taken, so it is limited
    const c = Names.check(input);
    if (!c.ok) return { status: 200, json: { ok: true, available: false, reason: c.reason, message: c.message } };
    const site = await db.siteByName(c.name);
    if (site) return { status: 200, json: { ok: true, available: false, name: c.name, yours: site.user_id === userId, reason: site.user_id === userId ? 'yours' : 'taken', message: site.user_id === userId ? 'You already use this name.' : 'This name is taken.' } };
    const hold = await db.holdByName(c.name);
    if (hold && hold.user_id !== userId && new Date(hold.expires_at).getTime() > new Date(now()).getTime()) return { status: 200, json: { ok: true, available: false, name: c.name, reason: 'taken', message: 'This name is taken.' } };
    return { status: 200, json: { ok: true, available: true, name: c.name, address: address(c.name) } };
  }

  /** Publishes (a new site) or updates (a site the person already has, by its name). */
  async function publish({ userId, name, files, projectId, adminStructure }) {
    if (!userId) return fail(401, 'Please sign in.');
    const c = Names.check(name);
    if (!c.ok) return fail(400, c.message, { reason: c.reason });
    if (paymentOn) {
      const bought = typeof projectId === 'string' && db.purchaseForProject ? await db.purchaseForProject(projectId) : null;
      if (!bought || bought.user_id !== userId) return fail(402, 'Please buy this page first. You can do that from the “Proceed” button.', { reason: 'purchase-needed' });
    }
    const limits = await limitsFor(userId);
    const checked = checkFiles(files, { totalBytes: limits.siteMb * 1024 * 1024, fileBytes: limits.fileMb * 1024 * 1024, more: limits.canBuyMore.siteMb });
    if (!checked.ok) return fail(400, checked.errors[0], { details: checked.errors, reason: 'files' });
    const scriptProblem = await checkScripts(checked.files);
    if (scriptProblem) return fail(400, scriptProblem, { details: [scriptProblem], reason: 'files' });
    if (await rateLimited(userId, 'publishes', limits.publishesPerHour)) return fail(429, 'Too many publishes this hour (' + limits.publishesPerHour + ' are allowed).' + (limits.canBuyMore.publishesPerHour ? ' More is available: ask edvlabs.' : '') + ' Please try again later.', { reason: 'rate' });

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
    let admin; // what happened to the admin panel's editor content, only for a site that has one
    if (adminHook) { try { admin = await adminHook.afterPublish(site.id, adminStructure); } catch (e) { admin = { ok: false, admin: true, note: 'failed' }; } } // the page is live either way; the panel is refreshed by the next publish
    return { status: 200, json: Object.assign({ ok: true, name: c.name, address: address(c.name), version, siteId: site.id, created }, admin && admin.admin ? { admin } : {}) };
  }

  /** Removes folders older than the last few versions. */
  async function prune(siteId, live) {
    const keep = live - LIMITS.keepVersions + 1; // keeps `live` and the four before it
    const listed = await bucket.list({ prefix: 'sites/' + siteId + '/', limit: 1000 });
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

  /** Gives a site a new name. The old address redirects to the new one for 90 days and stays reserved for the owner; the files do not move
      (they are stored under the site's id). The database does the swap in one action (db.renameSite); then the lookup visitors use is updated. */
  async function rename({ userId, siteId, newName }) {
    if (!userId) return fail(401, 'Please sign in.');
    const c = Names.check(newName);
    if (!c.ok) return fail(400, c.message, { reason: c.reason });
    const site = await db.siteById(siteId);
    if (!site || site.user_id !== userId) return fail(404, 'That site was not found.');
    if (site.status === 'blocked') return fail(403, 'This site has been blocked. Please contact edvlabs.', { reason: 'blocked' });
    if (site.name === c.name) return fail(400, 'That is already the name of this site.', { reason: 'same' });
    if (entitlementState(await db.entitlementForSite(site.id), now()) === 'ended') return fail(402, 'Publishing for this site has ended. Please renew it.', { reason: 'payment-needed' });
    if (await db.siteByName(c.name)) return fail(409, 'This name is taken.', { reason: 'taken' });
    const hold = await db.holdByName(c.name);
    if (hold && hold.user_id !== userId && new Date(hold.expires_at).getTime() > new Date(now()).getTime()) return fail(409, 'This name is taken.', { reason: 'taken' });
    if (await rateLimited(userId, 'renames', LIMITS.renamesPerHour)) return fail(429, 'Too many changes this hour. Please try again later.', { reason: 'rate' });
    let r;
    const limits = await limitsFor(userId);
    try { r = await db.renameSite({ siteId: site.id, userId, newName: c.name, holdDays: LIMITS.holdDays, maxRenames: limits.renamesPer30Days, nowIso: now() }); } catch (e) {
      const why = { 'rename-taken': [409, 'This name is taken.', 'taken'], 'rename-too-many': [429, 'A site can be renamed ' + (limits.renamesPer30Days === 1 ? 'once' : limits.renamesPer30Days + ' times') + ' in 30 days.' + (limits.canBuyMore.renamesPer30Days ? ' More is available: ask edvlabs.' : '') + ' Please try again later.', 'renames'], 'rename-blocked': [403, 'This site has been blocked.', 'blocked'], 'rename-not-found': [404, 'That site was not found.', 'not-found'], 'rename-same': [400, 'That is already the name of this site.', 'same'] }[e && e.code];
      if (why) return fail(why[0], why[1], { reason: why[2] });
      throw e;
    }
    // the lookup visitors use: the new name serves the site, the old names (this one and any older held ones) redirect to it
    try {
      await kv.put(kvKey(c.name), JSON.stringify({ id: site.id, version: r.version, status: r.status }));
      for (const held of r.held || []) await kv.put(kvKey(held), JSON.stringify({ redirect: c.name }));
      const ownHost = await kv.get('sitehost:' + site.id); // the customer's own domain (plan 2026-10-31-custom-domain.md) keeps serving the site under its new name
      if (ownHost) await kv.put('host:' + ownHost, JSON.stringify({ name: c.name }));
    } catch (e) {
      return { status: 202, json: { ok: true, name: c.name, oldName: r.old, address: address(c.name), pending: true, errors: [] } }; // the next hourly clean-up finishes the lookup
    }
    return { status: 200, json: { ok: true, name: c.name, oldName: r.old, address: address(c.name), oldAddress: address(r.old), holdDays: LIMITS.holdDays } };
  }

  /** The person's sites with their payment state, and how many paid places are still unused. */
  async function mySites(userId) {
    if (!userId) return fail(401, 'Please sign in.');
    const [sites, ents, limits] = await Promise.all([db.sitesByUser(userId), db.entitlementsByUser(userId), limitsFor(userId)]);
    const t = now(), since = new Date(t).getTime() - 30 * 86400000;
    return { status: 200, json: { ok: true,
      limits: { publishesPerHour: limits.publishesPerHour, renamesPer30Days: limits.renamesPer30Days, siteMb: limits.siteMb, canBuyMore: limits.canBuyMore },
      sites: sites.map((x) => { const e = ents.find((y) => y.site_id === x.id); const used = (x.renamed_at || []).filter((d) => new Date(d).getTime() > since).length; return { id: x.id, name: x.name, status: x.status, version: x.version, address: address(x.name), publishedAt: x.published_at || null, payment: entitlementState(e, t), paidUntil: e ? e.paid_until : null, renamesLeft: Math.max(0, limits.renamesPer30Days - used) }; }),
      freePlaces: ents.filter((e) => !e.site_id && entitlementState(e, t) === 'active').length } };
  }

  /** Deletes every file of a site from R2 (a listing returns at most a thousand at a time, so it repeats until nothing is left). */
  async function deleteFiles(siteId) {
    for (let round = 0; round < 1000; round++) {
      const listed = await bucket.list({ prefix: 'sites/' + siteId + '/', limit: 1000 });
      const objs = listed.objects || [];
      if (!objs.length) return;
      for (const o of objs) await bucket.delete(o.key);
    }
  }

  /** Sweeps up after things the browser never tells us about; run on a timer (src/worker.js scheduled). Safe to run twice.
      1) sites whose database row is gone (account deleted): files and address removed
      2) sites whose payment ended more than the grace period ago: taken offline, files kept
      3) name holds that ran out: released, and the redirect from the old address removed
      4) sites the owner blocked in the database (scripts/block-site.js): the block is copied into the lookup visitors use
      5) sites changed in the last three hours: the lookup is made to say what the database says (never backwards)
      6) sites offline because payment ended, once grace plus the 90 days of keeping files have passed: their files are deleted (the name and the row stay)
      7) folders in R2 whose site no longer exists in the database. Both deleting steps have brakes (see the plan, "Cleaning up lapsed sites' files"). */
  async function sweep() {
    const out = { orphans: 0, lapsed: 0, holds: 0, blocked: 0, repaired: 0, purged: 0, strays: 0 };
    let cursor;
    do {
      const l = await kv.list({ prefix: 'site:', cursor });
      for (const k of l.keys || []) {
        let rec = null;
        try { rec = JSON.parse(await kv.get(k.name)); } catch (e) { rec = null; }
        if (rec && rec.id && !(await db.siteById(rec.id))) { await deleteFiles(rec.id); await kv.delete(k.name); out.orphans++; }
        else if (rec && rec.redirect && !(await db.holdByName(k.name.slice(5)))) { await kv.delete(k.name); out.holds++; }
      }
      cursor = l.list_complete ? null : l.cursor;
    } while (cursor);
    for (let offset = 0; ; offset += 500) {
      const page = await db.liveSites(offset);
      for (const x of page) {
        const e = Array.isArray(x.site_entitlements) ? x.site_entitlements[0] : x.site_entitlements;
        if (e && entitlementState(e, now()) === 'ended') {
          await db.setStatus(x.id, 'unpublished');
          await kv.put(kvKey(x.name), JSON.stringify({ id: x.id, version: x.version, status: 'unpublished' }));
          out.lapsed++;
        }
      }
      if (page.length < 500) break;
    }
    for (const h of await db.expiredHolds(now())) {
      await db.deleteHold(h.name);
      try { const rec = JSON.parse(await kv.get(kvKey(h.name))); if (rec && rec.redirect) await kv.delete(kvKey(h.name)); } catch (e) { /* nothing stored under that name */ }
      out.holds++;
    }
    for (const x of await db.blockedSites()) {
      let rec = null;
      try { rec = JSON.parse(await kv.get(kvKey(x.name))); } catch (e) { rec = null; }
      if (!rec || rec.status !== 'blocked') { await kv.put(kvKey(x.name), JSON.stringify({ id: x.id, version: x.version, status: 'blocked' })); out.blocked++; }
    }
    // 5) sites changed in the last three hours: the lookup must say what the database says (a rename whose lookup update failed is finished here)
    const since = new Date(new Date(now()).getTime() - 3 * 3600 * 1000).toISOString();
    for (const x of await db.recentSites(since)) {
      const want = JSON.stringify({ id: x.id, version: x.version, status: x.status });
      if (x.status !== 'live' && x.status !== 'blocked' && x.status !== 'unpublished') continue;
      if (x.version < 1) continue; // never published: nothing to serve
      let have = null;
      try { have = JSON.parse(await kv.get(kvKey(x.name))); } catch (e) { have = null; }
      if (!have || have.id !== x.id || have.version < x.version) { await kv.put(kvKey(x.name), want); out.repaired++; } // never moves a lookup backwards: a publish or unpublish running at this moment wins
      for (const h of await db.holdsForSite(x.id)) {
        if (new Date(h.expires_at).getTime() <= new Date(now()).getTime() || !h.redirect_to) continue;
        let cur = null; try { cur = JSON.parse(await kv.get(kvKey(h.name))); } catch (e) { cur = null; }
        if (!cur || cur.redirect !== h.redirect_to) { await kv.put(kvKey(h.name), JSON.stringify({ redirect: h.redirect_to })); out.repaired++; }
      }
    }
    // 6) lapsed sites whose files have been kept long enough
    const keepUntilOffset = (LIMITS.graceDays + LIMITS.retentionDays) * 86400000;
    let purgedNow = 0;
    for (let offset = 0; purgedNow < LIMITS.maxPurgesPerRun; offset += 500) {
      const page = await db.offlineSitesWithFiles(offset);
      for (const x of page) {
        if (purgedNow >= LIMITS.maxPurgesPerRun) break;
        const e = Array.isArray(x.site_entitlements) ? x.site_entitlements[0] : x.site_entitlements;
        if (!e || entitlementState(e, now()) !== 'ended') continue; // taken offline by the owner, or still inside grace: the files stay
        if (new Date(now()).getTime() < new Date(e.paid_until).getTime() + keepUntilOffset) continue;
        try {
          await deleteFiles(x.id);
          await db.markPurged(x.id);
          await kv.put(kvKey(x.name), JSON.stringify({ id: x.id, version: 0, status: 'unpublished' }));
          purgedNow++; out.purged++;
        } catch (err) { out.failed = (out.failed || 0) + 1; purgedNow++; } // one site's trouble does not stop the rest; the next run tries it again
      }
      if (page.length < 500) break;
    }
    // 7) folders in R2 that belong to no site
    const ids = [];
    let r2cursor;
    do {
      const l = await bucket.list({ prefix: 'sites/', delimiter: '/', cursor: r2cursor, limit: 1000 });
      for (const p of l.delimitedPrefixes || []) { const id = p.split('/')[1]; if (id) ids.push(id); }
      r2cursor = l.truncated ? l.cursor : null;
    } while (r2cursor);
    const strays = [];
    for (const id of ids) { if (!(await db.siteById(id))) strays.push(id); }
    if (strays.length && strays.length <= LIMITS.maxPurgesPerRun && !(ids.length >= 8 && strays.length > ids.length / 2)) {
      for (const id of strays) { try { await deleteFiles(id); out.strays++; } catch (err) { out.failed = (out.failed || 0) + 1; } }
    } else if (strays.length) out.straysSkipped = strays.length; // too many to be a clean-up: probably a wrong answer from the database; left for a person to look at
    return out;
  }

  return { nameStatus, publish, unpublish, rename, mySites, sweep };
}

module.exports = { createPublisher, checkFiles, scanHtml, scanSvg, entitlementState, plainUrl, LIMITS, TYPES, key, kvKey };
