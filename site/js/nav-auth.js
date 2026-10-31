/* The last link of the main menu says "Sign in" for a visitor and "My account" for someone who is signed in.
   It only looks at the saved session in this browser (no network); the account page checks it with the service and
   forgets one that has stopped working, then calls EdvNav.refresh() so the menu follows. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else { root.EdvNav = api; api.start(root); }
})(typeof self !== 'undefined' ? self : this, function () {
  const SESSION_KEY = 'edvlabs.session';
  const tr = (s) => (typeof EdvI18n !== 'undefined' ? EdvI18n.t(s) : s); // js/i18n.js, when the page loads it

  /** True when this browser holds a saved session. */
  function signedIn(storage) {
    try { const s = JSON.parse(storage.getItem(SESSION_KEY)); return !!(s && s.access_token); } catch (_) { return false; }
  }

  /** Sets the label of every menu link that points at the account page. */
  function label(doc, isIn) {
    Array.prototype.forEach.call(doc.querySelectorAll('.nav a[href$="account/"]'), (a) => { a.textContent = tr(isIn ? 'My account' : 'Sign in'); });
  }

  function start(win) {
    const run = () => { let st = null; try { st = win.localStorage; } catch (_) { /* blocked storage: treat as signed out */ } label(win.document, !!st && signedIn(st)); };
    api.refresh = run;
    run();
    win.addEventListener('storage', (e) => { if (e.key === SESSION_KEY || e.key === null) run(); }); // signed in or out in another tab
  }

  const api = { signedIn, label, start, refresh() {} };
  return api;
});
