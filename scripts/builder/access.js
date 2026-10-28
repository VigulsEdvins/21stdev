/**
 * Who may use which block. On the published site a visitor who is not signed in can use the blocks marked "access": "free" in their meta.json
 * (one good look for each of the everyday block kinds, plus the language switcher); the rest need a free account. This is a soft lock in the
 * page, not a security wall: the component files are public, and the point is to invite people to make an account.
 * The lock exists only when the page says so (<meta name="access-gate" content="on">, written by scripts/build-site.js into the published
 * builder). The plain repository copy of builder.html has no such tag, so local work and the older tests see every block open.
 * "Signed in" here means this browser holds a session from the account page (site/js/auth.js); the sign-in service confirms it in the
 * background and a session it no longer accepts turns the lock back on.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'edvlabs.session';
  const SIGN_IN_URL = '../account/?from=builder'; // the published builder lives at /builder/

  const gateOn = () => { const m = document.querySelector('meta[name="access-gate"]'); return !!m && m.content === 'on'; };
  const hasSession = () => { try { const s = JSON.parse(window.localStorage.getItem(SESSION_KEY)); return !!(s && s.access_token); } catch (_) { return false; } };

  let signedIn = hasSession();
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch (_) { /* a listener must not stop the others */ } });

  let bySlug = null;
  function item(slug) {
    if (!bySlug) { bySlug = new Map(); (window.FEATURE_REGISTRY || []).forEach((i) => bySlug.set(i.slug, i)); }
    return bySlug.get(slug) || null;
  }
  /** True when this visitor may not add the block: the lock is on, nobody is signed in, and the block is not a free one. */
  function locked(slug) {
    if (!gateOn() || signedIn) return false;
    const i = item(slug);
    return !!i && i.access !== 'free';
  }
  const lockedCount = () => (window.FEATURE_REGISTRY || []).filter((i) => i.access !== 'free' && i.status !== 'draft' && !i.isWidget).length;

  // ---- the invitation: a small "Sign in free" link beside the catalogue title, a "Free blocks only" filter in the catalogue, and a note that floats when a locked block is tried.
  // Nothing here takes room in the side panel, where the components are chosen.
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); }
    kids.forEach((k) => e.append(k));
    return e;
  }
  let freeOnly = false; // the catalogue lists the whole library (locks mark what needs an account); "Free blocks only" narrows it to what can be used
  let pill = null, filterBtn = null, toast = null, toastText = null, toastTimer = null;
  const showLock = () => gateOn() && !signedIn;

  function draw() {
    const on = showLock();
    const title = document.querySelector('.elements-header-title-group');
    if (on && title && !pill) {
      pill = el('a', { class: 'access-pill', id: 'accessPill', href: SIGN_IN_URL, text: 'Sign in free', title: 'A free account unlocks ' + lockedCount() + ' more blocks. Your page stays as it is.' });
      title.append(pill);
    }
    if (pill) pill.hidden = !on;
    const row = document.querySelector('.elements-quick-row');
    if (on && row && !filterBtn) {
      filterBtn = el('button', { type: 'button', class: 'quick-pill', id: 'accessFreeBtn', title: 'Show only the blocks you can use without an account' });
      filterBtn.addEventListener('click', () => { freeOnly = !freeOnly; drawFilter(); notify(); });
      row.insertBefore(filterBtn, row.firstChild);
    }
    if (filterBtn) { filterBtn.hidden = !on; drawFilter(); }
    if (!on && toast) toast.hidden = true;
  }
  function drawFilter() {
    if (!filterBtn) return;
    filterBtn.textContent = 'Free blocks only';
    filterBtn.classList.toggle('is-active', freeOnly);
    filterBtn.setAttribute('aria-pressed', String(freeOnly));
  }
  /** True when the catalogue should list only the free blocks (and the in-section widgets, which have no lock). */
  const freeOnlyNow = () => showLock() && freeOnly;

  /** A visitor tried to use a locked block: a note floats at the top for a few seconds, with the way to sign in. */
  function prompt(name) {
    if (!toast) {
      toastText = el('p', { class: 'at-text', id: 'accessToastText' });
      const go = el('a', { class: 'at-go', id: 'accessSignIn', href: SIGN_IN_URL, text: 'Sign in free' });
      const no = el('button', { type: 'button', class: 'at-no', id: 'accessToastNo', text: 'Not now', 'aria-label': 'Close this note' });
      no.addEventListener('click', () => { toast.hidden = true; });
      toast = el('div', { class: 'access-toast', id: 'accessToast', role: 'status', 'aria-live': 'polite' }, toastText, go, no);
      document.body.append(toast);
    }
    toastText.textContent = '“' + name + '” needs a free account. Sign in or create one and it is yours to use. Your page stays as it is.';
    toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 12000);
  }

  /** Asks the sign-in service whether the stored session still stands; one that does not is dropped and the lock comes back. */
  async function verify() {
    if (!gateOn() || !signedIn) return;
    const A = window.EdvAuth;
    if (!A) return;
    try {
      const r = await window.fetch('/api/config', { cache: 'no-store' });
      if (!r.ok) return;
      const cfg = await r.json();
      if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return;
      const auth = A.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: window.localStorage, tempStorage: window.sessionStorage, origin: window.location.origin });
      if (!(await auth.current())) { signedIn = hasSession(); notify(); draw(); }
    } catch (_) { /* offline: keep what the browser holds */ }
  }

  window.addEventListener('storage', (e) => { if (e.key === SESSION_KEY) { signedIn = hasSession(); notify(); draw(); } }); // signed in or out in another tab
  window.BuilderAccess = { locked, prompt, draw, verify, gateOn, freeOnlyNow, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }, get signedIn() { return signedIn; }, SIGN_IN_URL };

  const start = () => { draw(); verify(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
