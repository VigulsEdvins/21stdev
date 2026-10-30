/**
 * "Put it online" in guided step 5 (plan 2026-10-30-publish-subdomain.md, step 6): choose a name, check it is free, and publish the page at
 * https://<name>.edvlabs.com/. It lists the person's sites with Update and Take offline. Publishing on an edvlabs address is a paid extra, so a
 * person without a paid place is told that plainly and can ask edvlabs; no price is shown here until one is set (site/js/prices.js).
 * Quiet by design: with no sign-in service (the plain repository server) the box does not appear, and a visitor who is not signed in makes no request. Everything shown is set with textContent.
 */
(function () {
  'use strict';
  const SESSION_KEY = 'edvlabs.session'; // written by site/js/auth.js
  const SIGN_IN_URL = '../account/?from=builder'; // the published builder lives at /builder/
  const CHECK_DELAY = 400;
  const DOMAIN = 'edvlabs.com';

  const el = (doc, tag, attrs, text) => {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else e.setAttribute(k, v); }
    if (text !== undefined) e.textContent = text;
    return e;
  };

  /** The words under the name box for what the name check answered. */
  function nameLine(answer, base) {
    if (!answer || !answer.json) return { text: 'Could not check the name just now.', good: false };
    const j = answer.json;
    if (answer.status !== 200 || !j.ok) return { text: (j.errors && j.errors[0]) || 'Could not check the name just now.', good: false };
    if (j.available) return { text: base + ' is free.', good: true };
    if (j.reason === 'yours') return { text: 'You already use this name. Pick it in the list above to update that site.', good: false };
    return { text: j.message || 'This name is not available.', good: false };
  }

  function mount(win, doc, cfg) {
    const pane = doc.querySelector('#paneGet .ck-body');
    const Client = win.BuilderPublishClient, Names = win.EdvSiteNames;
    if (!pane || !Client || !Names || doc.getElementById('publishBox')) return null;
    const auth = cfg ? win.EdvAuth.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: win.localStorage, tempStorage: win.sessionStorage, origin: win.location.origin }) : null; // null: nobody is signed in
    const client = Client.createClient({ token: () => (auth ? auth.accessToken() : null) });
    const domain = DOMAIN;
    const help = (doc.querySelector('meta[name="contact-url"]') || {}).content || '../contact/';

    const box = el(doc, 'section', { class: 'gt-publish', id: 'publishBox', 'aria-labelledby': 'publishHead' });
    const head = el(doc, 'h4', { id: 'publishHead' }, 'Put it online');
    const intro = el(doc, 'p', { class: 'gt-note' }, 'Your page can live at yourname.' + domain + '. It is a paid extra. You can always download the files and put them on any other host instead.');
    const signedOut = el(doc, 'p', { id: 'publishSignedOut' });
    const signIn = el(doc, 'a', { class: 'builder-btn-subtle', id: 'publishSignIn', href: SIGN_IN_URL }, 'Sign in free');
    signedOut.append('Sign in to put your page online. ', signIn);
    const list = el(doc, 'ul', { class: 'gt-sites', id: 'publishSites' });
    const places = el(doc, 'p', { class: 'gt-note', id: 'publishPlaces', role: 'status', 'aria-live': 'polite' });
    const nameInput = el(doc, 'input', { type: 'text', id: 'publishName', class: 'gt-input', maxlength: '30', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-describedby': 'publishNameNote', placeholder: 'yourname' });
    const nameLabel = el(doc, 'label', { class: 'gt-address', for: 'publishName' }, null);
    nameLabel.append(el(doc, 'b', {}, 'Choose a name'), el(doc, 'small', {}, 'Letters, digits and hyphens, 3 to 30 characters. It becomes the address people type.'),
      nameInput, el(doc, 'small', { class: 'gt-suffix' }, '.' + domain));
    const nameNote = el(doc, 'small', { id: 'publishNameNote', role: 'status', 'aria-live': 'polite' });
    const go = el(doc, 'button', { type: 'button', class: 'builder-btn-primary gt-go', id: 'publishGo' }, 'Put it online');
    const out = el(doc, 'p', { id: 'publishResult', role: 'status', 'aria-live': 'polite' });
    const ask = el(doc, 'a', { class: 'builder-btn-subtle gt-ask', id: 'publishAsk', href: help, target: '_blank', rel: 'noopener', hidden: '' }, 'Ask edvlabs to switch it on for me');
    box.append(head, intro, signedOut, list, places, nameLabel, nameNote, go, out, ask);
    pane.append(box);

    let state = { signedIn: false, sites: [], freePlaces: 0 }, busy = false, timer = null, lastChecked = '';
    const say = (text, problem) => { out.textContent = text; out.dataset.problem = problem ? 'true' : 'false'; };

    function setBusy(on) { busy = on; box.setAttribute('aria-busy', on ? 'true' : 'false'); box.querySelectorAll('button').forEach((b) => { b.disabled = on; }); if (!on) refreshGo(); }
    function refreshGo() { const c = Names.check(nameInput.value); go.disabled = busy || !c.ok || !state.signedIn || (lastChecked !== (c.ok ? c.name : '')); }

    function renderSites() {
      list.replaceChildren();
      state.sites.forEach((s) => {
        const li = el(doc, 'li', { class: 'gt-site' });
        const addr = Client.safeAddress(s.address);
        li.append(addr ? el(doc, 'a', { href: addr, target: '_blank', rel: 'noopener' }, addr.replace(/^https:\/\//, '').replace(/\/$/, '')) : el(doc, 'b', {}, s.name));
        const status = s.status === 'live' ? 'Online' : s.status === 'blocked' ? 'Blocked' : 'Offline';
        const pay = s.payment === 'grace' ? ' · payment is due, please renew' : s.payment === 'ended' ? ' · payment has ended' : '';
        li.append(el(doc, 'small', {}, ' ' + status + pay));
        if (s.status !== 'blocked') {
          const upd = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', 'data-act': 'update' }, s.status === 'live' ? 'Update with this page' : 'Put back online with this page');
          upd.addEventListener('click', () => publish(s.name));
          li.append(upd);
          if (s.status === 'live') { const off = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', 'data-act': 'offline' }, 'Take offline'); off.addEventListener('click', () => takeOffline(s)); li.append(off); }
        }
        list.append(li);
      });
    }

    function renderPlaces() {
      places.textContent = state.freePlaces > 0 ? 'You have ' + state.freePlaces + ' paid place' + (state.freePlaces === 1 ? '' : 's') + ' left for a new site.' : 'You have no paid place for a new site yet. Payment is not switched on, so edvlabs adds it for you.';
      ask.hidden = state.freePlaces > 0;
    }

    async function load() {
      const who = auth ? await auth.current() : null;
      state.signedIn = !!who;
      signedOut.hidden = state.signedIn;
      [list, places, nameLabel, nameNote, go].forEach((e) => { e.hidden = !state.signedIn; });
      if (!state.signedIn) return;
      const r = await client.mySites();
      if (r.status === 200 && r.json && r.json.ok) { state.sites = r.json.sites; state.freePlaces = r.json.freePlaces; renderSites(); renderPlaces(); }
      else if (r.status === 503) { box.hidden = true; return; } // publishing is not set up on this server: say nothing
      else say(Client.explain(r.status, r.json).message, true);
      refreshGo();
    }

    async function checkName() {
      const c = Names.check(nameInput.value);
      lastChecked = '';
      if (!c.ok) { nameNote.textContent = nameInput.value.trim() ? c.message : ''; refreshGo(); return; }
      nameNote.textContent = 'Checking…';
      const mine = state.sites.find((s) => s.name === c.name);
      const r = mine ? { status: 200, json: { ok: true, available: false, reason: 'yours' } } : await client.checkName(c.name);
      if (Names.check(nameInput.value).name !== c.name) return; // the person kept typing; a newer check is on its way
      const line = nameLine(r, c.name + '.' + domain);
      nameNote.textContent = line.text;
      lastChecked = line.good ? c.name : '';
      refreshGo();
    }
    nameInput.addEventListener('input', () => { lastChecked = ''; refreshGo(); clearTimeout(timer); timer = setTimeout(checkName, CHECK_DELAY); });

    async function publish(name) {
      if (busy) return;
      if (!win.builderExport || typeof win.builderExport.collectFiles !== 'function') { say('The page is not ready yet. Please try again in a moment.', true); return; }
      setBusy(true); say('Putting your page online…', false);
      try {
        let collected;
        try { collected = await win.builderExport.collectFiles({ cms: false, csp: true }); } catch (e) { say(e && /no sections/i.test(e.message) ? 'Add at least one block first.' : 'The page could not be prepared. Please try again.', true); return; }
        const r = await client.publish(name, collected);
        const e = Client.explain(r.status, r.json);
        if (e.kind === 'ok') {
          const addr = Client.safeAddress(r.json.address);
          out.replaceChildren('Your page is online: ', addr ? el(doc, 'a', { href: addr, target: '_blank', rel: 'noopener' }, addr) : r.json.name, '. It can take up to a minute to show everywhere.');
          out.dataset.problem = 'false';
          nameInput.value = ''; nameNote.textContent = ''; lastChecked = '';
          await load();
        } else {
          say(e.message, true);
          if (e.kind === 'payment') { state.freePlaces = 0; renderPlaces(); }
        }
      } finally { setBusy(false); }
    }
    go.addEventListener('click', () => { const c = Names.check(nameInput.value); if (c.ok) publish(c.name); });

    async function takeOffline(site) {
      if (busy) return;
      setBusy(true);
      try {
        const r = await client.unpublish(site.id);
        say(r.status === 200 ? site.name + '.' + domain + ' is offline. You can put it back online any time.' : Client.explain(r.status, r.json).message, r.status !== 200);
        await load();
      } finally { setBusy(false); }
    }

    load();
    return { load, box };
  }

  async function run(win) {
    const doc = win.document;
    if (!win.EdvAuth || !win.BuilderPublishClient || !win.EdvSiteNames) return null;
    let hasSession = false;
    try { hasSession = !!win.localStorage.getItem(SESSION_KEY); } catch (_) { hasSession = false; }
    let cfg = null;
    if (hasSession) { // as with the other account parts of the builder, a visitor who is not signed in makes no request at all
      try { const r = await win.fetch('/api/config', { cache: 'no-store' }); if (!r.ok) return null; cfg = await r.json(); } catch (_) { return null; }
      if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return null;
    } else if (!doc.querySelector('meta[name="access-gate"][content="on"]')) {
      return null; // the repository server has no sign-in service: nothing to invite to (the published builder carries the access-gate tag)
    }
    let tries = 0;
    return new Promise((resolve) => {
      const wait = () => { if (doc.querySelector('#paneGet .ck-body')) resolve(mount(win, doc, cfg)); else if (++tries < 100) setTimeout(wait, 50); else resolve(null); };
      wait();
    });
  }

  const api = { run, nameLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedPublish = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(window)); else run(window);
  }
})();
