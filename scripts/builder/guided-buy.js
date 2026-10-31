/**
 * The buying overlay in guided step 5 (plan 2026-10-31-buying-flow.md, spec docs/superpowers/specs/2026-10-31-buying-flow-design.md): a "Proceed" button opens a full-screen dialog with three
 * steps (where it goes, extras and billing, check and pay). The prices are the SERVER's: every number shown comes from /api/quote, and /api/checkout is sent the choices only, never a price.
 * Quiet by design: nothing appears while payment is switched off (the server says so in /api/my-purchases), for a visitor who is not signed in, or without a sign-in service. Everything shown is set with textContent.
 */
(function () {
  'use strict';
  const SESSION_KEY = 'edvlabs.session';
  const EDITOR_KEY = 'web_builder_editor';
  const CHECK_DELAY = 400;
  const NAME_KEY = 'edvlabs.buy_name';
  const STRIPE = /^https:\/\/checkout\.stripe\.com\//;

  const el = (doc, tag, attrs, text) => {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') e.className = v; else e.setAttribute(k, v); }
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const eur = (n) => '€' + n;

  /** Pure: which options exist for a destination. Hosting only where we host; deploy help only where the client puts the site online himself. */
  function optionsFor(destination) {
    return { name: destination === 'edvlabs', hosting: destination === 'edvlabs' || destination === 'domain', deployHelp: destination === 'domain' || destination === 'download' };
  }

  /** Pure: the order the server is asked about. Choices only; the server never reads a price from it. */
  function orderFrom(s) {
    const o = optionsFor(s.destination);
    const order = { projectId: s.projectId, destination: s.destination, editor: !!s.editor, hosting: o.hosting ? s.hosting : null, deployHelp: o.deployHelp && !!s.deployHelp };
    if (o.name && s.siteName) order.siteName = s.siteName;
    return order;
  }

  function mount(win, doc, cfg, initial) {
    const pane = doc.querySelector('#paneGet .ck-body');
    const Client = win.BuilderPublishClient, Names = win.EdvSiteNames;
    if (!pane || !Client || !Names || doc.getElementById('buyProceed')) return null;
    const auth = cfg ? win.EdvAuth.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: win.localStorage, tempStorage: win.sessionStorage, origin: win.location.origin }) : null;
    const client = Client.createClient({ token: () => (auth ? auth.accessToken() : null) });

    const proceed = el(doc, 'button', { type: 'button', class: 'builder-btn-primary gt-go', id: 'buyProceed', hidden: '' }, 'Proceed: buy it and put it online');
    const note = el(doc, 'p', { class: 'gt-note', id: 'buyNote', role: 'status', 'aria-live': 'polite' });
    pane.append(proceed, note);
    let editorDefault = false; try { editorDefault = win.localStorage.getItem(EDITOR_KEY) === '1'; } catch (_) { editorDefault = false; }

    let purchases = Array.isArray(initial) ? initial : [];
    let overlay = null, opener = null, timer = null, quoteSeq = 0;
    const s = { step: 1, destination: 'edvlabs', siteName: '', nameFree: false, editor: editorDefault, hosting: 'monthly', deployHelp: false, waiver: false, projectId: '', quote: null, testMode: false, message: '' };

    /** The page must be in the account before it can be bought, because the server counts the blocks from the saved page. Returns the project id or ''. */
    async function savedProjectId() {
      const who = auth ? await auth.current() : null;
      if (!who || !win.EdvCloudSave) return '';
      try { const saver = win.BuilderAccountSave && win.BuilderAccountSave.saver; if (saver && saver.tick) await Promise.race([saver.tick(true), new Promise((r) => setTimeout(r, 4000))]); } catch (_) { /* the existing link is still used */ }
      const cs = win.EdvCloudSave.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken(), storage: win.localStorage });
      const l = cs.link(who.id);
      return l ? l.id : '';
    }

    async function refreshQuote() {
      const my = ++quoteSeq;
      const r = await client.quote(orderFrom(s));
      if (my !== quoteSeq) return; // a newer choice is already being priced
      if (r.status === 200 && r.json && r.json.ok) { s.quote = r.json; s.testMode = !!r.json.testMode; s.message = ''; }
      else { s.quote = null; s.message = (r.json && r.json.errors && r.json.errors[0]) || Client.explain(r.status, r.json).message; }
      render();
    }

    function close() {
      if (!overlay) return;
      overlay.hidden = true; overlay.remove(); overlay = null; doc.removeEventListener('keydown', onKey, true);
      if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (!overlay) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return; // keep the focus inside the dialog
      const items = [...overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    const radio = (name, value, label, hint, checked, onChange) => {
      const input = el(doc, 'input', { type: 'radio', name, value }); input.checked = checked; input.addEventListener('change', () => onChange(value));
      const card = el(doc, 'label', { class: 'buy-card' + (checked ? ' is-on' : '') });
      card.append(input, el(doc, 'b', {}, label), el(doc, 'small', {}, hint));
      return card;
    };

    function render() {
      if (!overlay) return;
      const body = overlay.querySelector('.buy-body'); body.replaceChildren();
      const o = optionsFor(s.destination);
      const steps = el(doc, 'ol', { class: 'buy-steps', 'aria-label': 'Steps' });
      ['Where', 'Extras', 'Pay'].forEach((t, i) => steps.append(el(doc, 'li', i + 1 === s.step ? { 'aria-current': 'step', class: 'is-now' } : {}, (i + 1) + ' ' + t)));
      body.append(steps);
      if (s.step === 1) {
        body.append(el(doc, 'h3', { id: 'buyHead' }, 'Where should your website live?'));
        const cards = el(doc, 'div', { class: 'buy-cards', role: 'radiogroup', 'aria-labelledby': 'buyHead' });
        const pick = (v) => { s.destination = v; s.quote = null; render(); };
        cards.append(radio('buyDestination', 'edvlabs', 'An edvlabs address', 'yourname.edvlabs.com. We host it.', s.destination === 'edvlabs', pick),
          radio('buyDestination', 'domain', 'My own domain', 'yourname.com. We host it; you do not pay extra for the domain.', s.destination === 'domain', pick),
          radio('buyDestination', 'download', 'Just download the files', 'Host it anywhere you like. No hosting fee.', s.destination === 'download', pick));
        body.append(cards);
        if (o.name) {
          const input = el(doc, 'input', { type: 'text', id: 'buyName', class: 'gt-input', maxlength: '30', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'yourname', 'aria-describedby': 'buyNameNote' }); input.value = s.siteName;
          const nn = el(doc, 'small', { id: 'buyNameNote', role: 'status', 'aria-live': 'polite' }, s.nameFree ? s.siteName + '.edvlabs.com is free.' : '');
          input.addEventListener('input', () => { s.nameFree = false; next.disabled = true; clearTimeout(timer); timer = setTimeout(async () => {
            const c = Names.check(input.value); s.siteName = c.ok ? c.name : '';
            if (!c.ok) { nn.textContent = input.value.trim() ? c.message : ''; return; }
            nn.textContent = 'Checking…';
            const r = await client.checkName(c.name);
            if (Names.check(input.value).name !== c.name) return;
            const j = r.json || {}; s.nameFree = r.status === 200 && j.ok && (j.available || j.reason === 'yours');
            nn.textContent = s.nameFree ? c.name + '.edvlabs.com is free.' : (j.message || (j.errors && j.errors[0]) || 'That name is not available.');
            next.disabled = !s.nameFree;
          }, CHECK_DELAY); });
          body.append(el(doc, 'label', { for: 'buyName' }, 'Choose a name for the address'), input, el(doc, 'small', {}, '.edvlabs.com'), nn);
        }
      } else if (s.step === 2) {
        body.append(el(doc, 'h3', { id: 'buyHead' }, 'Extras and billing'));
        const ed = el(doc, 'input', { type: 'checkbox', id: 'buyEditor' }); ed.checked = s.editor; ed.addEventListener('change', () => { s.editor = ed.checked; refreshQuote(); });
        body.append(el(doc, 'label', { class: 'buy-card' }, null));
        const last = body.lastChild; last.append(ed, el(doc, 'b', {}, 'Admin panel (' + eur(win.EdvPrices.table.editor) + ')'), el(doc, 'small', {}, 'Change words and pictures later without the builder.'));
        if (o.hosting) {
          const g = el(doc, 'fieldset', { id: 'buyHosting', class: 'buy-card' }); g.append(el(doc, 'legend', {}, 'Hosting: first month free'));
          [['monthly', 'Monthly ' + eur(win.EdvPrices.table.hostingMonth)], ['yearly', 'Yearly ' + eur(win.EdvPrices.table.hostingYear)]].forEach(([v, t]) => {
            const r = el(doc, 'input', { type: 'radio', name: 'buyBilling', value: v }); r.checked = s.hosting === v; r.addEventListener('change', () => { s.hosting = v; refreshQuote(); });
            g.append(el(doc, 'label', {}, null)); g.lastChild.append(r, ' ' + t);
          });
          g.append(el(doc, 'small', {}, 'You pay nothing for hosting during the first month. Cancel any time.'));
          body.append(g);
        }
        if (o.deployHelp) {
          const dh = el(doc, 'input', { type: 'checkbox', id: 'buyDeployHelp' }); dh.checked = s.deployHelp; dh.addEventListener('change', () => { s.deployHelp = dh.checked; refreshQuote(); });
          body.append(el(doc, 'label', { class: 'buy-card' }, null)); body.lastChild.append(dh, el(doc, 'b', {}, 'We put it online for you (' + eur(win.EdvPrices.table.deployHelp) + ', once)'), el(doc, 'small', {}, 'Tell us your domain after paying and we do the rest.'));
        }
      } else {
        body.append(el(doc, 'h3', { id: 'buyHead' }, 'Check and pay'));
        const dl = el(doc, 'dl', { class: 'gt-lines', id: 'buyLines' });
        if (s.quote) s.quote.lines.forEach((l) => dl.append(el(doc, 'dt', {}, l.label), el(doc, 'dd', {}, eur(l.amount))));
        body.append(dl);
        if (s.quote && s.quote.hosting) body.append(el(doc, 'p', { id: 'buyHostingLine' }, 'Hosting: free for ' + s.quote.hosting.trialDays + ' days, then ' + eur(s.quote.hosting.amount) + ' a ' + (s.quote.hosting.plan === 'monthly' ? 'month' : 'year') + '. Cancel any time.'));
        const w = el(doc, 'input', { type: 'checkbox', id: 'buyWaiver' }); w.checked = s.waiver;
        w.addEventListener('change', () => { s.waiver = w.checked; pay.disabled = !(s.waiver && s.quote); });
        body.append(el(doc, 'label', { class: 'buy-waiver' }, null)); body.lastChild.append(w, ' I want the website made available to me at once, and I know I then lose my right to withdraw from this digital purchase.');
      }
      if (s.message) body.append(el(doc, 'p', { class: 'buy-error', role: 'alert' }, s.message));
      if (s.testMode) body.append(el(doc, 'p', { class: 'buy-test' }, 'Test mode: no real money is taken. Use the card 4242 4242 4242 4242.'));
      total.textContent = s.quote ? 'Pay today: ' + eur(s.quote.payToday) + (s.quote.hosting ? ' (hosting free for ' + s.quote.hosting.trialDays + ' days)' : '') : (s.step === 1 ? '' : 'Working out the price…');
      back.hidden = s.step === 1; next.hidden = s.step === 3; pay.hidden = s.step !== 3;
      next.disabled = s.step === 1 && o.name ? !s.nameFree : false;
      pay.disabled = !(s.waiver && s.quote);
      const first = body.querySelector('input:checked, input, button'); if (first && first.focus && !doc.activeElement.closest('.buy-body')) first.focus();
    }

    const total = el(doc, 'p', { id: 'buyTotal', role: 'status', 'aria-live': 'polite' });
    const back = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'buyBack' }, 'Back');
    const next = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'buyNext' }, 'Next');
    const pay = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'buyPay' }, 'Pay securely with Stripe');
    back.addEventListener('click', () => { s.step = Math.max(1, s.step - 1); render(); });
    next.addEventListener('click', () => { s.step = Math.min(3, s.step + 1); s.message = ''; render(); if (s.step >= 2) refreshQuote(); });
    pay.addEventListener('click', async () => {
      pay.disabled = true; s.message = 'Opening the payment page…'; render();
      try { win.sessionStorage.setItem(NAME_KEY, optionsFor(s.destination).name ? s.siteName : ''); } catch (_) { /* the name is then typed again */ }
      const r = await client.checkout(orderFrom(s));
      if (r.status === 200 && r.json && r.json.ok && typeof r.json.url === 'string' && STRIPE.test(r.json.url)) { win.location.assign(r.json.url); return; }
      s.message = (r.json && r.json.errors && r.json.errors[0]) || Client.explain(r.status, r.json).message; render();
    });

    proceed.addEventListener('click', async () => {
      opener = proceed; proceed.disabled = true; note.textContent = 'Saving your page to your account…';
      const id = await savedProjectId();
      proceed.disabled = false;
      if (!id) { note.textContent = 'Your page could not be saved to your account just now, so it cannot be bought yet. Please try again in a moment.'; return; }
      note.textContent = ''; s.projectId = id; s.step = 1; s.quote = null; s.message = ''; s.waiver = false;
      overlay = el(doc, 'div', { id: 'buyOverlay', class: 'buy-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'buyTitle' });
      const panel = el(doc, 'div', { class: 'buy-panel' });
      const top = el(doc, 'div', { class: 'buy-top' }, null); const x = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'buyClose' }, 'Back to builder'); x.addEventListener('click', close);
      top.append(el(doc, 'h2', { id: 'buyTitle' }, 'Finish your website'), x);
      panel.append(top, el(doc, 'div', { class: 'buy-body' }), total, el(doc, 'div', { class: 'buy-actions' }, null));
      panel.lastChild.append(back, next, pay);
      overlay.append(panel); doc.body.append(overlay); doc.addEventListener('keydown', onKey, true);
      render();
    });

    /* ---- what is unlocked: only a page that was bought can be downloaded or put online ---- */
    const paneGet = pane.closest('#paneGet');
    async function currentProjectId() {
      const who = auth ? await auth.current() : null;
      if (!who || !win.EdvCloudSave) return '';
      const l = win.EdvCloudSave.create({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, token: () => auth.accessToken(), storage: win.localStorage }).link(who.id);
      return l ? l.id : '';
    }
    const boughtFor = (pid) => purchases.filter((p) => pid && p.projectId === pid);
    async function applyLock() {
      const pid = await currentProjectId(), mine = boughtFor(pid);
      if (paneGet) paneGet.classList.toggle('buy-locked', !mine.length);
      proceed.textContent = mine.length ? 'Add blocks or extras to your order' : 'Proceed: buy it and put it online';
      if (!mine.length) note.textContent = note.textContent || 'Buy your website to download it or put it online.';
      return pid;
    }

    /* "We put it online for you": the domain and a note, asked for once after paying */
    const form = el(doc, 'form', { id: 'buyDeployForm', class: 'buy-deploy', hidden: '' });
    const dDomain = el(doc, 'input', { type: 'text', id: 'buyDeployDomain', class: 'gt-input', placeholder: 'yourname.com', autocomplete: 'off', maxlength: '253' });
    const dNotes = el(doc, 'textarea', { id: 'buyDeployNotes', class: 'gt-input', rows: '3', maxlength: '2000', placeholder: 'Where did you register the domain? Anything we should know?' });
    const dSend = el(doc, 'button', { type: 'submit', class: 'builder-btn-primary', id: 'buyDeploySend' }, 'Send to edvlabs');
    form.append(el(doc, 'h4', {}, 'We put it online for you'), el(doc, 'p', {}, 'Tell us your domain and where you bought it. We write to you if we need anything else.'), el(doc, 'label', { for: 'buyDeployDomain' }, 'Your domain'), dDomain, el(doc, 'label', { for: 'buyDeployNotes' }, 'Note (optional)'), dNotes, dSend);
    pane.append(form);
    function showDeployForm() { form.hidden = !purchases.some((p) => p.deployHelp && !p.deployDetailsSent); }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p = purchases.find((x) => x.deployHelp && !x.deployDetailsSent); if (!p) return;
      dSend.disabled = true;
      const r = await client.deployRequest(p.id, dDomain.value, dNotes.value);
      dSend.disabled = false;
      if (r.status === 200 && r.json && r.json.ok) { p.deployDetailsSent = true; showDeployForm(); note.textContent = 'Thank you. We will put your site online and write to you.'; }
      else note.textContent = (r.json && r.json.errors && r.json.errors[0]) || 'The details could not be sent just now. Please try again.';
    });

    /* Back from Stripe: the payment is confirmed by Stripe telling our server, which can take a moment, so look a few times. */
    async function afterPayment() {
      note.textContent = 'Thank you. Confirming your payment…';
      const pid = await currentProjectId(), known = new Set(purchases.map((p) => p.id));
      for (let i = 0; i < 8; i++) {
        const r = await client.myPurchases();
        if (r.status === 200 && r.json && r.json.ok) {
          const fresh = r.json.purchases.find((p) => p.projectId === pid && !known.has(p.id));
          if (fresh) {
            purchases = r.json.purchases; await applyLock(); showDeployForm();
            note.textContent = fresh.destination === 'download' ? 'Payment received. Your download is ready: use “Go to the download”.' : fresh.destination === 'edvlabs' ? 'Payment received. Choose the name you picked and press “Put it online”.' : 'Payment received. Your site is yours to put online; your own domain can be connected from “My websites” on your account page.';
            let name = ''; try { name = win.sessionStorage.getItem(NAME_KEY) || ''; win.sessionStorage.removeItem(NAME_KEY); } catch (_) { name = ''; }
            const box = doc.getElementById('publishName'); if (box && name && fresh.destination === 'edvlabs') { box.value = name; box.dispatchEvent(new win.Event('input', { bubbles: true })); }
            doc.dispatchEvent(new win.CustomEvent('edvlabs:purchased'));
            return;
          }
        }
        await new Promise((res) => setTimeout(res, 1500));
      }
      note.textContent = 'Your payment is being confirmed. If your page is not unlocked within a few minutes, contact edvlabs. You will not be charged twice.';
    }

    // coming back from Stripe
    let back1 = ''; try { back1 = new win.URLSearchParams(win.location.search).get('paid') || ''; } catch (_) { back1 = ''; }
    applyLock().then(showDeployForm).then(() => { if (back1 === '1') afterPayment(); });

    // coming back from Stripe without paying
    let back0 = ''; try { back0 = new win.URLSearchParams(win.location.search).get('paid') || ''; } catch (_) { back0 = ''; }
    if (back0 === '0') note.textContent = 'Payment was cancelled. Nothing was charged, and your page is as you left it.';
    proceed.hidden = false;
    return { proceed, note, close };
  }

  async function run(win) {
    const doc = win.document;
    if (!win.EdvAuth || !win.BuilderPublishClient || !win.EdvSiteNames || !win.EdvPrices) return null;
    let hasSession = false;
    try { hasSession = !!win.localStorage.getItem(SESSION_KEY); } catch (_) { hasSession = false; }
    if (!hasSession) return null; // a visitor who is not signed in makes no request
    let cfg = null;
    try { const r = await win.fetch('/api/config', { cache: 'no-store' }); if (!r.ok) return null; cfg = await r.json(); } catch (_) { return null; }
    if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return null;
    let tries = 0;
    const ready = await new Promise((resolve) => { const wait = () => { if (doc.querySelector('#paneGet .ck-body')) resolve(true); else if (++tries < 100) setTimeout(wait, 50); else resolve(false); }; wait(); });
    if (!ready) return null;
    // only when the server says buying is switched on; any other answer leaves step 5 exactly as it was
    const auth = win.EdvAuth.createAuth({ url: cfg.supabaseUrl, anonKey: cfg.anonKey, storage: win.localStorage, tempStorage: win.sessionStorage, origin: win.location.origin });
    const probe = await win.BuilderPublishClient.createClient({ token: () => auth.accessToken() }).myPurchases();
    if (!(probe.status === 200 && probe.json && probe.json.ok && probe.json.paymentOn === true)) return null;
    return mount(win, doc, cfg, probe.json.purchases);
  }

  const api = { run, optionsFor, orderFrom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedBuy = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(window)); else run(window);
  }
})();
