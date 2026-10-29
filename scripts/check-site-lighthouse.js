#!/usr/bin/env node
/**
 * Lighthouse (mobile preset, software rendering) on the public pages of site/. Writes reports/lighthouse-site.json and fails
 * below the budget. Uses CHROMIUM_PATH, then the Chromium Playwright installed, then /usr/bin/google-chrome.
 *   npm run check-site-lighthouse [-- --no-fail] [--page pricing]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const SITE = path.resolve(__dirname, '..', 'site');
const PAGES = { home: '/', start: '/start/', 'how-it-works': '/how-it-works/', pricing: '/pricing/', faq: '/faq/', contact: '/contact/', guide: '/guide/', about: '/about/', account: '/account/' };
// pages that are deliberately not for search engines (noindex) are not held to the SEO score
const NOINDEX = new Set(['account']);
const BUDGET = { performance: 0.9, accessibility: 0.95, 'best-practices': 0.95, seo: 0.95 };
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };

function chromePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) for (const d of fs.readdirSync(base).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe;
  }
  return '/usr/bin/google-chrome';
}
// the site as it will be served: static files, the same security headers from site/_headers are not needed for scoring
function serve() {
  const s = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(SITE, rel);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${s.address().port}`, close: () => new Promise(c => s.close(c)) })));
}

(async () => {
  const argv = process.argv.slice(2);
  const only = argv.includes('--page') ? argv[argv.indexOf('--page') + 1] : null;
  const srv = await serve();
  const { default: lighthouse } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');
  const results = {}; let failed = 0;
  for (const [name, p] of Object.entries(PAGES)) {
    if (only && only !== name) continue;
    const chrome = await chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
    try {
      const run = await lighthouse(srv.url + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(BUDGET) });
      const a = run.lhr.audits, cats = run.lhr.categories;
      const scores = Object.fromEntries(Object.keys(BUDGET).map(k => [k, cats[k].score]));
      const low = Object.keys(BUDGET).filter(k => scores[k] < BUDGET[k] && !(k === 'seo' && NOINDEX.has(name)));
      const failing = Object.values(a).filter(x => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').map(x => x.id);
      results[name] = { scores, metrics: { lcpMs: Math.round(a['largest-contentful-paint'].numericValue), tbtMs: Math.round(a['total-blocking-time'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3), transferKB: Math.round(a['total-byte-weight'].numericValue / 1024) }, failing, details: Object.fromEntries(['color-contrast', 'label', 'link-name', 'image-alt'].filter(id => a[id] && a[id].score !== null && a[id].score < 1).map(id => [id, ((a[id].details && a[id].details.items) || []).slice(0, 5).map(i => (i.node && (i.node.selector + ' | ' + (i.node.explanation || '').slice(0, 160))) || '')])) };
      console.log(`${low.length ? '✗' : '✓'} ${name.padEnd(13)} perf ${Math.round(scores.performance * 100)}  a11y ${Math.round(scores.accessibility * 100)}  bp ${Math.round(scores['best-practices'] * 100)}  seo ${Math.round(scores.seo * 100)}  LCP ${results[name].metrics.lcpMs}ms  CLS ${results[name].metrics.cls}  ${results[name].metrics.transferKB}KB${failing.length ? '  failing: ' + failing.join(', ') : ''}`);
      if (low.length) failed++;
    } finally { await chrome.kill(); }
  }
  await srv.close();
  fs.mkdirSync(path.join(__dirname, '..', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'reports', 'lighthouse-site.json'), JSON.stringify({ budget: BUDGET, results }, null, 2));
  if (failed && !argv.includes('--no-fail')) { console.error(`${failed} page(s) below the budget`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
