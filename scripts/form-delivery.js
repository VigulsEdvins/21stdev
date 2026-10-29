/**
 * Where a site's form messages go (plan: docs/superpowers/plans/2026-10-29-form-delivery.md).
 * One site-wide choice (`page.formMethod`) and one value (`page.formTarget`). This file only knows the choices and
 * checks the value; the export and the page script that actually send use `check()` so a bad value never reaches a page.
 * Pure string work so it runs in the builder and in Node tests.
 */
(function (root) {
  'use strict';

  const rules = typeof module !== 'undefined' && module.exports ? require('./cms/form-rules.js') : root.EdvFormRules;
  const { METHODS, method, check } = rules;

  /** The page's current choice, checked: { method, target, ok, error }. `target` is the cleaned value. */
  function fromPage(page) {
    const p = page || {};
    const r = check(p.formMethod, p.formTarget);
    return { method: r.method || (r.ok ? '' : String(p.formMethod || '')), target: r.value, ok: r.ok, error: r.error };
  }

  // ------------------------------------------------------------------ export: prepare the forms
  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function slug(v) { return String(v || '').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
  function attrOf(tag, name) {
    const re = /\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let m;
    while ((m = re.exec(tag))) if (m[1].toLowerCase() === name) return m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
    return null;
  }

  /** Gives every control that will be sent a `name` (Netlify and every form service drop a field without one). */
  function nameControls(block) {
    const labels = (block.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) || []);
    const labelFor = {};
    labels.forEach((l) => { const f = attrOf(l.match(/^<label\b[^>]*>/i)[0], 'for'); if (f) labelFor[f] = l; });
    const used = new Set();
    (block.match(/<(?:input|select|textarea)\b[^>]*>/gi) || []).forEach((t) => { const n = attrOf(t, 'name'); if (n) used.add(n); });
    return block.replace(/<(input|select|textarea)\b[^>]*>/gi, (tag, kind) => {
      const type = (attrOf(tag, 'type') || 'text').toLowerCase();
      if (/^(hidden|submit|button|reset|image|file|password|radio|checkbox)$/.test(type) || attrOf(tag, 'name')) return tag;
      const id = attrOf(tag, 'id');
      const wrap = labels.find((l) => l.includes(tag));
      let base = slug(attrOf(tag, 'data-key')) || (type === 'email' ? 'email' : '') || slug(attrOf(tag, 'aria-label')) || slug(wrap || (id && labelFor[id]) || '') || (/@/.test(attrOf(tag, 'placeholder') || '') ? '' : slug(attrOf(tag, 'placeholder')));
      if (!base || base.length < 2) base = kind.toLowerCase() === 'textarea' ? 'message' : (type === 'email' ? 'email' : 'field');
      let name = base;
      for (let i = 2; used.has(name); i++) name = base + '-' + i;
      used.add(name);
      return tag.replace(/\s*\/?>$/, (end) => ' name="' + esc(name) + '"' + end);
    });
  }

  /**
   * Prepares the forms marked data-edv-form="message": names on the fields, a hidden trap field (a person never fills
   * it, a bot does), and the markers Netlify looks for in the deployed HTML (they do nothing on other hosts). This is
   * done whether or not a route is chosen yet, so a route picked later in the admin editor works without a new export.
   * The chosen route goes on the form tag for the page script. Forms marked "skip", and forms without a marker, are left alone.
   * Returns the HTML unchanged when it has no message form.
   */
  function prepareHtml(html, page) {
    const d = fromPage(page);
    const chosen = !!d.method && d.ok;
    const taken = new Set();
    let count = 0;
    return String(html).replace(/<form\b[^>]*\bdata-edv-form\s*=\s*["']message["'][^>]*>[\s\S]*?<\/form>/gi, (block) => {
      const open = block.match(/^<form\b[^>]*>/i)[0];
      let formName = attrOf(open, 'id') || '';
      if (!/^[A-Za-z][\w-]{0,40}$/.test(formName) || taken.has(formName)) formName = 'form-' + (++count);
      taken.add(formName);
      // an email address is written encoded, so a scraper that looks for "@" in the page does not find it (the page script decodes it; this hides it from simple scrapers only, it is not a secret)
      const hideTarget = d.method === 'email' || d.method === 'mailto';
      const b64 = (v) => (typeof Buffer !== 'undefined' ? Buffer.from(encodeURIComponent(v), 'ascii').toString('base64') : btoa(encodeURIComponent(v)));
      let attrs = chosen ? ' data-edv-method="' + esc(d.method) + '"' + (d.target ? (hideTarget ? ' data-edv-target-b64="' + b64(d.target) + '"' : ' data-edv-target="' + esc(d.target) + '"') : '') : '';
      if (!attrOf(open, 'name')) attrs += ' name="' + esc(formName) + '"';
      attrs += ' data-netlify="true" data-netlify-honeypot="bot-field"';
      const extra = '<input type="hidden" name="form-name" value="' + esc(attrOf(open, 'name') || formName) + '">' +
        '<div hidden aria-hidden="true" style="display:none"><input type="text" name="bot-field" value="" tabindex="-1" autocomplete="off"></div>';
      const inner = nameControls(block.slice(open.length, block.length - '</form>'.length));
      return open.replace(/>$/, attrs + '>') + inner + extra + '</form>';
    });
  }

  /* eslint-disable no-var */
  /**
   * The JSON request a route sends: { url, data } for email (FormSubmit), Formspree, Web3Forms and an own address.
   * Self-contained, so the page script carries a copy as text and scripts/check-form-services.js uses the very same code.
   */
  function jsonRequest(method, target, fields, subject) {
    var data = Object.create(null), i, url = target;
    for (i = 0; i < fields.length; i++) data[fields[i][0]] = data[fields[i][0]] ? data[fields[i][0]] + ', ' + fields[i][1] : fields[i][1];
    if (method === 'email') { url = 'https://formsubmit.co/ajax/' + target; data._subject = subject; data._template = 'table'; }
    if (method === 'formspree') data._subject = subject;
    if (method === 'web3forms') { url = 'https://api.web3forms.com/submit'; data.access_key = target; data.subject = subject; }
    return { url: url, data: data };
  }
  /* eslint-enable no-var */

  // ------------------------------------------------------------------ the page script (no outside variables: it is copied into the site as text)
  /* eslint-disable no-var, prefer-arrow-callback, object-shorthand */
  function edvFormRuntime(win, doc, check, jsonRequest) {
    // Timing, for messages posted to a service (WhatsApp and the email app send nothing by themselves): nobody fills and sends a form
    // within 0.8 s of the page opening, so that is a bot and is dropped; between 0.8 s and 2.5 s the message is held until 2.5 s, so a real person is never lost.
    var born = Date.now();
    var holdMs = typeof win.__edvMinFillMs === 'number' ? win.__edvMinFillMs : 2500;
    var dropMs = typeof win.__edvDropMs === 'number' ? win.__edvDropMs : Math.min(800, holdMs);
    var RESERVED = /^(__proto__|constructor|prototype)$/;
    var MAX_FIELDS = 40, MAX_VALUE = 5000;
    var FAIL = 'Your message could not be sent. Please try again later or contact us another way.';
    function label(n) { var t = String(n).replace(/[-_]+/g, ' ').replace(/^\s+|\s+$/g, ''); return t.charAt(0).toUpperCase() + t.slice(1); }
    function collect(form) {
      var fields = [], trap = false, els = form.elements;
      for (var i = 0; i < els.length; i++) {
        var el = els[i], type = String(el.type || '').toLowerCase(), name = el.name;
        if (!name || el.disabled || name === 'form-name' || RESERVED.test(name) || /^(submit|button|reset|image|file|password)$/.test(type)) continue;
        if (name === 'bot-field') { if (el.value) trap = true; continue; }
        if ((type === 'checkbox' || type === 'radio') && !el.checked) continue;
        var v = String(el.value == null ? '' : el.value).replace(/^\s+|\s+$/g, '').slice(0, MAX_VALUE);
        if (v && fields.length < MAX_FIELDS) fields.push([name, v]);
      }
      return { fields: fields, trap: trap };
    }
    function notice(form, msg) {
      var host = form.parentNode;
      if (!host) return;
      var old = host.querySelector('[data-edv-notice]');
      if (old) old.parentNode.removeChild(old);
      if (!msg) return;
      var p = doc.createElement('p');
      p.setAttribute('role', 'alert');
      p.setAttribute('data-edv-notice', '');
      p.style.cssText = 'margin:.75rem 0 0;font-size:.9em;font-weight:600';
      p.textContent = msg;
      host.insertBefore(p, form.nextSibling);
    }
    function message(fields) {
      var lines = ['New message from ' + (doc.title || win.location.hostname), ''];
      for (var i = 0; i < fields.length; i++) lines.push(label(fields[i][0]) + ': ' + fields[i][1]);
      return lines.join('\n');
    }
    function deliver(form, method, target, c) {
      notice(form, '');
      if (method === 'netlify') {
        if (!win.fetch || !win.URLSearchParams) return;
        var body = new win.URLSearchParams();
        body.append('form-name', form.getAttribute('name') || '');
        for (var i = 0; i < c.fields.length; i++) body.append(c.fields[i][0], c.fields[i][1]);
        win.fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
          .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); })
          .catch(function () { notice(form, FAIL); });
      } else {
        // a JSON post to the service; the answer must say it worked
        if (!win.fetch) return;
        var req = jsonRequest(method, target, c.fields, 'New message from ' + (doc.title || win.location.hostname));
        win.fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(req.data) })
          .then(function (r) {
            return r.json().then(function (j) { return j; }, function () { return {}; }).then(function (j) {
              if (!r.ok || String(j.success) === 'false' || j.ok === false) throw new Error('status ' + r.status);
            });
          })
          .catch(function () { notice(form, FAIL); });
      }
    }
    doc.addEventListener('edv:submitted', function (e) {
      var form = e.target;
      if (!form || !form.getAttribute) return;
      // the route chosen when the site was exported, unless the admin editor published another; both are checked here, so a hand-edited file or page cannot point messages somewhere unsafe
      var method = form.getAttribute('data-edv-method') || '', target = form.getAttribute('data-edv-target') || '';
      var enc = form.getAttribute('data-edv-target-b64'); // an email address is not written in the page as plain text
      if (enc) { try { target = decodeURIComponent(win.atob(enc)); } catch (err) { target = ''; } }
      var o = win.__edvForm;
      if (o && typeof o === 'object' && typeof o.method === 'string') { method = o.method; target = o.target; }
      var r = check(method, target);
      if (!method || !r.ok) return;
      method = r.method; target = r.value;
      var c = collect(form);
      if (c.trap || !c.fields.length) return;
      if (method === 'whatsapp') {
        var wa = 'https://wa.me/' + target + '?text=' + encodeURIComponent(message(c.fields).slice(0, 1200));
        if (!win.open(wa, '_blank', 'noopener')) win.location.href = wa;
        return;
      }
      if (method === 'mailto') {
        var a = doc.createElement('a');
        a.href = 'mailto:' + target + '?subject=' + encodeURIComponent('New message from ' + (doc.title || win.location.hostname)) + '&body=' + encodeURIComponent(message(c.fields).slice(0, 1500));
        a.style.display = 'none';
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        return;
      }
      var age = Date.now() - born;
      if (age < dropMs) return;
      if (age < holdMs) win.setTimeout(function () { deliver(form, method, target, c); }, holdMs - age);
      else deliver(form, method, target, c);
    });
  }
  /* eslint-enable no-var, prefer-arrow-callback, object-shorthand */

  /** The page script as text, for script.js (ZIP, GitHub) or an inline <script> (single file). */
  function runtimeJs() { return '(' + edvFormRuntime.toString() + ')(window, document, ' + check.toString() + ', ' + jsonRequest.toString() + ');'; }

  /** Script for the builder preview only: a chosen route is not used there, so say so under the form instead of leaving the visitor guessing. */
  function previewJs(page) {
    const d = fromPage(page);
    if (!d.method || !d.ok) return '';
    const text = 'Preview only: this message was not sent. On the live site it goes to: ' + method(d.method).label.replace(/\s*\(.*\)$/, '') + '.';
    return '(function (doc) {\n  doc.addEventListener("edv:submitted", function (e) {\n    var form = e.target, host = form && form.parentNode;\n    if (!host || !form.getAttribute || !form.hasAttribute("data-edv-form")) return;\n    var old = host.querySelector("[data-edv-preview-note]");\n    if (old) old.parentNode.removeChild(old);\n    var p = doc.createElement("p");\n    p.setAttribute("role", "status");\n    p.setAttribute("data-edv-preview-note", "");\n    p.style.cssText = "margin:.75rem 0 0;font-size:.9em;font-weight:600";\n    p.textContent = ' + JSON.stringify(text).replace(/</g, '\\u003c') + ';\n    host.insertBefore(p, form.nextSibling);\n  });\n})(document);';
  }

  const api = { METHODS, method, check, fromPage, prepareHtml, runtimeJs, previewJs, jsonRequest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FormDelivery = api;
})(typeof window !== 'undefined' ? window : this);
