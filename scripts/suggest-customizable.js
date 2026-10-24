#!/usr/bin/env node
/**
 * Generates `customizable` lists for meta.json by rendering a feature inside the real builder and
 * running the same field discovery the Content tab uses, preferring short class selectors over
 * positional paths. Review the output: labels are derived from the current text.
 *   npm run suggest-customizable -- --slug a,b [--write]
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const LIMITS = { text: 8, image: 4, link: 3 };

async function suggest(page, slug) {
  return page.evaluate(async ({ slug, limits }) => {
    const sm = window.builderPreview.stackManager;
    sm.setStack([{ id: 'probe', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
    const frame = document.querySelector('iframe');
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 250));
      const d = frame.contentDocument;
      if (d && d.readyState === 'complete' && d.getElementById('probe')) break;
    }
    await new Promise(r => setTimeout(r, 1200));
    const root = frame.contentDocument.getElementById('probe');
    const fields = window.BuilderExtras.discoverFields(root);
    const used = {};
    const out = [];
    for (const f of fields) {
      if ((used[f.type] || 0) >= limits[f.type]) continue;
      const el = root.querySelector(f.selector);
      if (!el) continue;
      let selector = f.selector;
      for (const cls of Array.from(el.classList)) {
        const cand = `:scope ${el.tagName.toLowerCase()}.${CSS.escape(cls)}`;
        const hits = root.querySelectorAll(cand.replace(':scope ', ':scope '));
        if (hits.length === 1 && hits[0] === el) { selector = cand; break; }
      }
      used[f.type] = (used[f.type] || 0) + 1;
      const base = f.label.replace(/^[^:]+:\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || f.type;
      out.push({ id: `${f.type}-${base}`, label: f.label, type: f.type, selector });
    }
    return out;
  }, { slug, limits: LIMITS });
}

async function main() {
  const argv = process.argv.slice(2);
  const si = argv.indexOf('--slug');
  if (si < 0) { console.error('Usage: suggest-customizable --slug a,b [--write]'); process.exit(1); }
  const slugs = argv[si + 1].split(',');
  const write = argv.includes('--write');
  const srv = await startServer();
  const browser = await launchBrowser();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(srv.url + '/builder.html');
  await page.waitForFunction(() => window.builderPreview && window.BuilderExtras);
  for (const slug of slugs) {
    const fields = await suggest(page, slug);
    console.log(`${slug}: ${fields.length} fields`);
    if (write && fields.length) {
      const p = path.join(ROOT, 'features', slug, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
      const seen = new Set();
      meta.customizable = fields.map(f => { let id = f.id, n = 2; while (seen.has(id)) id = `${f.id}-${n++}`; seen.add(id); return { ...f, id }; });
      fs.writeFileSync(p, JSON.stringify(meta, null, 2) + '\n');
    }
  }
  await browser.close();
  await srv.close();
}

main().catch(e => { console.error(e); process.exit(1); });
