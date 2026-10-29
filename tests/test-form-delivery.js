// Form delivery, step 1: the choices, the value checks, storage of the two page keys, and the check-step wording.
const assert = require('assert');
const FD = require('../scripts/form-delivery.js');
const { checkPage } = require('../scripts/builder/page-checks.js');
const { sanitizeState } = require('../scripts/project-sanitize.js');
const { DEFAULT_PAGE } = require('../scripts/stack-manager.js');

// "Not yet" and Netlify need no value
assert.deepStrictEqual(FD.check('', 'ignored'), { ok: true, method: '', value: '', error: '' });
assert.strictEqual(FD.check('netlify', '').ok, true);

// good values come back in the form the export will use
assert.strictEqual(FD.check('email', ' hi@zephyr.example ').value, 'hi@zephyr.example');
assert.strictEqual(FD.check('mailto', 'hi@zephyr.example').ok, true);
assert.strictEqual(FD.check('whatsapp', '+371 2000-0000').value, '37120000000');
assert.strictEqual(FD.check('formspree', 'abcdwxyz').value, 'https://formspree.io/f/abcdwxyz');
assert.strictEqual(FD.check('formspree', 'https://formspree.io/f/abcdwxyz').value, 'https://formspree.io/f/abcdwxyz');
assert.strictEqual(FD.check('web3forms', '12345678-ABCD-1234-abcd-1234567890AB').value, '12345678-abcd-1234-abcd-1234567890ab');
assert.strictEqual(FD.check('custom', 'https://example.com/contact?x=1').value, 'https://example.com/contact?x=1');

// bad or hostile values are refused with a sentence, never passed on
const bad = [
  ['email', ''], ['email', 'nope'], ['email', 'a@b'], ['email', 'a@b.co\nBcc: x@y.zz'], ['email', 'a@b.co, c@d.co'], ['email', '<x>@y.zz'], ['email', 'a'.repeat(130) + '@b.co'],
  ['mailto', 'javascript:alert(1)'],
  ['whatsapp', ''], ['whatsapp', '123'], ['whatsapp', '0700000000'], ['whatsapp', '+371 abc'], ['whatsapp', '+1234567890123456'], ['whatsapp', 'https://wa.me/1'],
  ['formspree', 'x'], ['formspree', 'https://evil.example/f/abcdwxyz'], ['formspree', 'https://formspree.io/f/abcd"onload=1'],
  ['web3forms', 'abc'], ['web3forms', '12345678-abcd-1234-abcd-1234567890a'],
  ['custom', 'http://example.com/'], ['custom', 'javascript:alert(1)'], ['custom', '//example.com'], ['custom', 'https://user:pw@example.com/'], ['custom', 'https://a.example/" onload="x'], ['custom', 'https://a b.example/'], ['custom', 'https://' + 'a'.repeat(400) + '.example'],
  ['bogus', 'x']
];
for (const [m, v] of bad) { const r = FD.check(m, v); assert(!r.ok && r.error && r.value === '', 'refused: ' + m + ' ' + JSON.stringify(v).slice(0, 40)); }

// the choices list: unique ids, each with the words the page settings show; the sanitizer knows exactly the same ids
const ids = FD.METHODS.map((m) => m.id);
assert.strictEqual(new Set(ids).size, ids.length);
assert.strictEqual(ids[0], '');
FD.METHODS.forEach((m) => { assert(m.label); if (m.valueLabel) assert(m.placeholder && m.hint); });
const kept = ids.filter((id) => id && sanitizeState({ stack: [], page: { formMethod: id, formTarget: 'x' } }).state.page.formMethod === id);
assert.deepStrictEqual(kept, ids.filter(Boolean), 'project-sanitize accepts the same methods as form-delivery');
const cleaned = sanitizeState({ stack: [], page: { formMethod: 'bogus', formTarget: 'x' } });
assert.deepStrictEqual([cleaned.state.page.formMethod, cleaned.state.page.formTarget], ['', ''], 'an unknown method is dropped from an imported project');
assert(cleaned.removed > 0, 'and counted as a removal');

// stored with the page like the business details
assert(DEFAULT_PAGE.formMethod === '' && DEFAULT_PAGE.formTarget === '');
assert.strictEqual(FD.fromPage({ formMethod: 'whatsapp', formTarget: '+371 2000 0000' }).target, '37120000000');
assert.strictEqual(FD.fromPage({}).method, '');

// check step: a chosen and valid route removes the warning; an incomplete one is an error; "Not yet" keeps the warning
const form = (a, mark = 'data-edv-form="message"') => `<html lang="en"><body><section class="page-section" id="f"><h1>H</h1><form ${a} ${mark} method="post"><label for="e">E</label><input id="e"></form></section></body></html>`;
const base = { title: 'T', description: 'D' };
const idsOf = (page, a = 'action=""', mark) => checkPage(form(a, mark), { ...base, ...page }).map((i) => i.id);
assert(idsOf({}).includes('form-no-target'));
assert(idsOf({ formMethod: '' }).includes('form-no-target'));
assert(!idsOf({ formMethod: 'netlify' }).includes('form-no-target') && !idsOf({ formMethod: 'netlify' }).includes('form-delivery-invalid'));
assert(!idsOf({ formMethod: 'whatsapp', formTarget: '+371 2000 0000' }).some((i) => i.startsWith('form-')));
const inv = checkPage(form('action=""'), { ...base, formMethod: 'email', formTarget: 'nope' }).filter((i) => i.id === 'form-delivery-invalid');
assert.strictEqual(inv.length, 1);
assert.strictEqual(inv[0].severity, 'error');
assert(!idsOf({ formMethod: 'email', formTarget: 'nope' }).includes('form-no-target'), 'one problem is reported once');
assert(!idsOf({ formMethod: 'email', formTarget: 'nope' }, 'action="https://x.example/f"').some((i) => i.startsWith('form-')), 'a form with its own address is left alone');

// only forms the export can prepare count: a form of your own still warns, a search or sign-in form is not a message form
assert(idsOf({ formMethod: 'netlify' }, 'action=""', '').includes('form-no-target'), 'an unmarked form is not covered by the setting');
assert(!idsOf({}, 'action=""', 'data-edv-form="skip"').some((i) => i.startsWith('form-')), 'a skip form never warns');

// export: forms marked "message" are prepared; nothing else is touched
const fs = require('fs');
const path = require('path');
const src = '<section><form id="owForm" novalidate data-edv-form="message"><label>Name <input type="text"></label><input type="email" placeholder="you@x.com"><input type="email"><textarea></textarea><input type="password"><input type="radio" value="a"><button type="submit">Go</button></form><form data-edv-form="skip"><input></form><form><input></form></section>';
// prepared whether or not a route is chosen (a route picked later in the admin editor must work without a new export), but the route is only written for a valid choice
const none = FD.prepareHtml(src, {});
assert(none.includes('data-netlify="true"') && none.includes('name="bot-field"') && none.includes('name="email-2"'), 'no choice yet: forms still prepared');
assert(!none.includes('data-edv-method'), 'no choice yet: no route on the form');
assert.strictEqual(FD.prepareHtml(src, { formMethod: 'email', formTarget: 'nope' }).includes('data-edv-method'), false, 'invalid choice: no route on the form');
assert.strictEqual(FD.prepareHtml('<p>no forms</p>', { formMethod: 'netlify' }), '<p>no forms</p>', 'a page without a message form is untouched');
const nl = FD.prepareHtml(src, { formMethod: 'netlify' });
assert(/<form id="owForm"[^>]* name="owForm" data-netlify="true" data-netlify-honeypot="bot-field">/.test(nl));
assert(nl.includes('<input type="hidden" name="form-name" value="owForm">') && nl.includes('name="bot-field"'));
assert(nl.includes('<input type="text" name="name">') && nl.includes('type="email" placeholder="you@x.com" name="email"') && nl.includes('type="email" name="email-2"') && nl.includes('<textarea name="message">'));
assert(nl.includes('<input type="password">') && nl.includes('<input type="radio" value="a">'), 'passwords and unnamed radios get no name');
assert(nl.includes('<form data-edv-form="skip"><input></form><form><input></form>'), 'skip and unmarked forms untouched');
const wa = FD.prepareHtml(src, { formMethod: 'whatsapp', formTarget: '+371 2000 0000' });
assert(wa.includes('data-edv-method="whatsapp" data-edv-target="37120000000"'));
const hostile = FD.prepareHtml(src, { formMethod: 'mailto', formTarget: 'a"onfocus="x@b.co' });
assert(!hostile.includes('onfocus') && !hostile.includes('data-edv-method'), 'a hostile address never reaches the page');
const rt = FD.runtimeJs();
assert(rt.startsWith('(function edvFormRuntime(win, doc, check, jsonRequest)') && /}\);$/.test(rt) && !/\beval\b|new Function|innerHTML/.test(rt), 'page script is plain and self-contained');
new Function('window', 'document', rt); // parses
assert(rt.includes('bot-field') && rt.includes('__edvMinFillMs') && rt.includes('2500') && rt.includes('__edvForm') && rt.includes('function check('), 'page script has the trap field check and the timing check');

// every block with a message form says when a valid message is complete, or nothing would be sent
const FEATURES = path.join(__dirname, '..', 'features');
let marked = 0;
for (const slug of fs.readdirSync(FEATURES)) {
  const f = path.join(FEATURES, slug, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  if (/data-edv-form="message"/.test(html)) {
    marked++;
    const js = fs.readFileSync(path.join(FEATURES, slug, 'script.js'), 'utf8');
    assert(/edv:submitted/.test(js), slug + ': a message form must fire edv:submitted when a valid submission completes');
  }
}
assert(marked >= 10, 'the message blocks are marked (' + marked + ')');

// builder preview: a chosen route is announced, never used
assert.strictEqual(FD.previewJs({}), '');
assert.strictEqual(FD.previewJs({ formMethod: 'email', formTarget: 'nope' }), '');
const pv = FD.previewJs({ formMethod: 'whatsapp', formTarget: '+371 2000 0000' });
assert(/not sent/.test(pv) && /WhatsApp/.test(pv) && !/fetch|window\.open/.test(pv), 'preview note only talks');
new Function('document', pv);

// the guide explains every route by the same names as the setting
const guide = require('../scripts/deploy-guide.js');
const chapter = guide.CHAPTERS.find((c) => c.id === 'form');
const text = JSON.stringify(chapter);
assert(text.includes('Form messages') && text.includes('admin panel'));
for (const m of FD.METHODS.filter((x) => x.id)) {
  const word = { netlify: 'Netlify Forms', email: 'My email', formspree: 'Formspree', web3forms: 'Web3Forms', whatsapp: 'WhatsApp', mailto: 'email app', custom: 'My own address' }[m.id];
  assert(text.includes(word), 'guide covers ' + m.id);
}
assert(!/password|API key|secret key/i.test(text.replace('Never send', '')), 'the form chapter asks for no secrets');
const safe = guide.CHAPTERS.find((c) => c.id === 'safe');
assert(safe, 'the guide has a chapter on keeping forms and the editor safe');
for (const word of ['spam', 'privacy notice', 'no password', 'two-step', 'connect-src', 'Netlify', 'Web3Forms']) assert(JSON.stringify(safe).toLowerCase().includes(word.toLowerCase()), 'safety chapter covers ' + word);
assert(!/cms/i.test(JSON.stringify(guide.CHAPTERS)), 'public pages never say the banned word');

console.log('form delivery: ok');
