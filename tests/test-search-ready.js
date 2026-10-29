// E7.7 search-ready and safe downloads, E7.8 deploy guide: files in every download, address check, ready-for-Google list.
const assert = require('assert');
const A = require('../scripts/assembler.js');
const G = require('../scripts/builder/guided-get.js');
const { checkPage, checkSearchReady } = require('../scripts/builder/page-checks.js');
const guide = require('../scripts/deploy-guide.js');

const sec = [{ id: 's1', slug: 'x', title: 'X', html: '<h1>Hi</h1>', css: '', js: '' }];
const page = { title: 'Zephyr', description: 'Dentist', canonical: 'https://zephyr.example/', bizEmail: 'hi@zephyr.example', lang: 'lv' };
const names = (b) => Object.keys(b).sort();

// every download with an address carries the search and safety files
const withAddr = A.generateExportBundle ? A.generateExportBundle(sec, { id: 'clean-minimal' }, {}, { page }) : null;
for (const f of ['robots.txt', 'sitemap.xml', '404.html', '.well-known/security.txt', 'DEPLOY.md', 'DEPLOY.html', '_headers'])
  assert(withAddr && withAddr[f] !== undefined, 'bundle is missing ' + f + ' (has ' + names(withAddr) + ')');
assert(/Sitemap: https:\/\/zephyr\.example\/sitemap\.xml/.test(withAddr['robots.txt']), 'robots.txt names the sitemap');
assert(/^Contact: mailto:hi@zephyr\.example$/m.test(withAddr['.well-known/security.txt']) && /^Expires: \d{4}-\d\d-\d\dT/m.test(withAddr['.well-known/security.txt']), 'security.txt has contact and expiry');
assert(/lang="lv"/.test(withAddr['404.html']) && /noindex/.test(withAddr['404.html']) && /href="\/"/.test(withAddr['404.html']));
for (const f of A.SITE_EXTRA_FILES) assert(typeof f === 'string');
assert(A.SITE_EXTRA_FILES.includes('404.html') && A.SITE_EXTRA_FILES.includes('.well-known/security.txt') && A.SITE_EXTRA_FILES.includes('DEPLOY.html'), 'the ZIP code copies the new files');

// expiry is a year ahead and a wrong or hostile email writes no file
assert(A.renderSecurityTxt({ bizEmail: 'a@b.co' }, new Date('2026-10-29T10:00:00Z')).includes('Expires: 2027-10-29T10:00:00Z'));
for (const bad of ['', 'nope', 'a@b', 'a@b.co\nContact: mailto:evil@x.com', '<x>@y.zz']) assert(!A.renderDeployFiles({ bizEmail: bad })['.well-known/security.txt'], 'no security.txt for ' + JSON.stringify(bad));

// without an address: no sitemap, the guide says so
const noAddr = A.generateExportBundle(sec, { id: 'clean-minimal' }, {}, { page: { title: 'T' } });
assert(noAddr['sitemap.xml'] === undefined && /not set your web address yet/.test(noAddr['DEPLOY.md']) && noAddr['404.html']);
assert(/Your web address is set to \*\*https:\/\/zephyr\.example\*\*/.test(withAddr['DEPLOY.md']));

// address check
for (const [raw, ok, val] of [['', true, ''], ['yourname.com', true, 'https://yourname.com/'], ['https://a.example/shop', true, 'https://a.example/shop'], ['http://a.example', false], ['https://u:p@a.example', false], ['https://a.example/?k=1', false], ['https://a.example/#x', false], ['not a url', false], ['https://a b.example', false], ['https://nodot', false]]) {
  const r = G.checkAddress(raw);
  assert.strictEqual(r.ok, ok, 'checkAddress ' + raw);
  if (val !== undefined) assert.strictEqual(r.value, val, 'value of ' + raw);
}

// ready for Google
const idsOf = (html, p) => checkSearchReady(html, p).map((i) => i.id);
const html = '<html lang="en"><body><p>Call +371 2000 0000, hi@zephyr.example</p></body></html>';
assert.deepStrictEqual(idsOf(html, { title: 'T', description: 'D', canonical: 'https://a.example/', shareImage: 'https://a.example/i.png', lang: 'en', bizPhone: '+371 2000 0000', bizEmail: 'hi@zephyr.example' }), []);
const red = checkSearchReady(html, { robots: 'noindex', lang: 'en' });
assert(red[0].id === 'noindex' && red[0].severity === 'error', 'noindex is the red warning, first');
assert(idsOf(html, { lang: 'en' }).includes('address-missing') && idsOf(html, { canonical: 'http://a.example/', lang: 'en' }).includes('address-not-https'));
assert(idsOf(html, { title: 'x'.repeat(61), description: 'y'.repeat(161), lang: 'en' }).includes('title-long') && idsOf(html, { description: 'y'.repeat(161), lang: 'en' }).includes('description-long'));
assert(idsOf(html, { lang: 'en', bizPhone: '+371 9999', bizEmail: 'other@x.co' }).filter((i) => i.startsWith('contact-')).length === 2, 'settings that differ from the page are flagged');
// a form with nowhere to go is a warning; one with an address is not
const form = (a) => `<html lang="en"><body><section class="page-section" id="f"><h1>H</h1><form ${a} method="post"><label for="e">E</label><input id="e"></form></section></body></html>`;
for (const a of ['action=""', '', 'action="#"']) assert(checkPage(form(a), { title: 'T', description: 'D' }).some((i) => i.id === 'form-no-target'), 'form ' + a);
assert(!checkPage(form('action="https://formspree.io/f/x"'), { title: 'T', description: 'D' }).some((i) => i.id === 'form-no-target'));

// the guide: one text, every route, a "you should now see" after every step, nothing asks for secrets
const md = guide.markdown({}), htm = guide.html({});
for (const t of ['Netlify Drop', 'Cloudflare Pages', 'GitHub Pages', 'web host', 'Connect your own domain', 'Search Console', 'MX records', 'If something goes wrong', 'Checklist']) assert(md.includes(t) && htm.includes(t), 'guide has ' + t);
const steps = guide.CHAPTERS.flatMap((c) => c.steps || []);
assert(steps.length >= 20 && steps.every((s) => s[0] && s[1]), 'every step has its "you should now see"');
assert(guide.CHAPTERS.every((c) => /^\d{4}-\d\d-\d\d$/.test(c.checked)), 'every chapter is dated');
assert(/never ask|will never ask|nothing here asks/i.test(md) && /GitHub Pages ignores the `_headers`/.test(md) && /cannot promise a ranking/.test(md));
assert(!/<script/i.test(htm) && /<!doctype html>/i.test(htm));
console.log('✅ Search-ready and guide tests passed!');
