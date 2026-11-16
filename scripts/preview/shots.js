#!/usr/bin/env node
/**
 * Screenshots of one client's preview for the visual check: npm run preview:shots -- <token> [--out <dir>]
 * For every variant in previews/<token>/: the whole page (small, to judge the colours of the page as a whole) and the booking form at 1280px,
 * plus the form at phone width for the first variant. Opens the files directly (no server needed). Prints the files written.
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { launchBrowser } = require('../lib/browser');

const ROOT = path.join(__dirname, '..', '..');
const a = process.argv.slice(2), token = a.find(x => /^[a-f0-9]{16,64}$/.test(x)), oi = a.indexOf('--out');
const out = oi >= 0 ? a[oi + 1] : fs.mkdtempSync(path.join(os.tmpdir(), 'pv-shots-'));
if (!token) { console.error('usage: npm run preview:shots -- <token> [--out <dir>]'); process.exit(1); }
const dir = path.join(ROOT, 'previews', token);
const variants = fs.readdirSync(dir).filter(v => fs.existsSync(path.join(dir, v, 'index.html')));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await launchBrowser(), files = [];
  const open = async (v, opts) => {
    const p = await b.newPage(opts); await p.goto('file://' + path.join(dir, v, 'index.html'));
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); }); // lazy pictures load
    await p.waitForTimeout(800); return p;
  };
  try {
    for (const [i, v] of variants.entries()) {
      let p = await open(v, { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 0.35 });
      await p.screenshot({ path: path.join(out, v + '-page.png'), fullPage: true }); files.push(v + '-page.png'); await p.close();
      p = await open(v, { viewport: { width: 1280, height: 900 } });
      await (await p.$('#pieteikums')).screenshot({ path: path.join(out, v + '-form.png') }); files.push(v + '-form.png'); await p.close();
      if (!i) { p = await open(v, { viewport: { width: 390, height: 844 } }); await (await p.$('#pieteikums')).screenshot({ path: path.join(out, v + '-form-phone.png') }); files.push(v + '-form-phone.png'); await p.close(); }
    }
  } finally { await b.close(); }
  console.log(files.map(f => path.join(out, f)).join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
