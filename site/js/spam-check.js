/* The Cloudflare spam check (Turnstile) on the contact and start pages. The public key comes from /api/form-check; without one nothing is shown, no token is
   sent and the pages behave as before. The token is checked by the Worker (functions/lib/lead-http.js, TURNSTILE_SECRET). One token works once, so reset() after
   every answer from the server. SpamCheck.setup(element) resolves with { on, failed, ready(), token(), reset() }. */
(function () {
  'use strict';
  const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const off = { on: false, failed: false, ready: () => true, token: () => null, reset() {} };
  let loading = null;
  const load = () => loading || (loading = new Promise((resolve) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script'); s.src = SRC; s.async = true; s.onload = () => resolve(); s.onerror = () => resolve();
    document.head.append(s);
  }));
  async function setup(el) {
    let key = '';
    try { const r = await fetch('/api/form-check', { cache: 'no-store' }); if (r.ok) key = String((await r.json()).turnstileSiteKey || ''); } catch (e) { /* no check offered */ }
    if (!key || !el) return off;
    await load();
    // the check is on but could not start (blocked script, no connection): say so rather than let the visitor send something that will be refused
    if (!window.turnstile) return { on: true, failed: true, ready: () => false, token: () => null, reset() {} };
    let token = null, id;
    el.hidden = false;
    id = window.turnstile.render(el, { sitekey: key, callback: (t) => { token = t; }, 'expired-callback': () => { token = null; }, 'error-callback': () => { token = null; } });
    return { on: true, failed: false, ready: () => !!token, token: () => token, reset() { token = null; if (window.turnstile) window.turnstile.reset(id); } };
  }
  window.SpamCheck = { setup };
})();
