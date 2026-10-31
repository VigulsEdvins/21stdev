/* Pretend storage for the publishing code (functions/lib/publish.js): the three Supabase tables, R2 and KV, all in memory.
   This file also documents the interface the real adapters must offer:
   db: siteByName, siteById, holdByName, entitlementForSite, freeEntitlements, insertSite (throws code 'name-taken' / 'too-many'), deleteSite,
       claimEntitlement (true only if the place was still free), releaseEntitlement, reserveVersion (atomic +1 of last_version), goLive, setStatus. */
function create() {
  const sites = [], holds = [], ents = [], objects = new Map(), kvStore = new Map(), log = [];
  const limitRows = new Map(), admins = [], domains = [];
  let hostCounter = 1;
  let n = 0;
  const db = {
    async siteByName(name) { return sites.find((s) => s.name === name) || null; },
    async siteById(id) { return sites.find((s) => s.id === id) || null; },
    async holdByName(name) { return holds.find((h) => h.name === name) || null; },
    async entitlementForSite(id) { return ents.find((e) => e.site_id === id) || null; },
    async freeEntitlements(userId) { return ents.filter((e) => e.user_id === userId && !e.site_id); },
    async insertSite(row) {
      if (sites.some((s) => s.name === row.name)) throw Object.assign(new Error('dup'), { code: 'name-taken' });
      if (sites.filter((s) => s.user_id === row.user_id).length >= 10) throw Object.assign(new Error('cap'), { code: 'too-many' });
      const s = Object.assign({ id: '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'), version: 0, last_version: 0, status: 'unpublished', project_id: null }, row); sites.push(s); return s;
    },
    async deleteSite(id) { const i = sites.findIndex((s) => s.id === id); if (i >= 0) sites.splice(i, 1); },
    async claimEntitlement(entId, siteId) { const e = ents.find((x) => x.id === entId); if (!e || e.site_id) return false; e.site_id = siteId; return true; },
    async releaseEntitlement(siteId) { const e = ents.find((x) => x.site_id === siteId); if (e) e.site_id = null; },
    async reserveVersion(id) { const s = sites.find((x) => x.id === id); s.last_version += 1; return s.last_version; },
    async goLive(id, version, extra) { const s = sites.find((x) => x.id === id); if (version > s.version) s.version = version; s.status = 'live'; Object.assign(s, extra || {}); },
    async sitesByUser(userId) { return sites.filter((s) => s.user_id === userId); },
    async entitlementsByUser(userId) { return ents.filter((e) => e.user_id === userId); },
    async expiredHolds(nowIso) { return holds.filter((h) => new Date(h.expires_at) < new Date(nowIso)); },
    async deleteHold(name) { const i = holds.findIndex((h) => h.name === name); if (i >= 0) holds.splice(i, 1); },
    async offlineSitesWithFiles() { return sites.filter((s) => s.status === 'unpublished' && s.version > 0).map((s) => ({ id: s.id, name: s.name, version: s.version, status: s.status, site_entitlements: ents.find((e) => e.site_id === s.id) || null })); },
    async markPurged(id) { sites.find((x) => x.id === id).version = 0; },
    async blockedSites() { return sites.filter((s) => s.status === 'blocked').map((s) => ({ id: s.id, name: s.name, version: s.version })); },
    async liveSites() { return sites.filter((s) => s.status === 'live').map((s) => ({ id: s.id, name: s.name, version: s.version, status: s.status, site_entitlements: ents.find((e) => e.site_id === s.id) || null })); },
    /* mirrors supabase/migrations/20261030210000_rename_site.sql, including its error codes */
    async renameSite({ siteId, userId, newName, holdDays, maxRenames, nowIso }) {
      const fail = (c) => { throw Object.assign(new Error('rename:' + c), { code: 'rename-' + c }); };
      const s = sites.find((x) => x.id === siteId && x.user_id === userId); if (!s) fail('not-found');
      if (s.status === 'blocked') fail('blocked'); if (s.name === newName) fail('same');
      const now = new Date(nowIso || Date.now());
      s.renamed_at = s.renamed_at || [];
      if (s.renamed_at.filter((t) => new Date(t) > new Date(now.getTime() - 30 * 86400000)).length >= (maxRenames === undefined ? 2 : maxRenames)) fail('too-many');
      if (holds.some((h) => h.name === newName && h.user_id !== userId && new Date(h.expires_at) > now)) fail('taken');
      if (sites.some((x) => x.name === newName)) fail('taken');
      const i = holds.findIndex((h) => h.name === newName); if (i >= 0) holds.splice(i, 1);
      const old = s.name; s.name = newName; s.renamed_at = s.renamed_at.concat(now.toISOString()).slice(-4);
      const exp = new Date(now.getTime() + (holdDays || 90) * 86400000).toISOString();
      const j = holds.findIndex((h) => h.name === old); const row = { name: old, user_id: userId, site_id: siteId, redirect_to: newName, expires_at: exp };
      if (j >= 0) holds[j] = row; else holds.push(row);
      holds.filter((h) => h.site_id === siteId && h.name !== old).forEach((h) => { h.redirect_to = newName; });
      return { old, new: newName, version: s.version, status: s.status, held: holds.filter((h) => h.site_id === siteId && new Date(h.expires_at) > now).map((h) => h.name) };
    },
    async adminBySite(siteId) { return admins.find((a) => a.site_id === siteId) || null; },
    async adminsBySites(ids) { return admins.filter((a) => ids.includes(a.site_id)); },
    async upsertAdmin(row) {
      if (admins.some((a) => a.path_digits === row.path_digits && a.site_id !== row.site_id)) throw Object.assign(new Error('dup'), { code: 'digits-taken' });
      const i = admins.findIndex((a) => a.site_id === row.site_id); const merged = Object.assign({ last_login_at: null }, i >= 0 ? admins[i] : {}, row);
      if (i >= 0) admins[i] = merged; else admins.push(merged); return merged;
    },
    async deleteAdmin(siteId) { const i = admins.findIndex((a) => a.site_id === siteId); if (i >= 0) admins.splice(i, 1); },
    async touchAdminLogin(siteId, iso) { const a = admins.find((x) => x.site_id === siteId); if (a) a.last_login_at = iso; },
    /* mirrors supabase/migrations/20261031120000_site_domains.sql: one row per site, one per host name, rows outlive their site with site_id empty */
    async domainBySite(siteId) { return domains.find((d) => d.site_id === siteId) || null; },
    async domainByHostname(h) { return domains.find((d) => d.hostname === h) || null; },
    async domainsBySites(ids) { return domains.filter((d) => ids.includes(d.site_id)); },
    async insertDomain(row) {
      if (domains.some((d) => d.hostname === row.hostname)) throw Object.assign(new Error('dup'), { code: 'host-taken' });
      if (domains.some((d) => d.site_id && d.site_id === row.site_id)) throw Object.assign(new Error('dup'), { code: 'site-has-domain' });
      const d = Object.assign({ id: 'dom-' + (domains.length + 1) + '-' + hostCounter++, cf_hostname_id: null, dns_help: {}, last_error: null, created_at: '2026-11-01T10:00:00.000Z', updated_at: '2026-11-01T10:00:00.000Z' }, row); domains.push(d); return d;
    },
    async updateDomain(id, patch) { Object.assign(domains.find((d) => d.id === id), patch); },
    async deleteDomain(id) { const i = domains.findIndex((d) => d.id === id); if (i >= 0) domains.splice(i, 1); },
    async orphanDomains() { return domains.filter((d) => !d.site_id); },
    async accountLimits(userId) { return limitRows.get(userId) || null; },
    async holdsForSite(siteId) { return holds.filter((h) => h.site_id === siteId); },
    async recentSites() { return sites.map((s) => ({ id: s.id, name: s.name, version: s.version, status: s.status })); },
    async setStatus(id, status) { sites.find((x) => x.id === id).status = status; }
  };
  const bucket = {
    failOn: null,
    async put(k, bytes, opts) { if (this.failOn && k.includes(this.failOn)) throw new Error('disk full'); objects.set(k, { bytes, type: opts && opts.httpMetadata && opts.httpMetadata.contentType }); log.push('put ' + k); },
    async get(k) { const o = objects.get(k); return o ? { body: o.bytes, httpMetadata: { contentType: o.type }, httpEtag: '"' + k.length + '-' + o.bytes.length + '"' } : null; },
    async delete(k) { objects.delete(k); log.push('delete ' + k); },
    /* like R2: with a delimiter, the folders under the prefix come back as delimitedPrefixes instead of objects */
    async list({ prefix, delimiter }) {
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix));
      if (!delimiter) return { objects: keys.map((key) => ({ key })), truncated: false };
      const folders = new Set(), direct = [];
      for (const k of keys) { const rest = k.slice(prefix.length), i = rest.indexOf(delimiter); if (i >= 0) folders.add(prefix + rest.slice(0, i + 1)); else direct.push({ key: k }); }
      return { objects: direct, delimitedPrefixes: [...folders], truncated: false };
    }
  };
  const kv = { async get(k) { return kvStore.has(k) ? kvStore.get(k) : null; }, async put(k, v) { kvStore.set(k, v); }, async delete(k) { kvStore.delete(k); },
    async list({ prefix }) { return { keys: [...kvStore.keys()].filter((k) => k.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }; } };
  return { db, bucket, kv, admins, domains, sites, holds, ents, objects, kvStore, log, limitRows,
    addEntitlement(userId, paidUntil, over) { const e = Object.assign({ id: 'ent-' + (ents.length + 1), user_id: userId, site_id: null, status: 'active', paid_until: paidUntil, granted_by: 'owner' }, over || {}); ents.push(e); return e; } };
}
module.exports = { create };
