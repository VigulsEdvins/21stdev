/* The question flow. One question per screen, answers kept in this browser, the address hash is the screen
   (#q1 … #q10, #check, #choose, #contact, #thanks) so Back, refresh and links behave. No innerHTML anywhere. */
(function () {
  const { QUESTIONS, blockCount, wantsEditor } = window.EdvQuestions;
  const P = window.EdvPrices;
  const KEY = 'edvlabs.brief_v1';
  const root = document.getElementById('q');
  const priceBox = document.getElementById('q-price');
  const dots = document.getElementById('q-dots');
  const count = document.getElementById('q-count');
  const UNKNOWN = "I don’t know yet";
  const CONSENT = 'It is fine to contact me about this page.';

  let brief = load();
  function load() {
    try { const b = JSON.parse(localStorage.getItem(KEY)); if (b && b.v === 1 && b.answers) return b; } catch (e) { /* storage may be blocked */ }
    return { v: 1, answers: {}, path: null };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(brief)); } catch (e) { /* the page still works without it */ } }

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  }
  const btn = (label, cls, onclick, extra) => h('button', Object.assign({ type: 'button', class: 'btn ' + (cls || ''), onclick }, extra), label);
  const answer = (id) => brief.answers[id] || { value: null, unknown: false, note: '' };

  /* ---------- price ---------- */
  function showPrice(fromIndex) {
    priceBox.replaceChildren();
    if (fromIndex < 3) return; // from question 4 on
    const b = blockCount(brief.answers), ed = wantsEditor(brief.answers);
    const chosen = answer('blocks');
    const guess = chosen.unknown || !(chosen.value && chosen.value.length);
    priceBox.append(h('div', { class: 'meter' },
      h('b', { text: 'about ' + P.eur(P.self(b, ed)) }),
      h('span', { text: 'for yourself, from ' + P.eur(P.done(b, ed)) + ' if we do it. ' + (guess ? 'Worked out for ' + b + ' blocks, the usual size.' : b + ' blocks' + (ed ? ', with the editor.' : '.')) })));
  }

  /* ---------- question screen ---------- */
  function questionScreen(i) {
    const q = QUESTIONS[i], a = answer(q.id), many = q.type === 'many', text = q.type === 'text';
    const name = 'a-' + q.id;
    const unknownOn = () => answer(q.id).unknown;
    const inputs = [];
    let field, unknownInput;

    function commit() {
      if (text) brief.answers[q.id] = { value: field.value.trim(), unknown: unknownInput.checked, note: '' };
      else {
        const picked = inputs.filter((x) => x.checked).map((x) => x.value);
        brief.answers[q.id] = { value: many ? picked : (picked[0] || null), unknown: unknownInput.checked, note: '' };
      }
      save(); showPrice(i);
    }
    function onPick(el) {
      if (!text) {
        if (el === unknownInput && el.checked) inputs.forEach((x) => { x.checked = false; });
        else if (el !== unknownInput && el.checked) unknownInput.checked = false;
        if (many && q.max) {
          const on = inputs.filter((x) => x.checked);
          if (on.length > q.max) el.checked = false;
        }
      } else if (el === field && field.value.trim()) unknownInput.checked = false;
      else if (el === unknownInput && el.checked) field.value = '';
      commit();
    }
    const optionCard = (value, label, hint, checked, isUnknown) => {
      const input = h('input', { type: many ? 'checkbox' : 'radio', name, value, checked: checked || false, onchange: (e) => onPick(e.target) });
      if (isUnknown) unknownInput = input; else inputs.push(input);
      return h('label', { class: 'option' + (isUnknown ? ' is-unknown' : '') }, input, h('b', { text: label }), hint ? h('small', { text: hint }) : null);
    };

    let body;
    if (text) {
      field = h('input', { class: 'input', id: 'a-text', type: 'text', autocomplete: 'off', value: a.value || '', oninput: (e) => onPick(e.target) });
      unknownInput = h('input', { type: 'checkbox', checked: a.unknown || false, onchange: (e) => onPick(e.target) });
      body = h('div', { class: 'stack' }, h('div', { class: 'field' }, h('label', { for: 'a-text', text: q.label }), field),
        h('label', { class: 'choice' }, unknownInput, UNKNOWN));
    } else {
      const picked = new Set(many ? (a.value || []) : [a.value]);
      const cards = q.options.map(([v, l, hint]) => optionCard(v, l, hint, !a.unknown && picked.has(v), false));
      cards.push(optionCard('__unknown', q.suggest || UNKNOWN, q.suggest ? 'We will pick sensible blocks for you.' : '', a.unknown, true));
      const cls = 'q-options' + (q.layout === 'blocks' ? ' is-blocks' : (q.options.length > 4 ? '' : ' is-list'));
      body = h('div', { class: q.layout === 'blocks' ? 'option-grid-wrap' : '' }, h('div', { class: cls }, cards));
    }
    const legendId = 'q-title';
    const card = h('div', null,
      h('fieldset', { 'aria-describedby': 'q-help' },
        h('legend', null, h('h1', { id: legendId, tabindex: '-1', text: q.title })),
        h('p', { class: 'lead', id: 'q-help', text: q.help + (many && q.max ? ' (up to ' + q.max + ')' : '') }), body),
      h('div', { class: 'q-nav' },
        i > 0 ? btn('Back', 'btn--secondary', () => go('q' + i)) : null,
        h('span', { class: 'spacer' }),
        btn('Skip', 'btn--secondary', () => go(i + 1 < QUESTIONS.length ? 'q' + (i + 2) : 'check')),
        btn(i + 1 < QUESTIONS.length ? 'Next' : 'See my answers', '', () => go(i + 1 < QUESTIONS.length ? 'q' + (i + 2) : 'check'))));
    return card;
  }

  /* ---------- summary, choice, contact ---------- */
  function describe(q) {
    const a = answer(q.id);
    if (a.unknown) return UNKNOWN;
    if (q.type === 'text') return a.value || 'Not answered';
    const label = (v) => (q.options.find((o) => o[0] === v) || [0, v])[1];
    if (Array.isArray(a.value)) return a.value.length ? a.value.map(label).join(', ') : 'Not answered';
    return a.value ? label(a.value) : 'Not answered';
  }
  function checkScreen() {
    const dl = h('dl', { class: 'summary' });
    QUESTIONS.forEach((q, i) => dl.append(h('dt', { text: q.title }), h('dd', null, h('span', { text: describe(q) }), h('a', { class: 'link', href: '#q' + (i + 1), 'aria-label': 'Change: ' + q.title }, 'Change'))));
    return h('div', null, h('h1', { id: 'q-title', tabindex: '-1', text: 'Here is what you told us.' }),
      h('p', { class: 'lead', text: 'Check it over. Anything marked “not answered” or “I don’t know yet” is fine; we help with it.' }), dl,
      h('div', { class: 'q-nav' }, btn('Back', 'btn--secondary', () => go('q' + QUESTIONS.length)), h('span', { class: 'spacer' }), btn('Choose who makes it', '', () => go('choose'))));
  }
  /* "You build it" needs an account. If accounts are not switched on yet (no /api/config answer), fall back to the "tell me when it opens" form. */
  function openAccount() {
    fetch('/api/config', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((cfg) => { if (cfg && cfg.supabaseUrl && cfg.anonKey) location.assign('../account/?from=start'); else go('contact'); });
  }
  function chooseScreen() {
    const b = blockCount(brief.answers), ed = wantsEditor(brief.answers);
    const way = (cls, kicker, title, price, small, items, label, path) => h('div', { class: 'way ' + cls }, h('span', { class: 'kicker', text: kicker }), h('h2', { class: 'h3', text: title }),
      h('div', { class: 'price' }, price, ' ', h('small', { text: small })), h('ul', null, items.map((t) => h('li', { text: t }))), btn(label, '', () => { brief.path = path; save(); if (path === 'self') openAccount(); else go('contact'); }));
    return h('div', null, h('h1', { id: 'q-title', tabindex: '-1', text: 'Who should make your page?' }),
      h('p', { class: 'lead', text: 'Both give you the same finished files. Prices are worked out for ' + b + ' blocks' + (ed ? ' and the editor.' : '.') }),
      h('div', { class: 'fork' },
        way('', 'You build it', 'We guide you.', P.eur(P.self(b, ed)), 'about', ['You choose blocks, write your words and pick the look', 'Free to try before you pay', 'You download the files when you pay'], 'I will build it', 'self'),
        way('way--teal', 'We build it', 'You talk. We make.', P.eur(P.done(b, ed)), 'from, agreed first', ['We read your answers and get in touch', 'You send the words and photos you have', 'The same files, ready to put online'], 'Ask edvlabs to do it', 'done')),
      h('p', { class: 'mt-5' }, h('a', { class: 'link', href: '#contact', onclick: () => { brief.path = 'talk'; save(); } }, 'I want to talk first')),
      h('div', { class: 'q-nav' }, btn('Back', 'btn--secondary', () => go('check'))));
  }
  function contactScreen() {
    const path = brief.path || 'done';
    const copy = {
      done: ['How can we reach you?', 'Leave an email address or a phone number. One is enough. We will get in touch, and send nothing else.', 'Send my answers'],
      talk: ['How can we reach you?', 'Leave an email address or a phone number and we will talk before anything is decided.', 'Ask us to talk'],
      self: ['The builder is being finished.', 'The do-it-yourself builder is not open yet. Leave an email address or a phone number and we will tell you the day it opens. Your answers are kept in this browser until then.', 'Tell me when it opens']
    }[path];
    const email = h('input', { class: 'input', id: 'c-email', type: 'email', autocomplete: 'email', 'aria-describedby': 'c-err-email' });
    const phone = h('input', { class: 'input', id: 'c-phone', type: 'tel', autocomplete: 'tel', 'aria-describedby': 'c-err-phone' });
    const name = h('input', { class: 'input', id: 'c-name', type: 'text', autocomplete: 'name' });
    const how = h('select', { class: 'select', id: 'c-how' }, ['Any way is fine', 'Email', 'Phone call', 'Text message'].map((t) => h('option', { text: t })));
    const consent = h('input', { type: 'checkbox', id: 'c-consent' });
    const trap = h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' });
    const errEmail = h('span', { class: 'error-text', id: 'c-err-email', role: 'alert' });
    const errPhone = h('span', { class: 'error-text', id: 'c-err-phone', role: 'alert' });
    const consentErr = h('span', { class: 'error-text', id: 'c-cerr', role: 'alert' });
    const f1 = h('div', { class: 'field' }, h('label', { for: 'c-email', text: 'Email address' }), email, errEmail);
    const f2 = h('div', { class: 'field' }, h('label', { for: 'c-phone', text: 'Phone number' }), h('span', { class: 'hint', text: 'Use a + and the country code.' }), phone, errPhone);
    const f4 = h('div', { class: 'field' }, consentErr);
    function submit(e) {
      e.preventDefault();
      const em = email.value.trim(), ph = phone.value.trim();
      let ok = true;
      [f1, f2, f4].forEach((f) => f.classList.remove('has-error'));
      [errEmail, errPhone, consentErr].forEach((x) => { x.textContent = ''; });
      email.removeAttribute('aria-invalid'); phone.removeAttribute('aria-invalid');
      const emOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em), phOk = /^\+?[0-9 ()-]{6,}$/.test(ph);
      // each problem is shown under the box it is about; "leave one of the two" sits under the first box
      if (!em && !ph) { errEmail.textContent = 'Leave an email address or a phone number.'; f1.classList.add('has-error'); email.setAttribute('aria-invalid', 'true'); ok = false; }
      else {
        if (em && !emOk) { errEmail.textContent = 'That does not look like an email address. It should look like name@example.com.'; f1.classList.add('has-error'); email.setAttribute('aria-invalid', 'true'); ok = false; }
        if (ph && !phOk) { errPhone.textContent = 'That does not look like a phone number. Use digits, and a + for the country code.'; f2.classList.add('has-error'); phone.setAttribute('aria-invalid', 'true'); ok = false; }
      }
      if (!consent.checked) { consentErr.textContent = 'Tick the box so we know we may contact you.'; f4.classList.add('has-error'); ok = false; }
      if (!ok) { (email.getAttribute('aria-invalid') ? email : phone.getAttribute('aria-invalid') ? phone : consent).focus(); return; }
      lead({ path, email: em, phone: ph, name: name.value.trim(), how: how.value, brief, consent: true, consentText: CONSENT, website: trap.value });
    }
    const form = h('form', { class: 'stack', novalidate: true, onsubmit: submit },
      f1, f2, h('div', { class: 'field' }, h('label', { for: 'c-name', text: 'Your name (optional)' }), name),
      h('div', { class: 'field' }, h('label', { for: 'c-how', text: 'How would you like us to reach you?' }), how),
      h('label', { class: 'choice' }, consent, CONSENT), f4,
      h('div', { 'aria-hidden': 'true', class: 'trap' }, h('label', null, 'Leave this empty', trap)),
      h('div', { class: 'q-nav' }, btn('Back', 'btn--secondary', () => go(path === 'talk' ? 'choose' : 'choose')), h('span', { class: 'spacer' }), h('button', { class: 'btn', type: 'submit', text: copy[2] })));
    return h('div', null, h('h1', { id: 'q-title', tabindex: '-1', text: copy[0] }), h('p', { class: 'lead', text: copy[1] }), form);
  }
  /* The lead address is set at deploy time (a <meta name="lead-endpoint"> tag). Until it exists nothing leaves the browser. */
  function lead(payload) {
    const meta = document.querySelector('meta[name="lead-endpoint"]');
    const url = meta && meta.content;
    if (!url) { brief.pending = true; save(); go('thanks'); return; }
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); brief.pending = false; brief.sent = true; save(); go('thanks'); })
      .catch(() => { const e = document.getElementById('c-cerr'); e.textContent = 'We could not send that just now. Your answers are kept; please try again in a minute.'; e.parentNode.classList.add('has-error'); });
  }
  function thanksScreen() {
    const sent = brief.sent, path = brief.path;
    return h('div', null, h('h1', { id: 'q-title', tabindex: '-1', text: sent ? 'Thank you. We have your answers.' : 'Your answers are saved.' }),
      h('div', { class: sent ? 'alert alert--ok' : 'alert alert--info', role: 'status' }, h('div', null, h('strong', { text: sent ? 'Sent' : 'Not sent yet' }),
        sent ? (path === 'self' ? 'We will tell you the day the builder opens.' : 'We will read your answers and get in touch.') : 'Sending is not switched on at this address yet. Nothing has left your browser.')),
      h('p', null, h('a', { class: 'link', href: '../' }, 'Back to the home page')));
  }

  /* ---------- routing ---------- */
  function go(hash) { if (location.hash === '#' + hash) render(); else location.hash = hash; }
  function render() {
    const hash = location.hash.replace('#', '') || 'q1';
    let screen, qi = -1;
    const m = /^q(\d+)$/.exec(hash);
    if (m && QUESTIONS[Number(m[1]) - 1]) { qi = Number(m[1]) - 1; screen = questionScreen(qi); }
    else if (hash === 'check') screen = checkScreen();
    else if (hash === 'choose') screen = chooseScreen();
    else if (hash === 'contact') screen = contactScreen();
    else if (hash === 'thanks') screen = thanksScreen();
    else { location.replace('#q1'); return; }
    root.replaceChildren(screen);
    const total = QUESTIONS.length;
    dots.replaceChildren(...QUESTIONS.map((_, i) => h('i', { class: qi < 0 || i < qi ? 'is-done' : (i === qi ? 'is-now' : '') })));
    dots.setAttribute('aria-label', qi >= 0 ? 'Question ' + (qi + 1) + ' of ' + total : 'All ' + total + ' questions answered');
    count.textContent = qi >= 0 ? 'Question ' + (qi + 1) + ' of ' + total : (hash === 'check' ? 'Check your answers' : 'Last step');
    document.title = (qi >= 0 ? 'Question ' + (qi + 1) + ' of ' + total : 'Start your page') + ' · edvlabs';
    showPrice(qi >= 0 ? qi : total);
    if (hash === 'thanks') priceBox.replaceChildren();
    const t = document.getElementById('q-title'); if (t) t.focus({ preventScroll: false });
  }
  window.addEventListener('hashchange', render);
  render();
})();
