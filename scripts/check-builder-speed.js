#!/usr/bin/env node
/**
 * Speed of the guided builder on a throttled phone (plan E6.12): Lighthouse, performance only, on /builder.html served from the repository.
 * Prints the score, the main timings, the number of requests and the script weight, so a change can be judged by numbers.
 *   npm run check-builder-speed [-- --runs 3] [--budget 0.7]
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.svg']);
/** The repository served the way Cloudflare serves it: text files compressed (gzip here, brotli there), so script weight is the weight a visitor downloads. */
function startServer() {
  const s = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file), head = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (COMPRESS.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, Object.assign(head, { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' })); return res.end(zlib.gzipSync(fs.readFileSync(file))); }
    res.writeHead(200, head); fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + s.address().port, close: () => new Promise((c) => s.close(c)) })));
}

function chromePath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) for (const d of fs.readdirSync(base).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) { const exe = path.join(base, d, 'chrome-linux64', 'chrome'); if (fs.existsSync(exe)) return exe; }
  return '/usr/bin/google-chrome';
}

(async () => {
  const argv = process.argv.slice(2);
  const runs = Number(argv.includes('--runs') ? argv[argv.indexOf('--runs') + 1] : 1);
  const budget = argv.includes('--budget') ? Number(argv[argv.indexOf('--budget') + 1]) : null;
  const srv = await startServer();
  const { default: lighthouse } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');
  const rows = [];
  for (let i = 0; i < runs; i++) {
    const chrome = await chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
    try {
      const run = await lighthouse(srv.url + '/builder.html', { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] });
      const a = run.lhr.audits, items = (a['network-requests'].details || { items: [] }).items;
      const scripts = items.filter((x) => x.resourceType === 'Script');
      rows.push({ score: Math.round(run.lhr.categories.performance.score * 100), fcp: Math.round(a['first-contentful-paint'].numericValue), lcp: Math.round(a['largest-contentful-paint'].numericValue), tbt: Math.round(a['total-blocking-time'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
        requests: items.length, scripts: scripts.length, scriptKB: Math.round(scripts.reduce((t, x) => t + (x.transferSize || 0), 0) / 1024) });
    } finally { await chrome.kill(); }
  }
  await srv.close();
  rows.forEach((r, i) => console.log(`run ${i + 1}: score ${r.score}  FCP ${r.fcp} ms  LCP ${r.lcp} ms  TBT ${r.tbt} ms  CLS ${r.cls}  ${r.requests} requests, ${r.scripts} scripts, ${r.scriptKB} KB of scripts`));
  const med = rows.map((r) => r.score).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  console.log('median score ' + med);
  if (budget !== null && med < budget * 100) { console.error('below the budget of ' + budget * 100); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
