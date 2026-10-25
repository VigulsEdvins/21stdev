#!/usr/bin/env node
/**
 * Frame times for every component: each one is opened alone (1280x800, headless Chromium with software
 * rendering) and its requestAnimationFrame intervals are recorded for a few seconds after a settle period.
 * Writes reports/frames.json with, per component, the median and 95th-percentile frame time, the share of slow
 * frames (over 33 ms) and the longest main-thread block. Numbers come from software rendering on this machine, so
 * compare components with each other and with earlier runs, not with a phone.
 *   npm run measure-frames [-- --slug a,b] [--seconds 4] [--concurrency 2] [--recheck]
 * --recheck measures again, one at a time, every component the last run found slow: two at once disturb each other,
 * so a slow result is only trusted when it holds up alone.
 * Frame timing is sensitive to load: keep the concurrency low and do not run other work at the same time.
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : dflt; };

async function measureOne(browser, baseUrl, slug, seconds) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.addInitScript(() => {
      window.__long = 0;
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long = Math.max(window.__long, e.duration); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
    });
    await page.goto(`${baseUrl}/features/${slug}/index.html`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(1500); // let scripts, textures and entrance animations settle
    const r = await page.evaluate((ms) => new Promise(resolve => {
      const deltas = [];
      let last = performance.now();
      const end = last + ms;
      window.__long = 0;
      (function tick(now) {
        deltas.push(now - last); last = now;
        if (now < end) requestAnimationFrame(tick); else resolve({ deltas: deltas.slice(1), longest: window.__long });
      })(last);
      requestAnimationFrame(function first(now) { last = now; });
    }), seconds * 1000);
    const d = r.deltas.slice().sort((a, b) => a - b);
    const pick = q => d[Math.min(d.length - 1, Math.floor(d.length * q))] || 0;
    return { frames: d.length, medianMs: +pick(0.5).toFixed(1), p95Ms: +pick(0.95).toFixed(1), slowShare: +(d.filter(x => x > 33).length / Math.max(1, d.length)).toFixed(3), longestBlockMs: Math.round(r.longest) };
  } finally { await ctx.close(); }
}

(async () => {
  const items = require(path.join(ROOT, 'registry.json')).items.filter(i => !i.isWidget);
  let slugs = items.map(i => i.slug);
  const only = arg('slug');
  if (only) slugs = slugs.filter(s => only.split(',').includes(s));
  const file = path.join(ROOT, 'reports', 'frames.json');
  const recheck = process.argv.includes('--recheck');
  if (recheck) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
    slugs = slugs.filter(s => prev[s] && (prev[s].error || prev[s].p95Ms > 33));
  }
  const seconds = Number(arg('seconds', 4));
  const srv = await startServer();
  const browser = await launchBrowser();
  const queue = slugs.slice();
  const rows = {};
  await Promise.all(Array.from({ length: recheck ? 1 : Number(arg('concurrency', 2)) }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      try { rows[slug] = await measureOne(browser, srv.url, slug, seconds); }
      catch (e) { rows[slug] = { error: e.message.split('\n')[0] }; }
    }
  }));
  await browser.close();
  await srv.close();
  const merged = (only || recheck) && fs.existsSync(file) ? Object.assign(JSON.parse(fs.readFileSync(file, 'utf8')), rows) : rows;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  const ok = Object.entries(rows).filter(([, r]) => !r.error);
  const byWeight = {};
  ok.forEach(([slug, r]) => { const w = (items.find(i => i.slug === slug) || {}).weight || '?'; (byWeight[w] = byWeight[w] || []).push(r); });
  Object.entries(byWeight).forEach(([w, list]) => {
    const med = list.map(r => r.medianMs).sort((a, b) => a - b);
    console.log(`${w.padEnd(7)} ${String(list.length).padStart(3)} components, median frame ${med[med.length >> 1]} ms, ${list.filter(r => r.p95Ms > 33).length} with slow frames (p95 over 33 ms)`);
  });
  console.log('Slowest (p95):');
  ok.sort((a, b) => b[1].p95Ms - a[1].p95Ms).slice(0, 8).forEach(([s, r]) => console.log(`  ${String(r.p95Ms).padStart(6)} ms  ${s}  (median ${r.medianMs} ms, ${Math.round(r.slowShare * 100)}% slow)`));
  const failed = Object.entries(rows).filter(([, r]) => r.error);
  if (failed.length) console.log(`${failed.length} could not be measured: ${failed.map(([s]) => s).join(', ')}`);
})().catch(e => { console.error(e); process.exit(1); });
