#!/usr/bin/env node
/**
 * Theme audit: renders every feature alone in the builder under a dark and a light theme and reports
 * text that is hard to read (contrast below 3:1 against its effective solid background).
 * Elements sitting on images or gradients are skipped (background unknown), so this finds the clear
 * failures, e.g. white card titles on white cards, not every subtle issue.
 *   npm run audit-themes [-- --slug a,b] [--min 3] [--top 25] [--apply]
 * Writes reports/themes.json.
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const THEMES = ['midnight-dark', 'clean-minimal'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

/** Runs inside the preview iframe. Returns { checked, failing: [{text, color, bg, ratio, tag}] } */
function auditInPage(minRatio) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const effectiveBg = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // image/gradient: unknown
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  const failing = [];
  let checked = 0;
  const root = document.querySelector('.page-section') || document.body;
  root.querySelectorAll('*').forEach((el) => {
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CANVAS', 'IMG', 'VIDEO'].includes(el.tagName.toUpperCase())) return;
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim().length > 1).map(n => n.textContent.trim()).join(' ');
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.3 || parseFloat(cs.fontSize) < 9) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight * 3) return;
    const fg = parse(cs.color);
    const bg = effectiveBg(el);
    if (!fg || !bg) return;
    // Text drawn in exactly its background colour, or fully transparent, is hidden on purpose
    // (reveal animations, masked or clipped headlines), not unreadable by mistake.
    if (fg.a === 0 || (Math.abs(fg.r - bg.r) < 1 && Math.abs(fg.g - bg.g) < 1 && Math.abs(fg.b - bg.b) < 1)) return;
    const fgBlend = blend({ ...fg, a: fg.a * Number(cs.opacity) }, bg);
    const l1 = lum(fgBlend), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    checked++;
    if (ratio < minRatio) failing.push({ text: own.slice(0, 40), tag: el.tagName.toLowerCase(), color: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, ratio: Math.round(ratio * 10) / 10 });
  });
  return { checked, failing };
}

async function auditOne(browser, baseUrl, slug, theme, minRatio) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(baseUrl + '/builder.html');
    await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
    await page.evaluate(({ slug, theme }) => {
      const sm = window.builderPreview.stackManager;
      sm.setTheme(theme);
      sm.setStack([{ id: 'audit', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
    }, { slug, theme });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.readyState === 'complete' && d.getElementById('audit'); }, null, { timeout: 15000 });
    await page.waitForTimeout(2200);
    const frame = page.frames().find(f => f !== page.mainFrame());
    return await frame.evaluate(auditInPage, minRatio);
  } catch (e) {
    return { checked: 0, failing: [], error: e.message.split('\n')[0] };
  } finally {
    await ctx.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const minRatio = Number(args.min || 3);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  let slugs = registry.items.map(i => i.slug);
  if (typeof args.slug === 'string') slugs = slugs.filter(s => args.slug.split(',').includes(s));
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = slugs.flatMap(slug => THEMES.map(theme => ({ slug, theme })));
  const results = {};
  await Promise.all(Array.from({ length: Number(args.concurrency || 4) }, async () => {
    while (jobs.length) {
      const { slug, theme } = jobs.shift();
      const r = await auditOne(browser, srv.url, slug, theme, minRatio);
      (results[slug] = results[slug] || {})[theme] = r;
      process.stdout.write(r.failing.length ? 'x' : '.');
    }
  }));
  await browser.close();
  await srv.close();
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'themes.json'), JSON.stringify(results, null, 2));
  // Components a person has looked at in both themes and accepted (brand colours, decorative text, hidden
  // states the audit cannot tell apart) carry `themeReviewed: "<note>"` in meta.json and are listed apart.
  const reviewed = new Set(Object.keys(results).filter(slug => {
    try { return !!JSON.parse(fs.readFileSync(path.join(ROOT, 'features', slug, 'meta.json'), 'utf8')).themeReviewed; } catch (_) { return false; }
  }));
  const rows = Object.entries(results).filter(([slug]) => !reviewed.has(slug)).map(([slug, t]) => ({ slug, dark: t['midnight-dark'].failing.length, light: t['clean-minimal'].failing.length, errors: Object.values(t).filter(x => x.error).length }));
  if (args.apply) {
    // A component that is unreadable under only one polarity keeps its own palette there (nativeWhen).
    // One that fails under both needs a hand fix and is only listed.
    let applied = 0;
    for (const [slug, t] of Object.entries(results)) {
      const darkFails = t['midnight-dark'].failing.length > 0;
      const lightFails = t['clean-minimal'].failing.length > 0;
      const native = [lightFails && !darkFails ? 'light' : null, darkFails && !lightFails ? 'dark' : null].filter(Boolean);
      if (!native.length) continue;
      const file = path.join(ROOT, 'features', slug, 'meta.json');
      const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (JSON.stringify(meta.nativeWhen || []) !== JSON.stringify(native)) {
        meta.nativeWhen = native;
        fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n');
        applied++;
      }
    }
    console.log(`\nSet nativeWhen on ${applied} features. Run \`npm run sync\` and audit again.`);
  }
  const bad = rows.filter(r => r.dark || r.light).sort((a, b) => (b.dark + b.light) - (a.dark + a.light));
  console.log(`\n${rows.length - bad.length}/${rows.length} features have no low-contrast text in either theme (${reviewed.size} more were reviewed by hand and accepted). Report: reports/themes.json`);
  bad.slice(0, Number(args.top || 25)).forEach(r => console.log(`  dark ${String(r.dark).padStart(3)}  light ${String(r.light).padStart(3)}  ${r.slug}`));
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { auditInPage };
