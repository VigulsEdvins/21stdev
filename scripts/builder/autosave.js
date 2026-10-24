/**
 * Autosave storage with a safety net, over any localStorage-like object (unit-testable in Node).
 *  - save(): keeps the previous good copy as `<key>_prev` before overwriting, and when the browser refuses the
 *    write (storage full or blocked) drops its own backups and retries once; the outcome goes to onStatus so the
 *    page can warn the person instead of failing silently.
 *  - load(): a saved copy that cannot be read is kept as `<key>_corrupt`, and the previous good copy is used instead.
 * Browser: window.BuilderAutosave. Node: require().
 */
(function () {
  'use strict';

  const MAX_BACKUP_CHARS = 1500000;

  function isQuotaError(err) {
    return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014 || /quota/i.test(err.message || ''));
  }

  function createAutosave({ storage, key, onStatus = () => {} }) {
    let failing = false;
    const report = (ok, reason) => {
      if (ok && !failing) return;
      failing = !ok;
      onStatus(ok ? { ok: true } : { ok: false, reason });
    };

    function save(stateObject) {
      let json;
      try { json = JSON.stringify(stateObject); } catch (err) { report(false, 'unserializable'); return false; }
      const write = () => storage.setItem(key, json);
      let previous = null;
      try { previous = storage.getItem(key); } catch (_) { /* unreadable storage is handled by the write below */ }
      try {
        if (previous && previous !== json && previous.length < MAX_BACKUP_CHARS) {
          try { storage.setItem(key + '_prev', previous); } catch (_) { /* a missing backup must not block the save */ }
        }
        write();
        report(true);
        return true;
      } catch (err) {
        if (isQuotaError(err)) {
          // free the room our own backups take, then try once more
          try { storage.removeItem(key + '_prev'); storage.removeItem(key + '_corrupt'); } catch (_) { /* ignore */ }
          try { write(); report(true); return true; } catch (err2) { report(false, isQuotaError(err2) ? 'full' : 'blocked'); return false; }
        }
        report(false, 'blocked');
        return false;
      }
    }

    function parse(raw) {
      try {
        const value = JSON.parse(raw);
        return value && typeof value === 'object' ? value : undefined;
      } catch (_) { return undefined; }
    }

    /** @returns {{ state: object|null, status: 'none'|'ok'|'recovered'|'corrupt' }} */
    function load() {
      let raw = null;
      try { raw = storage.getItem(key); } catch (_) { return { state: null, status: 'none' }; }
      if (!raw) return { state: null, status: 'none' };
      const state = parse(raw);
      if (state) return { state, status: 'ok' };
      try { storage.setItem(key + '_corrupt', raw.slice(0, MAX_BACKUP_CHARS)); } catch (_) { /* ignore */ }
      let prev = null;
      try { prev = storage.getItem(key + '_prev'); } catch (_) { /* ignore */ }
      const recovered = prev ? parse(prev) : undefined;
      return recovered ? { state: recovered, status: 'recovered' } : { state: null, status: 'corrupt' };
    }

    return { save, load, isFailing: () => failing };
  }

  const api = { createAutosave, isQuotaError };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderAutosave = api;
})();
