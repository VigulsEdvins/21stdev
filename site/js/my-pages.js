/* "My pages" on the account page: the signed-in person's saved pages, in the Supabase table public.projects
   (supabase/migrations/20261028180000_projects_and_delete_account.sql). Row level security lets only the owner see or change a row,
   and the browser cannot set the status (draft or paid) at all. The page talks to Supabase's REST address with the person's own token.
   Deleting a page only sets deleted_at: it stays for 30 days and can be brought back. Nothing here throws: every answer is { ok, ... }. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvMyPages = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const TABLE = '/rest/v1/projects';
  const NAME_MAX = 120;
  const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const UNREACHABLE = 'We could not reach your account just now. Please try again in a moment.';

  /** Only what the list shows, in the shapes it expects; anything odd in a row is dropped, never put into the page. */
  function cleanRow(r) {
    if (!r || typeof r !== 'object' || !ID_RE.test(String(r.id || ''))) return null;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, NAME_MAX) : '';
    const t = Date.parse(r.updated_at);
    return { id: r.id, name: name || 'Untitled page', status: r.status === 'paid' ? 'paid' : 'draft', updatedAt: Number.isFinite(t) ? new Date(t).toISOString() : '' };
  }

  function create(deps) {
    const base = String(deps.url || '').replace(/\/+$/, '');
    const f = deps.fetchImpl || ((...a) => fetch(...a));
    const now = deps.now || (() => new Date().toISOString());
    const head = (token, extra) => Object.assign({ 'Content-Type': 'application/json', apikey: deps.anonKey, Authorization: 'Bearer ' + token }, extra || {});

    async function run(fn) {
      try {
        const token = await deps.token();
        if (!token) return { ok: false, message: 'Please sign in again first.' };
        return await fn(token);
      } catch (_) { return { ok: false, message: UNREACHABLE }; }
    }
    const change = (id, body) => run(async (token) => {
      if (!ID_RE.test(String(id))) return { ok: false, message: 'That page could not be found.' };
      const r = await f(base + TABLE + '?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: head(token, { Prefer: 'return=minimal' }), body: JSON.stringify(body) });
      return r.ok ? { ok: true } : { ok: false, message: UNREACHABLE };
    });

    return {
      /** The pages that are not deleted, newest first. */
      list() {
        return run(async (token) => {
          const r = await f(base + TABLE + '?select=id,name,status,updated_at&deleted_at=is.null&order=updated_at.desc&limit=100', { headers: head(token) });
          if (!r.ok) return { ok: false, message: UNREACHABLE };
          const rows = await r.json();
          return { ok: true, pages: (Array.isArray(rows) ? rows : []).map(cleanRow).filter(Boolean) };
        });
      },
      rename(id, name) {
        const n = String(name || '').trim();
        if (!n) return Promise.resolve({ ok: false, message: 'Give the page a name.' });
        if (n.length > NAME_MAX) return Promise.resolve({ ok: false, message: 'Keep the name under ' + NAME_MAX + ' characters.' });
        return change(id, { name: n, updated_at: now() });
      },
      /** Moves a page out of the list; it can be brought back with restore() for 30 days. */
      remove(id) { return change(id, { deleted_at: now() }); },
      restore(id) { return change(id, { deleted_at: null }); }
    };
  }

  return { create, cleanRow, NAME_MAX };
});
