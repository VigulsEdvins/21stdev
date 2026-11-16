/** The preview's call-back form in a real browser: steps, back, validation, success, no network request. Uses a page built by make-preview into a temp folder. */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const { make } = require('../scripts/preview/make-preview.js');
const { launchBrowser } = require('../scripts/lib/browser');

(async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-')), t = 'ab'.repeat(8);
  make({ company: 'Zobi', token: t, templates: ['dental-mintline'], lang: 'lv', accent: '#1a7f6b', services: [{ name: 'Plombēšana' }, { name: 'Higiēna' }], outDir: out });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage(), reqs = [], errs = [];
    page.on('request', r => { if (r.method() !== 'GET') reqs.push(r.method() + ' ' + r.url()); }); page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + path.join(out, t, 'dental-mintline', 'index.html'));
    const vis = async () => page.$$eval('.pf fieldset[data-step]', f => f.map(x => !x.hidden));
    assert.deepStrictEqual(await vis(), [true, false, false], 'starts at step 1');
    await page.click('.pf-chip:has-text("Higiēna")');
    await page.waitForFunction(() => !document.querySelectorAll('.pf fieldset')[1].hidden);
    assert.deepStrictEqual(await vis(), [false, true, false], 'a choice moves on by itself');
    await page.click('.pf-back'); assert.deepStrictEqual(await vis(), [true, false, false], 'back');
    assert.strictEqual(await page.$eval('input[name=what]:checked', x => x.value), 'Higiēna', 'the choice is kept');
    await page.click('.pf-chip:has-text("Higiēna")'); await page.waitForFunction(() => !document.querySelectorAll('.pf fieldset')[1].hidden);
    await page.click('.pf-chip:has-text("Vakarā")'); await page.waitForFunction(() => !document.querySelectorAll('.pf fieldset')[2].hidden);
    await page.fill('input[name=phone]', '123'); await page.click('.pf-go');
    assert(/derīgu tālruni/.test(await page.textContent('.pf [role=status]')), 'bad phone and no consent are refused');
    await page.fill('input[name=phone]', '+371 20 000 000'); await page.check('input[name=consent]'); await page.click('.pf-go');
    assert(await page.$eval('.pf-done', d => d.classList.contains('on')) && /Higiēna · Vakarā/.test(await page.textContent('.pf-sum')), 'success shows the summary');
    assert(await page.$eval('.pf form', f => f.hidden), 'the form is replaced by the thanks');
    assert.deepStrictEqual(reqs, [], 'a draft sends nothing (no POST or other writing request)');
    assert.deepStrictEqual(errs, [], 'no script errors');
    // no services: two steps
    make({ company: 'Zobi', token: t, templates: ['dental-mintline'], lang: 'lv', outDir: out });
    await page.goto('file://' + path.join(out, t, 'dental-mintline', 'index.html'));
    assert.strictEqual((await vis()).length, 2);
    // the form takes each template's own palette, and stays readable on every one
    const all = fs.readdirSync(path.join(__dirname, '..', 'features')).filter(x => /^(dental|clinic|stay|spa|build)-/.test(x));
    const report = [];
    for (const slug of all) {
      make({ company: 'Zobi', token: t, templates: [slug], lang: 'lv', services: [{ name: 'Plombēšana' }], outDir: out });
      await page.goto('file://' + path.join(out, t, slug, 'index.html'), { waitUntil: 'domcontentloaded' });
      const r = await page.$eval('#pieteikums', s => {
        const px = c => c.match(/[\d.]+/g).slice(0, 3).map(Number), L = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
        const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const cs = getComputedStyle(s), bg = px(cs.backgroundColor), fg = px(cs.color), go = getComputedStyle(s.querySelector('.pf-go')), hl = px(go.backgroundColor), on = px(go.color);
        const sib = (el, d) => { while (el && /^(STYLE|SCRIPT|LINK)$/.test(el.tagName)) el = el[d]; return el; }, edge = (el, c) => { while (el) { const v = getComputedStyle(el).backgroundColor; if (!/rgba\(.*, 0\)$|transparent/.test(v)) return px(v); el = el[c]; } return null; };
        const near = n => n && Math.abs(n[0] - bg[0]) + Math.abs(n[1] - bg[1]) + Math.abs(n[2] - bg[2]) < 60;
        const merged = [edge(sib(s.previousElementSibling, 'previousElementSibling'), 'lastElementChild'), edge(sib(s.nextElementSibling, 'nextElementSibling'), 'firstElementChild')].some(near);
        return { merged, pal: s.hasAttribute('data-pal'), harmony: s.getAttribute('data-pal'), fg: cr(fg, bg), hl: cr(hl, bg), on: cr(on, hl), bg: cs.backgroundColor, hlc: go.backgroundColor, font: getComputedStyle(s.querySelector('h2')).fontFamily.split(',')[0] };
      });
      report.push(slug + ' ' + JSON.stringify(r));
      assert(!r.pal || ['palette', 'monochromatic'].includes(r.harmony), slug + ': the panel must be the same or a neighbouring hue, or the template\'s own neutral');
      assert(!r.merged || !r.pal, slug + ': the form merges with the band above or below it');
      assert(r.fg >= 7 && r.hl >= 3 && r.on >= 4.5, slug + ': contrast ' + JSON.stringify(r));
    }
    if (process.env.PALETTE) console.log(report.join('\n'));
  } finally { await browser.close(); fs.rmSync(out, { recursive: true }); }
  console.log('preview form ok');
})().catch(e => { console.error(e); process.exit(1); });
