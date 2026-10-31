/* The contact form. It sends the same kind of lead as the questions (path "talk", no answers) to the address in
   <meta name="lead-endpoint">. Until that exists nothing leaves the browser, and the page says so. */
(function () {
  const $ = (id) => document.getElementById(id);
  const { t: tr } = window.EdvI18n; // words on the screen, in the page's language (js/i18n.js)
  const CONSENT = tr('It is fine to contact me about this.'); // the sentence the visitor sees is the one sent as proof of consent
  const form = $('contact-form'), result = $('contact-result');
  let check = null; // the Cloudflare spam check, when the site has one (js/spam-check.js)
  if (window.SpamCheck) window.SpamCheck.setup($('k-check')).then((c) => { check = c; });
  const box = (cls, title, text) => {
    const s = document.createElement('strong'); s.textContent = title;
    const d = document.createElement('div'); d.append(s, text);
    const a = document.createElement('div'); a.className = 'alert ' + cls; a.append(d); result.replaceChildren(a);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('k-email').value.trim(), ph = $('k-phone').value.trim();
    const emailField = $('k-email').closest('.field'), phoneField = $('k-phone').closest('.field'), consentField = $('k-cerr').closest('.field');
    [emailField, phoneField, consentField].forEach((f) => f.classList.remove('has-error'));
    ['k-err-email', 'k-err-phone', 'k-cerr'].forEach((id) => { $(id).textContent = ''; });
    $('k-email').removeAttribute('aria-invalid'); $('k-phone').removeAttribute('aria-invalid');
    let focusEl = null;
    const bad = (input, field, msgId, msg) => { $(msgId).textContent = msg; field.classList.add('has-error'); input.setAttribute('aria-invalid', 'true'); focusEl = focusEl || input; };
    // each problem is shown under the box it is about; "leave one of the two" sits under the first box
    if (!em && !ph) bad($('k-email'), emailField, 'k-err-email', tr('Leave an email address or a phone number.'));
    else {
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) bad($('k-email'), emailField, 'k-err-email', tr('That does not look like an email address. It should look like name@example.com.'));
      if (ph && !/^\+?[0-9 ()-]{6,}$/.test(ph)) bad($('k-phone'), phoneField, 'k-err-phone', tr('That does not look like a phone number. Use digits, and a + for the country code.'));
    }
    if (!$('k-consent').checked) { $('k-cerr').textContent = tr('Tick the box so we know we may contact you.'); consentField.classList.add('has-error'); focusEl = focusEl || $('k-consent'); }
    if (focusEl) { focusEl.focus(); return; }
    const meta = document.querySelector('meta[name="lead-endpoint"]');
    if (check && check.on && !check.ready()) { box('alert--info', check.failed ? tr('The spam check did not load') : tr('One moment'), check.failed ? tr('Check your connection, switch off any blocker for this page, and reload. Or write to us by email.') : tr('Please wait for the spam check above to finish, then press Send again.')); return; }
    if (!meta || !meta.content) { box('alert--info', tr('Not sent yet'), tr('Sending is not switched on at this address yet. Nothing has left your browser.')); return; }
    try {
      const r = await fetch(meta.content, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'talk', email: em, phone: ph, name: $('k-name').value.trim(), message: $('k-msg').value.trim(), turnstile: check && check.on ? check.token() : undefined, brief: { v: 1, answers: {} }, consent: true, consentText: CONSENT, website: $('k-trap').value }) });
      if (!r.ok) { if (check) check.reset(); throw new Error(String(r.status)); }
      form.hidden = true; box('alert--ok', tr('Sent'), tr('Thank you. We will get in touch.'));
    } catch (err) { if (check) check.reset(); box('alert--error', tr('Could not send'), tr('We could not send that just now. Please try again in a minute.')); }
  });
})();
