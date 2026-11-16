const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const { make, swapBrand, hostLabel } = require('../scripts/preview/make-preview.js');
assert.strictEqual(swapBrand('<b>Lark &amp; Lantern</b> lark &amp; lantern', 'Lark & Lantern', 'A<B>'), '<b>A&lt;B&gt;</b> A&lt;B&gt;');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-'));
const token = 'a'.repeat(16);
assert.deepStrictEqual([...make({ company: 'SIA Rīga Koks', token, templates: ['stay-sunnycamp', 'stay-pitchwise'], outDir: out })], ['stay-sunnycamp', 'stay-pitchwise']);
const html = fs.readFileSync(path.join(out, token, 'stay-sunnycamp', 'index.html'), 'utf8');
assert(html.includes('SIA Rīga Koks') && !/sunnycamp/i.test(html.replace(/stay-sunnycamp/g, '')) && html.includes('noindex'));
assert(fs.existsSync(path.join(out, 'assets', 'library')) && fs.existsSync(path.join(out, '_headers')));
assert.throws(() => make({ company: 'x', token: '../x', templates: ['stay-sunnycamp'], outDir: out }), /token/);
assert.throws(() => make({ company: 'x', token, templates: ['../etc'], outDir: out }), /slug/);
fs.rmSync(out, { recursive: true });
console.log('make-preview ok');
// round 2: brief, accent, services, lang, photos
{
  const out2 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'b'.repeat(16);
  const photo = path.join(out2, 'x.png'); fs.writeFileSync(photo, 'png');
  const r = make({ company: 'Koks & Co', token: t, templates: ['stay-hollow-cabins', 'stay-sunnycamp'], phone: '+371 20000000', email: 'a@b.lv', address: 'Brīvības 1', city: 'Rīga', services: ['Mājas', '<b>x</b>'], accent: '#aa3300', lang: 'lv', photos: [photo], outDir: out2 });
  const h = fs.readFileSync(path.join(out2, t, 'stay-hollow-cabins', 'index.html'), 'utf8');
  assert(h.includes('+371 20000000') && h.includes('Koks &amp; Co') && h.includes('&lt;b&gt;x&lt;/b&gt;') && h.includes('photos/p1.png') && h.includes('<section class="pv">'));
  assert(fs.readFileSync(path.join(out2, t, 'stay-hollow-cabins', 'style.css'), 'utf8').includes('#aa3300'));
  assert(r.notes.some(n => /stay-sunnycamp/.test(n)), 'light template with dark accent keeps its colour');
  assert.throws(() => make({ company: 'x', token: t, templates: ['stay-sunnycamp'], accent: 'red', outDir: out2 }), /accent/);
  assert.throws(() => make({ company: 'x', token: t, templates: ['stay-sunnycamp'], phone: 'a\nb', outDir: out2 }), /phone/);
  assert.throws(() => make({ company: 'x', token: t, templates: ['stay-sunnycamp'], logo: '/nope.png', outDir: out2 }), /image/);
  fs.rmSync(out2, { recursive: true });
}
console.log('make-preview round 2 ok');
// round 3: client content in the template's own sections
{
  const out3 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'f'.repeat(16);
  make({ company: 'Koks', token: t, templates: ['stay-hollow-cabins'], lang: 'lv', tagline: 'Mājas, kas <silda>', about: 'Ģimenes uzņēmums kopš 2009.', hours: 'P–Pk 9–18', services: [{ name: 'Jumti', text: 'Seguma maiņa' }, 'Fasādes'], outDir: out3 });
  const h = fs.readFileSync(path.join(out3, t, 'stay-hollow-cabins', 'index.html'), 'utf8');
  assert(h.includes('Mājas, kas &lt;silda&gt;') && h.includes('Ģimenes uzņēmums kopš 2009.') && h.includes('>Jumti<') && h.includes('Seguma maiņa') && h.includes('>Fasādes<'));
  assert(!h.includes('Virtuves stūrītis') && h.includes('Guli mierīgi'), 'service slots without a service are emptied, other text stays');
  assert(!/<li>Jumti<\/li>/.test(h), 'services are not listed twice');
  assert(h.includes('P–Pk 9–18'));
  fs.rmSync(out3, { recursive: true });
}
console.log('make-preview round 3 ok');
// round 4: photo pool replaces every placeholder, hide + blank
{
  const out4 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'a1'.repeat(8), ph = path.join(out4, 'x.jpg'); fs.writeFileSync(ph, 'jpg');
  const r = make({ company: 'Zobi', token: t, templates: ['spa-nao-longevity', 'spa-stillhouse-mono'], lang: 'lv', photos: [ph], outDir: out4 });
  for (const s of ['spa-nao-longevity', 'spa-stillhouse-mono']) { const h = fs.readFileSync(path.join(out4, t, s, 'index.html'), 'utf8'); assert(!/spa-ph-/.test(h.replace(/<style[\s\S]*?<\/style>/g, '')), s + ': no placeholder left'); assert(/alt="Zobi"/.test(h)); }
  assert(fs.readFileSync(path.join(out4, t, 'spa-nao-longevity', 'index.html'), 'utf8').includes('.na-team'), 'fake team hidden');
  assert(!/Wharf|Ninth Avenue|\$35|35 €/.test(fs.readFileSync(path.join(out4, t, 'spa-stillhouse-mono', 'index.html'), 'utf8')), 'invented branches and prices blanked');
  const none = make({ company: 'Zobi', token: t, templates: ['stay-sunnycamp'], outDir: out4 });
  assert(none.notes.some(n => /placeholder pictures remain/.test(n)));
  fs.rmSync(out4, { recursive: true });
}
console.log('make-preview round 4 ok');
// round 5: the shell page
{
  const out5 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'c3'.repeat(8);
  make({ company: 'Koks <b>&', token: t, templates: ['stay-sunnycamp', 'stay-hollow-cabins', 'stay-pitchwise'], lang: 'lv', replyTo: 'edv@example.lv', outDir: out5 });
  const h = fs.readFileSync(path.join(out5, t, 'index.html'), 'utf8');
  assert.strictEqual((h.match(/role="tab"/g) || []).length, 3);
  assert(h.includes('data-src="stay-hollow-cabins/index.html"') && h.includes('noindex') && h.includes('Koks &lt;b&gt;&amp;') && !h.includes('Koks <b>'));
  assert(h.includes('"edv@example.lv"') && h.includes('Izvēlos šo variantu') && h.includes('lang="lv"'));
  make({ company: 'X', token: t, templates: ['stay-sunnycamp'], outDir: out5 });
  assert(!fs.readFileSync(path.join(out5, t, 'index.html'), 'utf8').includes('id="pick"'), 'no reply address: no choose button');
  assert.throws(() => make({ company: 'X', token: t, templates: ['stay-sunnycamp'], replyTo: 'not mail', outDir: out5 }), /replyTo/);
  fs.rmSync(out5, { recursive: true });
}
console.log('make-preview round 5 ok');
{
  const o6 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-'));
  make({ company: 'A</script><script>alert(1)</script>', token: 'd4'.repeat(8), templates: ['stay-sunnycamp'], outDir: o6 });
  assert.strictEqual((fs.readFileSync(path.join(o6, 'd4'.repeat(8), 'index.html'), 'utf8').match(/<script/g) || []).length, 1, 'a company name cannot close the shell script');
  fs.rmSync(o6, { recursive: true });
}
console.log('shell escaping ok');
// round 6: native (data-slot) templates
{
  const o7 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'e5'.repeat(8), ph = path.join(o7, 'x.jpg'); fs.writeFileSync(ph, 'jpg');
  const run = brief => { make({ company: 'Zobi <3', token: t, templates: ['dental-mintline', 'clinic-evergreen'], lang: 'lv', photos: [ph], outDir: o7, ...brief }); return ['dental-mintline', 'clinic-evergreen'].map(s => fs.readFileSync(path.join(o7, t, s, 'index.html'), 'utf8')); };
  const [full] = run({ tagline: 'Smaids bez bailēm', about: 'Klīnika Rīgā.', phone: '+371 20 000 001', email: 'a@b.lv', address: 'Ielas 1', city: 'Rīga', hours: 'P–Pk 9–18', services: [{ name: 'Plombēšana', text: 'Ātri.' }, { name: 'Higiēna' }] });
  assert(full.includes('Smaids bez bailēm') && full.includes('href="tel:+37120000001"') && full.includes('href="mailto:a@b.lv"') && full.includes('P–Pk 9–18'));
  assert(full.includes('>Plombēšana<') && full.includes('>Higiēna<') && !full.includes('Zobu ārstēšana') && (full.match(/data-card/g) || []).length === 2, 'cards beyond the services are removed');
  assert(!/spa-ph|data-slot|data-need/.test(full.replace(/<style[\s\S]*?<\/style>/g, '')) === true || !/spa-ph/.test(full), 'no placeholder pictures');
  const [bare] = run({});
  assert(!bare.includes('Darba laiks') && !bare.includes('Mūsu pakalpojumi') && !bare.includes('info@piemers.lv') && !bare.includes('+371 20000000'), 'a client without hours/services shows neither the sections nor the sample data');
  assert(bare.includes('Zobi &lt;3'), 'company name stands in for a missing tagline, escaped');
  fs.rmSync(o7, { recursive: true });
}
console.log('make-preview round 6 ok');
// round 7: address labels in previews/_hosts.json
{
  const o8 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t1 = 'a7'.repeat(8), t2 = 'b8'.repeat(8), hosts = () => JSON.parse(fs.readFileSync(path.join(o8, '_hosts.json'), 'utf8'));
  const r1 = make({ company: 'SIA Rīga Koks & Co', token: t1, templates: ['stay-sunnycamp'], outDir: o8 });
  assert(/^sia-riga-koks-co-[0-9a-f]{6}$/.test(r1.host), r1.host);
  const r2 = make({ company: 'Diadents', token: t2, templates: ['stay-sunnycamp'], outDir: o8 });
  assert.deepStrictEqual(hosts(), { [r1.host]: t1, [r2.host]: t2 });
  assert.strictEqual(make({ company: 'Other name now', token: t1, templates: ['stay-sunnycamp'], outDir: o8 }).host, r1.host, 'a rebuild keeps the client address');
  assert(fs.existsSync(path.join(o8, t2, 'index.html')), 'other clients\' folders stay');
  assert(/^client-[0-9a-f]{6}$/.test(hostLabel(o8, 'c9'.repeat(8), '!!!')) && !JSON.stringify(hosts()).includes('--'), 'no letters: fallback name, never a double hyphen');
  assert(!/--/.test(hostLabel(o8, 'd1'.repeat(8), 'A -- B -- ' + 'x'.repeat(60))));
  fs.rmSync(o8, { recursive: true });
}
console.log('make-preview round 7 ok');
// round 8: an address given by the CRM
{
  const o9 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t1 = 'a9'.repeat(8), t2 = 'b9'.repeat(8), run = (token, host) => make({ company: 'X', token, host, templates: ['stay-sunnycamp'], outDir: o9 }).host;
  assert.strictEqual(run(t1, 'diadents-ab12cd'), 'diadents-ab12cd');
  assert.strictEqual(run(t1), 'diadents-ab12cd', 'kept on a rebuild without --host');
  assert.strictEqual(run(t1, 'diadents-ef34ab'), 'diadents-ef34ab', 'a new address replaces the old one');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(o9, '_hosts.json'), 'utf8')), { 'diadents-ef34ab': t1 });
  assert.throws(() => run(t2, 'diadents-ef34ab'), /already used/);
  for (const bad of ['Diadents-ab12cd', 'a--b-123456789', 'short-1', '-diadents-ab12', '../x-1234567890']) assert.throws(() => run(t2, bad), /host/, bad);
  fs.rmSync(o9, { recursive: true });
}
console.log('make-preview round 8 ok');
// round 9: every template carries the booking / call-back form (owner's rule), filled with the client's services
{
  const o10 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'f1'.repeat(8), all = fs.readdirSync(path.join(__dirname, '..', 'features')).filter(s => /^(dental|clinic|stay|spa|build)-/.test(s) && fs.existsSync(path.join(__dirname, '..', 'features', s, 'index.html')));
  assert(all.length > 30, 'templates found: ' + all.length);
  for (const s of all) {
    make({ company: 'Zobi <3', token: t, templates: [s], lang: 'lv', services: [{ name: 'Plombēšana' }, { name: 'Higiēna' }], outDir: o10 });
    const h = fs.readFileSync(path.join(o10, t, s, 'index.html'), 'utf8');
    assert.strictEqual((h.match(/id="pieteikums"/g) || []).length, 1, s + ': exactly one form');
    const code = h.match(/<script>(\(function\(\)\{var s=document\.currentScript[\s\S]*?)<\/script><\/section>/)[1];
    new (require('vm').Script)(code); // the inline script must at least parse (a lost backslash broke it once)
    assert(code.includes('/^\\+?\\d{6,15}$/') , s + ': phone pattern intact');
    assert(/<input name="phone" type="tel"[^>]* required/.test(h) && /type="checkbox" name="consent" required/.test(h) && h.includes('name="what" value="Plombēšana"') && h.includes('name="when"'), s + ': phone, consent, services and call time');
    assert(h.indexOf('id="pieteikums"') < (h.search(/<footer[\s>]/) < 0 ? Infinity : h.search(/<footer[\s>]/)), s + ': form before the footer');
  }
  make({ company: 'No services', token: t, templates: ['dental-mintline'], outDir: o10 });
  { const h = fs.readFileSync(path.join(o10, t, 'dental-mintline', 'index.html'), 'utf8'); assert(!h.includes('name="what"') && h.includes('name="when"') && h.includes('Let us start with a short call') && (h.match(/<fieldset data-step/g) || []).length === 2, 'no services: the service step is left out; English words by default'); }
  fs.rmSync(o10, { recursive: true });
}
console.log('make-preview round 9 ok');
// round 10: the brief and photos are kept, and a rebuild gives the same client back
{
  const { rebuild } = require('../scripts/preview/make-preview.js');
  const o11 = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), out = path.join(o11, 'previews'), src = path.join(o11, 'previews-src'), t = 'e7'.repeat(8);
  const pics = path.join(o11, 'stock'); fs.mkdirSync(pics); fs.writeFileSync(path.join(pics, 'a.jpg'), 'a'); fs.writeFileSync(path.join(pics, 'b.jpg'), 'b');
  fs.writeFileSync(path.join(pics, 'credits.json'), JSON.stringify([{ file: 'b.jpg', author: 'X', licence: 'Unsplash' }]));
  const first = make({ company: 'Zobi', token: t, host: 'zobi-1a2b3c4d', templates: ['dental-mintline'], lang: 'lv', tagline: 'Smaids', services: [{ name: 'Higiēna' }], photos: [path.join(pics, 'a.jpg'), path.join(pics, 'b.jpg')], outDir: out, srcDir: src });
  const saved = JSON.parse(fs.readFileSync(path.join(src, t, 'brief.json'), 'utf8'));
  assert.deepStrictEqual(saved.photos, ['p01.jpg', 'p02.jpg']); assert.strictEqual(saved.host, 'zobi-1a2b3c4d'); assert.deepStrictEqual(saved.templates, ['dental-mintline']);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(src, t, 'files', 'credits.json'), 'utf8')).map(c => c.file), ['p02.jpg'], 'stock credits follow the renamed photo');
  const before = fs.readFileSync(path.join(out, t, 'dental-mintline', 'index.html'), 'utf8');
  fs.rmSync(pics, { recursive: true }); // the original photos are gone (as with a wiped scratchpad)
  const again = rebuild(t, { srcDir: src, outDir: out });
  assert.strictEqual(again.host, first.host);
  assert.strictEqual(fs.readFileSync(path.join(out, t, 'dental-mintline', 'index.html'), 'utf8'), before, 'the rebuild is the same page');
  assert(!fs.existsSync(path.join(out, t, 'brief.json')) && !fs.existsSync(path.join(out, 'previews-src')), 'nothing of the source goes into the deployed folder');
  fs.rmSync(o11, { recursive: true });
}
console.log('make-preview round 10 ok');
