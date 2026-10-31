/* A customer's own domain for a published site (plan 2026-10-31-custom-domain.md): the hostname rules, the Cloudflare for SaaS client, and the account actions
   (add a domain, ask how it is going, remove it). Serving a site on that domain is in sites-serve.js.
   createSiteDomains({ db, kv, cf, now, domain, target }) returns { add, status, remove, decorate, sweep }. Same answer shape as publish.js: { status, json }.
   db: the table site_domains (domainBySite, domainByHostname, domainsBySites, insertDomain, updateDomain, deleteDomain, orphanDomains) and published_sites (siteById); see tests/lib/fake-sites.js.
   cf: { create(hostname), get(id), remove(id) } over Cloudflare's custom hostnames (createCloudflare below). Tests pass a pretend one.
   kv: the two lookups visitors use. `host:<hostname>` -> { name } says which site a customer's host name shows, and `sitehost:<site id>` -> '<hostname>' says the site now lives
       there, which makes its edvlabs address redirect (301). `sitehost:` is written last and removed first, so the visitor never meets a redirect to a host that does not answer yet.
   Cloudflare only turns a host name active once the customer's DNS really points at us and the certificate is issued, so nobody can attach a domain they do not control. */
const fail = (status, error, extra) => ({ status, json: Object.assign({ ok: false, errors: [error] }, extra || {}) });

const ADDS_PER_HOUR = 10;
const PENDING_HOLD_MS = 2 * 60 * 60 * 1000; // someone's unfinished set-up keeps its host name this long; after that the real owner of the domain may take it
/** One piece of a host name: 1 to 63 letters, digits and hyphens, not starting or ending with a hyphen (written without a nested pattern, so a hostile name cannot make it slow). */
const isLabel = (l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && l[0] !== '-' && l[l.length - 1] !== '-';

// Registries that put a second label under the country code. A name with one label in front of one of these is a bare domain (no CNAME is possible there).
const SECOND_LEVEL = new Set(['co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'org.nz', 'net.nz', 'co.za', 'org.za', 'co.jp', 'ne.jp', 'or.jp',
  'com.br', 'net.br', 'org.br', 'com.mx', 'com.ar', 'com.co', 'com.tr', 'com.cn', 'net.cn', 'org.cn', 'com.hk', 'com.sg', 'com.my', 'com.ph', 'co.in', 'net.in', 'org.in', 'co.il', 'co.kr', 'co.id', 'com.ua', 'com.pl', 'com.ru']);

const BARE = 'Use a name with something in front of the domain, like www.yourdomain.com. A bare domain cannot point at us; at your domain provider, send the bare domain to the www name.';

/** The host name in its stored form (lower case, punycode) or { error } in plain words. */
function checkHostname(input, ourDomain) {
  if (typeof input !== 'string') return { error: 'Type the address of your domain, for example www.yourdomain.com.' };
  let t = input.trim().toLowerCase().replace(/\.$/, '');
  if (!t || t.length > 253 + 8) return { error: 'Type the address of your domain, for example www.yourdomain.com.' };
  if (/^[a-z][a-z0-9+.-]*:\/\//.test(t) || /[\/\\?#@:\s*_]/.test(t)) return { error: 'Type only the host name, like www.yourdomain.com: no https://, no slash, no wildcard.' };
  let host;
  try { host = new URL('https://' + t).hostname; } catch (e) { return { error: 'That is not a valid domain address.' }; }
  host = host.replace(/\.$/, '');
  const labels = host.split('.');
  if (host.length > 253 || labels.some((l) => !isLabel(l)) || labels.length < 2 || /^[0-9]+$/.test(labels[labels.length - 1]) || !/^[a-z0-9-]{2,63}$/.test(labels[labels.length - 1])) return { error: 'That is not a valid domain address.' };
  const ours = String(ourDomain || 'edvlabs.com').toLowerCase();
  if (host === ours || host.endsWith('.' + ours)) return { error: 'Use your own domain here. Addresses ending in ' + ours + ' already work.' };
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.invalid')) return { error: 'That is not a public domain.' };
  if (labels.length === 2 || (labels.length === 3 && SECOND_LEVEL.has(labels.slice(1).join('.')))) return { error: BARE, bare: true };
  return { host };
}

/** What Cloudflare reports about a custom hostname, as one of 'active', 'pending' or 'failed' with a plain reason. */
function stateOf(h) {
  const ssl = (h && h.ssl) || {};
  if (!h) return { state: 'failed', why: 'Cloudflare does not know this domain any more. Remove it and add it again.' };
  if (h.status === 'blocked') return { state: 'failed', why: 'This domain cannot be used.' };
  if (h.status === 'deleted') return { state: 'failed', why: 'This domain was removed. Add it again.' };
  if (['validation_timed_out', 'issuance_timed_out', 'deleted'].includes(ssl.status)) return { state: 'failed', why: 'The domain was not confirmed in time. Remove it and add it again once the record is in place.' };
  if (h.status === 'active' && ssl.status === 'active') return { state: 'active' };
  return { state: 'pending' };
}

/** The Cloudflare for SaaS API for one zone. token is a secret scoped to this zone's SSL and certificates; nothing else is reachable with it. */
function createCloudflare({ token, zoneId, fetchImpl }) {
  const f = fetchImpl || fetch;
  const base = 'https://api.cloudflare.com/client/v4/zones/' + encodeURIComponent(zoneId) + '/custom_hostnames';
  async function call(method, path, body) {
    const r = await f(base + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let json = null; try { json = await r.json(); } catch (e) { json = null; }
    if (!r.ok || !json || json.success === false) {
      const err = json && json.errors && json.errors[0];
      throw Object.assign(new Error((err && err.message) || 'Cloudflare answered ' + r.status), { status: r.status, cfCode: err && err.code });
    }
    return json.result;
  }
  const view = (h) => ({ id: h.id, hostname: h.hostname, status: h.status, ssl: h.ssl ? { status: h.ssl.status } : undefined, errors: h.verification_errors || [], ownership: h.ownership_verification && h.ownership_verification.type === 'txt' ? { name: h.ownership_verification.name, value: h.ownership_verification.value } : null });
  return {
    async create(hostname) { return view(await call('POST', '', { hostname, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2', http2: 'on' } } })); },
    async get(id) { try { return view(await call('GET', '/' + encodeURIComponent(id))); } catch (e) { if (e.status === 404) return null; throw e; } },
    async remove(id) { try { await call('DELETE', '/' + encodeURIComponent(id)); } catch (e) { if (e.status !== 404) throw e; } }
  };
}

function createSiteDomains({ db, kv, cf, now, domain, target }) {
  const ours = domain || 'edvlabs.com';
  const fallback = target || 'sites.' + ours;
  const nowMs = () => new Date(now()).getTime();

  async function rateLimited(userId) {
    const k = 'domainadd:' + userId + ':' + String(now()).slice(0, 13); // one counter per clock hour
    const n = Number(await kv.get(k)) || 0;
    if (n >= ADDS_PER_HOUR) return true;
    await kv.put(k, String(n + 1), { expirationTtl: 3700 });
    return false;
  }

  /** What the account page shows for a row: the state, the record to add, and the problem if any. Never Cloudflare's ids. */
  function view(row) {
    const help = row.dns_help || {};
    return { hostname: row.hostname, status: row.status, records: [{ type: 'CNAME', name: row.hostname, value: fallback }],
      optionalRecords: help.ownership ? [{ type: 'TXT', name: help.ownership.name, value: help.ownership.value }] : [], error: row.last_error || '' };
  }

  async function lookupsOn(row) { // the visitors' side: the host name shows the site; then the edvlabs address redirects there
    const site = await db.siteById(row.site_id);
    if (!site) return;
    await kv.put('host:' + row.hostname, JSON.stringify({ name: site.name }));
    await kv.put('sitehost:' + row.site_id, row.hostname);
  }
  async function lookupsOff(row) {
    if (row.site_id) await kv.delete('sitehost:' + row.site_id);
    await kv.delete('host:' + row.hostname);
  }

  /** Asks Cloudflare how the row is doing and makes the visitors' lookups match. Returns the row as it is afterwards. */
  async function sync(row) {
    let h;
    try { h = await cf.get(row.cf_hostname_id); } catch (e) { return row; } // Cloudflare did not answer just now: keep things as they are
    const s = stateOf(h);
    const patch = { updated_at: now() };
    if (s.state === 'active') {
      if (row.status !== 'active') { await lookupsOn(row); patch.status = 'active'; patch.activated_at = now(); patch.last_error = null; }
    } else {
      if (row.status === 'active') await lookupsOff(row); // the customer's DNS stopped pointing at us: the edvlabs address serves the site again instead of redirecting to a dead end
      patch.status = s.state === 'failed' ? 'failed' : 'pending';
      patch.last_error = s.state === 'failed' ? s.why : (h && h.errors && h.errors[0] ? String(h.errors[0]).slice(0, 300) : null);
      if (h && h.ownership) patch.dns_help = Object.assign({}, row.dns_help, { ownership: h.ownership });
    }
    const changed = Object.keys(patch).some((k) => k !== 'updated_at' && JSON.stringify(patch[k]) !== JSON.stringify(row[k]));
    if (!changed) return row;
    await db.updateDomain(row.id, patch);
    return Object.assign({}, row, patch);
  }

  async function ownSite(userId, siteId) {
    const site = await db.siteById(siteId);
    return site && site.user_id === userId ? site : null;
  }

  /** Attach a domain to a live site. The site stays on its edvlabs address until Cloudflare confirms the domain. */
  async function add({ userId, siteId, hostname }) {
    const site = await ownSite(userId, siteId);
    if (!site) return fail(404, 'That site was not found.');
    if (site.status === 'blocked') return fail(403, 'This site has been blocked. Please contact edvlabs.', { reason: 'blocked' });
    if (site.status !== 'live') return fail(409, 'Put the website online first, then add your domain.', { reason: 'offline' });
    const c = checkHostname(hostname, ours);
    if (c.error) return fail(400, c.error, { reason: c.bare ? 'bare' : 'invalid' });
    if (await db.domainBySite(siteId)) return fail(409, 'This website already has a domain. Remove it first to use another.', { reason: 'has-domain' });
    if (await rateLimited(userId)) return fail(429, 'Too many tries this hour. Please try again later.', { reason: 'rate' });

    const taken = await db.domainByHostname(c.host);
    if (taken) {
      const stale = taken.status !== 'active' && (taken.user_id === userId || nowMs() - new Date(taken.updated_at || taken.created_at).getTime() > PENDING_HOLD_MS);
      if (!stale) return fail(409, 'This domain is already used by another website.', { reason: 'taken' });
      await release(taken); // an unfinished set-up that nobody completed
    }
    let row;
    try { row = await db.insertDomain({ site_id: siteId, user_id: userId, hostname: c.host, status: 'pending', dns_help: {} }); } catch (e) {
      if (e.code === 'host-taken' || e.code === 'site-has-domain') return fail(409, e.code === 'host-taken' ? 'This domain is already used by another website.' : 'This website already has a domain. Remove it first to use another.', { reason: 'taken' });
      throw e;
    }
    let h;
    try { h = await cf.create(c.host); } catch (e) {
      await db.deleteDomain(row.id);
      if (e.cfCode === 1406 || e.status === 409) return fail(409, 'This domain is already set up somewhere else. Try again in a few hours, or write to edvlabs.', { reason: 'taken' });
      if (e.status === 403 && e.cfCode === 1405) return fail(503, 'Domains cannot be added right now.', { reason: 'quota' });
      throw e;
    }
    row = Object.assign({}, row, { cf_hostname_id: h.id, dns_help: h.ownership ? { ownership: h.ownership } : {} });
    await db.updateDomain(row.id, { cf_hostname_id: row.cf_hostname_id, dns_help: row.dns_help, updated_at: now() });
    return { status: 200, json: Object.assign({ ok: true }, view(row)) };
  }

  /** The state of a site's domain (checks with Cloudflare while it is not yet confirmed, and when confirmed, to catch a record that was taken away). */
  async function status({ userId, siteId }) {
    const site = await ownSite(userId, siteId);
    if (!site) return fail(404, 'That site was not found.');
    let row = await db.domainBySite(siteId);
    if (!row) return { status: 200, json: { ok: true, hostname: null } };
    if (row.cf_hostname_id) row = await sync(row);
    return { status: 200, json: Object.assign({ ok: true }, view(row)) };
  }

  /** Takes a domain away: the visitors' lookups first, then Cloudflare, then the row. If Cloudflare does not answer the row stays, so the clean-up or a retry finishes it. */
  async function release(row) {
    await lookupsOff(row);
    if (row.cf_hostname_id) await cf.remove(row.cf_hostname_id);
    await db.deleteDomain(row.id);
  }

  async function remove({ userId, siteId }) {
    const site = await ownSite(userId, siteId);
    if (!site) return fail(404, 'That site was not found.');
    const row = await db.domainBySite(siteId);
    if (!row) return { status: 200, json: { ok: true, hostname: null } };
    await release(row);
    return { status: 200, json: { ok: true, hostname: null } };
  }

  /** For my-sites: the domain of each site, if any. Reads only our table; the account page asks status() for the live state. */
  async function decorate(siteIds) {
    const out = {};
    for (const row of await db.domainsBySites(siteIds)) out[row.site_id] = { hostname: row.hostname, status: row.status };
    return out;
  }

  /** The hourly clean-up: domains whose site or account was deleted (the row kept its host name, see the migration) are removed at Cloudflare and here. */
  async function sweep() {
    const out = { removed: 0, failed: 0 };
    for (const row of await db.orphanDomains()) {
      try { await release(row); out.removed++; } catch (e) { out.failed++; }
    }
    return out;
  }

  return { add, status, remove, decorate, sweep };
}

module.exports = { createSiteDomains, createCloudflare, checkHostname, stateOf, ADDS_PER_HOUR };
