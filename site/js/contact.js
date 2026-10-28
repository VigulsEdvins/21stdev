/* The contact form. It sends the same kind of lead as the questions (path "talk", no answers) to the address in
   <meta name="lead-endpoint">. Until that exists nothing leaves the browser, and the page says so. */
(function () {
  const $ = (id) => document.getElementById(id);
  const CONSENT = 'It is fine to contact me about this.';
  const form = $('contact-form'), result = $('contact-result');
  const box = (cls, title, text) => {
    const s = document.createElement('strong'); s.textContent = title;
    const d = document.createElement('div'); d.append(s, text);
    const a = document.createElement('div'); a.className = 'alert ' + cls; a.append(d); result.replaceChildren(a);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('k-email').value.trim(), ph = $('k-phone').value.trim();
    const phoneField = $('k-phone').closest('.field'), consentField = $('k-cerr').closest('.field');
    phoneField.classList.remove('has-error'); consentField.classList.remove('has-error');
    $('k-email').removeAttribute('aria-invalid'); $('k-phone').removeAttribute('aria-invalid');
    let problem = '', focusEl = null;
    if (!em && !ph) { problem = 'Leave an email address or a phone number.'; focusEl = $('k-email'); }
    else if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { problem = 'That does not look like an email address. It should look like name@example.com.'; focusEl = $('k-email'); $('k-email').setAttribute('aria-invalid', 'true'); }
    else if (ph && !/^\+?[0-9 ()-]{6,}$/.test(ph)) { problem = 'That does not look like a phone number. Use digits, and a + for the country code.'; focusEl = $('k-phone'); $('k-phone').setAttribute('aria-invalid', 'true'); }
    $('k-err').textContent = problem; if (problem) phoneField.classList.add('has-error');
    if (!$('k-consent').checked) { $('k-cerr').textContent = 'Tick the box so we know we may contact you.'; consentField.classList.add('has-error'); focusEl = focusEl || $('k-consent'); }
    if (focusEl) { focusEl.focus(); return; }
    const meta = document.querySelector('meta[name="lead-endpoint"]');
    if (!meta || !meta.content) { box('alert--info', 'Not sent yet', 'Sending is not switched on at this address yet. Nothing has left your browser.'); return; }
    try {
      const r = await fetch(meta.content, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'talk', email: em, phone: ph, name: $('k-name').value.trim(), message: $('k-msg').value.trim(), brief: { v: 1, answers: {} }, consent: true, consentText: CONSENT, website: $('k-trap').value }) });
      if (!r.ok) throw new Error(String(r.status));
      form.hidden = true; box('alert--ok', 'Sent', 'Thank you. We will get in touch.');
    } catch (err) { box('alert--error', 'Could not send', 'We could not send that just now. Please try again in a minute.'); }
  });
})();
