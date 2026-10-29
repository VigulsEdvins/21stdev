#!/usr/bin/env node
/**
 * Sends ONE test message to each form service you give details for, with the very same request the exported page sends
 * (scripts/form-delivery.js, jsonRequest), and says whether the service accepted it. Run it yourself with your own test accounts:
 * it contacts the real services. Without --send it only prints what it would send.
 *
 *   FORMSUBMIT_EMAIL=you@example.com FORMSPREE_ID=abcdwxyz WEB3FORMS_KEY=<key> CUSTOM_URL=https://example.com/contact \
 *   NETLIFY_SITE=https://yoursite.netlify.app NETLIFY_FORM=form-1 node scripts/check-form-services.js --send
 *
 * Any service whose variable is missing is skipped. FormSubmit's first message only asks you to confirm the address.
 */
const FD = require('./form-delivery.js');

const SEND = process.argv.includes('--send');
const fields = [['name', 'Form check'], ['email', 'form-check@example.invalid'], ['message', 'Test message from scripts/check-form-services.js. Safe to delete.']];
const subject = 'Form check (test message)';
const env = process.env;

const jobs = [
  ['email', env.FORMSUBMIT_EMAIL, 'FormSubmit'],
  ['formspree', env.FORMSPREE_ID, 'Formspree'],
  ['web3forms', env.WEB3FORMS_KEY, 'Web3Forms'],
  ['custom', env.CUSTOM_URL, 'Own address']
];

async function main() {
  let failed = 0, ran = 0;
  for (const [method, value, label] of jobs) {
    if (!value) { console.log('- ' + label + ': skipped (no details given)'); continue; }
    const r = FD.check(method, value);
    if (!r.ok) { console.log('✗ ' + label + ': ' + r.error); failed++; continue; }
    const req = FD.jsonRequest(method, r.value, fields, subject);
    const shown = method === 'web3forms' ? { ...req.data, access_key: '(hidden)' } : req.data;
    console.log((SEND ? '→ ' : '· would send ') + label + ': POST ' + (method === 'web3forms' ? req.url : req.url.replace(/(ajax\/).*/, '$1(your address)')) + ' ' + JSON.stringify(shown));
    if (!SEND) continue;
    ran++;
    try {
      const res = await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(req.data) });
      let body = {};
      try { body = await res.json(); } catch (_) { /* some services answer without JSON */ }
      const ok = res.ok && String(body.success) !== 'false' && body.ok !== false;
      console.log((ok ? '  ✓ accepted' : '  ✗ refused') + ' (HTTP ' + res.status + ')' + (ok ? '' : ' ' + JSON.stringify(body).slice(0, 200)));
      if (!ok) failed++;
    } catch (e) { console.log('  ✗ no answer: ' + e.message); failed++; }
  }
  if (env.NETLIFY_SITE) {
    const base = String(env.NETLIFY_SITE).replace(/\/+$/, '');
    if (!/^https:\/\/[^/\s]+$/.test(base)) { console.log('✗ Netlify: NETLIFY_SITE must look like https://yoursite.netlify.app'); failed++; }
    else {
      const body = new URLSearchParams({ 'form-name': env.NETLIFY_FORM || 'form-1' });
      fields.forEach(([k, v]) => body.append(k, v));
      console.log((SEND ? '→ ' : '· would send ') + 'Netlify Forms: POST ' + base + '/ form-urlencoded, form-name=' + (env.NETLIFY_FORM || 'form-1'));
      if (SEND) {
        ran++;
        try {
          const res = await fetch(base + '/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), redirect: 'manual' });
          const ok = res.ok || (res.status >= 300 && res.status < 400);
          console.log((ok ? '  ✓ accepted' : '  ✗ refused') + ' (HTTP ' + res.status + '). Look under Forms in your Netlify dashboard.');
          if (!ok) failed++;
        } catch (e) { console.log('  ✗ no answer: ' + e.message); failed++; }
      }
    }
  } else console.log('- Netlify Forms: skipped (no NETLIFY_SITE given)');
  if (!SEND) console.log('\nNothing was sent. Add --send to send one test message to each service above.');
  else console.log('\n' + ran + ' test message' + (ran === 1 ? '' : 's') + ' sent' + (failed ? ', ' + failed + ' problem' + (failed === 1 ? '' : 's') : ', no problems') + '.');
  process.exit(failed ? 1 : 0);
}
main();
