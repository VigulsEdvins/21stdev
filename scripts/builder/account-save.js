/**
 * Keeps the builder's page in the signed-in person's account too (site/js/cloud-save.js), so the same page opens on another computer.
 * The browser's own autosave stays the first copy; this is a second one, made a few seconds after something changed.
 *  - Not signed in, no sign-in service, or any failure: the builder works exactly as before (no request at all when nobody is signed in).
 *  - On start: "?project=<id>" (the Open button on the account page) opens that account page; a page saved on another device since this
 *    one last saved is brought in when nothing here changed, and asked about when both changed.
 *  - Opening another account page first saves the page that is here to the account, so nothing is lost; one Undo brings it back as well.
 * A small line next to Undo says what happened. Everything the person sees is set with textContent.
 */
(function () {
  'use strict';
  const SESSION_KEY = 'edvlabs.session'; // written by site/js/auth.js; checked first so a visitor who is not signed in makes no request at all
  const TICK_MS = 3000;
  const RETRY_MS = 30000;

  const el = (doc, tag, css, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text !== undefined) e.textContent = text; return e; };

  async function run(win) {
    const doc = win.document;
    try { if (!win.localStorage.getItem(SESSION_KEY)) return null; } catch (_) { return null; }
    if (!win.EdvAuth || !win.EdvCloudSave) return null;
    let cfg;
    try { const r = await win.fetch('/api/config', { cache: 'no-store' }); if (!r.ok) return null; cfg = await r.json(); } catch (_) { return null; }
    if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return null;
    const auth = win.EdvAuth.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: win.localStorage, tempStorage: win.sessionStorage, origin: win.location.origin });
    const who = await auth.current();
    if (!who) return null;
    const cs = win.EdvCloudSave.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken(), storage: win.localStorage });
    const api = await builderReady(win);
    if (!api) return null;

    // ---- the line next to Undo, and the question when two devices changed the page ----
    const status = el(doc, 'span', 'font:12px/1.3 system-ui,sans-serif;opacity:.8;padding:0 8px;white-space:nowrap');
    status.id = 'cloudStatus'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const undo = doc.getElementById('undoBtn'); if (undo && undo.parentNode) undo.parentNode.insertBefore(status, undo);
    const say = (text, problem) => { status.textContent = text; status.dataset.problem = problem ? 'true' : 'false'; status.style.color = problem ? '#b3261e' : ''; };
    let asking = false, busy = false, failedHash = '', failedAt = 0;

    const content = (s) => (s.stack && s.stack.length > 0) || (Array.isArray(s.pages) && s.pages.length > 1);
    /** The page a first-time visitor starts with, not touched yet: opening the builder alone never makes an account page. */
    function untouchedStarter(s) {
      const start = api.STARTER_SECTIONS;
      if (!Array.isArray(start) || !s.stack || s.stack.length !== start.length || (Array.isArray(s.pages) && s.pages.length > 1)) return false;
      return s.stack.every((x, i) => x.slug === start[i].slug && !Object.keys(x.overrides || {}).length && !(x.elements || []).length) && (s.theme || 'midnight-dark') === 'midnight-dark' && !Object.keys(s.customColors || {}).length
        && ((s.page && s.page.title) || 'Assembled Web Page') === 'Assembled Web Page' && !(s.page && s.page.description);
    }
    /** A page worth keeping in the account: it has blocks and is not the untouched starter. */
    const worthSaving = (s) => content(s) && !untouchedStarter(s);
    const nameOf = (s) => { const t = s && s.page && String(s.page.title || '').trim(); return t && t !== 'Assembled Web Page' ? t : 'My page'; };
    const now = () => api.serializeState();

    /** Puts an account page in place of what is on the screen (one history step: Undo brings the earlier page back). */
    function show(project) {
      const clean = win.ProjectSanitize ? win.ProjectSanitize.sanitizeState(project.state).state : project.state;
      const keep = ['stack', 'theme', 'customColors', 'page', 'pages', 'activePageId'];
      const snap = Object.assign({}, api.serializeState());
      keep.forEach((k) => { if (clean[k] !== undefined) snap[k] = clean[k]; });
      api.applyState(snap);
      cs.adopt(project, who.id, api.serializeState());
    }

    function conflict() {
      if (asking) return; asking = true;
      say('Changed on another device', true);
      const bar = el(doc, 'div', 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;max-width:min(680px,92vw);padding:12px 16px;border-radius:10px;background:#1d2a33;color:#fff;font:14px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.35)');
      bar.id = 'cloudConflict'; bar.setAttribute('role', 'alert');
      const text = el(doc, 'span', 'flex:1 1 18em', 'This page was changed on another device since you last saved here. Which version do you want to keep?');
      const mine = el(doc, 'button', 'padding:7px 12px;border-radius:8px;border:0;background:#e2a627;color:#1d2a33;font-weight:600;cursor:pointer', 'Keep what I see here'); mine.type = 'button'; mine.id = 'cloudKeepMine';
      const theirs = el(doc, 'button', 'padding:7px 12px;border-radius:8px;border:1px solid #fff;background:transparent;color:#fff;cursor:pointer', 'Use the other version'); theirs.type = 'button'; theirs.id = 'cloudUseTheirs';
      const close = () => { bar.remove(); asking = false; };
      mine.addEventListener('click', async () => { close(); say('Saving…'); const r = await cs.push(now(), { userId: who.id, name: nameOf(now()), force: true }); report(r); });
      theirs.addEventListener('click', async () => {
        const l = cs.link(who.id); close();
        const o = l ? await cs.open(l.id) : { ok: false };
        if (o.ok) { show(o.project); say('Saved to your account'); } else say(o.message || 'Could not open the other version', true);
      });
      bar.append(text, mine, theirs); doc.body.appendChild(bar); mine.focus();
    }

    function report(r) {
      if (r.ok) { failedHash = ''; say(r.action === 'created' || r.action === 'saved' || r.action === 'same' ? 'Saved to your account' : ''); return; }
      if (r.action === 'conflict') return conflict();
      if (r.action === 'gone') return say('Deleted from your account; saving again…', true);
      say(r.message || 'Not saved to your account', true);
    }

    async function tick(force) {
      if (asking || busy) return;
      let s; try { s = now(); } catch (_) { return; }
      const h = cs.hash(s);
      const l = cs.link(who.id);
      if (!l && !worthSaving(s)) return; // an empty page or the untouched starter is never made into an account page; once linked, every change is saved
      if (l && l.hash === h && !force) return;
      if (h === failedHash && Date.now() - failedAt < RETRY_MS && !force) return; // a refused save is not repeated every few seconds
      busy = true; say('Saving…');
      try { const r = await cs.push(s, { userId: who.id, name: nameOf(s) }); if (!r.ok && r.action !== 'conflict' && r.action !== 'gone') { failedHash = h; failedAt = Date.now(); } report(r); }
      finally { busy = false; }
    }

    // ---- on start ----
    const params = new URLSearchParams(win.location.search);
    if (params.get('new') === '1') { // "Create a new website" on the account page: let go of the account page this builder was tied to, and begin a fresh one
      try { win.history.replaceState(null, '', win.location.pathname + win.location.hash); } catch (_) { /* the address stays; harmless */ }
      if (cs.link(who.id)) await tick(true).catch(() => {}); // the old page is saved once more first, so nothing of it is lost
      cs.unlink();
      if (api.loadStarterTemplate) api.loadStarterTemplate(true);
      say('New website: saved to your account when you change something');
      notice(win, 'A new website. Your other pages are still in My pages on your account.');
      return start();
    }
    const wanted = params.get('project');
    let link = cs.link(who.id);
    if (wanted) {
      try { win.history.replaceState(null, '', win.location.pathname + win.location.hash); } catch (_) { /* the address stays; harmless */ }
      if (!link || link.id !== wanted) {
        const s = now();
        if (worthSaving(s) && (!link || link.hash !== cs.hash(s))) { // the page that is here is not in the account yet: save it first
          const r = await cs.push(s, { userId: who.id, name: nameOf(s) });
          if (!r.ok && r.action !== 'same') { say(r.message || 'Not saved to your account', true); notice(win, 'Your current page could not be saved to your account first, so the other page was not opened.'); return start(); }
        }
        const o = await cs.open(wanted);
        if (o.ok) { show(o.project); say('Saved to your account'); notice(win, 'Opened “' + o.project.name + '”. Undo brings back the page that was here (it is also saved in your account).'); }
        else { say(o.message || 'Could not open that page', true); }
        return start();
      }
    }
    if (link) {
      const o = await cs.open(link.id);
      if (!o.ok && o.action === 'gone') cs.unlink();
      else if (o.ok && o.project.revision !== link.revision) {
        const unchanged = content(now()) ? cs.hash(now()) === link.hash : true;
        if (unchanged) { show(o.project); say('Saved to your account'); notice(win, 'Your page was updated from your account (it was saved on another device).'); }
        else { start(); return conflict(); }
      }
    }
    return start();

    function start() {
      const t = win.setInterval(() => tick(false), TICK_MS);
      doc.addEventListener('visibilitychange', () => { if (!doc.hidden) tick(false); });
      tick(false);
      return { stop: () => win.clearInterval(t), tick };
    }
  }

  function notice(win, text) { try { const ui = win.BuilderUI; if (ui && ui.showToast) ui.showToast(text, 7000); } catch (_) { /* the line next to Undo says it too */ } }

  /** The preview controller (serializeState and applyState) is made late in start-up; wait for it, at most ~10 s. */
  function builderReady(win) {
    return new Promise((resolve) => {
      let tries = 0;
      const look = () => {
        const api = win.builderPreview;
        if (api && api.serializeState && api.applyState) return resolve(api);
        if (++tries > 200) return resolve(null);
        setTimeout(look, 50);
      };
      look();
    });
  }

  window.BuilderAccountSave = { run, saver: null }; // saver: { tick(force) } once the first run has started, so the buying overlay can save the page before it is bought
  const start = () => run(window).then((r) => { window.BuilderAccountSave.saver = r || null; }, () => {});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
