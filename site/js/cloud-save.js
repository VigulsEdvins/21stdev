/* Saves the builder's page into the signed-in person's account (the Supabase table public.projects, supabase/migrations/2026102818* and 2026102820*).
   The browser's own copy stays the first and offline copy; this is the second copy, so the same page opens on another computer.
   One page of the builder is linked to one row (kept in the browser under edvlabs.cloud_project). Every save carries the revision it started from:
   "change revision 4 into 5". If another device saved in between, nothing is overwritten and the answer is 'conflict', so the builder can ask.
   It talks to Supabase's REST address with the person's own token. Nothing throws: every answer is { ok, action, ... }.
   action: 'created' | 'saved' | 'same' | 'conflict' | 'gone' | 'limit' | 'too-big' | 'offline' | 'signed-out' */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvCloudSave = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const TABLE = '/rest/v1/projects';
  const LINK_KEY = 'edvlabs.cloud_project';
  const MAX_BYTES = 1400000; // the table refuses more than 1.5 MB of page; stay clear of it
  const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** The page as text with its keys in a fixed order: the builder writes the same page with its keys in a different order after a reload. */
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));

  /** A short fingerprint of a page, to tell "nothing changed" without keeping the page twice. */
  function hash(state) { const text = canon(state) || ''; let h = 5381; for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + text.length; }

  function create(deps) {
    const base = String(deps.url || '').replace(/\/+$/, '');
    const f = deps.fetchImpl || ((...a) => fetch(...a));
    const store = deps.storage;
    const now = deps.now || (() => new Date().toISOString());
    const head = (token, extra) => Object.assign({ 'Content-Type': 'application/json', apikey: deps.anonKey, Authorization: 'Bearer ' + token }, extra || {});
    const sel = (qs) => base + TABLE + '?' + qs;

    function link(userId) {
      try { const l = JSON.parse(store.getItem(LINK_KEY)); return l && ID_RE.test(l.id) && l.userId === userId && Number.isInteger(l.revision) ? l : null; } catch (_) { return null; }
    }
    function setLink(l) { try { store.setItem(LINK_KEY, JSON.stringify(l)); } catch (_) { /* private window: the link lasts until the page closes only when storage works; the next start finds the page by name */ } }
    function unlink() { try { store.removeItem(LINK_KEY); } catch (_) { /* nothing to remove */ } }

    async function run(fn) {
      let token;
      try { token = await deps.token(); } catch (_) { token = null; }
      if (!token) return { ok: false, action: 'signed-out', message: 'Please sign in again to save to your account.' };
      try { return await fn(token); } catch (_) { return { ok: false, action: 'offline', message: 'We could not reach your account. Your page is still kept in this browser.' }; }
    }
    const refused = (r, text) => {
      if (/too many saved pages/i.test(text || '')) return { ok: false, action: 'limit', message: 'You have 25 saved pages, the most an account can hold. Delete one you no longer need on the account page.' };
      return { ok: false, action: 'offline', message: 'We could not save to your account just now. Your page is still kept in this browser.' };
    };

    /**
     * Saves `state` (the builder's serialized page). With no link yet a new account page is made (named `name`); with one, the saved revision is
     * changed into the next. opts: { userId, name, force }. force keeps this version over a newer one from elsewhere (after the person chose it).
     */
    function push(state, opts) {
      return run(async (token) => {
        const text = JSON.stringify(state);
        if (text.length > MAX_BYTES) return { ok: false, action: 'too-big', message: 'This page is too large to save to your account. It is still kept in this browser; download a copy to be safe.' };
        const fingerprint = hash(state);
        const l = link(opts.userId);
        if (!l) {
          const name = String(opts.name || '').trim().slice(0, 120) || 'My page';
          const r = await f(sel('select=id,revision'), { method: 'POST', headers: head(token, { Prefer: 'return=representation' }), body: JSON.stringify({ name, state }) });
          if (!r.ok) return refused(r, await r.text().catch(() => ''));
          const rows = await r.json(); const row = Array.isArray(rows) ? rows[0] : rows;
          if (!row || !ID_RE.test(row.id)) return { ok: false, action: 'offline', message: 'We could not save to your account just now.' };
          setLink({ id: row.id, revision: row.revision, hash: fingerprint, userId: opts.userId });
          return { ok: true, action: 'created', id: row.id };
        }
        if (l.hash === fingerprint && !opts.force) return { ok: true, action: 'same', id: l.id };
        const patch = (revision) => f(sel('id=eq.' + l.id + '&revision=eq.' + revision + '&deleted_at=is.null&select=id,revision'), { method: 'PATCH', headers: head(token, { Prefer: 'return=representation' }), body: JSON.stringify({ state, revision: revision + 1, updated_at: now() }) });
        let revision = l.revision;
        if (opts.force) { // the person chose this version: start from whatever revision the account holds now
          const cur = await f(sel('id=eq.' + l.id + '&deleted_at=is.null&select=revision'), { headers: head(token) });
          const rows = cur.ok ? await cur.json() : [];
          if (!rows.length) { unlink(); return { ok: false, action: 'gone', message: 'That page was deleted from your account.' }; }
          revision = rows[0].revision;
        }
        const r = await patch(revision);
        if (!r.ok) return refused(r, await r.text().catch(() => ''));
        const rows = await r.json();
        if (rows.length) { setLink({ id: l.id, revision: rows[0].revision, hash: fingerprint, userId: opts.userId }); return { ok: true, action: 'saved', id: l.id }; }
        // nothing matched: the page was changed on another device, or deleted
        const cur = await f(sel('id=eq.' + l.id + '&select=revision,deleted_at'), { headers: head(token) });
        const now_ = cur.ok ? await cur.json() : [];
        if (!now_.length || now_[0].deleted_at) { unlink(); return { ok: false, action: 'gone', message: 'That page was deleted from your account.' }; }
        return { ok: false, action: 'conflict', id: l.id, message: 'This page was changed on another device.' };
      });
    }

    /** One page of the account, with its content. */
    function open(id, userId) {
      return run(async (token) => {
        if (!ID_RE.test(String(id))) return { ok: false, action: 'gone', message: 'That page could not be found.' };
        const r = await f(sel('id=eq.' + id + '&deleted_at=is.null&select=id,name,state,revision,updated_at'), { headers: head(token) });
        if (!r.ok) return { ok: false, action: 'offline', message: 'We could not reach your account just now.' };
        const rows = await r.json();
        const row = rows && rows[0];
        if (!row || !row.state || typeof row.state !== 'object') return { ok: false, action: 'gone', message: 'That page could not be found. It may have been deleted.' };
        return { ok: true, action: 'opened', project: { id: row.id, name: row.name, state: row.state, revision: row.revision } };
      });
    }
    /** Makes an opened account page the one this browser keeps saving to. `state` is the builder's own page after it was put in place (the builder may have tidied it). */
    function adopt(project, userId, state) { setLink({ id: project.id, revision: project.revision, hash: hash(state || project.state), userId }); }

    return { push, open, adopt, link, unlink, hash };
  }

  return { create, hash, LINK_KEY, MAX_BYTES };
});
