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
  const NAME_KEY = 'edvlabs.buy_name', DOMAIN_KEY = 'edvlabs.buy_domain', KNOWN_KEY = 'edvlabs.buy_known'; // KNOWN: the purchases of this page before paying, so a payment confirmed early still counts as new
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

  // Registries that put a second label under the country code (the same list as functions/lib/site-domain.js): a name with one label in front of one of these is a bare domain.
  const SECOND_LEVEL = new Set(['co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'org.nz', 'net.nz', 'co.za', 'org.za', 'co.jp', 'ne.jp', 'or.jp',
    'com.br', 'net.br', 'org.br', 'com.mx', 'com.ar', 'com.co', 'com.tr', 'com.cn', 'net.cn', 'org.cn', 'com.hk', 'com.sg', 'com.my', 'com.ph', 'co.in', 'net.in', 'org.in', 'co.il', 'co.kr', 'co.id', 'com.ua', 'com.pl', 'com.ru']);
  const BARE = 'Use a name with something in front of the domain, like www.yourdomain.com. A bare domain cannot point at us; at your domain provider, send the bare domain to the www name.';
  const isLabel = (l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && l[0] !== '-' && l[l.length - 1] !== '-';

  /** Pure: the domain a client types, in the shape the server accepts (the server checks it again). Returns { ok, host, message }. */
  function checkDomain(input) {
    const bad = (message) => ({ ok: false, host: '', message });
    if (typeof input !== 'string') return bad('Type the address of your domain, for example www.yourdomain.com.');
    const t = input.trim().toLowerCase().replace(/\.$/, '');
    if (!t || t.length > 253) return bad('Type the address of your domain, for example www.yourdomain.com.');
    if (/^[a-z][a-z0-9+.-]*:\/\//.test(t) || /[/\\?#@:\s*_]/.test(t)) return bad('Type only the host name, like www.yourdomain.com: no https://, no slash.');
    const labels = t.split('.');
    if (labels.length < 2 || labels.some((l) => !isLabel(l)) || !/^[a-z0-9-]{2,63}$/.test(labels[labels.length - 1]) || /^[0-9]+$/.test(labels[labels.length - 1])) return bad('That is not a valid domain address. Example: www.yourdomain.com.');
    if (t === 'edvlabs.com' || t.endsWith('.edvlabs.com')) return bad('Use your own domain here. Addresses ending in edvlabs.com already work.');
    if (labels.length === 2 || (labels.length === 3 && SECOND_LEVEL.has(labels.slice(1).join('.')))) return bad(BARE);
    return { ok: true, host: t, message: '' };
  }

  /** Pure: the edvlabs name a domain's site is first put online under: www.bakery-anna.com -> bakery-anna. Always a valid name (3 to 30 characters). */
  function siteNameFor(host) {
    let labels = String(host || '').toLowerCase().split('.');
    labels = labels.slice(0, labels.length >= 3 && SECOND_LEVEL.has(labels.slice(-2).join('.')) ? -2 : -1);
    if (labels[0] === 'www') labels.shift();
    let name = labels.join('-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30).replace(/-$/, '');
    if (name.length < 3) name = (name || 'my') + '-site';
    return name;
  }

  /** Pure: the order the server is asked about. Choices only; the server never reads a price from it. */
  function orderFrom(s) {
    const o = optionsFor(s.destination);
    // hosting 'none' (a bought page keeping its hosting) sends no hosting
    const order = { projectId: s.projectId, destination: s.destination, editor: !!s.editor, hosting: o.hosting && (s.hosting === 'monthly' || s.hosting === 'yearly') ? s.hosting : null, deployHelp: o.deployHelp && !!s.deployHelp };
    if ((o.name || s.destination === 'domain') && s.siteName) order.siteName = s.siteName; // for an own domain the name is made from the domain
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
    // while buying is on, step 5 stays short: the count, one total and Proceed; address, editor and "done for you" wait in a closed "More options"
    const more = el(doc, 'details', { class: 'buy-more', id: 'buyMore' });
    more.append(el(doc, 'summary', {}, 'More options: web address, editor, done for you'));
    ['.gt-editor', '.gt-address', '.gt-help'].forEach((sel) => { const n = pane.querySelector(sel); if (n) more.append(n); });
    const sum = pane.querySelector('#getTotal');
    if (sum) sum.after(proceed, note, more); else pane.append(proceed, note, more);
    if (pane.closest('#paneGet')) pane.closest('#paneGet').classList.add('buy-on');
    let editorDefault = false; try { editorDefault = win.localStorage.getItem(EDITOR_KEY) === '1'; } catch (_) { editorDefault = false; }

    let purchases = Array.isArray(initial) ? initial : [];
    let overlay = null, opener = null, timer = null, quoteSeq = 0;
    const s = { step: 1, destination: 'edvlabs', siteName: '', domainText: '', domainHost: '', nameFree: false, editor: editorDefault, hosting: 'monthly', deployHelp: false, waiver: false, projectId: '', quote: null, testMode: false, message: '' };

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

    const domainSaid = () => 'Your site goes online first at ' + s.siteName + '.edvlabs.com, then we connect ' + s.domainHost + '. After paying you add one record at your domain provider; we show you exactly what.';
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
        if (s.destination === 'domain') {
          const input = el(doc, 'input', { type: 'text', id: 'buyDomain', class: 'gt-input', maxlength: '253', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'www.yourdomain.com', 'aria-describedby': 'buyDomainNote' }); input.value = s.domainText;
          const dn = el(doc, 'small', { id: 'buyDomainNote', role: 'status', 'aria-live': 'polite' }, s.nameFree ? domainSaid() : '');
          input.addEventListener('input', () => { s.domainText = input.value; s.nameFree = false; s.domainHost = ''; next.disabled = true; clearTimeout(timer); timer = setTimeout(async () => {
            const c = checkDomain(input.value);
            if (!c.ok) { dn.textContent = input.value.trim() ? c.message : ''; return; }
            dn.textContent = 'Checking…';
            const base = siteNameFor(c.host); let found = '';
            for (let i = 1; i <= 5 && !found; i++) { // the site is first put online at an edvlabs name made from the domain; if it is taken, a number is added
              const candidate = i === 1 ? base : base.slice(0, 28) + '-' + i; const r = await client.checkName(candidate);
              if (checkDomain(input.value).host !== c.host) return; // the person kept typing
              const j = r.json || {}; if (r.status === 200 && j.ok && (j.available || j.reason === 'yours')) found = candidate;
            }
            if (!found) { dn.textContent = 'We could not find a free edvlabs name for this domain just now. Please try again.'; return; }
            s.siteName = found; s.domainHost = c.host; s.nameFree = true; dn.textContent = domainSaid(); next.disabled = false;
          }, CHECK_DELAY); });
          body.append(el(doc, 'label', { for: 'buyDomain' }, 'Which domain should the site use?'), input, dn);
        }
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
          const choices = [['monthly', 'Monthly ' + eur(win.EdvPrices.table.hostingMonth)], ['yearly', 'Yearly ' + eur(win.EdvPrices.table.hostingYear)]];
          if (s.bought) choices.unshift(['none', 'No change: keep my hosting as it is']); // adding blocks must never start a second subscription
          choices.forEach(([v, t]) => {
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
        if (s.quote && s.quote.vatIncluded) body.append(el(doc, 'p', { id: 'buyVat', class: 'buy-vat' }, 'Prices include VAT where it applies. You can add your VAT number on the payment page, and you get an invoice by email.'));
        const w = el(doc, 'input', { type: 'checkbox', id: 'buyWaiver' }); w.checked = s.waiver;
        const werr = el(doc, 'p', { class: 'buy-error', id: 'buyWaiverError', role: 'alert' }, 'Please tick the box above to continue.'); werr.hidden = true;
        w.addEventListener('change', () => { s.waiver = w.checked; if (s.waiver) { werr.hidden = true; w.removeAttribute('aria-invalid'); } });
        body.append(el(doc, 'label', { class: 'buy-waiver' }, null)); body.lastChild.append(w, ' I want the website made available to me at once, and I know I then lose my right to withdraw from this digital purchase.');
        body.append(werr);
      }
      if (s.message) body.append(el(doc, 'p', { class: 'buy-error', role: 'alert' }, s.message));
      if (s.testMode) body.append(el(doc, 'p', { class: 'buy-test' }, 'Test mode: no real money is taken. Use the card 4242 4242 4242 4242.'));
      total.textContent = s.quote ? 'Pay today: ' + eur(s.quote.payToday) + (s.quote.hosting ? ' (hosting free for ' + s.quote.hosting.trialDays + ' days)' : '') : (s.step === 1 ? '' : 'Working out the price…');
      back.hidden = s.step === 1; next.hidden = s.step === 3; pay.hidden = s.step !== 3;
      next.disabled = s.step === 1 && (o.name || s.destination === 'domain') ? !s.nameFree : false;
      pay.disabled = !s.quote;
      const first = body.querySelector('input:checked, input, button'); if (first && first.focus && !doc.activeElement.closest('.buy-body')) first.focus();
    }

    const total = el(doc, 'p', { id: 'buyTotal', role: 'status', 'aria-live': 'polite' });
    const back = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'buyBack' }, 'Back');
    const next = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'buyNext' }, 'Next');
    const pay = el(doc, 'button', { type: 'button', class: 'builder-btn-primary', id: 'buyPay' }, 'Pay securely with Stripe');
    back.addEventListener('click', () => { s.step = Math.max(1, s.step - 1); render(); });
    next.addEventListener('click', () => { s.step = Math.min(3, s.step + 1); s.message = ''; render(); if (s.step >= 2) refreshQuote(); });
    pay.addEventListener('click', async () => {
      if (!s.waiver) { // say what is missing instead of a button that silently does nothing
        const box = overlay && overlay.querySelector('#buyWaiver'), err = overlay && overlay.querySelector('#buyWaiverError');
        if (err) err.hidden = false;
        if (box) { box.setAttribute('aria-invalid', 'true'); box.focus(); }
        return;
      }
      pay.disabled = true; s.message = 'Opening the payment page…'; render();
      try { win.sessionStorage.setItem(NAME_KEY, optionsFor(s.destination).name || s.destination === 'domain' ? s.siteName : ''); win.sessionStorage.setItem(DOMAIN_KEY, s.destination === 'domain' ? s.domainHost : ''); } catch (_) { /* the name is then typed again */ }
      const r = await client.checkout(orderFrom(s));
      if (r.status === 200 && r.json && r.json.ok && typeof r.json.url === 'string' && STRIPE.test(r.json.url)) { win.location.assign(r.json.url); return; }
      s.message = (r.json && r.json.errors && r.json.errors[0]) || Client.explain(r.status, r.json).message; render();
    });

    proceed.addEventListener('click', async () => {
      opener = proceed; proceed.disabled = true; note.textContent = 'Saving your page to your account…';
      const id = await savedProjectId();
      proceed.disabled = false;
      if (!id) { note.textContent = 'Your page could not be saved to your account just now, so it cannot be bought yet. Please try again in a moment.'; return; }
      try { win.sessionStorage.setItem(KNOWN_KEY, JSON.stringify(boughtFor(id).map((p) => p.id))); } catch (_) { /* then the list at return is used */ }
      note.textContent = ''; s.projectId = id; s.bought = boughtFor(id).length > 0; if (s.bought && s.hosting !== 'yearly') s.hosting = 'none'; else if (!s.bought && s.hosting === 'none') s.hosting = 'monthly'; s.step = 1; s.quote = null; s.message = ''; s.waiver = false;
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
    const boughtLine = el(doc, 'p', { class: 'buy-bought', id: 'buyBought', hidden: '' });
    if (sum) sum.before(boughtLine);
    async function applyLock() {
      const pid = await currentProjectId(), mine = boughtFor(pid);
      // a bought page says what was bought instead of showing a price and the add-on choice again
      const blocks = Math.max(0, ...mine.map((p) => p.allowance)), withEditor = mine.some((p) => p.editor);
      boughtLine.hidden = !mine.length;
      boughtLine.textContent = mine.length ? 'Bought: up to ' + blocks + ' block' + (blocks === 1 ? '' : 's') + (withEditor ? ', admin panel included' : '') + '.' : '';
      if (paneGet) { paneGet.classList.toggle('buy-bought', mine.length > 0); paneGet.classList.toggle('buy-has-editor', withEditor); }
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

    /* An edvlabs address: right after paying, the page goes online at the name that was chosen, by pressing the same "Put it online" button for the person. */
    async function putOnline(name) {
      note.textContent = 'Payment received. Putting your site online at ' + name + '.edvlabs.com…';
      let box = null, go = null;
      for (let i = 0; i < 30 && !(box && go); i++) { box = doc.getElementById('publishName'); go = doc.getElementById('publishGo'); if (!(box && go)) await new Promise((res) => setTimeout(res, 200)); }
      if (!box || !go) { note.textContent = 'Payment received. Choose the name ' + name + ' and press “Put it online”.'; return null; }
      box.value = name; box.dispatchEvent(new win.Event('input', { bubbles: true }));
      for (let i = 0; i < 40 && go.disabled; i++) await new Promise((res) => setTimeout(res, 250)); // the name is checked while it is typed
      if (go.disabled) { note.textContent = 'Payment received. The name ' + name + ' could not be used just now. Please choose a name and press “Put it online”.'; return null; }
      go.click();
      note.textContent = 'Payment received. Your site is going online at ' + name + '.edvlabs.com.';
      for (let i = 0; i < 30; i++) { // wait until the site is live, so a domain can be attached to it
        await new Promise((res) => setTimeout(res, 1000));
        const r = await client.mySites();
        const site = r.status === 200 && r.json && r.json.ok ? r.json.sites.find((x) => x.name === name && x.status === 'live') : null;
        if (site) return site;
      }
      return null;
    }

    /* An own domain: the site is online at its edvlabs name; now the domain is attached and the client is told exactly what to add at his domain provider. */
    const helpBox = el(doc, 'section', { id: 'buyDomainHelp', class: 'buy-domain', hidden: '' });
    pane.append(helpBox);
    function showDomainHelp(site, view) {
      helpBox.replaceChildren(); helpBox.hidden = false;
      const state = el(doc, 'p', { id: 'buyDomainState', role: 'status', 'aria-live': 'polite' });
      const say2 = (v) => { state.textContent = v.status === 'active' ? 'Your domain is working. Your site is now at ' + v.hostname + '.' : v.status === 'failed' ? 'We could not connect the domain yet' + (v.error ? ': ' + v.error : '.') + ' Check the record below, or write to edvlabs.' : 'Still waiting for the record to reach everyone. This can take up to an hour, sometimes longer. Your site works at ' + site.name + '.edvlabs.com meanwhile.'; };
      helpBox.append(el(doc, 'h4', {}, 'One more step: connect ' + view.hostname));
      const steps = el(doc, 'ol', {});
      steps.append(el(doc, 'li', {}, 'Open the website where you bought ' + view.hostname.replace(/^www\./, '') + ' (your domain provider) and find “DNS” or “DNS records”.'),
        el(doc, 'li', {}, 'Add this record, exactly as written:'));
      const rec = (r) => el(doc, 'p', { class: 'buy-record' }, 'Type: ' + r.type + '   Name: ' + r.name + '   Value: ' + r.value);
      (view.records || []).forEach((r) => steps.lastChild.append(rec(r)));
      steps.append(el(doc, 'li', {}, 'Save it. It can take up to an hour (sometimes longer) for the change to reach everyone.'),
        el(doc, 'li', {}, 'That is all. We switch to your domain by ourselves when it works. Until then your site is at ' + site.name + '.edvlabs.com.'));
      (view.optionalRecords || []).forEach((r) => steps.append(el(doc, 'li', {}, 'Only if it is still waiting after an hour, also add: Type: ' + r.type + '   Name: ' + r.name + '   Value: ' + r.value)));
      const check = el(doc, 'button', { type: 'button', class: 'builder-btn-subtle', id: 'buyDomainCheck' }, 'Check now');
      check.addEventListener('click', async () => {
        check.disabled = true; const r = await client.siteDomainStatus(site.id); check.disabled = false;
        if (r.status === 200 && r.json && r.json.ok) say2(r.json); else state.textContent = (r.json && r.json.errors && r.json.errors[0]) || 'The domain could not be checked just now.';
      });
      helpBox.append(steps, state, check); say2(view);
    }
    async function connectDomain(site, host) {
      const r = await client.siteDomain('add', site.id, host);
      if (r.status === 200 && r.json && r.json.ok) { showDomainHelp(site, r.json); note.textContent = 'Payment received. Your site is online at ' + site.name + '.edvlabs.com. One more step: connect ' + host + '.'; }
      else note.textContent = 'Your site is online at ' + site.name + '.edvlabs.com. We could not connect ' + host + ' just now' + (r.json && r.json.errors && r.json.errors[0] ? ': ' + r.json.errors[0] : '.') + ' You can connect it later in “My websites” on your account page.';
    }

    /* Back from Stripe: the payment is confirmed by Stripe telling our server, which can take a moment, so look a few times. */
    async function afterPayment() {
      note.textContent = 'Thank you. Confirming your payment…';
      try { win.history.replaceState(null, '', win.location.pathname + win.location.hash); } catch (_) { /* a reload would only look again */ }
      const pid = await currentProjectId();
      let known = null; try { const raw = win.sessionStorage.getItem(KNOWN_KEY); known = raw ? new Set(JSON.parse(raw)) : null; win.sessionStorage.removeItem(KNOWN_KEY); } catch (_) { known = null; }
      if (!known) known = new Set(purchases.map((p) => p.id)); // no record of the time before paying: only a purchase that appears from now on is new
      let list = purchases;
      for (let i = 0; i < 8; i++) {
        if (i > 0) { await new Promise((res) => setTimeout(res, 1500)); const r0 = await client.myPurchases(); if (!(r0.status === 200 && r0.json && r0.json.ok)) continue; list = r0.json.purchases; }
        const r = { status: 200, json: { ok: true, purchases: list } };
        if (r.status === 200 && r.json && r.json.ok) {
          const fresh = r.json.purchases.find((p) => p.projectId === pid && !known.has(p.id));
          if (fresh) {
            purchases = r.json.purchases; await applyLock(); showDeployForm();
            note.textContent = fresh.destination === 'download' ? 'Payment received. Your download is ready: use “Go to the download”.' : fresh.destination === 'edvlabs' ? 'Payment received. Choose the name you picked and press “Put it online”.' : 'Payment received. Your site is yours to put online; your own domain can be connected from “My websites” on your account page.';
            let name = ''; try { name = win.sessionStorage.getItem(NAME_KEY) || ''; win.sessionStorage.removeItem(NAME_KEY); } catch (_) { name = ''; }
            doc.dispatchEvent(new win.CustomEvent('edvlabs:purchased'));
            let host = ''; try { host = win.sessionStorage.getItem(DOMAIN_KEY) || ''; win.sessionStorage.removeItem(DOMAIN_KEY); } catch (_) { host = ''; }
            if ((fresh.destination === 'edvlabs' || fresh.destination === 'domain') && name) {
              const site = await putOnline(name);
              if (site && fresh.destination === 'domain' && host) await connectDomain(site, host);
              else if (!site && fresh.destination === 'domain') note.textContent = 'Payment received. Your site could not be put online just now. Please press “Put it online”, then connect your domain from “My websites” on your account page.';
            } else if (fresh.destination === 'domain') note.textContent = 'Payment received. Put your site online, then connect your domain from “My websites” on your account page.';
            return;
          }
        }
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

  const api = { run, optionsFor, orderFrom, checkDomain, siteNameFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.BuilderGuidedBuy = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(window)); else run(window);
  }
})();
