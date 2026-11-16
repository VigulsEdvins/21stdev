#!/usr/bin/env node
/**
 * Colour combinations per template, for the whole page, its neighbouring sections and the booking form: npm run preview:palettes
 * Builds every dental/clinic/stay/spa/build template into a temp folder, measures each page with the same code the page runs
 * (form-palette.browser.js) and writes docs/design/form-colour-combinations.html: the rules, then per template the page as bands
 * from top to bottom (60-30-10 shares, a verdict for every pair of neighbouring bands, the colours each band may take between its
 * neighbours), then every valid combination of the booking form drawn in its own colours, the chosen one first.
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { make } = require('./make-preview.js');
const { launchBrowser } = require('../lib/browser');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'design', 'form-colour-combinations.html');
const css = c => 'rgb(' + c.join(',') + ')';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** Runs in the page: the form's own combinations, then the page as a stack of bands (sampled down the left edge, so the section colours and not the cards),
    each band's allowed colours between its neighbours, and a verdict for every pair of neighbouring bands. */
async function analyse() {
  const s = document.getElementById('pieteikums'), form = pfPick(s), lib = form.lib; delete form.lib;
  const H = document.documentElement.scrollHeight, vh = innerHeight, maxS = Math.max(0, H - vh), STEP = 16, samples = [];
  const label = el => {
    if (!el) return 'page';
    if (el.closest('#pieteikums')) return 'booking form (added by the preview)';
    if (el.closest('.pv')) return 'contact block (added by the preview)';
    if (el === document.body || el.getBoundingClientRect().height > 0.6 * H) return 'page background (between sections)';
    const sec = el.closest('section,header,footer,nav,article,aside') || el;
    const h = sec.querySelector('h1,h2,h3');
    return sec.tagName.toLowerCase() + (h && h.textContent.trim() ? ': ' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 42) : sec.className ? '.' + String(sec.className).split(' ')[0] : '');
  };
  for (let y = 4; y < H; y += STEP) {
    scrollTo(0, Math.min(maxS, Math.max(0, y - vh / 2)));
    let c = null, kind = 'colour', el = null;
    for (const e of document.elementsFromPoint(24, y - scrollY)) { // inside the body's default 8px margin, still left of most cards
      if (/^(IMG|VIDEO|PICTURE|CANVAS|IFRAME)$/.test(e.tagName)) { kind = 'photo'; el = e; break; }
      const v = lib.px(getComputedStyle(e).backgroundColor); if (v) { c = v; el = e; break; }
    }
    if (!c && kind !== 'photo') c = lib.px(getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
    samples.push({ y, c, kind, sec: label(el) });
  }
  scrollTo(0, 0);
  const same = (a, b) => a.kind === b.kind && (a.kind === 'photo' || lib.dist(a.c, b.c) < 12);
  let bands = [];
  for (const x of samples) { const b = bands[bands.length - 1]; if (b && same(b, x)) b.y1 = x.y + STEP; else bands.push({ c: x.c, kind: x.kind, y0: x.y, y1: x.y + STEP, sec: x.sec }); }
  bands = bands.filter(b => b.y1 - b.y0 >= 32); // borders and hairlines are not bands
  bands = bands.reduce((o, b) => { const l = o[o.length - 1]; if (l && same(l, b)) l.y1 = b.y1; else o.push(b); return o; }, []);
  const inPal = c => form.palette.some(p => lib.dist(p, c) < 30);
  bands.forEach((b, i) => {
    b.share = (b.y1 - b.y0) / H;
    if (b.kind === 'photo') return;
    b.tone = lib.tone(b.c); b.inPalette = inPal(b.c);
    const nb = { soft: true, prev: i && bands[i - 1].kind !== 'photo' ? bands[i - 1].c : null, next: bands[i + 1] && bands[i + 1].kind !== 'photo' ? bands[i + 1].c : null };
    const all = pfPick(s, nb).combos;
    b.fits = all.some(k => lib.dist(k.bg, b.c) < 20);
    b.options = all.slice(0, 8).map(k => ({ bg: k.bg, kind: k.kind }));
  });
  const BIG = ['complementary', 'split-complementary', 'triadic', 'contrasting'];
  const pairs = bands.slice(1).map((b, i) => {
    const a = bands[i];
    if (a.kind === 'photo' || b.kind === 'photo') return { ok: true, text: 'next to a photo' };
    const rel = lib.relation(a.c, b.c), d = lib.dist(a.c, b.c);
    const lightNeutrals = a.tone === 'light' && b.tone === 'light' && !lib.vivid(a.c) && !lib.vivid(b.c);
    if (lightNeutrals && d >= 12) return { ok: true, text: 'a slight shift between two light neutrals (an intended way to separate sections)' };
    if (d < 60) return { ok: false, text: 'almost the same colour: the sections run together (make them one colour or clearly different)' };
    if (lib.vivid(a.c) && lib.vivid(b.c) && a.share >= 0.06 && b.share >= 0.06 && BIG.includes(rel)) return { ok: false, text: rel + ' hues as two large areas: they compete; keep one of them as an accent' };
    return { ok: true, text: rel + (a.tone !== b.tone ? ', ' + a.tone + ' to ' + b.tone + ' (a clear break)' : ', same lightness') };
  });
  const groups = [];
  bands.filter(b => b.kind !== 'photo').forEach(b => { const g = groups.find(x => lib.dist(x.c, b.c) < 30); if (g) g.share += b.share; else groups.push({ c: b.c, share: b.share }); });
  groups.sort((x, y) => y.share - x.share);
  const photo = bands.filter(b => b.kind === 'photo').reduce((n, b) => n + b.share, 0);
  return { r: form, bands, pairs, groups, photo };
}

const chip = (c, label) => '<span class="sw" style="background:' + css(c) + '" title="' + css(c) + '"></span>' + (label ? '<small>' + label + '</small>' : '');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-')), token = 'cd'.repeat(8);
  const slugs = fs.readdirSync(path.join(ROOT, 'features')).filter(s => /^(dental|clinic|stay|spa|build)-/.test(s) && fs.existsSync(path.join(ROOT, 'features', s, 'index.html')));
  const fn = fs.readFileSync(path.join(__dirname, 'form-palette.browser.js'), 'utf8');
  const browser = await launchBrowser(), page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const rows = [];
  try {
    for (const slug of slugs) {
      make({ company: 'Klients', token, templates: [slug], lang: 'lv', services: [{ name: 'Konsultācija' }], outDir: tmp });
      await page.goto('file://' + path.join(tmp, token, slug, 'index.html'), { waitUntil: 'domcontentloaded' });
      await page.addScriptTag({ content: fn });
      rows.push({ slug, ...(await page.evaluate(analyse)) });
    }
  } finally { await browser.close(); fs.rmSync(tmp, { recursive: true }); }

  const total = rows.reduce((n, x) => n + x.r.combos.length, 0);
  const card = (k, i) => '<div class="c' + (i ? '' : ' pick') + '" style="background:' + css(k.bg) + ';color:' + css(k.fg) + '">'
    + (i ? '' : '<em style="background:' + css(k.hl) + ';color:' + css(k.on) + '">chosen</em>')
    + '<b>Sāksim ar īsu sarunu</b><span class="bar" style="background:' + css(k.hl) + '"></span>'
    + '<span class="btn" style="background:' + css(k.hl) + ';color:' + css(k.on) + '">Pieprasīt zvanu</span>'
    + '<small>' + (k.kind === 'tone' ? 'tone of ' + chip(k.from) : 'template colour') + ' · ' + (k.dark ? 'dark' : 'light') + ' · accent: ' + esc(k.accent) + ' · next to the band above: ' + esc(k.flow)
    + '<br>contrast text ' + k.cr.fg.toFixed(1) + ' · accent ' + k.cr.hl.toFixed(1) + ' · button text ' + k.cr.on.toFixed(1) + ' · score ' + k.score + '</small></div>';
  const pct = x => Math.round(x * 100) + '%';
  const pageHtml = ({ bands, pairs, groups, photo }) => {
    const bar = '<div class="bar6">' + groups.map(g => '<span style="width:' + (g.share * 100).toFixed(1) + '%;background:' + css(g.c) + '" title="' + pct(g.share) + '"></span>').join('') + (photo ? '<span class="ph" style="width:' + (photo * 100).toFixed(1) + '%" title="photos ' + pct(photo) + '"></span>' : '') + '</div>';
    const roles = groups.slice(0, 3).map((g, i) => ['dominant', 'secondary', 'accent'][i] + ' ' + chip(g.c) + pct(g.share)).join(' · ') + (photo ? ' · photos ' + pct(photo) : '');
    const strip = bands.map((b, i) => '<div class="band"><span class="blk" style="height:' + Math.max(18, Math.min(120, b.share * 600)).toFixed(0) + 'px;' + (b.kind === 'photo' ? '' : 'background:' + css(b.c)) + '"' + (b.kind === 'photo' ? ' data-photo' : '') + '></span>'
      + '<div><b>' + esc(b.sec) + '</b> <small>' + pct(b.share) + (b.kind === 'photo' ? ' · photo' : ' · ' + b.tone + ' · ' + (b.inPalette ? 'template colour' : '<i class="bad">not in the template palette</i>') + ' · ' + (b.fits ? '<i class="ok">fits the rules here</i>' : '<i class="bad">outside the rules here</i>')) + '</small>'
      + (b.options && b.options.length ? '<br><small>allowed here: ' + b.options.map(o => chip(o.bg)).join('') + '</small>' : '') + '</div></div>'
      + (pairs[i] ? '<div class="pair' + (pairs[i].ok ? '' : ' no') + '">↕ ' + esc(pairs[i].text) + '</div>' : '')).join('');
    const bad = pairs.filter(p => !p.ok).length + bands.filter(b => b.kind !== 'photo' && !b.fits).length;
    return '<h3>Whole page <small>' + (bad ? bad + ' to look at' : 'no problems found') + '</small></h3>' + bar + '<p>' + roles + '</p><div class="strip">' + strip + '</div>';
  };
  const body = rows.map(({ slug, r, ...pg }) => '<section><h2>' + slug + '</h2>' + pageHtml(pg) + '<h3>Booking form <small>' + r.combos.length + ' combinations</small></h3>'
    + '<p>Palette: ' + r.palette.map(c => chip(c)).join('') + ' &nbsp; Text and links: ' + r.inks.map(c => chip(c)).join('')
    + ' &nbsp; Band above: ' + (r.prev ? chip(r.prev) : '–') + ' below: ' + (r.next ? chip(r.next) : '–') + '</p>'
    + (r.combos.length ? '<div class="g">' + r.combos.map(card).join('') + '</div>' : '<p>No valid combination: the form keeps its neutral dark panel.</p>') + '</section>').join('');

  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Colour combinations: page, sections, form</title><style>'
    + 'body{margin:0;padding:32px 4vw 80px;font:15px/1.5 system-ui,sans-serif;color:#1c1c1c;background:#f4f2ee}h1{margin:0 0 6px}h2{margin:40px 0 6px;font-size:20px}h2 small{font-weight:400;color:#666}'
    + '.rules{max-width:900px;background:#fff;border-radius:14px;padding:18px 24px}.rules li{margin:4px 0}.sw{display:inline-block;width:22px;height:22px;border-radius:6px;border:1px solid rgb(0 0 0/.15);vertical-align:middle;margin-right:4px}'
    + '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.c{position:relative;border-radius:14px;padding:18px;min-height:150px;display:flex;flex-direction:column;gap:10px}.c.pick{outline:3px solid #2a6bd0;outline-offset:2px}'
    + '.c b{font-size:20px;font-weight:500}.c .bar{height:3px;width:40%;border-radius:3px}.c .btn{align-self:flex-start;padding:8px 14px;border-radius:99px;font-weight:600;font-size:13px}.c small{font-size:11.5px;opacity:.85}.c small .sw{width:12px;height:12px}'
    + 'h3{margin:22px 0 8px;font-size:16px}h3 small{font-weight:400;color:#666}.bar6{display:flex;height:22px;border-radius:6px;overflow:hidden;max-width:900px;border:1px solid rgb(0 0 0/.12)}.bar6 .ph,[data-photo]{background:repeating-linear-gradient(45deg,#ccc 0 6px,#e8e8e8 6px 12px)}'
    + '.strip{max-width:900px;background:#fff;border-radius:12px;padding:12px 16px}.band{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:start;padding:4px 0}.blk{display:block;border-radius:6px;border:1px solid rgb(0 0 0/.12)}.band small{color:#555}'
    + '.pair{margin:0 0 0 102px;font-size:12px;color:#2d7a46}.pair.no{color:#b3261e;font-weight:600}.ok{color:#2d7a46;font-style:normal}.bad{color:#b3261e;font-style:normal;font-weight:600}'
    + '.c em{position:absolute;top:10px;right:10px;font-style:normal;font-size:11px;padding:2px 8px;border-radius:99px}</style></head><body>'
    + '<h1>Colour combinations: whole page, neighbouring sections, booking form</h1><p>Generated by <code>npm run preview:palettes</code> from ' + rows.length + ' templates. For each template: the page as bands from top to bottom (60-30-10 shares, every pair of neighbouring bands judged, the colours each band may take between its neighbours), then the ' + total + ' combinations the booking form may take; the page picks the first one by itself (scripts/preview/form-palette.browser.js).</p>'
    + '<div class="rules"><h3>Rules</h3><ul>'
    + '<li><b>Monochromatic</b> (one hue, different lightness) is the safest harmony; <b>analogous</b> hues sit 30–60° apart on the colour wheel and feel calm.</li>'
    + '<li><b>Complementary</b> (180°), <b>split-complementary</b> (the two hues beside the complement) and <b>triadic</b> (120°) give strong contrast: use them as the accent, not as large areas; two saturated complements in equal amounts vibrate.</li>'
    + '<li><b>60-30-10</b>: dominant ~60% (the page), secondary ~30% (the form panel), accent ~10% (button, progress, ticks).</li>'
    + '<li>So the panel only uses a colour the template already uses, or a deeper / lighter tone of one; never a foreign colour (the charcoal next to the plum page). It must differ from the bands right above and below it; a tone of the band above is preferred, so the page flows.</li>'
    + '<li><b>Neighbouring sections</b>: two bands of almost the same colour look like a mistake (make them one colour or clearly different); two large areas in contrasting hues compete, so one of them should become an accent; a light-to-dark change is a clear, intended break.</li>'
    + '<li>Readability is separate from harmony (WCAG): text on the panel 7:1, accent against the panel 3:1, text on the button 4.5:1.</li></ul>'
    + '<p>Sources: <a href="https://inventivehq.com/blog/color-harmonies-guide-web-design">Inventive HQ, colour harmonies</a>, <a href="https://blog.readymag.com/mastering-color-combinations">Readymag, colour combinations</a>, <a href="https://colorfyi.com/id/blog/color-proportion-rule">ColorFYI, 60-30-10</a>, <a href="https://penpot.app/blog/web-design-color-theory-how-to-build-brands-and-improve-ux-with-color/">Penpot, web colour theory</a>.</p></div>'
    + body + '</body></html>';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log('ok ' + rows.length + ' templates, ' + total + ' form combinations, ' + rows.reduce((n, x) => n + x.pairs.filter(p => !p.ok).length, 0) + ' neighbour problems, '
    + rows.reduce((n, x) => n + x.bands.filter(b => b.kind !== 'photo' && !b.fits).length, 0) + ' bands outside the rules -> ' + path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
