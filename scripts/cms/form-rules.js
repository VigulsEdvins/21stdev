/**
 * The choices for where a site's form messages go, and the checks on the value typed for each one.
 * One file for everyone who needs the rules: the builder, the admin editor (admin.html), the exported site and the Node tests.
 * `check` uses nothing from outside itself, so the exported page script can carry a copy of it as text.
 * See docs/superpowers/plans/2026-10-29-form-delivery.md.
 */
(function (root) {
  'use strict';

  /** The choices, in the order the client sees them. `valueLabel` empty = no value to type. */
  const METHODS = [
    { id: '', via: '', label: 'Not yet (forms stay a demo)', valueLabel: '', placeholder: '', hint: '' },
    { id: 'netlify', via: 'Netlify, the host of your site', label: 'Netlify Forms (if the site is on Netlify)', valueLabel: '', placeholder: '', hint: 'Nothing to type. Messages appear in your Netlify dashboard after you put the site online there.' },
    { id: 'email', via: 'FormSubmit (formsubmit.co)', label: 'My email (no account needed)', valueLabel: 'Your email address', placeholder: 'you@example.com', hint: 'The first message asks you to confirm this address. The address is visible in the page source: use one made for this.' },
    { id: 'formspree', via: 'Formspree (formspree.io)', label: 'Formspree (free account)', valueLabel: 'Formspree form address or code', placeholder: 'https://formspree.io/f/abcdwxyz', hint: 'Copy the address of your form from formspree.io.' },
    { id: 'web3forms', via: 'Web3Forms (web3forms.com)', label: 'Web3Forms (free account)', valueLabel: 'Web3Forms access key', placeholder: '8-4-4-4-12 letters and digits', hint: 'The access key web3forms.com emails you. It is public by design.' },
    { id: 'whatsapp', via: 'WhatsApp (Meta), from the visitor’s own phone', label: 'WhatsApp', valueLabel: 'Your WhatsApp number with country code', placeholder: '+371 2000 0000', hint: 'The visitor’s WhatsApp opens with the message written; they press send.' },
    { id: 'mailto', via: '', label: 'The visitor’s email app', valueLabel: 'Your email address', placeholder: 'you@example.com', hint: 'The visitor’s mail program opens with the message written; they press send.' },
    { id: 'custom', via: 'the server at the address you give', label: 'My own address (advanced)', valueLabel: 'Address that receives the form (https://)', placeholder: 'https://example.com/contact', hint: 'Your own server must accept the form and allow requests from your site.' }
  ];

  function method(id) { return METHODS.find(function (m) { return m.id === id; }) || METHODS[0]; }

  /**
   * Checks a choice and its value. Returns { ok, method, value, error }: `value` is the cleaned form the export uses
   * (email as typed, WhatsApp as digits only, Formspree as the full address). An empty method is fine and means "not yet".
   */
  function check(methodId, rawValue) {
    var id = String(methodId || '').trim();
    var v = String(rawValue == null ? '' : rawValue).trim();
    var KNOWN = ['netlify', 'email', 'formspree', 'web3forms', 'whatsapp', 'mailto', 'custom'];
    var ASK = { email: 'your email address', mailto: 'your email address', formspree: 'Formspree form address or code', web3forms: 'Web3Forms access key', whatsapp: 'your WhatsApp number with country code', custom: 'address that receives the form' };
    var EMAIL_RE = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/;
    if (!id) return { ok: true, method: '', value: '', error: '' };
    if (KNOWN.indexOf(id) < 0) return { ok: false, method: '', value: '', error: 'That way of receiving messages is not known.' };
    function done(value) { return { ok: true, method: id, value: value, error: '' }; }
    function bad(error) { return { ok: false, method: id, value: '', error: error }; }
    if (id === 'netlify') return done('');
    if (!v) return bad('Type the ' + ASK[id] + ' above, or choose “Not yet”.');
    if (/[\u0000-\u001f\u007f]/.test(v)) return bad('The value has characters that are not allowed.');
    if (id === 'email' || id === 'mailto') {
      return EMAIL_RE.test(v) && v.length <= 120 ? done(v) : bad('That does not look like an email address (name@example.com).');
    }
    if (id === 'whatsapp') {
      if (!/^\+?[\d\s().-]+$/.test(v)) return bad('Use digits only, with the country code (for example +371 2000 0000).');
      var digits = v.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) return bad('A WhatsApp number has 8 to 15 digits including the country code.');
      if (!/^\+/.test(v) && digits.charAt(0) === '0') return bad('Start with the country code (for example +371), not a leading 0.');
      return done(digits);
    }
    if (id === 'formspree') {
      var m = /^https:\/\/formspree\.io\/f\/([A-Za-z0-9]+)\/?$/.exec(v);
      var code = m ? m[1] : v;
      return /^[A-Za-z0-9]{4,24}$/.test(code) ? done('https://formspree.io/f/' + code) : bad('Paste the address from Formspree (https://formspree.io/f/…) or just its last part.');
    }
    if (id === 'web3forms') {
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v) ? done(v.toLowerCase()) : bad('A Web3Forms access key looks like 12345678-abcd-1234-abcd-1234567890ab.');
    }
    // custom: a plain https address, nothing hidden in it
    if (v.length > 400 || /[\s"'<>\\]/.test(v)) return bad('The address has characters that are not allowed.');
    if (!/^https:\/\/[^/@]+(\/|$)/i.test(v) || /^https:\/\/[^/]*@/i.test(v)) return bad('Use a full address starting with https:// and no password in it.');
    return done(v);
  }

  var api = { METHODS: METHODS, method: method, check: check };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EdvFormRules = api;
})(typeof window !== 'undefined' ? window : this);
