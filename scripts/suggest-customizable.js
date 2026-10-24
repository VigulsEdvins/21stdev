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

/**
 * Renders a feature inside the real builder, runs the Content tab's field discovery, then turns the raw
 * finds into a short list with names a client understands ("Headline", "Intro text", "Button text",
 * "Hero photo", "Menu link 2") and class-based selectors where an element has a unique class.
 */
async function suggest(page, slug) {
  return page.evaluate(async ({ slug, limits }) => {
    const sm = window.builderPreview.stackManager;
    const probeId = 'probe-' + slug.replace(/[^a-z0-9]/gi, '-');
    sm.setStack([{ id: probeId, slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
    const frame = document.querySelector('iframe');
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 250));
      const d = frame.contentDocument;
      if (d && d.readyState === 'complete' && d.getElementById(probeId)) break;
    }
    await new Promise(r => setTimeout(r, 1200));
    const root = frame.contentDocument.getElementById(probeId);
    if (!root) return [];
    const found = window.BuilderExtras.discoverFields(root, null, { limit: 40 });

    const inside = (el, sel) => !!el.closest(sel);
    const snippet = (t, n = 28) => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
    const rootTop = root.getBoundingClientRect().top;
    const enriched = found.map(f => {
      const el = root.querySelector(f.selector);
      if (!el) return null;
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const top = el.getBoundingClientRect().top - rootTop;
      const inNav = inside(el, 'nav, header, [role="navigation"]');
      const inFooter = inside(el, 'footer');
      const buttonish = tag === 'button' || /btn|button|cta/.test(cls) || el.getAttribute('role') === 'button';
      let role, priority;
      if (f.type === 'image') {
        const alt = (el.getAttribute('alt') || '').toLowerCase();
        role = /logo/.test(alt + cls) ? 'Logo' : (top < 900 && !inFooter ? 'Hero photo' : 'Photo');
        priority = role === 'Logo' ? 3 : role === 'Hero photo' ? 1 : 4;
      } else if (f.type === 'link') {
        role = buttonish ? 'Button link' : inFooter ? 'Footer link' : inNav ? 'Menu link' : 'Link';
        priority = buttonish ? 2 : inNav ? 6 : 5;
      } else if (tag === 'h1') { role = 'Headline'; priority = 0; }
      else if (/^h[2-6]$/.test(tag)) { role = inFooter ? 'Footer heading' : (tag === 'h2' ? 'Section heading' : 'Subheading'); priority = tag === 'h2' ? 1 : 3; }
      else if (buttonish) { role = 'Button text'; priority = 2; }
      else if (tag === 'a') { role = inFooter ? 'Footer link text' : inNav ? 'Menu item' : 'Link text'; priority = inNav ? 5 : 6; }
      else if (tag === 'p' || tag === 'blockquote') { role = inFooter ? 'Footer text' : tag === 'blockquote' ? 'Quote' : 'Paragraph'; priority = inFooter ? 6 : 2; }
      else if (tag === 'li') { role = inFooter ? 'Footer link text' : inNav ? 'Menu item' : 'List item'; priority = 6; }
      else { role = inFooter ? 'Footer text' : inNav ? 'Menu item' : top < 250 && f.current.length < 40 ? 'Small label' : 'Text'; priority = 5; }
      return { f, el, role, priority, top, cls };
    }).filter(Boolean);

    // The first heading becomes the Headline when the section has no h1
    const hasHeadline = enriched.some(e => e.role === 'Headline');
    if (!hasHeadline) {
      const firstHeading = enriched.filter(e => e.f.type === 'text' && /Section heading|Subheading/.test(e.role)).sort((a, b) => a.top - b.top)[0];
      if (firstHeading) { firstHeading.role = 'Headline'; firstHeading.priority = 0; }
    }
    // The first paragraph after the headline is the intro text
    const headline = enriched.find(e => e.role === 'Headline');
    const intro = enriched.filter(e => e.role === 'Paragraph' && (!headline || e.top >= headline.top)).sort((a, b) => a.top - b.top)[0];
    if (intro) intro.role = 'Intro text';

    const used = {};
    const picked = [];
    [...enriched].sort((a, b) => a.priority - b.priority || a.top - b.top).forEach(e => {
      if ((used[e.f.type] || 0) >= limits[e.f.type]) return;
      used[e.f.type] = (used[e.f.type] || 0) + 1;
      picked.push(e);
    });
    picked.sort((a, b) => a.top - b.top);

    const counts = {};
    const totals = {};
    picked.forEach(e => { totals[e.role] = (totals[e.role] || 0) + 1; });
    return picked.map(e => {
      let selector = e.f.selector;
      for (const cls of Array.from(e.el.classList)) {
        const cand = ':scope ' + e.el.tagName.toLowerCase() + '.' + CSS.escape(cls);
        const hits = root.querySelectorAll(cand);
        if (hits.length === 1 && hits[0] === e.el) { selector = cand; break; }
      }
      counts[e.role] = (counts[e.role] || 0) + 1;
      const label = totals[e.role] > 1 ? `${e.role} ${counts[e.role]}` : e.role;
      const id = (e.role + (totals[e.role] > 1 ? '-' + counts[e.role] : '')).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return { id, label, type: e.f.type, selector, sample: snippet(e.f.current) };
    });
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
    let fields = [];
    try { fields = await suggest(page, slug); } catch (e) { console.log(`${slug}: failed (${e.message.split('\n')[0]})`); continue; }
    console.log(`${slug}: ${fields.map(f => f.label).join(', ') || 'none'}`);
    if (write && fields.length) {
      const p = path.join(ROOT, 'features', slug, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
      const seen = new Set();
      meta.customizable = fields.map(({ sample, ...f }) => { let id = f.id, n = 2; while (seen.has(id)) id = `${f.id}-${n++}`; seen.add(id); return { ...f, id }; });
      fs.writeFileSync(p, JSON.stringify(meta, null, 2) + '\n');
    }
  }
  await browser.close();
  await srv.close();
}

main().catch(e => { console.error(e); process.exit(1); });
