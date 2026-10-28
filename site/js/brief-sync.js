/* Keeps the answers from the questions (the brief, key edvlabs.brief_v1) in the signed-in person's account, so the builder can offer them on any device.
   One row per person in the Supabase table public.briefs (supabase/migrations/20261028150000_briefs.sql); row level security lets only the owner touch it.
   The page talks to Supabase's REST address with the person's own token (auth.js accessToken), never with the public key alone.
   sync() decides in one place: this browser has answers -> they are saved to the account (newest wins); it has none -> the account's answers are restored here.
   opts.pullOnly (the builder uses it) never writes to the account, so an older device cannot overwrite newer answers just by opening the builder.
   It never throws: every answer is { ok, action, message? } with action 'saved' | 'restored' | 'same' | 'none'. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./brief.js') : root.EdvBrief);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvBriefSync = api;
})(typeof self !== 'undefined' ? self : this, function (Brief) {
  const KEY = 'edvlabs.brief_v1';
  const TABLE = '/rest/v1/briefs';

  const stable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));
  /** What is stored in the account: the answers and the chosen way, not the state of a lead that was or was not sent from this browser. */
  function forAccount(b) { const c = Object.assign({}, b); delete c.pending; delete c.sent; return c; }
  const answered = (b) => !!b && Object.keys(b.answers || {}).length > 0;

  function create(deps) {
    const base = String(deps.url || '').replace(/\/+$/, '');
    const f = deps.fetchImpl || ((...a) => fetch(...a));
    const store = deps.storage;
    const now = deps.now || (() => new Date().toISOString());
    const readLocal = () => { try { const b = JSON.parse(store.getItem(KEY)); return b && !Brief.check(b).length ? b : null; } catch (_) { return null; } };
    const writeLocal = (b) => { try { store.setItem(KEY, JSON.stringify(b)); return true; } catch (_) { return false; } };
    const fail = (message) => ({ ok: false, action: 'none', message });
    const head = (token, extra) => Object.assign({ 'Content-Type': 'application/json', apikey: deps.anonKey, Authorization: 'Bearer ' + token }, extra || {});

    async function remote(token) {
      const r = await f(base + TABLE + '?select=brief&limit=1', { headers: head(token) });
      if (!r.ok) throw new Error('read ' + r.status);
      const rows = await r.json();
      const b = rows && rows[0] && rows[0].brief;
      return b && !Brief.check(b).length ? b : null; // an account row that no longer passes the checker is ignored, never put into the page
    }

    /** opts.userId: the signed-in person's id (auth.current().id). opts.pullOnly: restore if this browser has no answers, never save. */
    async function sync(opts) {
      try {
        const token = await deps.token();
        if (!token || !opts || !opts.userId) return fail('Not signed in.');
        const local = readLocal(), there = await remote(token);
        if (answered(local) && opts.pullOnly) return { ok: true, action: 'same' };
        if (answered(local)) {
          const mine = forAccount(local);
          if (there && stable(there) === stable(mine)) return { ok: true, action: 'same' };
          const r = await f(base + TABLE + '?on_conflict=user_id', { method: 'POST', headers: head(token, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ user_id: opts.userId, brief: mine, updated_at: now() }) });
          if (!r.ok) throw new Error('write ' + r.status);
          return { ok: true, action: 'saved' };
        }
        if (there && answered(there)) { writeLocal(there); return { ok: true, action: 'restored' }; }
        return { ok: true, action: 'none' };
      } catch (_) {
        return fail('We could not reach your account just now. Your answers are still in this browser.');
      }
    }
    return { sync };
  }
  return { create, forAccount, KEY };
});
