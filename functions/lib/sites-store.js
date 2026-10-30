/* The real storage behind functions/lib/publish.js: the three Supabase tables over REST with the service key (server only), and the sign-in check.
   R2 and KV need no adapter: Cloudflare gives them to the Worker as env.SITES_BUCKET and env.SITES, with the methods publish.js already uses.
   Settings (never in git): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (secret). */

const enc = encodeURIComponent;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who is behind this token? Asks Supabase itself, so a forged or expired token is simply refused. Returns { id, email } or null. */
async function verifyUser(env, token, fetchImpl) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || /\s/.test(token)) return null;
  const f = fetchImpl || fetch;
  const r = await f(env.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/user', { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && typeof u.id === 'string' && UUID.test(u.id) ? { id: u.id, email: u.email || '' } : null;
}

function createDb(env, fetchImpl) {
  const f = fetchImpl || fetch;
  const base = env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/';
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };

  async function rest(method, path, body, prefer) {
    const r = await f(base + path, { method, headers: prefer ? Object.assign({ Prefer: prefer }, headers) : headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
    if (!r.ok) throw Object.assign(new Error((json && json.message) || 'database error ' + r.status), { status: r.status, code: json && json.code });
    return json;
  }
  const first = async (path) => { const rows = await rest('GET', path); return Array.isArray(rows) && rows.length ? rows[0] : null; };
  const all = async (path) => { const rows = await rest('GET', path); return Array.isArray(rows) ? rows : []; };

  return {
    siteByName: (name) => first('published_sites?select=*&limit=1&name=eq.' + enc(name)),
    siteById: (id) => (UUID.test(String(id)) ? first('published_sites?select=*&limit=1&id=eq.' + enc(id)) : Promise.resolve(null)),
    sitesByUser: (userId) => all('published_sites?select=*&order=created_at.desc&user_id=eq.' + enc(userId)),
    holdByName: (name) => first('site_name_holds?select=*&limit=1&name=eq.' + enc(name)),
    expiredHolds: (nowIso) => all('site_name_holds?select=*&limit=500&expires_at=lt.' + enc(nowIso)),
    deleteHold: (name) => rest('DELETE', 'site_name_holds?name=eq.' + enc(name)),
    entitlementForSite: (siteId) => first('site_entitlements?select=*&limit=1&site_id=eq.' + enc(siteId)),
    entitlementsByUser: (userId) => all('site_entitlements?select=*&user_id=eq.' + enc(userId)),
    insertEntitlement: async (row) => (await rest('POST', 'site_entitlements', row, 'return=representation'))[0],
    freeEntitlements: (userId) => all('site_entitlements?select=*&status=eq.active&site_id=is.null&order=paid_until.desc&user_id=eq.' + enc(userId)),
    async insertSite(row) {
      try {
        const rows = await rest('POST', 'published_sites', row, 'return=representation');
        return rows[0];
      } catch (e) {
        if (e.code === '23505') throw Object.assign(e, { code: 'name-taken' });
        if (e.code === 'P0001' && /too many sites/.test(e.message)) throw Object.assign(e, { code: 'too-many' });
        throw e;
      }
    },
    deleteSite: (id) => rest('DELETE', 'published_sites?id=eq.' + enc(id)),
    async claimEntitlement(entId, siteId) { // only succeeds while the place is still free, so two publishes cannot use one place
      const rows = await rest('PATCH', 'site_entitlements?site_id=is.null&id=eq.' + enc(entId), { site_id: siteId }, 'return=representation');
      return Array.isArray(rows) && rows.length === 1;
    },
    releaseEntitlement: (siteId) => rest('PATCH', 'site_entitlements?site_id=eq.' + enc(siteId), { site_id: null }),
    reserveVersion: (id) => rest('POST', 'rpc/reserve_site_version', { p_site: id }),
    goLive: (id, version, extra) => rest('POST', 'rpc/go_live_site', { p_site: id, p_version: version, p_project: (extra && extra.project_id) || null }),
    setStatus: (id, status) => rest('PATCH', 'published_sites?id=eq.' + enc(id), { status, updated_at: new Date().toISOString() }),
    /* The whole rename in one database action (supabase/migrations/20261030210000_rename_site.sql); the error codes are named for publish.js. */
    async renameSite({ siteId, userId, newName, holdDays, maxRenames }) {
      try {
        return await rest('POST', 'rpc/rename_site', { p_site: siteId, p_user: userId, p_new: newName, p_hold_days: holdDays || 90, p_max_renames: maxRenames === undefined ? 2 : maxRenames });
      } catch (e) {
        const m = /rename:([a-z-]+)/.exec(e.message || '');
        if (m) throw Object.assign(e, { code: 'rename-' + m[1] });
        if (e.code === '23505') throw Object.assign(e, { code: 'rename-taken' });
        throw e;
      }
    },
    accountLimits: (userId) => first('account_limits?select=*&limit=1&user_id=eq.' + enc(userId)),
    /* An upgrade for one person: only the numbers given are changed, the rest stay as they were (an empty column means the default for everyone). */
    async setAccountLimits(userId, patch) { return (await rest('POST', 'account_limits?on_conflict=user_id', Object.assign({ user_id: userId, updated_at: new Date().toISOString() }, patch), 'resolution=merge-duplicates,return=representation'))[0]; },
    clearAccountLimits: (userId) => rest('DELETE', 'account_limits?user_id=eq.' + enc(userId)),
    holdsForSite: (siteId) => all('site_name_holds?select=name,redirect_to,expires_at&site_id=eq.' + enc(siteId)),
    recentSites: (sinceIso) => all('published_sites?select=id,name,version,status&limit=500&updated_at=gte.' + enc(sinceIso)),
    /* sites that are offline but still have files: the candidates for the cleanup of lapsed sites (blocked ones are never listed) */
    offlineSitesWithFiles: (offset) => all('published_sites?select=id,name,version,status,site_entitlements(status,paid_until)&status=eq.unpublished&version=gt.0&order=created_at.asc&limit=500&offset=' + Number(offset || 0)),
    markPurged: (id) => rest('PATCH', 'published_sites?id=eq.' + enc(id), { version: 0, updated_at: new Date().toISOString() }),
    blockedSites: () => all('published_sites?select=id,name,version&status=eq.blocked&limit=500'),
    liveSites: (offset) => all('published_sites?select=id,name,version,status,site_entitlements(status,paid_until)&status=eq.live&order=created_at.asc&limit=500&offset=' + Number(offset || 0))
  };
}

module.exports = { verifyUser, createDb, UUID };
