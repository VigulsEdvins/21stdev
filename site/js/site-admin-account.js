/* "My websites" on the account page (plan 2026-10-31-site-admin-panel.md): for each published site the website link and, when it is on, the admin panel link,
   always shown; and turning the admin panel on, changing its username, password or secret address, and removing it.
   Talks to /api/my-sites and /api/site-admin with the person's sign-in token. Everything on screen is set with textContent. The password is sent once and never kept.
   create({ token, fetchImpl, clipboard }) -> { show() } */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvSiteAdmin = api;
})(typeof self !== 'undefined' ? self : this, function () {
  /** The address of a site (or of its admin panel) only if it is a plain https address (the local demo's http://<name>.localhost:<port> too); it is used as a link. Otherwise ''. */
  function safeUrl(value, admin) {
    let u;
    try { u = new URL(String(value)); } catch (e) { return ''; }
    if (u.href !== value || u.search || u.hash || u.username || u.password) return '';
    if (admin ? !/^\/admin[0-9]{10}$/.test(u.pathname) : u.pathname !== '/') return '';
    const label = u.hostname.split('.')[0];
    if (!/^[a-z0-9-]{3,30}$/.test(label)) return '';
    if (u.protocol === 'https:' && u.port === '' && u.hostname.includes('.') && /^[a-z0-9.-]+$/.test(u.hostname)) return value;
    if (u.protocol === 'http:' && u.hostname === label + '.localhost') return value;
    return '';
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function when(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; }

  function create(deps) {
    const f = deps.fetchImpl || ((...a) => fetch(...a));
    const $ = (id) => document.getElementById(id);
    const note = (text, kind) => { const box = $('ws-msg'); box.replaceChildren(); if (text) { const d = el('div', 'alert alert--' + (kind || 'info')); d.append(el('p', '', text)); box.append(d); } };

    async function call(method, path, body) {
      const t = await deps.token();
      if (!t) return { status: 401, json: { ok: false, errors: ['Please sign in again.'] } };
      let r;
      try { r = await f('/api' + path, { method, headers: Object.assign({ Authorization: 'Bearer ' + t }, body === undefined ? {} : { 'Content-Type': 'application/json' }), body: body === undefined ? undefined : JSON.stringify(body) }); } catch (e) { return { status: 0, json: { ok: false, errors: ['No connection.'] } }; }
      let json = null; try { json = await r.json(); } catch (e) { json = null; }
      return { status: r.status, json };
    }
    const words = (r) => (r.json && r.json.errors && r.json.errors[0]) || (r.status === 401 ? 'Please sign in again.' : 'That did not work just now. Please try again.');

    function linkRow(label, url, greyed) {
      const row = el('p', 'ws-line');
      row.append(el('strong', '', label + ' '));
      if (greyed) { row.append(el('span', 'ws-off', url + ' (the website is offline)')); }
      else { const a = el('a', '', url); a.href = url; a.target = '_blank'; a.rel = 'noopener'; row.append(a); }
      const copy = el('button', 'btn btn--secondary btn--small', 'Copy'); copy.type = 'button'; copy.setAttribute('aria-label', 'Copy the ' + label.toLowerCase() + ' link');
      copy.addEventListener('click', async () => { try { await (deps.clipboard || navigator.clipboard).writeText(url); copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1500); } catch (e) { note('Copying did not work here. Select the address and copy it by hand.', 'error'); } });
      row.append(' ', copy);
      return row;
    }

    /** A small form: fields [{ id, label, type, autocomplete }], a submit label, and a function that gets the values and returns a result. */
    function form(site, title, fields, submitLabel, run, hint) {
      const box = el('form', 'stack ws-form'); box.noValidate = true;
      box.append(el('h4', '', title));
      if (hint) box.append(el('p', 'hint', hint));
      const inputs = {};
      fields.forEach((fd) => {
        const wrap = el('div', 'field'), id = 'ws-' + site.id.slice(0, 8) + '-' + fd.id;
        const label = el('label', '', fd.label); label.htmlFor = id;
        const input = el('input', 'input'); input.id = id; input.type = fd.type || 'text'; input.autocomplete = fd.autocomplete || 'off'; input.maxLength = fd.type === 'password' ? 100 : 40;
        if (fd.type !== 'password') { input.setAttribute('autocapitalize', 'none'); input.spellcheck = false; }
        wrap.append(label, input); box.append(wrap); inputs[fd.id] = input;
      });
      const err = el('p', 'error-text'); err.setAttribute('role', 'alert');
      const go = el('button', 'btn', submitLabel); go.type = 'submit';
      const cancel = el('button', 'btn btn--secondary', 'Cancel'); cancel.type = 'button';
      box.append(err, el('div', 'btn-row')); box.lastChild.append(go, ' ', cancel);
      cancel.addEventListener('click', () => box.remove());
      box.addEventListener('submit', async (e) => {
        e.preventDefault(); err.textContent = '';
        const values = {}; Object.keys(inputs).forEach((k) => { values[k] = inputs[k].value; });
        go.disabled = true;
        const problem = await run(values);
        go.disabled = false;
        if (problem) err.textContent = problem; else { Object.values(inputs).forEach((i) => { i.value = ''; }); box.remove(); }
      });
      return box;
    }

    /** What is wrong with a new username and password, in the page's own words (the server checks again). '' when fine. */
    function localProblem(values, withUser) {
      if (withUser && !/^[A-Za-z0-9][A-Za-z0-9._-]{2,30}[A-Za-z0-9]$/.test(String(values.username || '').trim())) return 'The username needs 4 to 32 letters, numbers, dots, dashes or underscores, starting and ending with a letter or number.';
      if (values.password !== undefined) {
        if (values.password !== values.password2) return 'The two passwords are not the same.';
        const rules = typeof window !== 'undefined' ? window.EdvPassword : (typeof require === 'function' ? require('./password.js') : null), why = rules ? rules.problem(values.password, { email: '' }) : '';
        if (why) return why;
        if (withUser && values.password.toLowerCase().includes(String(values.username).trim().toLowerCase())) return 'The password must not contain the username.';
      }
      return '';
    }

    async function act(site, action, extra, done) {
      const r = await call('POST', '/site-admin', Object.assign({ action, siteId: site.id }, extra || {}));
      if (r.status === 200 && r.json && r.json.ok) { await done(r.json); return ''; }
      return words(r);
    }

    function adminBlock(site, li) {
      const a = site.admin, box = el('div', 'ws-admin');
      box.append(el('h4', '', 'Admin panel'));
      const offline = site.status !== 'live';
      if (a === null || a === undefined) { box.append(el('p', 'hint', 'The admin panel could not be read just now. Reload the page to try again.')); return box; }
      if (!a.on) {
        box.append(el('p', 'hint', 'Change texts, pictures and links on your live website yourself, with a username and a strong password. It lives at a secret address that only you will see here.'));
        const open = el('button', 'btn btn--secondary', 'Add admin panel'); open.type = 'button';
        open.addEventListener('click', () => {
          if (box.querySelector('.ws-form')) return;
          const fm = form(site, 'Add an admin panel', [{ id: 'username', label: 'Username', autocomplete: 'username' }, { id: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' }, { id: 'password2', label: 'Repeat the password', type: 'password', autocomplete: 'new-password' }], 'Add admin panel', async (v) => {
            const p = localProblem(v, true); if (p) return p;
            return act(site, 'enable', { username: v.username.trim(), password: v.password }, async (j) => { await show(); note(j.needsPublish ? 'The admin panel is on. Put your page online once more from the builder, so there is something to edit.' : 'The admin panel is on.', 'ok'); });
          }, 'The password needs 10 or more characters with a lowercase letter, a capital, a number and a symbol.');
          box.append(fm); fm.querySelector('input').focus();
        });
        box.append(open);
        return box;
      }
      const addr = safeUrl(a.address, true);
      if (addr) box.append(linkRow('Admin panel:', addr, offline));
      box.append(el('p', 'ws-line', 'Username: ' + a.username + (a.lastLoginAt ? ' · last signed in ' + when(a.lastLoginAt) : ' · not signed in yet')));
      const row = el('div', 'btn-row');
      const mk = (label, run) => { const b = el('button', 'btn btn--secondary btn--small', label); b.type = 'button'; b.addEventListener('click', () => { const old = box.querySelector('.ws-form'); if (old) old.remove(); run(); }); row.append(b, ' '); return b; };
      mk('Change password', () => box.append(form(site, 'Change the password', [{ id: 'password', label: 'New password', type: 'password', autocomplete: 'new-password' }, { id: 'password2', label: 'Repeat the new password', type: 'password', autocomplete: 'new-password' }], 'Change password', async (v) => {
        const p = localProblem(Object.assign({ username: a.username }, v), true); if (p) return p;
        return act(site, 'change', { password: v.password }, async () => { await show(); note('The password is changed. Anyone signed in to the admin panel has been signed out.', 'ok'); });
      })));
      mk('Change username', () => box.append(form(site, 'Change the username', [{ id: 'username', label: 'New username', autocomplete: 'username' }], 'Change username', async (v) => {
        const p = localProblem(v, true); if (p) return p;
        return act(site, 'change', { username: v.username.trim() }, async () => { await show(); note('The username is changed. Anyone signed in to the admin panel has been signed out.', 'ok'); });
      })));
      mk('New secret address', () => {
        const ask = el('div', 'ws-form'); ask.append(el('p', '', 'The admin panel moves to a new secret address and the old one stops working. Use this if you think the address was seen by someone.'));
        const yes = el('button', 'btn', 'Make a new address'); yes.type = 'button'; const no = el('button', 'btn btn--secondary', 'Cancel'); no.type = 'button';
        no.addEventListener('click', () => ask.remove());
        yes.addEventListener('click', async () => { yes.disabled = true; const p = await act(site, 'change', { newAddress: true }, async () => { await show(); note('The admin panel has a new secret address, shown above.', 'ok'); }); if (p) { yes.disabled = false; note(p, 'error'); } });
        ask.append(yes, ' ', no); box.append(ask);
      });
      mk('Remove admin panel', () => {
        const ask = el('div', 'ws-form'); ask.append(el('p', '', 'This removes the admin panel and every change made in it. The website goes back to how the builder made it. You can add a new admin panel later.'));
        const yes = el('button', 'btn', 'Yes, remove it'); yes.type = 'button'; const no = el('button', 'btn btn--secondary', 'Keep it'); no.type = 'button';
        no.addEventListener('click', () => ask.remove());
        yes.addEventListener('click', async () => { yes.disabled = true; const p = await act(site, 'remove', {}, async () => { await show(); note('The admin panel is removed.', 'ok'); }); if (p) { yes.disabled = false; note(p, 'error'); } });
        ask.append(yes, ' ', no); box.append(ask);
      });
      box.append(row);
      return box;
    }

    function siteItem(site) {
      const li = el('li', 'ws-item'); li.dataset.id = site.id;
      li.append(el('h3', 'ws-name', site.name));
      const addr = safeUrl(site.address, false);
      if (addr) li.append(linkRow('Website:', addr, site.status !== 'live'));
      if (site.status !== 'live') li.append(el('p', 'hint', site.status === 'blocked' ? 'This website has been blocked. Please contact edvlabs.' : 'This website is offline. Put it online again from the builder.'));
      li.append(adminBlock(site, li));
      return li;
    }

    async function show() {
      const list = $('ws-list'), empty = $('ws-empty');
      const r = await call('GET', '/my-sites');
      list.replaceChildren();
      if (r.status === 503) { $('ws-sec').hidden = true; return; } // putting pages online is not set up on this server: say nothing
      $('ws-sec').hidden = false;
      if (!(r.status === 200 && r.json && r.json.ok)) { empty.hidden = true; return note(words(r), 'error'); }
      empty.hidden = r.json.sites.length > 0;
      r.json.sites.forEach((s) => list.append(siteItem(s)));
    }

    return { show, localProblem };
  }

  return { create, safeUrl };
});
