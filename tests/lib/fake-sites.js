/* Pretend storage for the publishing code (functions/lib/publish.js): the three Supabase tables, R2 and KV, all in memory.
   This file also documents the interface the real adapters must offer:
   db: siteByName, siteById, holdByName, entitlementForSite, freeEntitlements, insertSite (throws code 'name-taken' / 'too-many'), deleteSite,
       claimEntitlement (true only if the place was still free), releaseEntitlement, reserveVersion (atomic +1 of last_version), goLive, setStatus. */
function create() {
  const sites = [], holds = [], ents = [], objects = new Map(), kvStore = new Map(), log = [];
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
      const s = Object.assign({ id: 'site-' + (++n), version: 0, last_version: 0, status: 'unpublished', project_id: null }, row); sites.push(s); return s;
    },
    async deleteSite(id) { const i = sites.findIndex((s) => s.id === id); if (i >= 0) sites.splice(i, 1); },
    async claimEntitlement(entId, siteId) { const e = ents.find((x) => x.id === entId); if (!e || e.site_id) return false; e.site_id = siteId; return true; },
    async releaseEntitlement(siteId) { const e = ents.find((x) => x.site_id === siteId); if (e) e.site_id = null; },
    async reserveVersion(id) { const s = sites.find((x) => x.id === id); s.last_version += 1; return s.last_version; },
    async goLive(id, version, extra) { const s = sites.find((x) => x.id === id); if (version > s.version) s.version = version; s.status = 'live'; Object.assign(s, extra || {}); },
    async setStatus(id, status) { sites.find((x) => x.id === id).status = status; }
  };
  const bucket = {
    failOn: null,
    async put(k, bytes, opts) { if (this.failOn && k.includes(this.failOn)) throw new Error('disk full'); objects.set(k, { bytes, type: opts && opts.httpMetadata && opts.httpMetadata.contentType }); log.push('put ' + k); },
    async get(k) { const o = objects.get(k); return o ? { body: o.bytes, httpMetadata: { contentType: o.type }, httpEtag: '"' + k.length + '-' + o.bytes.length + '"' } : null; },
    async delete(k) { objects.delete(k); log.push('delete ' + k); },
    async list({ prefix }) { return { objects: [...objects.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
  };
  const kv = { async get(k) { return kvStore.has(k) ? kvStore.get(k) : null; }, async put(k, v) { kvStore.set(k, v); } };
  return { db, bucket, kv, sites, holds, ents, objects, kvStore, log,
    addEntitlement(userId, paidUntil, over) { const e = Object.assign({ id: 'ent-' + (ents.length + 1), user_id: userId, site_id: null, status: 'active', paid_until: paidUntil, granted_by: 'owner' }, over || {}); ents.push(e); return e; } };
}
module.exports = { create };
