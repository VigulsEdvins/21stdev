/* What a signed-in person sees under "You are signed in": My pages (rename, delete with undo), My answers, change email, delete account.
   account.js calls create() once and show(who) every time the signed-in view opens. No HTML strings: everything is set with textContent.
   deps: { auth, pages (my-pages.js), storage, notice(text, kind), signedOut() } */
(function () {
  const $ = (id) => document.getElementById(id);
  const BRIEF_KEY = 'edvlabs.brief_v1';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function when(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; }

  function create(deps) {
    let who = null;
    const msg = (text, kind, undo) => {
      const box = $('pg-msg'); box.replaceChildren();
      if (!text) return;
      const d = el('div', 'alert alert--' + (kind || 'info')); const p = el('p', '', text + (undo ? ' ' : '')); d.append(p);
      if (undo) { const b = el('button', 'linklike', 'Undo'); b.type = 'button'; b.addEventListener('click', undo); p.append(b); }
      box.append(d);
    };

    function row(page) {
      const li = el('li', 'pg-item'); li.dataset.id = page.id;
      const name = el('span', 'pg-name', page.name);
      const tag = el('span', 'pg-tag', page.status === 'paid' ? 'Paid' : 'Draft'); tag.dataset.status = page.status;
      const meta = el('span', 'pg-meta', page.updatedAt ? 'Edited ' + when(page.updatedAt) : '');
      const rename = el('button', 'btn btn--secondary btn--small', 'Rename'); rename.type = 'button';
      const del = el('button', 'btn btn--secondary btn--small', 'Delete'); del.type = 'button';
      rename.setAttribute('aria-label', 'Rename ' + page.name); del.setAttribute('aria-label', 'Delete ' + page.name);
      rename.addEventListener('click', () => edit(li, page));
      del.addEventListener('click', async () => {
        const r = await deps.pages.remove(page.id);
        if (!r.ok) return msg(r.message, 'error');
        await load();
        msg('“' + page.name + '” is deleted. It stays for 30 days.', 'ok', async () => { const b = await deps.pages.restore(page.id); await load(); msg(b.ok ? '“' + page.name + '” is back.' : b.message, b.ok ? 'ok' : 'error'); });
      });
      li.append(name, tag, meta, rename, del);
      return li;
    }

    function edit(li, page) {
      li.replaceChildren();
      const input = el('input', 'input'); input.type = 'text'; input.value = page.name; input.maxLength = 120; input.setAttribute('aria-label', 'Name of the page');
      const save = el('button', 'btn btn--small', 'Save'); save.type = 'button';
      const cancel = el('button', 'btn btn--secondary btn--small', 'Cancel'); cancel.type = 'button';
      const done = async () => {
        const r = await deps.pages.rename(page.id, input.value);
        if (!r.ok) return msg(r.message, 'error');
        msg(''); await load();
      };
      save.addEventListener('click', done); cancel.addEventListener('click', () => load());
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } else if (e.key === 'Escape') load(); });
      li.append(input, save, cancel); input.focus(); input.select();
    }

    async function load() {
      const list = $('pg-list'), empty = $('pg-empty');
      const r = await deps.pages.list();
      list.replaceChildren();
      if (!r.ok) { empty.hidden = true; return msg(r.message, 'error'); }
      empty.hidden = r.pages.length > 0;
      r.pages.forEach((p) => list.append(row(p)));
    }

    function answers() {
      let n = 0;
      try { const b = JSON.parse(deps.storage.getItem(BRIEF_KEY)); n = b && b.answers ? Object.keys(b.answers).length : 0; } catch (_) { n = 0; }
      $('an-text').textContent = n ? 'You have answered ' + n + (n === 1 ? ' question.' : ' questions.') + ' They are kept in your account, so you can carry on from any device.' : 'You have not answered the questions yet. They help us suggest the right blocks for your page.';
    }

    async function submitEmail(e) {
      e.preventDefault(); $('em-new-err').textContent = ''; deps.notice('');
      const value = $('em-new').value.trim();
      const r = await deps.auth.changeEmail(value);
      if (!r.ok) { $('em-new-err').textContent = r.message; return; }
      $('em-new').value = '';
      deps.notice('We sent a link to ' + value + '. Your sign-in address changes once you press it. Until then, keep using ' + who.email + '.', 'ok');
    }

    function toggleDelete(open) {
      $('f-del').hidden = !open; $('b-del').hidden = open; $('dl-email-err').textContent = '';
      if (open) $('dl-email').focus(); else { $('dl-email').value = ''; $('b-del').focus(); }
    }
    async function submitDelete(e) {
      e.preventDefault(); $('dl-email-err').textContent = '';
      if ($('dl-email').value.trim().toLowerCase() !== String(who.email || '').toLowerCase()) { $('dl-email-err').textContent = 'That is not the address on this account. Type it exactly, or choose “Keep my account”.'; return; }
      $('dl-go').disabled = true;
      const r = await deps.auth.deleteAccount();
      $('dl-go').disabled = false;
      if (!r.ok) { $('dl-email-err').textContent = r.message; return; }
      toggleDelete(false);
      deps.signedOut('Your account and everything saved in it are deleted. Answers kept in this browser stay here until you clear it.');
    }

    $('f-email').addEventListener('submit', submitEmail);
    $('b-del').addEventListener('click', () => toggleDelete(true)); $('dl-cancel').addEventListener('click', () => toggleDelete(false)); $('f-del').addEventListener('submit', submitDelete);

    return {
      async show(person) {
        who = person; msg(''); toggleDelete(false);
        $('f-email').hidden = person.provider !== 'email'; // a Google or GitHub account takes its address from there
        answers();
        await load();
      }
    };
  }

  window.EdvAccountExtras = { create };
})();
