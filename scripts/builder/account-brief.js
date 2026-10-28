/**
 * Brings the signed-in person's saved answers (site/js/brief-sync.js) into the builder: when this browser has no answers of its own but the
 * account has, they are restored and the "We have your answers" offer (guided-brief.js) is shown. Pull only: opening the builder never writes
 * to the account, so an older device cannot overwrite newer answers. Quiet by design: nobody signed in, no sign-in service (the plain
 * repository server has none), or any failure means the builder simply starts as it always did.
 */
(function () {
  'use strict';
  const SESSION_KEY = 'edvlabs.session'; // written by site/js/auth.js; checked first so a visitor who is not signed in makes no request at all

  async function run(win) {
    try { if (!win.localStorage.getItem(SESSION_KEY)) return null; } catch (_) { return null; }
    if (!win.EdvAuth || !win.EdvBriefSync) return null;
    let cfg;
    try { const r = await win.fetch('/api/config', { cache: 'no-store' }); if (!r.ok) return null; cfg = await r.json(); } catch (_) { return null; }
    if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return null;
    const auth = win.EdvAuth.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: win.localStorage, tempStorage: win.sessionStorage, origin: win.location.origin });
    const who = await auth.current();
    if (!who) return null;
    const r = await win.EdvBriefSync.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken(), storage: win.localStorage }).sync({ userId: who.id, pullOnly: true });
    if (r.action === 'restored') showOffer(win, 0);
    return r;
  }

  /** The offer reads the brief once at start-up, so after a restore ask it again (it ignores a second call when the offer is already there). */
  function showOffer(win, tries) {
    const ready = win.BuilderGuidedBrief && win.builderManager && win.BuilderBlockPicker && win.BuilderLookSets && win.document.getElementById('paneElements');
    if (ready) { win.builderGuidedBrief = win.BuilderGuidedBrief.init(win.builderManager, win.document, win) || win.builderGuidedBrief; return; }
    if (tries < 100) setTimeout(() => showOffer(win, tries + 1), 50);
  }

  window.BuilderAccountBrief = { run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(window)); else run(window);
})();
